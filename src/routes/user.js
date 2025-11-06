const express = require('express');
const router = express.Router();
const { loadUsers, saveUsers, hashPassword, loadMarket } = require('../../util');
const { verifyUserToken } = require('../middleware/user');
const jwt = require('jsonwebtoken');

const dotenv = require('dotenv');
dotenv.config({ path: '/daytwo/.env' })

router.post('/signup', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const users = loadUsers();
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'user already exists' });
    }

    const user = {
        id: Date.now(),
        username,
        password: hashPassword(password),
        role: 'user',
        collateral_balance: 0,
        market_balances: {} // { market_id: { outcome_a: amount, outcome_b: amount } }
    };
    users.push(user);
    saveUsers(users);
    const token = jwt.sign({ username, role: "user" }, process.env.USER_SECRET, { expiresIn: "2h" });
    res.status(201).json({ id: user.id, username: user.username, token });
});

router.post('/signin', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: 'invalid credentials' });
    }
    const token = jwt.sign({ username, role: "user" }, process.env.USER_SECRET, { expiresIn: "2h" });
    res.json({ message: 'signin successful', id: user.id, username: user.username, token });
});

router.post('/split', verifyUserToken, (req, res) => {
    const { market_id, amount } = req.body;
    const username = req.auth.username;

    if (!market_id || !amount || amount <= 0) {
        return res.status(400).json({ error: 'market_id and valid amount are required' });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const markets = loadMarket();
    const marketIndex = markets.findIndex(m => m.market_id === market_id);

    if (marketIndex === -1) {
        return res.status(404).json({ error: 'Market not found' });
    }

    if (markets[marketIndex].is_settled) {
        return res.status(400).json({ error: 'Cannot split on settled market' });
    }

    // Check if user has enough collateral
    if (!users[userIndex].collateral_balance || users[userIndex].collateral_balance < amount) {
        return res.status(400).json({ error: 'Insufficient collateral balance' });
    }

    // Initialize market_balances if needed
    if (!users[userIndex].market_balances) {
        users[userIndex].market_balances = {};
    }
    if (!users[userIndex].market_balances[market_id]) {
        users[userIndex].market_balances[market_id] = { outcome_a: 0, outcome_b: 0 };
    }

    // Deduct collateral from user
    users[userIndex].collateral_balance -= amount;

    // Add outcome tokens to user
    users[userIndex].market_balances[market_id].outcome_a += amount;
    users[userIndex].market_balances[market_id].outcome_b += amount;

    // Update market
    markets[marketIndex].total_collateral_locked += amount;
    markets[marketIndex].outcome_a_balance += amount;
    markets[marketIndex].outcome_b_balance += amount;

    saveUsers(users);

    res.json({
        message: 'Split successful',
        collateral_balance: users[userIndex].collateral_balance,
        market_balances: users[userIndex].market_balances[market_id],
        market_total_collateral: markets[marketIndex].total_collateral_locked
    });
});

router.post('/merge', verifyUserToken, (req, res) => {
    const { market_id } = req.body;
    const username = req.auth.username;

    if (!market_id) {
        return res.status(400).json({ error: 'market_id is required' });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const markets = loadMarket();
    const marketIndex = markets.findIndex(m => m.market_id === market_id);

    if (marketIndex === -1) {
        return res.status(404).json({ error: 'Market not found' });
    }

    if (markets[marketIndex].is_settled) {
        return res.status(400).json({ error: 'Cannot merge on settled market' });
    }

    // Check if user has tokens in this market
    if (!users[userIndex].market_balances || !users[userIndex].market_balances[market_id]) {
        return res.status(400).json({ error: 'No tokens found for this market' });
    }

    const userMarketBalance = users[userIndex].market_balances[market_id];
    const minAmount = Math.min(userMarketBalance.outcome_a, userMarketBalance.outcome_b);

    if (minAmount <= 0) {
        return res.status(400).json({ error: 'Insufficient outcome tokens to merge' });
    }

    // Initialize collateral_balance if needed
    if (!users[userIndex].collateral_balance) {
        users[userIndex].collateral_balance = 0;
    }

    // Deduct outcome tokens from user
    users[userIndex].market_balances[market_id].outcome_a -= minAmount;
    users[userIndex].market_balances[market_id].outcome_b -= minAmount;

    // Return collateral to user
    users[userIndex].collateral_balance += minAmount;

    // Update market
    markets[marketIndex].total_collateral_locked -= minAmount;
    markets[marketIndex].outcome_a_balance -= minAmount;
    markets[marketIndex].outcome_b_balance -= minAmount;

    saveUsers(users);

    res.json({
        message: 'Merge successful',
        merged_amount: minAmount,
        collateral_balance: users[userIndex].collateral_balance,
        market_balances: users[userIndex].market_balances[market_id],
        market_total_collateral: markets[marketIndex].total_collateral_locked
    });
});

router.post('/claim', verifyUserToken, (req, res) => {
    const { market_id } = req.body;
    const username = req.auth.username;

    if (!market_id) {
        return res.status(400).json({ error: 'market_id is required' });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const markets = loadMarket();
    const marketIndex = markets.findIndex(m => m.market_id === market_id);

    if (marketIndex === -1) {
        return res.status(404).json({ error: 'Market not found' });
    }

    if (!markets[marketIndex].is_settled) {
        return res.status(400).json({ error: 'Market is not settled yet' });
    }

    if (!markets[marketIndex].winning_outcome) {
        return res.status(400).json({ error: 'Winning outcome not set' });
    }

    // Check if user has tokens in this market
    if (!users[userIndex].market_balances || !users[userIndex].market_balances[market_id]) {
        return res.status(400).json({ error: 'No tokens found for this market' });
    }

    const userMarketBalance = users[userIndex].market_balances[market_id];
    const winningOutcome = markets[marketIndex].winning_outcome;

    let claimAmount = 0;
    if (winningOutcome === 'a') {
        claimAmount = userMarketBalance.outcome_a;
        userMarketBalance.outcome_a = 0;
    } else if (winningOutcome === 'b') {
        claimAmount = userMarketBalance.outcome_b;
        userMarketBalance.outcome_b = 0;
    }

    if (claimAmount <= 0) {
        return res.status(400).json({ error: 'No winning tokens to claim' });
    }

    // Initialize collateral_balance if needed
    if (!users[userIndex].collateral_balance) {
        users[userIndex].collateral_balance = 0;
    }

    // Give collateral to user
    users[userIndex].collateral_balance += claimAmount;

    // Update market
    markets[marketIndex].total_collateral_locked -= claimAmount;
    if (winningOutcome === 'a') {
        markets[marketIndex].outcome_a_balance -= claimAmount;
    } else {
        markets[marketIndex].outcome_b_balance -= claimAmount;
    }

    saveUsers(users);

    res.json({
        message: 'Claim successful',
        claimed_amount: claimAmount,
        winning_outcome: winningOutcome,
        collateral_balance: users[userIndex].collateral_balance,
        market_balances: users[userIndex].market_balances[market_id]
    });
});

router.post('/onramp', verifyUserToken, (req, res) => {
    const { amount } = req.body;
    const username = req.auth.username;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Initialize collateral_balance if it doesn't exist
    if (users[userIndex].collateral_balance === undefined) {
        users[userIndex].collateral_balance = 0;
    }

    users[userIndex].collateral_balance += amount;
    saveUsers(users);

    res.json({
        message: 'Collateral deposited successfully',
        collateral_balance: users[userIndex].collateral_balance
    });
});

module.exports = router;
