import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Top 20 US stocks only (reduced to avoid rate limits)
const TOP_STOCKS 10 US stocks only (reduced for rate limits)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
  'JPM', 'V'
  
  
];

const DELAY_MS = 5000; // 5 seconds between requestsconst MAX_RETRIES = 2;
const MIN_PRICE = 5;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeQuote(symbol, attempt = 1) {
  try {
    await sleep(DELAY_MS); // Always wait before request
    const quote = await yahooFinance.quote(symbol);
    return quote;
  } catch (error) {
    if (error.message?.includes('429') && attempt < MAX_RETRIES) {
      const waitTime = attempt * 3000; // 3s, 6s
      console.log(`Rate limit for ${symbol}. Waiting ${waitTime}ms...`);
      await sleep(waitTime);
      return safeQuote(symbol, attempt + 1);
    }
    console.error(`Error fetching ${symbol} (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
    return null;
  }
}

export async function getStockData(symbol) {
  try {
    const quote = await safeQuote(symbol);
    if (!quote) return null;

    const price = quote.regularMarketPrice || quote.price;
    const previousClose = quote.regularMarketPreviousClose || quote.previousClose;
    const volume = quote.regularMarketVolume || quote.volume;
    const avgVolume = quote.averageDailyVolume10day || quote.averageDailyVolume10Day || 0;

    if (!price || price < MIN_PRICE || !previousClose) return null;

    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    const volumeRatio = avgVolume > 0 ? volume / avgVolume : 0;

    return {
      symbol,
      name: quote.longName || quote.shortName || symbol,
      price,
      change,
      changePercent,
      volume,
      avgVolume,
      volumeRatio,
      previousClose,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`Error processing ${symbol}:`, error.message);
    return null;
  }
}

export async function getSignificantChanges(threshold = 3) {
  console.log(`\n🔍 Scanning ${TOP_STOCKS.length} stocks (with 2s delay each)...`);
  const results = [];

  // Process ONE at a time to avoid rate limits
  for (const symbol of TOP_STOCKS) {
    const data = await getStockData(symbol);
    if (!data) continue;

    if (Math.abs(data.changePercent) >= threshold && data.volumeRatio >= 1.5) {
      results.push(data);
      console.log(`✅ ${symbol}: ${data.changePercent.toFixed(2)}% (Vol: ${data.volumeRatio.toFixed(1)}x)`);
    }
  }

  console.log(`\n📊 Found ${results.length} significant movements\n`);
  return results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

export function isMarketOpen() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
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
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
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
