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

### Lint / Test

No ESLint config or test framework is set up in this repo. There are no `lint` or `test` npm scripts. Testing is manual via `curl` or browser.

### Key gotchas

- The stock scanner only runs during NYSE market hours (Mon-Fri 9:30 AM - 4:00 PM ET). Outside those hours, scan endpoints return empty results with `"Market closed"` — this is expected behavior, not a bug.
- The `.env.example` does not list `FINNHUB_KEY`, but it is required by `src/services/finnhub.js`. Without it, scanner start throws an error.
- `package.json` uses `"type": "module"` — all imports must use ESM syntax.
- Universe-switching in the UI may show a brief "Error al cambiar universo" toast when the market is closed — this is a cosmetic issue, not a crash.
