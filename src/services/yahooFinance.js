import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Top 100 US stocks (S&P 100 + high volume stocks)
const TOP_STOCKS = [
  // Mega caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'LLY', 'V',
  'JPM', 'WMT', 'XOM', 'UNH', 'MA', 'PG', 'JNJ', 'HD', 'COST', 'ABBV',
  // Tech & Growth
  'AVGO', 'ORCL', 'CRM', 'NFLX', 'ADBE', 'AMD', 'CSCO', 'ACN', 'INTC', 'QCOM',
  'TXN', 'INTU', 'NOW', 'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS',
  // Financial
  'BAC', 'WFC', 'GS', 'MS', 'SCHW', 'BLK', 'SPGI', 'AXP', 'C', 'USB',
  // Healthcare
  'TMO', 'ABT', 'DHR', 'MRK', 'PFE', 'AMGN', 'BMY', 'CVS', 'GILD', 'VRTX',
  // Consumer
  'TSLA', 'NKE', 'DIS', 'MCD', 'SBUX', 'TGT', 'LOW', 'TJX', 'BKNG', 'CMG',
  // Industrial & Energy
  'BA', 'CAT', 'HON', 'UNP', 'RTX', 'DE', 'LMT', 'GE', 'MMM', 'CVX',
  // Telecom & Media
  'T', 'VZ', 'TMUS', 'CMCSA', 'CHTR', 'DIS', 'WBD',
  // Other high volume
  'COIN', 'SQ', 'PYPL', 'UBER', 'ABNB', 'SHOP', 'SNOW', 'ZM', 'ROKU', 'DDOG'
];

const ALERT_THRESHOLD = parseFloat(process.env.DEFAULT_THRESHOLD) || 3;
const MIN_PRICE = parseFloat(process.env.MIN_PRICE) || 5;
const VOLUME_RATIO_THRESHOLD = parseFloat(process.env.VOLUME_RATIO) || 1.5;

const BATCH_SIZE = parseInt(process.env.SYMBOL_BATCH_SIZE, 10) || 25;

// Cache for historical volume data (reserved for future use)
const volumeCache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let batchOffset = 0;

function getNextBatch() {
  const symbols = [];

  for (let i = 0; i < BATCH_SIZE; i += 1) {
    const idx = (batchOffset + i) % TOP_STOCKS.length;
    symbols.push(TOP_STOCKS[idx]);
  }

  batchOffset = (batchOffset + BATCH_SIZE) % TOP_STOCKS.length;
  return symbols;
}

async function safeQuote(symbol, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await yahooFinance.quote(symbol);
    } catch (error) {
      const msg = error && error.message ? error.message : '';
      const status = error
        ? error.statusCode || error.status || error.code
        : null;

      const is429 =
        msg.includes('Too Many Requests') ||
        msg.includes('Failed to get crumb') ||
        status === 429;

      if (!is429 || attempt === retries) {
        console.error(
          `Error fetching ${symbol} (attempt ${attempt}/${retries}):`,
          msg
        );
        throw error;
      }

      const backoff = 500 * attempt;
      console.warn(
        `429 from Yahoo for ${symbol}. Waiting ${backoff}ms before retry...`
      );

      // eslint-disable-next-line no-await-in-loop
      await sleep(backoff);
    }
  }

  return null;
}

/**
 * Get stock data with enhanced metrics
 */
export async function getStockData(symbol) {
  try {
    const quote = await safeQuote(symbol);

    if (!quote) {
      return null;
    }

    // Skip penny stocks
    if (quote.regularMarketPrice < MIN_PRICE) {
      return null;
    }

    const percentChange = quote.regularMarketChangePercent;
    const currentVolume = quote.regularMarketVolume;

    // Calculate volume ratio
    const avgVolume =
      quote.averageDailyVolume3Month || quote.averageDailyVolume10Day;
    const volumeRatio = avgVolume ? currentVolume / avgVolume : 0;

    return {
      symbol,
      name: quote.longName || quote.shortName,
      price: quote.regularMarketPrice,
      open: quote.regularMarketOpen,
      previousClose: quote.regularMarketPreviousClose,
      change: quote.regularMarketChange,
      changePercent: percentChange,
      volume: currentVolume,
      avgVolume,
      volumeRatio,
      marketCap: quote.marketCap,
      direction: percentChange > 0 ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return null;
  }
}

async function getStockDataBatched(symbols) {
  const results = [];

  for (const symbol of symbols) {
    // eslint-disable-next-line no-await-in-loop
    const data = await getStockData(symbol);
    results.push(data);

    // Rate limit: ~1 request per second
    // eslint-disable-next-line no-await-in-loop
    await sleep(1000);
  }

  return results;
}

/**
 * Get significant market changes with all filters
 */
export async function getSignificantChanges(thresholdOverride = null) {
  try {
    const threshold = thresholdOverride || ALERT_THRESHOLD;
    const symbolsToScan = getNextBatch();

    console.log(
      `🔍 Scanning ${symbolsToScan.length} of ${TOP_STOCKS.length} stocks ` +
        `for changes >= ${threshold}%...`
    );

    const stocksData = await getStockDataBatched(symbolsToScan);

    // Apply all filters
    const alerts = stocksData
      .filter((stock) => stock !== null)
      .filter((stock) => stock.price >= MIN_PRICE)
      .filter((stock) => Math.abs(stock.changePercent) >= threshold)
      .filter((stock) => stock.volumeRatio >= VOLUME_RATIO_THRESHOLD)
      .sort(
        (a, b) =>
          Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );

    console.log(
      `✅ Found ${alerts.length} significant alerts (${threshold}% ` +
        `threshold, ${VOLUME_RATIO_THRESHOLD}x volume, $${MIN_PRICE}+ price)`
    );

    return alerts;
  } catch (error) {
    console.error('Error in getSignificantChanges:', error);
    throw error;
  }
}

/**
 * Check if NYSE market is currently open
 */
export function isMarketOpen() {
  const now = new Date();

  // Convert to ET timezone
  const etTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekend check
  if (day === 0 || day === 6) {
    return false;
  }

  // Market hours: 9:30 AM (570 mins) to 4:00 PM (960 mins) ET
  const marketOpen = 9 * 60 + 30; // 570
  const marketClose = 16 * 60; // 960

  return totalMinutes >= marketOpen && totalMinutes < marketClose;
}

/**
 * Get market status information
 */
export function getMarketStatus() {
  const isOpen = isMarketOpen();
  const now = new Date();
  const etTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );

  return {
    isOpen,
    currentTime: etTime.toISOString(),
    timezone: 'America/New_York',
    hours: '9:30 AM - 4:00 PM ET',
    message: isOpen ? 'Market is OPEN' : 'Market is CLOSED'
  };
}

export { TOP_STOCKS };
