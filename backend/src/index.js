import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', healthRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
