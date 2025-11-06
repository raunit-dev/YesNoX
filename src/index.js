const express = require('express');
const app = express();
const port = 3000;

// Import routes
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Middleware
app.use(express.json());

// Register routes
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});