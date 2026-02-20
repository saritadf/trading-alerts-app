// server.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Import routes and scanner
import alertsRouter from './src/routes/alerts.js';
import aiRouter from './src/routes/ai.js';
import universesRouter from './src/routes/universes.js';
import scanner from './src/services/scanner.js';

// Load .env for local development (no-op if file doesn't exist)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/alerts', alertsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/universes', universesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\u{1F680} Server running on port ${PORT}`);
  scanner.start();
});
