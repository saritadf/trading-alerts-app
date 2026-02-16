import yahooFinance from 'yahoo-finance2';

// Lista de los principales símbolos del mercado
const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT',
  'JNJ', 'PG', 'UNH', 'MA', 'HD', 'DIS', 'BAC', 'ADBE', 'NFLX', 'CRM',
  'CSCO', 'PEP', 'AVGO', 'TMO', 'COST', 'ABT', 'MRK', 'ACN', 'NKE', 'LLY'
];

const ALERT_THRESHOLD = parseFloat(process.env.DEFAULT_THRESHOLD) || 3;

export async function getStockData(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    const percentChange = quote.regularMarketChangePercent;
    
    return {
      symbol: symbol,
      name: quote.longName || quote.shortName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: percentChange,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return null;
  }
}

export async function getSignificantChanges() {
  try {
    console.log('🔍 Checking stocks for significant changes...');
    const stockPromises = TOP_STOCKS.map(symbol => getStockData(symbol));
    const stocksData = await Promise.all(stockPromises);
    
    // Filter out null values and stocks with significant changes
    const alerts = stocksData
      .filter(stock => stock !== null)
      .filter(stock => Math.abs(stock.changePercent) >= ALERT_THRESHOLD)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    console.log(`✅ Found ${alerts.length} significant changes`);
    return alerts;
  } catch (error) {
    console.error('Error in getSignificantChanges:', error);
    throw error;
  }
}
