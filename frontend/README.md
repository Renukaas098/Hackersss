# Fair Price Index: front end

React + Vite app for the Fair Price Index hackathon prototype. It runs entirely on
mock data right now, so no backend is needed.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Demo NGO login: `ngo.demo@example.com` / `demo1234`
Shop invite codes: `PUNE-NGO-4821`, `KOCHI-NGO-1307`, `DELHI-NGO-5590`

## Pages

| Route | Page | Endpoints |
|---|---|---|
| `/` | Home: pitch, quick price lookup, stats | #1, #2, #5 |
| `/prices` | Price Range Board | #1, #2 |
| `/report` | Report an offer, with the thank-you view | #3 |
| `/map` | Area Map (Leaflet), with a table view | #4 |
| `/impact` | Impact Dashboard (Chart.js) | #5, #6, #7 |
| `/ngo` | NGO View and CSV export (NGO login required) | #9, #10, #13 |
| `/about` | Methodology | #7, #8 |
| `/login`, `/register` | Auth | #11, #12, #13 |

## How data loading works

```
pages  ->  src/api/index.js  ->  USE_MOCK ? src/mock/mockApi.js : request() in src/api/client.js
```

- `src/mock/*.json` holds the seed data. Use the same files to seed the database.
- `src/mock/mockApi.js` applies the same rules as the backend: the 5-report threshold, the gap
  formula, and NGO-only access. The response shapes match the API contract exactly.
- Mock state (new reports, new accounts) lives in memory and resets when the page reloads.

## Connecting the backend

Everything is marked with `BACKEND:` comments. Search for it.

1. `src/config.js`: uncomment the `API_BASE_URL` line.
2. `src/api/index.js`: uncomment `import { request, qs }`, then for each endpoint uncomment its
   `BACKEND:` line and delete the `throw notConnected(...)` under it. You can do this one endpoint
   at a time.
3. Create `.env.local` from `.env.example` with `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=...`.
4. Optional: uncomment the `/api` proxy in `vite.config.js` for local development.

The front end sends `Authorization: Bearer <token>` on `/api/ngo/*`, `/api/auth/me` and
`POST /api/reports`. The backend must require it on the first two and treat it as optional on reports.
