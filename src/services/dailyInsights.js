import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
let currentInsight = null;
let lastUpdateTime = null;

const UPDATE_TIMES = [
  { hour: 9, minute: 30, name: 'apertura' },
  { hour: 12, minute: 30, name: 'mediodía' },
  { hour: 16, minute: 0, name: 'cierre' }
];

async function generateInsight(momentOfDay) {
  try {
    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Genera para traders del mercado USA:\n1. UNA noticia relevante (máx 2 líneas)\n2. UNA cita de Warren Buffett, Jesse Livermore o Paul Tudor Jones\n\nMomento: ${momentOfDay} - ${fecha}\nFormato: NOTICIA: [texto]\nCITA: "[cita]" - [Autor]`;
    const completion = await client.chat.completions.create({
      messages: [{ role: 'system', content: 'Analista de mercados con insights concisos.' }, { role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 250
    });
    const response = completion.choices[0]?.message?.content || '';
    const newsMatch = response.match(/NOTICIA:\s*(.+?)(?=\nCITA:|$)/s);
    const quoteMatch = response.match(/CITA:\s*(.+)/);
    return { news: newsMatch ? newsMatch[1].trim() : 'Mercado en análisis...', quote: quoteMatch ? quoteMatch[1].trim() : '"The trend is your friend." - Trading Wisdom', momentOfDay, timestamp: new Date() };
  } catch (error) {
    console.error('Error:', error);
    return { news: 'Mantente atento al mercado y gestiona tu riesgo.', quote: '"Risk comes from not knowing what you\'re doing." - Warren Buffett', momentOfDay, timestamp: new Date() };
  }
}

export async function getCurrentInsight() {
  if (!currentInsight) {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hour = etTime.getHours();
    let moment = 'apertura';
    if (hour >= 16) moment = 'cierre';
    else if (hour >= 12) moment = 'mediodía';
    currentInsight = await generateInsight(moment);
    lastUpdateTime = new Date();
  }
  return currentInsight;
}

export async function refreshInsight() {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = etTime.getHours();
  let moment = 'apertura';
  if (hour >= 16) moment = 'cierre';
  else if (hour >= 12) moment = 'mediodía';
  currentInsight = await generateInsight(moment);
  lastUpdateTime = new Date();
  return currentInsight;
}

setInterval(async () => {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = etTime.getHours();
  const minute = etTime.getMinutes();
  for (const time of UPDATE_TIMES) {
    if (hour === time.hour && Math.abs(minute - time.minute) < 5) {
      if (!lastUpdateTime || (now - lastUpdateTime) > 3600000) {
        currentInsight = await generateInsight(time.name);
        lastUpdateTime = now;
        console.log(`✨ Insight: ${time.name}`);
      }
    }
  }
}, 5 * 60 * 1000);
