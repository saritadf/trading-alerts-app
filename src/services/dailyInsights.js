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

async function generateInsight() {
  try {
    const fecha = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `Generate for US market traders:\n1. THE TOP news story of the day affecting markets (max 2 lines, be specific)\n2. ONE inspirational trading quote from Warren Buffett, Jesse Livermore, Paul Tudor Jones, George Soros, or Ray Dalio\n\nDate: ${fecha}\nFormat: NEWS: [text]\nQUOTE: "[quote]" - [Author]`;
    const completion = await client.chat.completions.create({
      messages: [{ role: 'system', content: 'Market analyst providing concise insights. Focus on the most impactful news of the day.' }, { role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 300
    });
    const response = completion.choices[0]?.message?.content || '';
    const newsMatch = response.match(/NEWS:\s*(.+?)(?=\nQUOTE:|$)/s);
    const quoteMatch = response.match(/QUOTE:\s*(.+)/);
    return { 
      news: newsMatch ? newsMatch[1].trim() : 'Market analysis in progress...', 
      quote: quoteMatch ? quoteMatch[1].trim() : '"The trend is your friend." - Trading Wisdom', 
      timestamp: new Date() 
    };
  } catch (error) {
    console.error('Error generating insight:', error);
    return { 
      news: 'Stay alert to the market and manage your risk.', 
      quote: '"Risk comes from not knowing what you\'re doing." - Warren Buffett', 
      timestamp: new Date() 
    };
  }
}

export async function getCurrentInsight() {
  const now = new Date();
  if (!currentInsight || !lastUpdateTime || (now - lastUpdateTime) > 3600000) {
    currentInsight = await generateInsight();
    lastUpdateTime = now;
    console.log('✨ Daily insight updated');
  }
  return currentInsight;
}

export async function refreshInsight() {
  currentInsight = await generateInsight();
  lastUpdateTime = new Date();
  console.log('✨ Daily insight refreshed manually');
  return currentInsight;
}

setInterval(async () => {
  const now = new Date();
  if (!lastUpdateTime || (now - lastUpdateTime) >= 3600000) {
    currentInsight = await generateInsight();
    lastUpdateTime = now;
    console.log('✨ Daily insight auto-updated (hourly)');
  }
}, 60 * 60 * 1000);
