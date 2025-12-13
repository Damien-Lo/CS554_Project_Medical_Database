import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import patientsRouter from './routes/patients.js';
import coverageRouter from './routes/coverage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/patients', patientsRouter);
app.use('/api/coverage', coverageRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
