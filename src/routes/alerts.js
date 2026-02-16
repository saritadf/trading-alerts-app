import express from 'express';
import { getSignificantChanges, getStockData } from '../services/yahooFinance.js';

const router = express.Router();

// Get real-time alerts
router.get('/live', async (req, res) => {
  try {
    const alerts = await getSignificantChanges();
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific stock data
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getStockData(symbol);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting stock data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
