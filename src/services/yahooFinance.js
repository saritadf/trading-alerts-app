import yahooFinance from 'yahoo-finance2';

// List of major US stock symbols to monitor (NYSE/NASDAQ)
const MAJOR_SYMBOLS = [
  // Tech giants
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  // Financial
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C',
  // Healthcare
  'JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'MRK',
  // Consumer
  'WMT', 'HD', 'NKE', 'COST', 'MCD', 'SBUX',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB',
  // Others
  'DIS', 'V', 'MA', 'BA', 'INTC', 'CSCO', 'PEP', 'KO', 'T', 'VZ'
];

/**
 * Get market alerts based on threshold
 * @param {number} threshold - Percentage threshold for alerts
 * @returns {Promise<Array>} Array of alert objects
 */
export async function getMarketAlerts(threshold = 3.0) {
  try {
    console.log(`🔍 Scanning ${MAJOR_SYMBOLS.length} symbols for ${threshold}% moves...`);
    
    const alerts = [];
    const batchSize = 10;
    
    // Process symbols in batches to avoid rate limiting
    for (let i = 0; i < MAJOR_SYMBOLS.length; i += batchSize) {
      const batch = MAJOR_SYMBOLS.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(symbol => getSymbolQuote(symbol, threshold))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          alerts.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`Error fetching ${batch[index]}:`, result.reason);
        }
      });
      
      // Small delay between batches
      if (i + batchSize < MAJOR_SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Found ${alerts.length} alerts above ${threshold}%`);
    return alerts;
    
  } catch (error) {
    console.error('Error in getMarketAlerts:', error);
    throw error;
  }
}

/**
 * Get quote for a single symbol and check if it meets threshold
 * @param {string} symbol - Stock symbol
 * @param {number} threshold - Percentage threshold
 * @returns {Promise<Object|null>} Alert object or null
 */
async function getSymbolQuote(symbol, threshold) {
  try {
    const quote = await yahooFinance.quote(symbol);
    
    if (!quote || !quote.regularMarketPrice || !quote.regularMarketPreviousClose) {
      return null;
    }
    
    const currentPrice = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // Check if movement exceeds threshold
    if (Math.abs(changePercent) >= threshold) {
      return {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: quote.regularMarketVolume || 0,
        previousClose: previousClose,
        marketCap: quote.marketCap || 0,
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
    
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get detailed information for a specific symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Symbol information
 */
export async function getSymbolInfo(symbol) {
  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics']
      }).catch(() => null)
    ]);
    
    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      averageVolume: quote.averageDailyVolume10Day,
      marketCap: quote.marketCap,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      peRatio: summary?.summaryDetail?.trailingPE || null,
      eps: summary?.defaultKeyStatistics?.trailingEps || null,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`Error fetching info for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get list of all monitored symbols
 * @returns {Array<string>} Array of stock symbols
 */
export function getMonitoredSymbols() {
  return [...MAJOR_SYMBOLS];
}
