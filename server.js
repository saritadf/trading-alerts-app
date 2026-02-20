// server.js - VERSIÓN MEJORADA CON SCANNER
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv (works with Railway env vars too)
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';

// Import routes and scanner
import alertsRouter from './src/routes/alerts.js';
import aiRouter from './src/routes/ai.js';
// import universesRouter from './src/routes/universes.js';
import scanner from './src/services/scanner.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/alerts', alertsRouter);
app.use('/api/ai', aiRouter);
// app.use('/api/universes', universesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    scanner: scanner.getLatestAlerts().marketStatus
  });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ============================================');
  console.log('📊 TRADING ALERTS APP - Papa\'s Edition');
  console.log('🚀 ============================================\n');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'LOADED ✓' : 'MISSING ✗'}`);
  
  if (process.env.GROQ_API_KEY) {
    console.log(`🔑 API Key length: ${process.env.GROQ_API_KEY.length} chars`);
  }
  
  console.log('\n📡 Starting automatic market scanner...');
  scanner.start();
  
  console.log('\n🚀 ============================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  scanner.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  scanner.stop();
  process.exit(0);
});
