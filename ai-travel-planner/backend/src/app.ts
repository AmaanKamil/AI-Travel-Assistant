import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orchestratorRoutes from './routes/orchestratorRoutes';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

import editRouter from './routes/edit';
import transcribeRouter from './routes/transcribe';

// Mount routes
app.use('/api', orchestratorRoutes);
app.use('/api/edit', editRouter);
app.use('/api/transcribe', transcribeRouter);

export default app;
