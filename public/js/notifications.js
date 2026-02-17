// Browser Notifications Handler
export class NotificationManager {
    constructor() {
      this.permission = Notification.permission;
    }
  
    async requestPermission() {
      if (!('Notification' in window)) {
        console.warn('Browser notifications not supported');
        return false;
      }
  
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }
  
      return this.permission === 'granted';
    }
  
    show(alert) {
      if (this.permission !== 'granted') return;
  
      const title = `${alert.symbol} ${alert.changePercent > 0 ? '↑' : '↓'} ${Math.abs(alert.changePercent).toFixed(2)}%`;
      const body = `$${alert.price.toFixed(2)} • Vol: ${(alert.volumeRatio || 0).toFixed(1)}x avg`;
  
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: alert.symbol,
        requireInteraction: false,
        silent: false
      });
  
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
  
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }
  