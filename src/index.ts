import express, { Request, Response, NextFunction } from 'express';
const app = express();
const port = 3000;

// Import routes
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';

// Middleware
app.use(express.json());

// Register routes
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
