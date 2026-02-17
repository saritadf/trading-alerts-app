import yahooFinance from 'yahoo-finance2';

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

// Cache for historical volume data
const volumeCache = new Map();

/**
 * Get stock data with enhanced metrics
 */
export async function getStockData(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    
    // Skip penny stocks
    if (quote.regularMarketPrice < MIN_PRICE) {
      return null;
    }

    const percentChange = quote.regularMarketChangePercent;
    const currentVolume = quote.regularMarketVolume;
    
    // Calculate volume ratio
    const avgVolume = quote.averageDailyVolume3Month || quote.averageDailyVolume10Day;
    const volumeRatio = avgVolume ? (currentVolume / avgVolume) : 0;

    return {
      symbol: symbol,
      name: quote.longName || quote.shortName,
      price: quote.regularMarketPrice,
      open: quote.regularMarketOpen,
      previousClose: quote.regularMarketPreviousClose,
      change: quote.regularMarketChange,
      changePercent: percentChange,
      volume: currentVolume,
      avgVolume: avgVolume,
      volumeRatio: volumeRatio,
      marketCap: quote.marketCap,
      direction: percentChange > 0 ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get significant market changes with all filters
 */
export async function getSignificantChanges(thresholdOverride = null) {
  try {
    const threshold = thresholdOverride || ALERT_THRESHOLD;
    console.log(`🔍 Scanning ${TOP_STOCKS.length} stocks for changes >= ${threshold}%...`);
    
    const stockPromises = TOP_STOCKS.map(symbol => getStockData(symbol));
    const stocksData = await Promise.all(stockPromises);
    
    // Apply all filters
    const alerts = stocksData
      .filter(stock => stock !== null) // Valid data
      .filter(stock => stock.price >= MIN_PRICE) // No penny stocks
      .filter(stock => Math.abs(stock.changePercent) >= threshold) // Significant change
      .filter(stock => stock.volumeRatio >= VOLUME_RATIO_THRESHOLD) // High volume
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    
    console.log(`✅ Found ${alerts.length} significant alerts (${threshold}% threshold, ${VOLUME_RATIO_THRESHOLD}x volume, $${MIN_PRICE}+ price)`);
    
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
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
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
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  return {
    isOpen,
    currentTime: etTime.toISOString(),
    timezone: 'America/New_York',
    hours: '9:30 AM - 4:00 PM ET',
    message: isOpen ? 'Market is OPEN' : 'Market is CLOSED'
  };
}

export { TOP_STOCKS };
