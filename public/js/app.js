// Trading Alerts App - Frontend Logic (Updated)
const API_BASE = window.location.origin;
let alertsData = [];
let currentFilter = 'all';
let autoRefreshInterval = null;

// Settings with defaults
let settings = {
  threshold: 3,
  autoRefresh: 30,
  soundEnabled: true,
  notificationsEnabled: false,
  darkMode: true,
  maxAlerts: 50
};

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Trading Alerts App initialized');
  loadSettings();
  setupEventListeners();
  fetchAlerts();
  fetchMarketStatus();
  startAutoRefresh();
  requestNotificationPermission();
});

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('tradingAlertsSettings');
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
    applySettings();
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('tradingAlertsSettings', JSON.stringify(settings));
}

// Apply settings to UI
function applySettings() {
  document.getElementById('thresholdSelect').value = settings.threshold;
  document.getElementById('autoRefresh').value = settings.autoRefresh;
  document.getElementById('soundToggle').checked = settings.soundEnabled;
  document.getElementById('notificationsToggle').checked = settings.notificationsEnabled;
  document.getElementById('darkModeToggle').checked = settings.darkMode;
  document.getElementById('maxAlerts').value = settings.maxAlerts;
  
  // Apply dark mode
  if (!settings.darkMode) {
    document.body.classList.add('light-mode');
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Filter tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.dataset.filter;
      renderAlerts(alertsData);
    });
  });
  
  // Threshold change
  document.getElementById('thresholdSelect').addEventListener('change', (e) => {
    settings.threshold = parseFloat(e.target.value);
    saveSettings();
    fetchAlerts();
  });
  
  // Sort change
  document.getElementById('sortSelect').addEventListener('change', () => {
    renderAlerts(alertsData);
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    fetchAlerts(true);
  });
  
  // Settings modal
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  });
  
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });
  
  // Settings changes
  document.getElementById('autoRefresh').addEventListener('change', (e) => {
    settings.autoRefresh = parseInt(e.target.value);
    saveSettings();
    startAutoRefresh();
  });
  
  document.getElementById('soundToggle').addEventListener('change', (e) => {
    settings.soundEnabled = e.target.checked;
    saveSettings();
  });
  
  document.getElementById('notificationsToggle').addEventListener('change', (e) => {
    settings.notificationsEnabled = e.target.checked;
    saveSettings();
    if (e.target.checked) {
      requestNotificationPermission();
    }
  });
  
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    settings.darkMode = e.target.checked;
    saveSettings();
    document.body.classList.toggle('light-mode', !e.target.checked);
  });
  
  document.getElementById('maxAlerts').addEventListener('change', (e) => {
    settings.maxAlerts = parseInt(e.target.value);
    saveSettings();
    renderAlerts(alertsData);
  });
  
  // Chat modal
  document.getElementById('chatToggle').addEventListener('click', () => {
    document.getElementById('chatModal').classList.remove('hidden');
  });
  
  document.getElementById('closeChat').addEventListener('click', () => {
    document.getElementById('chatModal').classList.add('hidden');
  });
  
  document.getElementById('sendBtn').addEventListener('click', () => {
    sendChatMessage();
  });
  
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Modal backdrop clicks
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.add('hidden');
    });
  });
}

// Fetch alerts from API
async function fetchAlerts(showSpinner = false) {
  try {
    if (showSpinner) {
      const fab = document.getElementById('refreshBtn');
      fab.classList.add('spinning');
    }
    
    const response = await fetch(`${API_BASE}/api/alerts?threshold=${settings.threshold}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    alertsData = data.alerts || [];
    
    updateStats(alertsData);
    renderAlerts(alertsData);
    updateLastUpdate();
    
    // Notify if new alerts
    if (settings.soundEnabled && alertsData.length > 0) {
      playNotificationSound();
    }
    
    if (settings.notificationsEnabled && alertsData.length > 0) {
      showBrowserNotification(alertsData[0]);
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    showError('Error al cargar alertas. Por favor verifica tu conexión.');
  } finally {
    if (showSpinner) {
      setTimeout(() => {
        document.getElementById('refreshBtn').classList.remove('spinning');
      }, 500);
    }
  }
}

// Fetch market status
async function fetchMarketStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/alerts/status`);
    if (!response.ok) return;
    
    const status = await response.json();
    updateMarketStatus(status);
  } catch (error) {
    console.error('Error fetching market status:', error);
  }
}

// Update market status badge
function updateMarketStatus(status) {
  const badge = document.getElementById('marketStatus');
  const text = document.getElementById('statusText');
  
  if (status.isOpen) {
    badge.classList.add('open');
    text.textContent = 'Mercado Abierto';
  } else {
    badge.classList.remove('open');
    text.textContent = 'Mercado Cerrado';
  }
}

// Render alerts list
function renderAlerts(alerts) {
  const container = document.getElementById('alertsList');
  const sortBy = document.getElementById('sortSelect').value;
  
  // Filter alerts
  let filtered = alerts;
  if (currentFilter === 'up') {
    filtered = alerts.filter(a => a.changePercent > 0);
  } else if (currentFilter === 'down') {
    filtered = alerts.filter(a => a.changePercent < 0);
  }
  
  // Update badges
  updateStats(alerts);
  
  if (filtered.length === 0) {
    document.getElementById('emptyState').classList.remove('hidden');
    container.innerHTML = '';
    return;
  }
  
  document.getElementById('emptyState').classList.add('hidden');
  
  // Sort alerts
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'change') return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    if (sortBy === 'volume') return (b.volumeRatio || 0) - (a.volumeRatio || 0);
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  container.innerHTML = sorted.slice(0, settings.maxAlerts).map(alert => `
    <div class="alert-card ${alert.changePercent > 0 ? 'positive' : 'negative'}" data-symbol="${alert.symbol}">
      <div class="alert-header">
        <div>
          <h3 class="alert-symbol">${alert.symbol}</h3>
          <p class="alert-name">${alert.name || 'Stock'}</p>
        </div>
        <div class="alert-change ${alert.changePercent > 0 ? 'positive' : 'negative'}">
          ${alert.changePercent > 0 ? '+' : ''}${alert.changePercent.toFixed(2)}%
        </div>
      </div>
      <div class="alert-details">
        <div class="alert-detail">
          <span class="label">Precio</span>
          <span class="value">$${alert.price.toFixed(2)}</span>
        </div>
        <div class="alert-detail">
          <span class="label">Cambio</span>
          <span class="value ${alert.change > 0 ? 'positive' : 'negative'}">
            ${alert.change > 0 ? '+' : ''}$${Math.abs(alert.change).toFixed(2)}
          </span>
        </div>
        <div class="alert-detail">
          <span class="label">Volumen</span>
          <span class="value">${formatVolume(alert.volume)}</span>
        </div>
        <div class="alert-detail">
          <span class="label">Vol. Ratio</span>
          <span class="value">${(alert.volumeRatio || 0).toFixed(1)}x</span>
        </div>
      </div>
      <button class="alert-action" onclick="askAboutStock('${alert.symbol}')">
        Analizar con AI
      </button>
    </div>
  `).join('');
}

// Update statistics
function updateStats(alerts) {
  const all = alerts.length;
  const gainers = alerts.filter(a => a.changePercent > 0).length;
  const losers = alerts.filter(a => a.changePercent < 0).length;
  
  document.getElementById('badgeAll').textContent = all;
  document.getElementById('badgeUp').textContent = gainers;
  document.getElementById('badgeDown').textContent = losers;
}

// Update last update timestamp
function updateLastUpdate() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('lastUpdate').textContent = timeString;
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  addChatMessage(message, 'user');
  input.value = '';
  input.style.height = 'auto';
  
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: alertsData.slice(0, 5)
      })
    });
    
    if (!response.ok) {
      throw new Error('AI service unavailable');
    }
    
    const data = await response.json();
    addChatMessage(data.response, 'ai');
  } catch (error) {
    console.error('Error sending message:', error);
    addChatMessage('Lo siento, hubo un error. Por favor intenta de nuevo.', 'ai');
  } finally {
    sendBtn.disabled = false;
  }
}

// Add message to chat
function addChatMessage(text, type) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  div.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Ask AI about specific stock
window.askAboutStock = function(symbol) {
  document.getElementById('chatModal').classList.remove('hidden');
  const input = document.getElementById('chatInput');
  input.value = `¿Qué puedes decirme sobre ${symbol}? ¿Qué está causando este movimiento?`;
  input.focus();
};

// Auto-refresh functionality
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  
  autoRefreshInterval = setInterval(() => {
    fetchAlerts();
    fetchMarketStatus();
  }, settings.autoRefresh * 1000);
}

// Show error message
function showError(message) {
  const container = document.getElementById('alertsList');
  container.innerHTML = `
    <div class="empty-state">
      <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <h3>Error</h3>
      <p>${message}</p>
    </div>
  `;
}

// Play notification sound
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Audio not supported');
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }
  
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// Show browser notification
function showBrowserNotification(alert) {
  if (!settings.notificationsEnabled) return;
  if (Notification.permission !== 'granted') return;
  
  const title = `${alert.symbol} ${alert.changePercent > 0 ? '📈' : '📉'} ${alert.changePercent.toFixed(2)}%`;
  const options = {
    body: `Precio: $${alert.price.toFixed(2)} | Volumen: ${(alert.volumeRatio || 0).toFixed(1)}x`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: alert.symbol,
    requireInteraction: false
  };
  
  const notification = new Notification(title, options);
  
  notification.onclick = function() {
    window.focus();
    this.close();
  };
}

// Utility functions
function formatVolume(vol) {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
  return vol.toString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

