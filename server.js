// server.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import alertsRouter from './src/routes/alerts.js';
import aiRouter from './src/routes/ai.js';
import universesRouter from './src/routes/universes.js';
import scanner from './src/services/scanner.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers (allow inline scripts for the vanilla frontend)
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

// Rate limiting for AI endpoints (expensive calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a moment.' }
});
app.use('/api/ai', aiLimiter);

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/alerts', alertsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/universes', universesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scanner.start();
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`);
  scanner.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
