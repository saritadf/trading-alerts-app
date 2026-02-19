import { createRequire } from 'module';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const require = createRequire(import.meta.url);
const AlphaVantage = require('alphavantage');

let alpha = null;

function getAlphaClient() {
  if (!alpha) {
    if (!process.env.ALPHA_VANTAGE_KEY) {
      throw new Error('ALPHA_VANTAGE_KEY is not set in environment variables');
    }
    alpha = AlphaVantage({ 
      key: process.env.ALPHA_VANTAGE_KEY,
      usePOST: false
    });
  }
  return alpha;
}

const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 
  'META', 'TSLA', 'BRK.B', 'JPM', 'V'
];

const MIN_PRICE = 5;
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBatchQuotes() {
  try {
    const alphaClient = getAlphaClient();
    const quotes = {};
    for (const symbol of TOP_STOCKS) {
      await sleep(DELAY_MS);
      const data = await alphaClient.data.quote(symbol);
      const quote = data['Global Quote'];
      
      if (!quote) continue;
      
      const price = parseFloat(quote['05. price']);
      const changePercent = parseFloat(
        quote['10. change percent'].replace('%', '')
      );
      const volume = parseInt(quote['06. volume']);
      const open = parseFloat(quote['02. open']);
      const previousClose = parseFloat(quote['08. previous close']);
      
      if (price && price >= MIN_PRICE) {
        quotes[symbol] = {
          price,
          change: price - previousClose,
          changePercent,
          volume,
          open,
          previousClose
        };
      }
    }
    return quotes;
  } catch (error) {
    console.error('Alpha Vantage error:', error.message || error.toString() || JSON.stringify(error));
    return null;
  }
}

export async function getStockData(symbol) {
  try {
    const alphaClient = getAlphaClient();
    await sleep(DELAY_MS);
    const data = await alphaClient.data.quote(symbol.toUpperCase());
    const quote = data['Global Quote'];
    
    if (!quote) return null;
    
    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const volume = parseInt(quote['06. volume']);
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    if (!price || price < MIN_PRICE) return null;
    
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume,
      avgVolume: volume,
      volumeRatio: 1,
      previousClose,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message || error.toString() || JSON.stringify(error));
    return null;
  }
}

export async function getSignificantChanges(threshold = 3) {
  console.log(
    `\n🔍 Scanning ${TOP_STOCKS.length} stocks with Alpha Vantage...`
  );
  
  const quotes = await getBatchQuotes();
  if (!quotes) return [];
  
  const results = [];
  for (const [symbol, data] of Object.entries(quotes)) {
    if (Math.abs(data.changePercent) >= threshold) {
      results.push({
        symbol,
        name: symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        avgVolume: data.volume,
        volumeRatio: 1,
        previousClose: data.previousClose,
        timestamp: new Date()
      });
      
      console.log(
        `✅ ${symbol}: ${data.changePercent.toFixed(2)}%`
      );
    }
  }
  
  console.log(`\n📊 Found ${results.length} significant movements\n`);
  return results.sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );
}

export function isMarketOpen() {
  const now = new Date();
  const nyTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  
  if (day === 0 || day === 6) return false;
  if (hour < 9 || hour > 16) return false;
  if (hour === 9 && minute < 30) return false;
  return true;
}

export function getMarketStatus() {
  const isOpen = isMarketOpen();
  const now = new Date();
  const nyTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  
  return {
    isOpen,
    currentTime: nyTime.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    timezone: 'America/New_York'
  };
}
