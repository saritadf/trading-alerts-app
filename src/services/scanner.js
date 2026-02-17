import { getSignificantChanges, isMarketOpen, getMarketStatus } from './yahooFinance.js';

class MarketScanner {
  constructor() {
    this.scanInterval = null;
    this.lastScan = null;
    this.latestAlerts = [];
    this.subscribers = [];
    this.scanIntervalMinutes = parseInt(process.env.SCAN_INTERVAL) || 3;
  }

  /**
   * Start automatic scanning
   */
  start() {
    console.log(`🚀 Starting market scanner (every ${this.scanIntervalMinutes} minutes)`);
    
    // Initial scan
    this.performScan();
    
    // Schedule periodic scans
    this.scanInterval = setInterval(() => {
      this.performScan();
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
   * Perform a single scan
   */
  async performScan() {
    try {
      const status = getMarketStatus();
      
      if (!status.isOpen) {
        console.log(`💤 Market closed - skipping scan (${status.currentTime})`);
        return {
          alerts: [],
          lastScan: new Date().toISOString(),
          marketStatus: status,
          skipped: true
        };
      }

      console.log('📊 Performing market scan...');
      const alerts = await getSignificantChanges();
      
      this.lastScan = new Date().toISOString();
      this.latestAlerts = alerts;
      
      // Notify subscribers
      this.notifySubscribers(alerts);
      
      return {
        alerts,
        lastScan: this.lastScan,
        marketStatus: status,
        count: alerts.length
      };
    } catch (error) {
      console.error('Error in scanner:', error);
      return {
        alerts: [],
        lastScan: this.lastScan,
        error: error.message
      };
    }
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
   * Get latest alerts
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
    return await this.performScan();
  }
}

// Singleton instance
const scanner = new MarketScanner();

export default scanner;