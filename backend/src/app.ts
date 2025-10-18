import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import videoRoutes from './routes/videoRoutes';
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

export const createApp = () => {
    const app = express();

    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005',
    ].filter(Boolean) as string[];

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));
    app.use(express.json());
    app.use(apiLimiter);

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', message: 'Server is running' });
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/videos', videoRoutes);

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
};

export default createApp;
