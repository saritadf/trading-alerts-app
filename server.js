// server.js - VERSIÓN CORREGIDA PARA ESM
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚠️ CRÍTICO: Cargar dotenv ANTES de cualquier otro import
// Especificar ruta explícita del .env para Windows
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';

// Ahora sí, importar los routers (después de cargar dotenv)
import alertsRouter from './src/routes/alerts.js';
import aiRouter from './src/routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/alerts', alertsRouter);
app.use('/api/ai', aiRouter);

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Trading Alerts App for Papa`);
  console.log(`✅ GROQ_API_KEY loaded: ${process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);
  if (process.env.GROQ_API_KEY) {
    console.log(`🔑 API Key length: ${process.env.GROQ_API_KEY.length} chars`);
  }
});
