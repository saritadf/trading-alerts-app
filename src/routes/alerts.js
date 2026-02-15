import express from 'express';
import { getMarketAlerts, getSymbolInfo } from '../services/yahooFinance.js';

const router = express.Router();

// GET /api/alerts - Get current market alerts
router.get('/', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 3.0;
    const alerts = await getMarketAlerts(threshold);
    
    res.json({
      success: true,
      alerts,
      threshold,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market alerts',
      message: error.message
    });
  }
});

// GET /api/alerts/:symbol - Get info for specific symbol
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const info = await getSymbolInfo(symbol);
    
    res.json({
      success: true,
      symbol,
      info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching symbol ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symbol information',
      message: error.message
    });
  }
});

export default router;
