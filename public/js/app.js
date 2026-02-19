// Trading Alerts App - Frontend Logic (Updated)
const API_BASE = window.location.origin;
let alertsData = [];
let currentFilter = 'all';
let autoRefreshInterval = null;
let currentInsight = null;
let currentUniverse = 'SP100';
let universesData = [];
let lastScanTime = null;

// Settings with defaults
let settings = {
  threshold: 3, // 3% default
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
  fetchUniverses();
  fetchAlerts();
  fetchMarketStatus();
  startAutoRefresh();
  requestNotificationPermission();
});

// Load settings from localStorage
function loadSettings() {
  fetchDailyInsight();
  setInterval(fetchDailyInsight, 60 * 60 * 1000);
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
  const thresholdChips = document.querySelectorAll('.threshold-chip');
  thresholdChips.forEach(chip => {
    if (parseFloat(chip.dataset.threshold) === settings.threshold) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
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
  
  // Threshold chips
  document.querySelectorAll('.threshold-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.threshold-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      settings.threshold = parseFloat(e.currentTarget.dataset.threshold);
      saveSettings();
      renderAlerts(alertsData);
    });
  });
  
  // Universe selector
  document.querySelectorAll('.universe-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const universeId = e.currentTarget.dataset.universe;
      setUniverse(universeId);
    });
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
  
  // Universes config modal
  document.getElementById('universesConfigBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
    document.getElementById('universesModal').classList.remove('hidden');
    renderUniversesList();
  });
  
  document.getElementById('closeUniverses')?.addEventListener('click', () => {
    document.getElementById('universesModal').classList.add('hidden');
  });
  
  // Custom universe editor
  document.getElementById('addSymbolBtn')?.addEventListener('click', () => {
    addCustomSymbol();
  });
  
  document.getElementById('newSymbolInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSymbol();
    }
  });
  
  document.getElementById('saveCustomBtn')?.addEventListener('click', () => {
    saveCustomUniverse();
  });
  
  document.getElementById('cancelCustomBtn')?.addEventListener('click', () => {
    document.getElementById('customUniverseEditor').classList.add('hidden');
  });
}

// Fetch alerts from API
async function fetchAlerts(forceRefresh = false) {
  try {
    // Protection: don't refresh if last scan was less than 2 minutes ago
    if (forceRefresh && lastScanTime) {
      const timeSinceLastScan = (Date.now() - new Date(lastScanTime).getTime()) / 1000 / 60;
      if (timeSinceLastScan < 2) {
        showToast(`Espera un poco para no saturar la API (último scan hace ${Math.round(timeSinceLastScan)} min)`);
        return;
      }
    }
    
    if (forceRefresh) {
      const fab = document.getElementById('refreshBtn');
      fab.classList.add('spinning');
      
      // Force scan
      const response = await fetch(`${API_BASE}/api/alerts/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      alertsData = data.alerts || [];
      lastScanTime = data.lastScan;
    } else {
      const response = await fetch(`${API_BASE}/api/alerts?threshold=${settings.threshold}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      alertsData = data.alerts || [];
      lastScanTime = data.lastScan;
    }
    
    // Filter by threshold
    alertsData = alertsData.filter(a => Math.abs(a.changePercent) >= settings.threshold);
    
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
    showError('Error loading alerts. Please check your connection.');
  } finally {
    if (forceRefresh) {
      setTimeout(() => {
        document.getElementById('refreshBtn').classList.remove('spinning');
      }, 500);
    }
  }
}

// Fetch universes
async function fetchUniverses() {
  try {
    const response = await fetch(`${API_BASE}/api/universes`);
    if (!response.ok) return;
    
    universesData = await response.json();
  } catch (error) {
    console.error('Error fetching universes:', error);
  }
}

// Set active universe
async function setUniverse(universeId) {
  try {
    const response = await fetch(`${API_BASE}/api/universes/scanner/universe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universeId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to set universe');
    }
    
    currentUniverse = universeId;
    
    // Update UI
    document.querySelectorAll('.universe-pill').forEach(pill => {
      if (pill.dataset.universe === universeId) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
    
    // Update subtitle
    const universe = universesData.find(u => u.id === universeId);
    if (universe) {
      document.getElementById('universeSubtitle').textContent = 
        `Escaneando: ${universe.name} (actualizando cada 15 min – API gratuita)`;
    }
    
    // Refresh alerts
    fetchAlerts(true);
  } catch (error) {
    console.error('Error setting universe:', error);
    showToast('Error al cambiar universo');
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
    text.textContent = 'Market Open';
  } else {
    badge.classList.remove('open');
    text.textContent = 'Market Closed';
  }
}

// Render alerts list
function renderAlerts(alerts) {
  const container = document.getElementById('alertsList');
  const sortBy = document.getElementById('sortSelect').value;
  
  // Filter alerts by threshold
  let filtered = alerts.filter(a => Math.abs(a.changePercent) >= settings.threshold);
  
  // Filter by direction
  if (currentFilter === 'up') {
    filtered = filtered.filter(a => a.changePercent > 0);
  } else if (currentFilter === 'down') {
    filtered = filtered.filter(a => a.changePercent < 0);
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
  
  // Separate by severity
  const highAlerts = sorted.filter(a => a.severity === 'high');
  const normalAlerts = sorted.filter(a => a.severity === 'normal');
  
  const now = new Date();
  
  const renderAlertCard = (alert) => {
    const timestamp = alert.timestamp ? new Date(alert.timestamp) : now;
    const timeAgo = formatTimeAgo(timestamp, now);
    const isPositive = alert.changePercent > 0;
    const severityText = alert.severity === 'high' ? 'Fuerte' : 'Moderada';
    const universeName = alert.universeId === 'SP100' ? 'S&P 100' : 
                        alert.universeId === 'CUSTOM' ? 'Mis acciones' :
                        alert.universeId || 'N/A';
    
    return `
    <div class="alert-card ${isPositive ? 'positive' : 'negative'}" data-symbol="${alert.symbol}">
      <div class="alert-header">
        <div>
          <h3 class="alert-symbol">${alert.symbol}</h3>
          <p class="alert-name">${alert.name || 'Stock'} • ${timeAgo}</p>
        </div>
        <div class="alert-change ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}${alert.changePercent.toFixed(2)}% hoy
        </div>
      </div>
      <div class="alert-details">
        <div class="alert-detail">
          <span class="label">Cambio:</span>
          <span class="value ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}$${Math.abs(alert.change).toFixed(2)}
          </span>
        </div>
        <div class="alert-detail">
          <span class="label">Precio:</span>
          <span class="value">$${alert.price.toFixed(2)}</span>
        </div>
        <div class="alert-detail">
          <span class="label">Severidad:</span>
          <span class="value severity-${alert.severity}">${severityText}</span>
        </div>
        <div class="alert-detail">
          <span class="label">Universo:</span>
          <span class="value">${universeName}</span>
        </div>
      </div>
      <button class="alert-action" onclick="askAboutStock('${alert.symbol}')">
        Analizar con AI
      </button>
    </div>
    `;
  };
  
  let html = '';
  
  if (highAlerts.length > 0) {
    html += `<div class="alert-section">
      <h3 class="section-title section-high">Alertas fuertes (≥ 5%)</h3>
      <div class="alerts-grid-section">
        ${highAlerts.slice(0, settings.maxAlerts).map(renderAlertCard).join('')}
      </div>
    </div>`;
  }
  
  if (normalAlerts.length > 0) {
    html += `<div class="alert-section">
      <h3 class="section-title section-normal">Alertas moderadas (3–5%)</h3>
      <div class="alerts-grid-section">
        ${normalAlerts.slice(0, settings.maxAlerts).map(renderAlertCard).join('')}
      </div>
    </div>`;
  }
  
  container.innerHTML = html;
}

// Update statistics
function updateStats(alerts) {
  const filtered = alerts.filter(a => Math.abs(a.changePercent) >= settings.threshold);
  const all = filtered.length;
  const gainers = filtered.filter(a => a.changePercent > 0).length;
  const losers = filtered.filter(a => a.changePercent < 0).length;
  
  const strong = filtered.filter(a => a.severity === 'high').length;
  const normal = filtered.filter(a => a.severity === 'normal').length;
  
  document.getElementById('badgeAll').textContent = all;
  document.getElementById('badgeUp').textContent = gainers;
  document.getElementById('badgeDown').textContent = losers;
  document.getElementById('strongAlertsCount').textContent = strong;
  document.getElementById('normalAlertsCount').textContent = normal;
}

// Update last update timestamp
function updateLastUpdate() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const lastUpdateEl = document.getElementById('lastUpdate');
  lastUpdateEl.textContent = `Updated: ${timeString}`;
  lastUpdateEl.title = `Last updated at ${now.toLocaleString()}`;
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
    addChatMessage('Sorry, there was an error. Please try again.', 'ai');
  } finally {
    sendBtn.disabled = false;
  }
}

// Add message to chat
function addChatMessage(text, type) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  div.innerHTML = `<div class="message-content">${type === 'ai' ? formatMarkdown(text) : escapeHtml(text)}</div>`;  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Ask AI about specific stock
window.askAboutStock = function(symbol) {
  document.getElementById('chatModal').classList.remove('hidden');
  const input = document.getElementById('chatInput');
  input.value = `What can you tell me about ${symbol}? What's causing this movement?`;
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

function formatTimeAgo(timestamp, now) {
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Convert markdown-like formatting to HTML
function formatMarkdown(text) {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert line breaks (+ before bullet) to proper breaks
  html = html.replace(/\s\+\s/g, '<br>');
  
  // Convert double line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  
  // Convert single line breaks to <br>
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// Daily Insight functions
async function fetchDailyInsight() {
  try {
    const response = await fetch(`${API_BASE}/api/ai/insight`);
    if (!response.ok) return;
    const insight = await response.json();
    currentInsight = insight;
    displayInsight(insight);
  } catch (error) {
    console.error('Error fetching daily insight:', error);
  }
}

function displayInsight(insight) {
  const banner = document.getElementById('insightBanner');
  const newsText = document.getElementById('insightNewsText');
  const quoteText = document.getElementById('insightQuoteText');
  
  if (!insight) return;
  
  newsText.textContent = insight.news || 'Market analysis in progress...';
  
  if (insight.quote) {
    quoteText.textContent = insight.quote;
    quoteText.classList.remove('hidden');
  } else {
    quoteText.classList.add('hidden');
  }
  
  banner.classList.remove('hidden');
}

// Universes management
let customSymbolsTemp = [];
let currentEditingUniverse = null;
let originalSymbols = [];

async function renderUniversesList() {
  const container = document.getElementById('universesList');
  if (!container) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/universes`);
    if (!response.ok) return;
    
    const universes = await response.json();
    
    container.innerHTML = universes.map(universe => `
      <div class="universe-item">
        <div class="universe-info">
          <h4>${universe.name}</h4>
          <p>${universe.description || ''}</p>
          <span class="universe-count">${universe.symbolsCount} símbolos</span>
        </div>
        <button class="btn-secondary view-symbols-btn" data-universe-id="${universe.id}">
          Ver símbolos
        </button>
      </div>
    `).join('');
    
    // Add event listeners
    container.querySelectorAll('.view-symbols-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const universeId = e.currentTarget.dataset.universeId;
        if (universeId === 'CUSTOM') {
          await loadCustomUniverse();
        } else {
          await viewUniverseSymbols(universeId);
        }
      });
    });
  } catch (error) {
    console.error('Error rendering universes:', error);
  }
}

async function viewUniverseSymbols(universeId) {
  try {
    const response = await fetch(`${API_BASE}/api/universes/${universeId}`);
    if (!response.ok) return;
    
    const universe = await response.json();
    currentEditingUniverse = universe;
    originalSymbols = [...universe.symbols];
    
    const editor = document.getElementById('universeEditor');
    const title = document.getElementById('universeEditorTitle');
    const help = document.getElementById('universeEditorHelp');
    const textarea = document.getElementById('universeSymbolsTextarea');
    
    title.textContent = universe.name;
    help.textContent = `Edita los símbolos separados por comas. Máximo ${universe.maxSymbols} símbolos.`;
    textarea.value = universe.symbols.join(', ');
    
    editor.classList.remove('hidden');
    
    document.getElementById('saveUniverseBtn').onclick = () => saveUniverse();
    document.getElementById('cancelUniverseBtn').onclick = () => cancelUniverseEdit();
  } catch (error) {
    console.error('Error viewing universe:', error);
  }
}

async function loadCustomUniverse() {
  try {
    const response = await fetch(`${API_BASE}/api/universes/CUSTOM`);
    if (!response.ok) return;
    
    const universe = await response.json();
    customSymbolsTemp = [...universe.symbols];
    
    document.getElementById('customUniverseEditor').classList.remove('hidden');
    renderCustomSymbolsList();
  } catch (error) {
    console.error('Error loading custom universe:', error);
  }
}

function renderCustomSymbolsList() {
  const container = document.getElementById('customSymbolsList');
  if (!container) return;
  
  container.innerHTML = customSymbolsTemp.map(symbol => `
    <div class="symbol-item">
      <span>${symbol}</span>
      <button class="icon-btn-small remove-symbol" data-symbol="${symbol}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `).join('') || '<p class="empty-text">No hay símbolos añadidos</p>';
  
  container.querySelectorAll('.remove-symbol').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const symbol = e.currentTarget.dataset.symbol;
      customSymbolsTemp = customSymbolsTemp.filter(s => s !== symbol);
      renderCustomSymbolsList();
    });
  });
}

function addCustomSymbol() {
  const input = document.getElementById('newSymbolInput');
  const symbol = input.value.trim().toUpperCase();
  
  if (!symbol) return;
  
  if (customSymbolsTemp.includes(symbol)) {
    showToast('Este símbolo ya está en la lista');
    return;
  }
  
  if (customSymbolsTemp.length >= 50) {
    showToast('Máximo 50 símbolos permitidos');
    return;
  }
  
  customSymbolsTemp.push(symbol);
  input.value = '';
  renderCustomSymbolsList();
}

async function saveCustomUniverse() {
  try {
    const response = await fetch(`${API_BASE}/api/universes/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: customSymbolsTemp })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save custom universe');
    }
    
    document.getElementById('customUniverseEditor').classList.add('hidden');
    showToast('Watchlist guardada correctamente');
    
    // Refresh universes data
    await fetchUniverses();
  } catch (error) {
    console.error('Error saving custom universe:', error);
    showToast('Error al guardar watchlist');
  }
}

async function saveUniverse() {
  if (!currentEditingUniverse) return;
  
  try {
    const textarea = document.getElementById('universeSymbolsTextarea');
    const symbolsText = textarea.value.trim();
    
    const symbols = symbolsText
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);
    
    if (symbols.length > currentEditingUniverse.maxSymbols) {
      alert(`Máximo ${currentEditingUniverse.maxSymbols} símbolos permitidos`);
      return;
    }
    
    const response = await fetch(`${API_BASE}/api/universes/${currentEditingUniverse.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al guardar');
      return;
    }
    
    const result = await response.json();
    showToast('Cambios guardados correctamente');
    
    document.getElementById('universeEditor').classList.add('hidden');
    currentEditingUniverse = null;
    originalSymbols = [];
    
    await renderUniversesList();
  } catch (error) {
    console.error('Error saving universe:', error);
    alert('Error al guardar los cambios');
  }
}

function cancelUniverseEdit() {
  if (currentEditingUniverse) {
    const textarea = document.getElementById('universeSymbolsTextarea');
    textarea.value = originalSymbols.join(', ');
  }
  document.getElementById('universeEditor').classList.add('hidden');
  currentEditingUniverse = null;
  originalSymbols = [];
}

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}
