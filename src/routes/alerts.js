import express from 'express';
import { getSignificantChanges, getStockData, getMarketStatus } from '../services/finnhub.js';
import scanner from '../services/scanner.js';

const router = express.Router();

// Get alerts (main endpoint with cache logic)
router.get('/', async (req, res) => {
  try {
    const universeId = req.query.universe || scanner.activeUniverse;
    const cached = scanner.getCachedAlerts(universeId);
    
    // Case 1: No cached data - perform scan and wait
    if (!cached.lastScan) {
      console.log(`🔄 No cache for ${universeId}, performing initial scan...`);
      const result = await scanner.performScanForUniverse(universeId);
      return res.json({
        alerts: result.alerts || [],
        lastScan: result.lastScan,
        marketStatus: result.marketStatus || getMarketStatus(),
        universeId,
        stale: false,
        refreshInProgress: false
      });
    }
    
    // Case 2: Data is fresh (less than minForceScanGapMinutes) - return cache
    if (!cached.stale) {
      return res.json({
        alerts: cached.alerts,
        lastScan: cached.lastScan,
        marketStatus: getMarketStatus(),
        universeId,
        stale: false,
        refreshInProgress: false,
        ageMinutes: cached.ageMinutes
      });
    }
    
    // Case 3: Data is stale - trigger async refresh, return cache immediately
    console.log(`⏳ Cache stale for ${universeId} (${cached.ageMinutes} min), refreshing in background...`);
    scanner.performScanForUniverse(universeId).catch(err => {
      console.error(`Background scan error for ${universeId}:`, err);
    });
    
    return res.json({
      alerts: cached.alerts,
      lastScan: cached.lastScan,
      marketStatus: getMarketStatus(),
      universeId,
      stale: true,
      refreshInProgress: true,
      ageMinutes: cached.ageMinutes
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
    const universeId = req.query.universe || scanner.activeUniverse;
    const cached = scanner.getCachedAlerts(universeId);
    
    res.json({
      ...status,
      lastScan: cached.lastScan,
      alertCount: cached.alerts.length,
      universeId,
      stale: cached.stale,
      ageMinutes: cached.ageMinutes
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual refresh/scan (now uses cache-aware logic)
router.post('/refresh', async (req, res) => {
  try {
    const universeId = req.query.universe || scanner.activeUniverse;
    console.log(`🔄 Manual scan requested for ${universeId}`);
    const result = await scanner.performScanForUniverse(universeId);
    
    res.json({
      success: true,
      ...result,
      stale: false,
      refreshInProgress: false
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
