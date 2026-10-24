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

\
- **Live (default):**  holds  (the  base) and
  . Every request sends  and   (). Filters use PostgREST syntax via , e.g. .
-  maps the snake_case tables to the camelCase shapes in ,
  so pages did not change.
- **Mock:** set  to run with no network on the JSON in .
- **Login and register stay on the mock in both modes**: the Supabase project has no users or
  invite-code tables yet. Demo login:  / .

| Contract endpoint | Supabase source |
|---|---|
| #1 meta | , , ,  |
| #2 prices |  +  |
| #3 submit report |  (client sends  and ; validation runs in the client), then  |
| #4 area gaps | ; gap figures computed from  +  for visible areas |
| #5, #6 impact |  |
| #7 assumptions |  +  |
| #8 sources |  |
| #9, #10 NGO summary and CSV | computed from  +  |

## Backend to-dos found while connecting

- Turn on Row Level Security. Right now the public key can read every raw report, delete reports,
  and update . Allow anon only  on reference tables and  on .
- Add  and  to the  view and add an NGO summary
  view, so the front end stops reading raw reports.
- Give  and  defaults, and add check constraints matching the
  validation in .
-  is static seed data (77 reports for Pune) while  has 14 rows.
