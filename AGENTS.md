# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Single-service Node.js (ES Modules) trading alerts app. Express backend serves a vanilla HTML/CSS/JS frontend from `public/`. No database, no Docker, no build step.

### Running the app

- **Dev mode**: `npm run dev` (uses nodemon for hot-reload)
- **Production mode**: `npm start`
- Server listens on `PORT` (default 3000)
- Frontend at `http://localhost:3000`

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `FINNHUB_KEY` | Finnhub API for stock data (core scanner feature) |
| `GROQ_API_KEY` | Groq AI for chat and daily insights (optional but recommended) |

Both must be injected as environment secrets. The `.env` file only needs `PORT`, `NODE_ENV`, and app-config values; API keys come from the environment and `dotenv.config()` does not override existing env vars.

### Lint / Test / Build

- `npm run lint` — ESLint (flat config v9). 0 errors expected; minor warnings for unused frontend vars are OK.
- `npm run lint:fix` — auto-fix lint issues.
- `npm test` — Vitest (25 tests). Integration tests require the dev server running on port 3000.
- `npm run test:watch` — Vitest in watch mode.
- No build step required (vanilla frontend served as static files).

### Key gotchas

- The stock scanner only runs during NYSE market hours (Mon-Fri 9:30 AM - 4:00 PM ET). Outside those hours, scan endpoints return empty results with market closed status — this is expected, not a bug.
- The `.env.example` lists `FINNHUB_KEY`; without it, the scanner throws on startup.
- `package.json` uses `"type": "module"` — all imports must use ESM syntax.
- Integration tests (`tests/server.test.js`) expect the dev server to already be running on port 3000. Start it first with `npm run dev`.
- Security middleware is enabled: `helmet` for headers, `express-rate-limit` at 20 req/min for AI and 120 req/min general.
- Graceful shutdown is handled on SIGTERM/SIGINT — the scanner stops and the server closes cleanly.
