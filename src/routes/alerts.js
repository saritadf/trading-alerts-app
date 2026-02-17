import express from 'express';
import { getSignificantChanges, getStockData, getMarketStatus } from '../services/yahooFinance.js';
import scanner from '../services/scanner.js';

const router = express.Router();

// Get alerts (main endpoint as per spec)
router.get('/', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || null;
    const alerts = await getSignificantChanges(threshold);
    
    res.json({ 
      alerts,
      lastScan: new Date().toISOString(),
      marketStatus: getMarketStatus()
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get market status
router.get('/status', (req, res) => {
  try {
    const status = getMarketStatus();
    const scannerData = scanner.getLatestAlerts();
    
    res.json({
      ...status,
      lastScan: scannerData.lastScan,
      alertCount: scannerData.alerts.length
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual refresh/scan
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual scan requested');
    const result = await scanner.forceScan();
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in manual refresh:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific stock data (kept for backward compatibility)
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getStockData(symbol.toUpperCase());
    
    if (!data) {
      return res.status(404).json({ error: 'Stock not found or price below minimum' });
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Error getting stock data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
