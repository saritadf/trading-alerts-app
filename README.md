# 📊 Trading Alerts App - Papa's Edition

Mobile-first web application for real-time US stock trading alerts with AI analysis.

## 🎯 Features

- Real-time market scanning (Top 100 US stocks)
- Automatic alerts for significant price movements (≥3% default)
- Volume ratio filtering (≥1.5x average)
- Penny stock filtering (≥$5 minimum)
- Market hours detection (NYSE: 9:30 AM - 4:00 PM ET)
- AI-powered analysis with Groq (llama-3.3-70b-versatile)
- Browser notifications
- Mobile-first Revolut-style design
- Auto-refresh every 3 minutes during market hours

## 🛠️ Tech Stack

Frontend:
- HTML/CSS/JavaScript (Vanilla, no frameworks)
- Heroicons for iconography
- Mobile-first responsive design

Backend:
- Node.js 18+
- Express
- Yahoo Finance API (free)
- Groq AI SDK (free tier)

## 📦 Installation

Prerequisites:
- Node.js 18 or higher
- npm or yarn
- Groq API Key (Get it free at https://console.groq.com)

Setup:

1. Clone the repository:
git clone https://github.com/saritadf/trading-alerts-app.git
cd trading-alerts-app

2. Install dependencies:
npm install

3. Configure environment variables:
cp .env.example .env

Edit .env and add your Groq API key:
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
DEFAULT_THRESHOLD=3
MIN_PRICE=5
VOLUME_RATIO=1.5
SCAN_INTERVAL=3

4. Start the server:
Development: npm run dev
Production: npm start

5. Open in browser:
http://localhost:3000

## 🚀 Deployment

Railway (Recommended - Single Server):
1. Push code to GitHub
2. Go to Railway.app
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables in Railway dashboard
6. Deploy!

Your app URL: https://your-app.up.railway.app

Vercel (Frontend) + Railway (Backend):

Backend on Railway:
1. Deploy as above
2. Copy your Railway URL

Frontend on Vercel:
1. Update vercel.json with your Railway URL
2. Deploy: npm i -g vercel, vercel login, vercel --prod

## 📡 API Endpoints

GET /api/alerts
Query params: ?threshold=3
Returns: List of significant stock alerts

Response example:
{
  "alerts": [{
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 175.50,
    "changePercent": 4.2,
    "volumeRatio": 2.1,
    "direction": "UP",
    "timestamp": "2026-02-17T12:00:00.000Z"
  }],
  "lastScan": "2026-02-17T12:00:00.000Z",
  "marketStatus": {
    "isOpen": true,
    "message": "Market is OPEN"
  }
}

GET /api/alerts/status
Returns: Market status and scanner info

POST /api/alerts/refresh
Triggers manual scan
Returns: Fresh alerts data

POST /api/ai/chat
Body: { "message": "¿Qué está pasando con AAPL?", "context": [...] }
Returns: AI response with multi-mode analysis

## ⚙️ Configuration

Environment Variables:

PORT = 3000 (Server port)
GROQ_API_KEY = required (Your Groq API key)
DEFAULT_THRESHOLD = 3 (Default % change threshold)
MIN_PRICE = 5 (Minimum stock price - filter penny stocks)
VOLUME_RATIO = 1.5 (Minimum volume ratio vs avg)
SCAN_INTERVAL = 3 (Minutes between scans)

Frontend Settings (user-configurable via Settings modal):
- Auto-refresh interval (10-300 seconds)
- Maximum alerts displayed (10-100)
- Sound notifications (on/off)
- Browser notifications (on/off)
- Dark/Light mode

## 🎨 Design System

Following Revolut/Yahoo Finance style:

Colors:
--bg: #0f172a (Background)
--surface: #1e293b (Cards/Modals)
--primary: #3b82f6 (Blue accent)
--success: #10b981 (Green - up)
--danger: #ef4444 (Red - down)
--radius: 12px (Border radius)

Icons: Heroicons (no emojis)

## 🤖 AI Modes

The AI automatically detects query intent and responds from relevant perspectives:
- Technical Analyst: Charts, indicators, patterns
- Financial Advisor: Strategy, risk, recommendations
- Educator: Concepts, definitions, learning

Response format:
- Maximum 250 words
- Multi-perspective when relevant
- Always includes disclaimer

## 📱 PWA Support

Add to home screen for app-like experience:
- Manifest included
- Theme color configured
- Icons provided (192x192, 512x512)

## 🔔 Notifications

Sound Notifications:
- Plays on new alerts
- Can be disabled in settings

Browser Notifications:
- Requires permission grant
- Shows alert title and key metrics
- Click to focus app

## 🧪 Testing

Test backend:
curl http://localhost:3000/api/alerts

Test market status:
curl http://localhost:3000/api/alerts/status

Test health check:
curl http://localhost:3000/health

## 🐛 Troubleshooting

Alerts not showing:
- Check if market is open (9:30 AM - 4:00 PM ET, Mon-Fri)
- Lower threshold in settings
- Check console for errors

AI not responding:
- Verify GROQ_API_KEY in .env
- Check API rate limits (free tier: 30 requests/min)
- Review server logs

Scanner not working:
- Ensure server was restarted after .env changes
- Check Yahoo Finance API availability
- Verify network connection

## 📚 Project Structure

trading-alerts-app/
├── public/ (Frontend static files)
│   ├── css/
│   │   └── styles.css (Revolut-style design)
│   ├── js/
│   │   ├── app.js (Main frontend logic)
│   │   └── notifications.js
│   ├── index.html (Main HTML with Heroicons)
│   └── manifest.json (PWA manifest)
├── src/ (Backend source)
│   ├── routes/
│   │   ├── alerts.js (Alert endpoints)
│   │   └── ai.js (AI chat endpoints)
│   └── services/
│       ├── yahooFinance.js (Stock data + market hours)
│       ├── scanner.js (Auto-scanner - 3 min intervals)
│       └── aiService.js (Groq AI integration)
├── server.js (Express server + scanner init)
├── package.json
├── .env.example
├── .gitignore
└── README.md

## 🔐 Security Notes

- Never commit .env file
- API keys should be stored securely
- Use environment variables in production
- Enable CORS only for trusted domains in production

## 📈 Performance

- Scans 100 stocks every 3 minutes (during market hours only)
- Caches volume data
- Filters early (price, volume, change %)
- Lazy loads alerts
- Debounced UI updates

## 🌍 Time Zones

- All times displayed in user's local timezone
- Market hours tracked in ET (Eastern Time)
- Automatic daylight saving adjustment

## 🤝 Contributing

This is a personal project for family use. Feel free to fork and adapt for your needs.

## 📄 License

MIT

## 👨‍👦 Credits

Built with ❤️ for Papa

Technologies:
- Yahoo Finance API: https://github.com/gadicc/node-yahoo-finance2
- Groq AI: https://groq.com
- Heroicons: https://heroicons.com

---

Need help? Check the troubleshooting section or open an issue.

¡Buena suerte con tus inversiones, Papá! 📊📈
