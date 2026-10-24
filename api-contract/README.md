# Fair Price Index: API contract

This folder is everything the backend needs to match the front end. The front end already runs
against mock data with exactly these shapes, so if your responses match these files, switching
over takes no front-end changes.

```
api-contract/
├── README.md                 this file
├── endpoints/
│   ├── _index.json           list of all endpoints
│   ├── 01-get-meta.json      one file per endpoint: request, response, errors, rules
│   ├── …
│   ├── 10-ngo-export.sample.csv
│   └── 15-get-health.json
└── seed/                     data to load into the database (same files the front end mocks with)
```

## Endpoints

| # | Method | Path | Auth | Priority | Used by |
|---|---|---|---|---|---|
| 01 | GET | `/api/meta` | none | core | App start (all dropdowns) |
| 02 | GET | `/api/prices?city=&material=&grade=` | none | core | Home, Price Board |
| 03 | POST | `/api/reports` | optional | core | Report an Offer |
| 04 | GET | `/api/areas/gaps?city=` | none | core | Area Map |
| 05 | GET | `/api/impact/summary?city=` | none | core | Impact Dashboard, Home |
| 06 | GET | `/api/impact/trend?city=&months=` | none | core | Impact Dashboard |
| 07 | GET | `/api/assumptions` | none | core | Impact Dashboard, Methodology |
| 08 | GET | `/api/sources` | none | core | Methodology |
| 09 | GET | `/api/ngo/summary?city=&from=&to=` | NGO role | core | NGO View |
| 10 | GET | `/api/ngo/export?city=&from=&to=&format=csv` | NGO role | core | NGO View export |
| 11 | POST | `/api/auth/register` | none | core | Register |
| 12 | POST | `/api/auth/login` | none | core | Login |
| 13 | GET | `/api/auth/me` | token | core | Session restore, NGO guard |
| 14 | PATCH | `/api/reports/:id/verify` | NGO role | stretch | Not in the UI yet |
| 15 | GET | `/api/health` | none | nice to have | Deploy check |

Each endpoint file has these keys: `method`, `path`, `auth`, `purpose`, `usedBy`, `query` or
`requestBody`, `validation`, `notes`/`formulas` (business rules), `response` (status + body) and
`errors`.

## Conventions

- **JSON** in and out, UTF-8. Field names are camelCase. Dates are `YYYY-MM-DD`; timestamps are ISO 8601.
- **Money** is INR per kg as a number (`18`, `20.5`). Weights are kg.
- **IDs** are strings: cities `pune`, areas `pune-hadapsar`, materials `pet`, grades `A`/`B`/`C`.
- **Query filters**: a missing value or `all` means "no filter".
- **Auth**: `Authorization: Bearer <token>`. Login and register return `{ user, token }`. Never
  return password fields.
- **CORS**: allow `http://localhost:5173` during development (or use the Vite proxy noted in the
  front-end README).
- **Errors**: always JSON in this shape. The front end shows `message` to the user, so write it
  as a sentence a shop owner understands.

```json
{ "message": "Quantity must be between 0.1 and 5000 kg.", "code": "VALIDATION_ERROR", "fields": { "quantityKg": "Quantity must be between 0.1 and 5000 kg." } }
```

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `UNKNOWN_CITY`, `INVALID_INVITE` | Bad input |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | Missing/expired token, wrong password. The front end logs out on 401. |
| 403 | `FORBIDDEN` | Logged in but not an NGO |
| 404 | `NOT_FOUND` | Unknown id |
| 409 | `EMAIL_TAKEN` | Register with an existing email |
| 429 | `RATE_LIMITED` | Too many reports |

## Rules that must live on the server

1. **Privacy threshold (k = 5).** Any aggregate for an area must hide its figures until it has at
   least 5 reports. Return the area with `visible: false` and `null` figures. Do not leave the
   threshold to the front end.
2. **Reports are anonymous.** Never store a user id, name or phone on a report. A shop token adds
   only `partnerId`. No endpoint returns individual reports.
3. **Outliers.** `offeredPrice` below 0.2× or above 3× the median gets `flagged: true`. Store it,
   but keep it out of aggregates until it's verified.
4. **Gap formula.** `gapPct = round((median - offeredPrice) / median * 100)`. The prevailing
   median for aggregates uses grade B.
5. **Rate limit** `POST /api/reports`, for example 10 per IP per hour.
6. **Passwords** hashed with bcrypt or argon2.

## Suggested tables

| Table | Key fields |
|---|---|
| `cities` | id, name, state, center_lat, center_lng |
| `areas` | id, city_id, name, lat, lng |
| `materials` | id, name, category, low_value, unit |
| `grades` | id, label, description |
| `sources` | id, type, name, city_id (nullable), as_of |
| `price_ranges` | id, city_id, material_id, grade, min, max, median, source_id, as_of, sample_size, is_sample |
| `reports` | id, city_id, area_id, material_id, grade, quantity_kg, offered_price, buyer_type, offered_on, created_at, flagged, partner_id, verified_by, verified_at, is_sample |
| `users` | id, role (shop/ngo), email, password_hash, name, city_id, area_id, partner_id |
| `invite_codes` | code, partner_id, city_id, active |
| `emission_factors` | material_id, kg_co2e_per_kg, source, status |

Endpoints 04, 05, 06 and 09 are aggregates over `reports`. Build them as SQL views or query
functions so the threshold is applied in one place.

## Seed data (`seed/`)

- `cities`, `areas`, `materials`, `grades`, `sources`, `prices`, `assumptions` load straight into
  their tables. `prices.json` has 90 ranges: 3 cities × 10 materials × 3 grades.
- `reports.json` is a sample of individual reports. `areaAggregates.json` and `impact.json` are
  the aggregate figures the demo shows. Until you have enough real reports, you can serve
  endpoints 04–06 and 09 from these two files so the numbers match the mock exactly.
- `users.json` has the demo NGO account (`ngo.demo@example.com` / `demo1234`) with a
  **plaintext** password, plus shop invite codes. Hash the password when you seed it.
- Everything is sample data (`isSample: true`). Source names are placeholders, prices are
  illustrative, and emission factors are marked `placeholder` until they're cited.

## Testing against the front end

1. Run the backend on `http://localhost:4000`.
2. In `frontend/`, follow "Connecting the backend" in its README: uncomment the `BACKEND:` lines
   and set `VITE_USE_MOCK=false`.
3. Every screen should look the same as in mock mode. If one differs, compare your response with
   the matching file in `endpoints/`.
