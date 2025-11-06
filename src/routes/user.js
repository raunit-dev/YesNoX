const express = require('express');
const router = express.Router();
const {
    prisma,
    hashPassword,
    findUserByUsername,
    createUser,
    findMarketById,
    findMarketBalance,
    upsertMarketBalance
} = require('../util');
const { verifyUserToken } = require('../middleware/user');
const jwt = require('jsonwebtoken');

const dotenv = require('dotenv');
dotenv.config({ path: '/daytwo/.env' })

router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'username and password required' });

        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'user already exists' });
        }

        const user = await createUser({
            username,
            password: hashPassword(password),
            role: 'user',
            collateral_balance: 0
        });

        const token = jwt.sign({ username, role: "user" }, process.env.USER_SECRET, { expiresIn: "2h" });
        res.status(201).json({ id: user.id, username: user.username, token });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'username and password required' });

        const user = await findUserByUsername(username);
        if (!user || user.password !== hashPassword(password)) {
            return res.status(401).json({ error: 'invalid credentials' });
        }
        const token = jwt.sign({ username, role: "user" }, process.env.USER_SECRET, { expiresIn: "2h" });
        res.json({ message: 'signin successful', id: user.id, username: user.username, token });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/split', verifyUserToken, async (req, res) => {
    try {
        const { market_id, amount } = req.body;
        const username = req.auth.username;

        if (!market_id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'market_id and valid amount are required' });
        }

        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const market = await findMarketById(market_id);
        if (!market) {
            return res.status(404).json({ error: 'Market not found' });
        }

        if (market.is_settled) {
            return res.status(400).json({ error: 'Cannot split on settled market' });
        }

        if (user.collateral_balance < amount) {
            return res.status(400).json({ error: 'Insufficient collateral balance' });
        }

        // Use Prisma transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Deduct collateral from user
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { collateral_balance: user.collateral_balance - amount }
            });

            // Get existing market balance or create new one
            const existingBalance = await tx.marketBalance.findUnique({
                where: {
                    user_id_market_id: {
                        user_id: user.id,
                        market_id: market_id
                    }
                }
            });

            // Update or create market balance
            const marketBalance = await tx.marketBalance.upsert({
                where: {
                    user_id_market_id: {
                        user_id: user.id,
                        market_id: market_id
                    }
                },
                update: {
                    outcome_a: (existingBalance?.outcome_a || 0) + amount,
                    outcome_b: (existingBalance?.outcome_b || 0) + amount
                },
                create: {
                    user_id: user.id,
                    market_id: market_id,
                    outcome_a: amount,
                    outcome_b: amount
                }
            });

            // Update market totals
            const updatedMarket = await tx.market.update({
                where: { market_id: market_id },
                data: {
                    total_collateral_locked: market.total_collateral_locked + amount,
                    outcome_a_balance: market.outcome_a_balance + amount,
                    outcome_b_balance: market.outcome_b_balance + amount
                }
            });

            return { updatedUser, marketBalance, updatedMarket };
        });

        res.json({
            message: 'Split successful',
            collateral_balance: result.updatedUser.collateral_balance,
            market_balances: {
                outcome_a: result.marketBalance.outcome_a,
                outcome_b: result.marketBalance.outcome_b
            },
            market_total_collateral: result.updatedMarket.total_collateral_locked
        });
    } catch (error) {
        console.error('Split error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/merge', verifyUserToken, async (req, res) => {
    try {
        const { market_id } = req.body;
        const username = req.auth.username;

        if (!market_id) {
            return res.status(400).json({ error: 'market_id is required' });
        }

        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const market = await findMarketById(market_id);
        if (!market) {
            return res.status(404).json({ error: 'Market not found' });
        }

        if (market.is_settled) {
            return res.status(400).json({ error: 'Cannot merge on settled market' });
        }

        const marketBalance = await findMarketBalance(user.id, market_id);
        if (!marketBalance) {
            return res.status(400).json({ error: 'No tokens found for this market' });
        }

        const minAmount = Math.min(marketBalance.outcome_a, marketBalance.outcome_b);
        if (minAmount <= 0) {
            return res.status(400).json({ error: 'Insufficient outcome tokens to merge' });
        }

        // Use Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update market balance
            const updatedBalance = await tx.marketBalance.update({
                where: {
                    user_id_market_id: {
                        user_id: user.id,
                        market_id: market_id
                    }
                },
                data: {
                    outcome_a: marketBalance.outcome_a - minAmount,
                    outcome_b: marketBalance.outcome_b - minAmount
                }
            });

            // Return collateral to user
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { collateral_balance: user.collateral_balance + minAmount }
            });

            // Update market
            const updatedMarket = await tx.market.update({
                where: { market_id: market_id },
                data: {
                    total_collateral_locked: market.total_collateral_locked - minAmount,
                    outcome_a_balance: market.outcome_a_balance - minAmount,
                    outcome_b_balance: market.outcome_b_balance - minAmount
                }
            });

            return { updatedUser, updatedBalance, updatedMarket };
        });

        res.json({
            message: 'Merge successful',
            merged_amount: minAmount,
            collateral_balance: result.updatedUser.collateral_balance,
            market_balances: {
                outcome_a: result.updatedBalance.outcome_a,
                outcome_b: result.updatedBalance.outcome_b
            },
            market_total_collateral: result.updatedMarket.total_collateral_locked
        });
    } catch (error) {
        console.error('Merge error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/claim', verifyUserToken, async (req, res) => {
    try {
        const { market_id } = req.body;
        const username = req.auth.username;

        if (!market_id) {
            return res.status(400).json({ error: 'market_id is required' });
        }

        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const market = await findMarketById(market_id);
        if (!market) {
            return res.status(404).json({ error: 'Market not found' });
        }

        if (!market.is_settled) {
            return res.status(400).json({ error: 'Market is not settled yet' });
        }

        if (!market.winning_outcome) {
            return res.status(400).json({ error: 'Winning outcome not set' });
        }

        const marketBalance = await findMarketBalance(user.id, market_id);
        if (!marketBalance) {
            return res.status(400).json({ error: 'No tokens found for this market' });
        }

        const winningOutcome = market.winning_outcome;
        let claimAmount = 0;
        let newOutcomeA = marketBalance.outcome_a;
        let newOutcomeB = marketBalance.outcome_b;

        if (winningOutcome === 'a') {
            claimAmount = marketBalance.outcome_a;
            newOutcomeA = 0;
        } else if (winningOutcome === 'b') {
            claimAmount = marketBalance.outcome_b;
            newOutcomeB = 0;
        }

        if (claimAmount <= 0) {
            return res.status(400).json({ error: 'No winning tokens to claim' });
        }

        // Use Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update market balance (claim winning tokens)
            const updatedBalance = await tx.marketBalance.update({
                where: {
                    user_id_market_id: {
                        user_id: user.id,
                        market_id: market_id
                    }
                },
                data: {
                    outcome_a: newOutcomeA,
                    outcome_b: newOutcomeB
                }
            });

            // Give collateral to user
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { collateral_balance: user.collateral_balance + claimAmount }
            });

            // Update market
            const marketUpdate = {
                total_collateral_locked: market.total_collateral_locked - claimAmount
            };
            if (winningOutcome === 'a') {
                marketUpdate.outcome_a_balance = market.outcome_a_balance - claimAmount;
            } else {
                marketUpdate.outcome_b_balance = market.outcome_b_balance - claimAmount;
            }

            const updatedMarket = await tx.market.update({
                where: { market_id: market_id },
                data: marketUpdate
            });

            return { updatedUser, updatedBalance, updatedMarket };
        });

        res.json({
            message: 'Claim successful',
            claimed_amount: claimAmount,
            winning_outcome: winningOutcome,
            collateral_balance: result.updatedUser.collateral_balance,
            market_balances: {
                outcome_a: result.updatedBalance.outcome_a,
                outcome_b: result.updatedBalance.outcome_b
            }
        });
    } catch (error) {
        console.error('Claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/onramp', verifyUserToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const username = req.auth.username;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { collateral_balance: user.collateral_balance + amount }
        });

        res.json({
            message: 'Collateral deposited successfully',
            collateral_balance: updatedUser.collateral_balance
        });
    } catch (error) {
        console.error('Onramp error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
