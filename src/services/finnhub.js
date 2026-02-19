// src/services/finnhub.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUniverseSymbols } from './universes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const FINNHUB_API_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_KEY;

if (!API_KEY) {
  throw new Error('FINNHUB_KEY is not set in environment variables');
}

const MIN_PRICE = 5;
const DEFAULT_UNIVERSE = process.env.DEFAULT_UNIVERSE || 'SP100';
const MAX_SYMBOLS_PER_SCAN = parseInt(process.env.MAX_SYMBOLS_PER_SCAN || '100', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || '350', 10);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchQuote(symbol) {
  const url = new URL(`${FINNHUB_API_BASE_URL}/quote`);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('token', API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub HTTP ${res.status} for ${symbol}`);
  }
  const data = await res.json();
  return data;
}

// ====== API PRINCIPAL ======

export async function getBatchQuotes(universeId = DEFAULT_UNIVERSE) {
  try {
    const allSymbols = getUniverseSymbols(universeId).slice(0, MAX_SYMBOLS_PER_SCAN);
    const quotes = {};
    
    for (const symbol of allSymbols) {
      await sleep(DELAY_MS);
      const data = await fetchQuote(symbol);

      const price = data.c;
      const open = data.o;
      const previousClose = data.pc;

      if (!price || price < MIN_PRICE || !previousClose) continue;

      const change = price - previousClose;
      const changePercent = (change / previousClose) * 100;

      quotes[symbol] = {
        price,
        change,
        changePercent,
        volume: data.v || 0,
        open,
        previousClose
      };
    }
    return quotes;
  } catch (error) {
    console.error('Finnhub error in getBatchQuotes:', error.message || error.toString());
    return null;
  }
}

export async function getStockData(symbol) {
  try {
    await sleep(DELAY_MS);
    const data = await fetchQuote(symbol.toUpperCase());

    const price = data.c;
    const previousClose = data.pc;
    const volume = data.v || 0;

    if (!price || price < MIN_PRICE || !previousClose) return null;

    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

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
    console.error(`Finnhub error fetching ${symbol}:`, error.message || error.toString());
    return null;
  }
}

export async function getSignificantChanges(options = {}) {
  const {
    universeId = DEFAULT_UNIVERSE,
    normalThresholdPercent = 3,
    strongThresholdPercent = 5
  } = options;

  const allSymbols = getUniverseSymbols(universeId).slice(0, MAX_SYMBOLS_PER_SCAN);
  console.log(`\n🔍 Scanning ${allSymbols.length} stocks (${universeId}) with Finnhub...`);

  const quotes = await getBatchQuotes(universeId);
  if (!quotes) return [];

  const scanTime = new Date();
  const results = [];
  
  for (const [symbol, data] of Object.entries(quotes)) {
    const absChangePercent = Math.abs(data.changePercent);
    
    if (absChangePercent >= normalThresholdPercent) {
      const severity = absChangePercent >= strongThresholdPercent ? 'high' : 'normal';
      
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
        timestamp: scanTime,
        scanTime,
        timeframeMinutes: 0,
        severity,
        universeId
      });

      console.log(`✅ ${symbol}: ${data.changePercent.toFixed(2)}% (${severity})`);
    }
  }

  console.log(`\n📊 Found ${results.length} significant movements\n`);
  return results.sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
  );
}

// ====== Horario de mercado ======

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
  const open = isMarketOpen();
  const now = new Date();
  const nyTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );

  return {
    isOpen: open,
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
