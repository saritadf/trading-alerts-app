// Trading Alerts App - Frontend Logic
const API_BASE = window.location.origin;
let alertsData = [];
let currentMode = 'technical';
let autoRefreshInterval = null;

// Settings with defaults
let settings = {
  threshold: 3,
  autoRefresh: 30,
  soundEnabled: true,
  darkMode: true,
  maxAlerts: 50
};

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Trading Alerts App initialized');
  loadSettings();
  setupEventListeners();
  fetchAlerts();
  startAutoRefresh();
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
  document.getElementById('darkModeToggle').checked = settings.darkMode;
  document.getElementById('maxAlerts').value = settings.maxAlerts;
}

// Setup all event listeners
function setupEventListeners() {
  // Filter controls
  document.getElementById('thresholdSelect').addEventListener('change', (e) => {
    settings.threshold = parseFloat(e.target.value);
    saveSettings();
    fetchAlerts();
  });

  document.getElementById('sortSelect').addEventListener('change', () => {
    renderAlerts(alertsData);
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    fetchAlerts();
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

  // Auto-resize textarea
  document.getElementById('chatInput').addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  });

  // Chat mode selection
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentMode = e.target.dataset.mode;
    });
  });

  // Settings modal
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden');
  });

  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
  });

  document.getElementById('autoRefresh').addEventListener('change', (e) => {
    settings.autoRefresh = parseInt(e.target.value);
    saveSettings();
    startAutoRefresh();
  });

  document.getElementById('soundToggle').addEventListener('change', (e) => {
    settings.soundEnabled = e.target.checked;
    saveSettings();
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
}

// Fetch alerts from API
async function fetchAlerts() {
  try {
    showLoading(true);
    const response = await fetch(`${API_BASE}/api/alerts?threshold=${settings.threshold}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    alertsData = data.alerts || [];
    
    updateStats(alertsData);
    renderAlerts(alertsData);
    updateLastUpdate();
    
    if (settings.soundEnabled && alertsData.length > 0) {
      playNotificationSound();
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    showError('Failed to fetch alerts. Please check your connection.');
  } finally {
    showLoading(false);
  }
}

// Render alerts list
function renderAlerts(alerts) {
  const container = document.getElementById('alertsList');
  const sortBy = document.getElementById('sortSelect').value;
  
  if (alerts.length === 0) {
    container.innerHTML = '<div class="no-alerts"><p>No alerts at this threshold. Try lowering it!</p></div>';
    return;
  }
  
  // Sort alerts
  const sorted = [...alerts].sort((a, b) => {
    if (sortBy === 'change') return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    if (sortBy === 'volume') return b.volume - a.volume;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  container.innerHTML = sorted.slice(0, settings.maxAlerts).map(alert => `
    <div class="alert-card ${alert.changePercent > 0 ? 'positive' : 'negative'}" data-symbol="${alert.symbol}">
      <div class="alert-header">
        <div class="alert-info">
          <h3 class="alert-symbol">${alert.symbol}</h3>
          <p class="alert-name">${alert.name || 'Stock'}</p>
        </div>
        <div class="alert-change ${alert.changePercent > 0 ? 'positive' : 'negative'}">
          ${alert.changePercent > 0 ? '+' : ''}${alert.changePercent.toFixed(2)}%
        </div>
      </div>
      <div class="alert-details">
        <div class="alert-detail">
          <span class="label">Price:</span>
          <span class="value">$${alert.price.toFixed(2)}</span>
        </div>
        <div class="alert-detail">
          <span class="label">Volume:</span>
          <span class="value">${formatVolume(alert.volume)}</span>
        </div>
        <div class="alert-detail">
          <span class="label">Change:</span>
          <span class="value ${alert.change > 0 ? 'positive' : 'negative'}">
            ${alert.change > 0 ? '+' : ''}$${alert.change.toFixed(2)}
          </span>
        </div>
        <div class="alert-detail">
          <span class="label">Time:</span>
          <span class="value">${formatTime(alert.timestamp)}</span>
        </div>
      </div>
      <button class="alert-action" onclick="askAboutStock('${alert.symbol}')">
        Ask AI about ${alert.symbol}
      </button>
    </div>
  `).join('');
}

// Update statistics
function updateStats(alerts) {
  const gainers = alerts.filter(a => a.changePercent > 0);
  const losers = alerts.filter(a => a.changePercent < 0);
  
  document.getElementById('totalAlerts').textContent = alerts.length;
  document.getElementById('gainersCount').textContent = gainers.length;
  document.getElementById('losersCount').textContent = losers.length;
}

// Update last update timestamp
function updateLastUpdate() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('lastUpdate').textContent = `Updated: ${timeString}`;
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;

  addChatMessage(message, 'user');
  input.value = '';
  input.style.height = 'auto';

  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode: currentMode,
        context: alertsData.slice(0, 10)
      })
    });
    
    if (!response.ok) {
      throw new Error('AI service unavailable');
    }
    
    const data = await response.json();
    addChatMessage(data.response, 'ai');
  } catch (error) {
    console.error('Error sending message:', error);
    addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
  }
}

// Add message to chat
function addChatMessage(text, type) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-message ${type}-message`;
  div.innerHTML = `<p>${escapeHtml(text)}</p>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Ask AI about specific stock (called from alert cards)
window.askAboutStock = function(symbol) {
  document.getElementById('chatModal').classList.remove('hidden');
  const input = document.getElementById('chatInput');
  input.value = `Tell me about ${symbol} - what's driving this movement?`;
  input.focus();
}

// Auto-refresh functionality
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  
  autoRefreshInterval = setInterval(() => {
    fetchAlerts();
  }, settings.autoRefresh * 1000);
}

// Show/hide loading state
function showLoading(show) {
  const container = document.getElementById('alertsList');
  if (show) {
    container.innerHTML = `
      <div class="loading-skeleton">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    `;
  }
}

// Show error message
function showError(message) {
  const container = document.getElementById('alertsList');
  container.innerHTML = `<div class="error-message"><p>⚠️ ${message}</p></div>`;
}

// Play notification sound
function playNotificationSound() {
  // Simple beep using Web Audio API
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

// Utility functions
function formatVolume(vol) {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
  return vol.toString();
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
