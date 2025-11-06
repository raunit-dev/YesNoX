const express = require('express');
const router = express.Router();
const {
    prisma,
    hashPassword,
    findAdminByUsername,
    createAdmin,
    findMarketById,
    createMarket,
    updateMarket
} = require('../util');
const jwt = require('jsonwebtoken');
const { verifyAdminToken } = require('../middleware/admin');
const { v4: uuidv4 } = require('uuid');

const dotenv = require('dotenv');
dotenv.config({ path: '/daytwo/.env' })

router.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'username and password required' });

        let admin = await findAdminByUsername(username);

        if (!admin) {
            // Create new admin if doesn't exist
            admin = await createAdmin({
                username,
                password: hashPassword(password),
                role: 'admin'
            });
            return res.status(201).json({ message: 'admin created and signed in', id: admin.id, username: admin.username });
        }

        if (admin.password !== hashPassword(password)) {
            return res.status(401).json({ error: 'invalid credentials' });
        }

        const token = jwt.sign({ username, role: "admin" }, process.env.ADMIN_SECRET, { expiresIn: "2h" });
        res.json({ message: 'signin successful', token });
    } catch (error) {
        console.error('Admin signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/market', verifyAdminToken, async (req, res) => {
    try {
        const { settlement_deadline } = req.body;
        const username = req.auth.username;

        if (!settlement_deadline) {
            return res.status(400).json({ error: 'settlement_deadline is required' });
        }

        // Validate settlement_deadline is a valid future timestamp
        const deadlineTimestamp = new Date(settlement_deadline).getTime();
        if (isNaN(deadlineTimestamp) || deadlineTimestamp <= Date.now()) {
            return res.status(400).json({ error: 'settlement_deadline must be a valid future date' });
        }

        // Find the admin
        const admin = await findAdminByUsername(username);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const market = await createMarket({
            market_id: uuidv4(),
            settlement_deadline: new Date(settlement_deadline),
            is_settled: false,
            winning_outcome: null,
            total_collateral_locked: 0,
            outcome_a_balance: 0,
            outcome_b_balance: 0,
            settled_at: null,
            admin_id: admin.id
        });

        res.status(201).json({
            message: 'Market created successfully',
            market: {
                market_id: market.market_id,
                settlement_deadline: market.settlement_deadline,
                is_settled: market.is_settled,
                total_collateral_locked: market.total_collateral_locked
            }
        });
    } catch (error) {
        console.error('Market creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/result', verifyAdminToken, async (req, res) => {
    try {
        const { winning_outcome, market_id } = req.body;
        if (!winning_outcome || !market_id) {
            return res.status(400).json({ error: 'winning_outcome and market_id are required' });
        }

        if (winning_outcome !== 'a' && winning_outcome !== 'b') {
            return res.status(400).json({ error: 'winning_outcome must be "a" or "b"' });
        }

        const market = await findMarketById(market_id);
        if (!market) {
            return res.status(404).json({ error: 'Market not found' });
        }

        if (market.is_settled) {
            return res.status(400).json({ error: 'Market is already settled' });
        }

        const updatedMarket = await updateMarket(market_id, {
            is_settled: true,
            winning_outcome: winning_outcome,
            settled_at: new Date()
        });

        res.json({
            message: 'Market settled successfully',
            market: {
                market_id: updatedMarket.market_id,
                is_settled: updatedMarket.is_settled,
                winning_outcome: updatedMarket.winning_outcome,
                settled_at: updatedMarket.settled_at
            }
        });
    } catch (error) {
        console.error('Market settlement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
