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
pages -> src/api/index.js -> VITE_USE_MOCK=false ? src/api/supabase.js (Supabase REST) : src/mock/mockApi.js
```

- **Live (default):** `frontend/.env` holds `VITE_SUPABASE_URL` (the `/rest/v1/` base) and
  `VITE_SUPABASE_ANON_KEY`. Copy `.env.example` to create it. Every request sends `apikey` and
  `Authorization: Bearer <key>` (see `src/api/client.js`). Filters use PostgREST query parameters
  through `sbFilter()`, for example `/city_prices?city_id=eq.pune`.
- `src/api/supabase.js` maps the snake_case tables to the camelCase shapes in `api-contract/`,
  so the pages did not change.
- **Mock:** set `VITE_USE_MOCK=true` to run with no network, using the JSON in `src/mock`.
- **Login and register stay on the mock in both modes**, because the Supabase project has no users
  or invite-code tables yet. Demo login: `ngo.demo@example.com` / `demo1234`.

| Contract endpoint | Supabase source |
|---|---|
| #1 meta | `cities`, `areas`, `materials`, `grades` |
| #2 prices | `city_prices?city_id=eq.&material_id=eq.&grade=eq.` + `sources` |
| #3 submit report | `POST reports` (the client sends `id` and `created_at`, and validates), then `area_analytics?area_id=eq.` |
| #4 area gaps | `area_analytics?city_id=eq.`; gap figures computed from `reports` + `city_prices` for visible areas |
| #5, #6 impact | `city_summaries` |
| #7 assumptions | `app_settings` + `emission_factors` |
| #8 sources | `sources` |
| #9, #10 NGO summary and CSV | computed from `reports` + `city_prices` |

## Backend to-dos found while connecting

- **Turn on Row Level Security.** Right now the public key can read every raw report, delete
  reports, and update `city_prices`. Allow the anon role only `select` on reference tables and
  `insert` on `reports`.
- Add `median_gap_pct` and `worst_material_id` to the `area_analytics` view and add an NGO summary
  view, so the front end stops reading raw reports.
- Give `reports.id` and `reports.created_at` defaults, and add check constraints that match the
  validation in `api-contract/endpoints/03-post-reports.json`.
- `city_summaries` is static seed data (77 reports for Pune), while `reports` has 14 rows.

