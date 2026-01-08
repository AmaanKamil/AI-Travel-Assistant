import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orchestratorRoutes from './routes/orchestratorRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api', orchestratorRoutes);

export default app;
