const express = require('express');
const router = express.Router();
const { loadUsers, saveUsers, hashPassword, loadMarket } = require('../../util');
const jwt = require('jsonwebtoken');
const { verifyAdminToken } = require('../middleware/admin');

const dotenv = require(dotenv);
dotenv.config({ path: '/daytwo/.env' })

router.post('/signin', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const users = loadUsers();
    let admin = users.find(u => u.username === username && u.role === 'admin');

    if (!admin) {
        admin = {
            id: Date.now(),
            username,
            password: hashPassword(password),
            role: 'admin'
        };
        users.push(admin);
        saveUsers(users);
        return res.status(201).json({ message: 'admin created and signed in', id: admin.id, username: admin.username });
    }

    if (admin.password !== hashPassword(password)) {
        return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = jwt.sign({ username, role: "admin" }, process.env.ADMIN_SECRET, { expiresIn: "2h" });
    res.json({ message: 'signin successful', token });
});

router.post('/market', verifyAdminToken, (req, res) => {
    const { settlement_deadline } = req.body;
    if (!settlement_deadline) {
        return res.status(400).json({ error: 'settlement_deadline is required' });
    }

    // Validate settlement_deadline is a valid future timestamp
    const deadlineTimestamp = new Date(settlement_deadline).getTime();
    if (isNaN(deadlineTimestamp) || deadlineTimestamp <= Date.now()) {
        return res.status(400).json({ error: 'settlement_deadline must be a valid future date' });
    }

    const markets = loadMarket();

    const market = {
        market_id: uuidv4(),
        settlement_deadline: settlement_deadline,
        is_settled: false,
        winning_outcome: null,
        total_collateral_locked: 0,
        outcome_a_balance: 0,
        outcome_b_balance: 0,
        settled_at: 0,
        created_at: new Date().toISOString()
    };

    markets.push(market);
    saveMarket(market);

    res.status(201).json({
        message: 'Market created successfully',
        market: {
            market_id: market.market_id,
            settlement_deadline: market.settlement_deadline,
            is_settled: market.is_settled,
            total_collateral_locked: market.total_collateral_locked
        }
    });
});

router.post('/result', verifyAdminToken, (req, res) => {
    const { winning_outcome, market_id } = req.body;
    if (!winning_outcome || !market_id) {
        return res.status(400).json({ error: 'swinning_outcome is required' });
    }
    const market = loadMarket();
    const marketIndex = market.findIndex(m => m.index === market_id) //findIndex if nothing is found then returns -1
    if (marketIndex === -1) {
        return res.status(404).json({ error: 'Market not found' });
    }
    if (market[marketIndex].is_settled) {
        return res.status(400).json({ error: 'Market is already settled' });
    }
    market[marketIndex].is_settled = true;
    market[marketIndex].winning_outcome = winning_outcome;
    market[marketIndex].settled_at = new Date().toISOString();

    res.json({
        message: 'Market settled successfully',
        market: {
            market_id,
            is_settled: market[marketIndex].is_settled,
            winning_outcome: market[marketIndex].winning_outcome,
            settled_at: market[marketIndex].settled_at
        }
    })
});

module.exports = router;
