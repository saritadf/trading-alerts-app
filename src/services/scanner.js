import { getSignificantChanges, isMarketOpen, getMarketStatus } from './finnhub.js';

class MarketScanner {
  constructor() {
    this.scanInterval = null;
    this.lastScan = null;
    this.latestAlerts = [];
    this.subscribers = [];
    this.scanIntervalMinutes = parseInt(process.env.SCAN_INTERVAL || '15', 10);
    this.activeUniverse = process.env.DEFAULT_UNIVERSE || 'SP100';
    this.normalThresholdPercent = parseFloat(process.env.NORMAL_THRESHOLD || '3');
    this.strongThresholdPercent = parseFloat(process.env.STRONG_THRESHOLD || '5');
    
    // Cache and state by universe
    this.lastScanTimeByUniverse = {};
    this.cachedAlertsByUniverse = {};
    this.highPrioritySymbols = new Set();
    this.minForceScanGapMinutes = parseInt(process.env.MIN_FORCE_SCAN_GAP || '3', 10);
    this.scanUniverseIndex = 0;
  }

  /**
   * Start automatic scanning with staggered universe rotation
   */
  start() {
    console.log(`🚀 Starting market scanner (every ${this.scanIntervalMinutes} minutes)`);
    
    const universes = (process.env.SCAN_UNIVERSES || this.activeUniverse).split(',').map(u => u.trim());
    console.log(`📋 Scanning universes: ${universes.join(', ')}`);
    
    // Initial scan of active universe
    this.performScanForUniverse(this.activeUniverse);
    
    // Schedule periodic scans with round-robin
    this.scanInterval = setInterval(() => {
      const universeId = universes[this.scanUniverseIndex % universes.length];
      this.scanUniverseIndex++;
      this.performScanForUniverse(universeId);
    }, this.scanIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop scanning
   */
  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('⏸️  Market scanner stopped');
    }
  }

  /**
   * Perform scan for a specific universe
   */
  async performScanForUniverse(universeId) {
    try {
      const status = getMarketStatus();
      
      if (!status.isOpen) {
        console.log(`💤 Market closed - skipping scan for ${universeId} (${status.currentTime})`);
        return {
          alerts: this.cachedAlertsByUniverse[universeId] || [],
          lastScan: this.lastScanTimeByUniverse[universeId] || null,
          marketStatus: status,
          skipped: true,
          universeId
        };
      }

      console.log(`📊 Performing market scan for universe ${universeId}...`);
      
      const alerts = await getSignificantChanges({
        universeId,
        normalThresholdPercent: this.normalThresholdPercent,
        strongThresholdPercent: this.strongThresholdPercent
      });
      
      const nowIso = new Date().toISOString();
      this.lastScanTimeByUniverse[universeId] = nowIso;
      this.cachedAlertsByUniverse[universeId] = alerts.map(alert => ({
        ...alert,
        universeId
      }));
      
      // Update highPrioritySymbols: symbols that exceed normal threshold
      alerts.forEach(a => {
        if (Math.abs(a.changePercent) >= this.normalThresholdPercent) {
          this.highPrioritySymbols.add(a.symbol);
        }
      });
      
      // If matches active universe, also update legacy properties
      if (universeId === this.activeUniverse) {
        this.lastScan = nowIso;
        this.latestAlerts = this.cachedAlertsByUniverse[universeId];
      }
      
      // Notify subscribers
      this.notifySubscribers(alerts);
      
      return {
        alerts: this.cachedAlertsByUniverse[universeId],
        lastScan: nowIso,
        marketStatus: status,
        count: alerts.length,
        universeId
      };
    } catch (error) {
      console.error(`Error in scanner for universe ${universeId}:`, error);
      return {
        alerts: this.cachedAlertsByUniverse[universeId] || [],
        lastScan: this.lastScanTimeByUniverse[universeId] || null,
        error: error.message,
        universeId
      };
    }
  }

  /**
   * Perform a single scan (legacy wrapper for compatibility)
   */
  async performScan() {
    return await this.performScanForUniverse(this.activeUniverse);
  }

  /**
   * Get cached alerts for a universe with staleness info
   */
  getCachedAlerts(universeId) {
    const alerts = this.cachedAlertsByUniverse[universeId] || [];
    const lastScanTime = this.lastScanTimeByUniverse[universeId] || null;
    
    if (!lastScanTime) {
      return {
        alerts: [],
        lastScan: null,
        stale: true,
        ageMinutes: null
      };
    }
    
    const ageMs = Date.now() - new Date(lastScanTime).getTime();
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const stale = ageMinutes >= this.minForceScanGapMinutes;
    
    return {
      alerts,
      lastScan: lastScanTime,
      stale,
      ageMinutes
    };
  }

  /**
   * Subscribe to scan updates
   */
  subscribe(callback) {
    this.subscribers.push(callback);
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(alerts) {
    this.subscribers.forEach(callback => {
      try {
        callback(alerts);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  /**
   * Get latest alerts (legacy method)
   */
  getLatestAlerts() {
    return {
      alerts: this.latestAlerts,
      lastScan: this.lastScan,
      marketStatus: getMarketStatus()
    };
  }

  /**
   * Force a scan now
   */
  async forceScan() {
    return await this.performScanForUniverse(this.activeUniverse);
  }

  /**
   * Set active universe
   */
  setUniverse(universeId) {
    this.activeUniverse = universeId;
    console.log(`🔄 Active universe changed to: ${universeId}`);
  }

  /**
   * Scan high priority symbols (future enhancement - skeleton)
   */
  async scanHighPriority() {
    if (!this.highPrioritySymbols.size) {
      return { alerts: [], message: 'No high priority symbols' };
    }
    
    const symbols = Array.from(this.highPrioritySymbols).slice(0, 20);
    // TODO: Implement lightweight scan for specific symbols
    // This would require a new method in finnhub.js that accepts symbol list
    console.log(`🔍 High priority symbols: ${symbols.join(', ')}`);
    return { alerts: [], symbols };
  }
}

// Singleton instance
const scanner = new MarketScanner();

export default scanner;