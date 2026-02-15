# TRADING ALERTS APP - COMPLETE SPECIFICATION (ENGLISH)

## OBJECTIVE
Build a mobile-first web app for intraday trading alerts targeting US stocks
(NYSE/NASDAQ only).

## TECH STACK
Frontend: HTML/CSS/JS Vanilla (no frameworks)  
Backend: Node.js 18+ + Express  
APIs: Yahoo Finance (free) + Groq AI (free)  
Deploy: Vercel (frontend) + Railway (backend)

## FILE STRUCTURE
/frontend
  |- index.html
  |- /css/styles.css
  |- /js/app.js, alerts.js, chat.js, config.js, notifications.js
/backend
  |- server.js
  |- /routes/alerts.js, chat.js, symbols.js
  |- /services/yahooFinance.js, groqAI.js, scanner.js
  |- /data/top100.json
  |- /utils/helpers.js

## 1. MARKET SCANNING (US MARKET ONLY)

Scan Top 100 US stocks every 3min during NYSE/NASDAQ hours (9:30-16:00 ET).

Detection criteria:
- Intraday change >= 3% vs open price
- Volume ratio >= 1.5x vs 20-day average
- Price >= $5 (no penny stocks)

Alert structure:
{
  id: string,
  symbol: string,           // "AAPL"
  price: number,            // current
  open: number,
  previousClose: number,
  changePercent: number,    // +4.2
  volumeRatio: number,      // 2.1
  direction: "UP"|"DOWN",
  timestamp: ISO string
}

Endpoints:
/api/alerts -> { alerts: Alert[], lastScan: string }
/api/alerts/status -> market status
POST /api/alerts/refresh -> manual scan

## 2. FRONTEND - REVOLUT/YAHOO STYLE

Design system (MANDATORY):
--bg: #0f172a
--surface: #1e293b
--primary: #3b82f6
--success: #10b981 (UP)
--danger: #ef4444 (DOWN)
--radius: 12px

Components:
HEADER: Logo + Status + Config/Chat buttons (Heroicons only)
FILTER TABS: All/UP/DOWN with badges
ALERT CARDS: Symbol large + % change colored + price + time + volume badge
FAB: Refresh button (bottom-right)
EMPTY STATE: Clean illustration + text
CONFIG MODAL: Sliders, toggles, localStorage
CHAT PANEL: Slide-in, multi-mode selector, quick questions

Icons: Heroicons ONLY (settings, chat, refresh, close). NO emoji, NO WhatsApp.

Mobile-first responsive grid.

## 3. AI CHAT - INTELLIGENT MULTI-MODE

Backend (/services/groqAI.js):
Model: llama-3.3-70b-versatile
Rate limit: 5/min, 50/day per IP

**SMART MODE DETECTION** (SINGLE response combining perspectives):
- Technical analysis questions -> Analyst mode
- Strategy/risk -> Advisor mode
- Concepts -> Educator mode
- Mixed -> Combine 2-3 perspectives
- ALWAYS respond in user's query language
- MAX 250 words, precise/clear

System prompt:
"You are a multi-mode trading assistant. Analyze the question and respond
from the most relevant perspective(s): technical analyst, financial advisor,
or educator. Structure: Key insights -> Analysis -> Actionable info.
Concise (250 words max). Respond in query language.
ALWAYS disclaimer: 'Not financial advice.'"

POST /api/chat -> { answer: string }

Frontend: Slide panel, mode selector (visual only), quick questions.

## 4. SYMBOLS - YAHOO FINANCE API (AUTO-UPDATE)

Fetch US symbols from Yahoo Finance:
1. Primary: Yahoo Finance S&P 500 components API
2. Fallback: Yahoo top volume stocks
3. Cache: weekly update to /data/symbols.json

Auto-maintain list (no Wikipedia scraping).

## 5. NOTIFICATIONS
Browser Notifications API:
- Request permission in config
- Notify new alerts (throttle 2min)
- Click -> focus app + scroll to alert
- Title: "[SYMBOL] +X.X%"
- Badge: bell icon (only badge icon allowed)

## 6. CONFIGURATION
localStorage persistence:
- Change threshold: 1-10% (slider)
- Volume ratio: 1-5x (slider)
- Scan interval: 1/3/5 min (dropdown)
- Min price: $1-100 (input)
- Notifications toggle

## 7. TESTING PROTOCOL (MANDATORY)
After each module:
BACKEND: npm i && npm start && curl /api/alerts
FRONTEND: Open index.html, check console, test interactions
INTEGRATION: Frontend -> Backend API calls succeed
AI: Mock response + real test (with key)

Fix any errors BEFORE proceeding.

## SUCCESS CRITERIA
- Backend: npm start OK, APIs respond 200
- Frontend: Mobile responsive (375px+), no console errors
- Design: Revolut clean professional (no emoji icons)
- AI: Intelligent multi-mode detection, <5s response
- Symbols: Auto-fetch from Yahoo Finance
- Config: Persists in localStorage
- Notifications: Request + show correctly

## DEPLOY READY
- .env.example
- README.md (install, setup, deploy)
- vercel.json (frontend)
- Railway setup instructions

BUILD AUTONOMOUSLY. Test iteratively. Fix errors before advancing.

## REPO (SINGLE REPO / MONOREPO)

This project is a single Git repository with two folders:
- /frontend (static HTML/CSS/JS)
- /backend (Node.js Express API)

### Root files required
- .gitignore (must ignore node_modules, .env, logs, .vercel)
- .env.example (no real keys)
- README.md (setup + run + deploy)
- vercel.json (optional, only if needed for rewrites/proxy)
- (Optional) .vercelignore if we want to exclude backend from Vercel builds

### Git rules
- NEVER commit .env files
- The repo must run locally with:
  - Backend: cd backend && npm i && npm run dev
  - Frontend: open frontend/index.html (or serve with a simple static server)
