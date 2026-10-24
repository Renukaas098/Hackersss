// One function per endpoint in api-contract/. Pages import only from here.
//
// USE_MOCK=false (frontend/.env): data comes from Supabase REST, see ./supabase.js.
// USE_MOCK=true: data comes from src/mock, same response shapes.
//
// Login and register always use the mock for now: the Supabase project has no
// users or invite_codes tables yet. See the note above the auth section.
import { USE_MOCK } from "../config";
import { mock, setToken } from "./client";
import * as sb from "./supabase";
import * as mockApi from "../mock/mockApi";

/* ---------- reference data ---------- */

// #1 GET /cities, /areas, /materials, /grades -> { cities, areas, materials, grades }
export async function getMeta() {
  if (USE_MOCK) return mock(() => mockApi.getMeta());
  return sb.getMeta();
}

// #2 GET /city_prices?city_id=eq.&material_id=eq.&grade=eq. -> { cityId, updatedAt, ranges }
export async function getPrices({ city, material, grade } = {}) {
  if (USE_MOCK) return mock(() => mockApi.getPrices({ city, material, grade }));
  return sb.getPrices({ city, material, grade });
}

// #8 GET /sources -> [{ id, type, name, cityId, asOf }]
export async function getSources() {
  if (USE_MOCK) return mock(() => mockApi.getSources());
  return sb.getSources();
}

// #7 GET /app_settings + /emission_factors -> { threshold, gapFormula, emissionFactors, ... }
export async function getAssumptions() {
  if (USE_MOCK) return mock(() => mockApi.getAssumptions());
  return sb.getAssumptions();
}

/* ---------- reports ---------- */

// #3 POST /reports -> { reportId, comparison, area, flagged }
export async function submitReport(report) {
  if (USE_MOCK) return mock(() => mockApi.submitReport(report));
  return sb.submitReport(report);
}

/* ---------- aggregates ---------- */

// #4 GET /area_analytics?city_id=eq. -> { cityId, threshold, areas }
export async function getAreaGaps({ city, material } = {}) {
  if (USE_MOCK) return mock(() => mockApi.getAreaGaps({ city, material }));
  return sb.getAreaGaps({ city });
}

// #5 GET /city_summaries?city_id=eq. -> KPI numbers
export async function getImpactSummary({ city }) {
  if (USE_MOCK) return mock(() => mockApi.getImpactSummary({ city }));
  return sb.getImpactSummary({ city });
}

// #6 GET /city_summaries -> { months, series, volumeByMaterial }
export async function getImpactTrend({ city, months = 6 }) {
  if (USE_MOCK) return mock(() => mockApi.getImpactTrend({ city, months }));
  return sb.getImpactTrend({ city, months });
}

/* ---------- NGO (the page is guarded by role "ngo") ---------- */

// #9 computed from /reports + /city_prices -> { rows }
export async function getNgoSummary({ city, from, to }) {
  if (USE_MOCK) return mock(() => mockApi.getNgoSummary({ city, from, to }));
  return sb.getNgoSummary({ city, from, to });
}

// #10 CSV built from the #9 rows
export async function exportNgoCsv({ city, from, to }) {
  if (USE_MOCK) return mock(() => mockApi.exportNgoCsv({ city, from, to }));
  return sb.exportNgoCsv({ city, from, to });
}

/* ---------- auth (mock in every mode for now) ----------
 * To move to Supabase Auth later:
 *   register -> POST {project}/auth/v1/signup            { email, password, data: { role, cityId, areaId } }
 *   login    -> POST {project}/auth/v1/token?grant_type=password
 *   me       -> GET  {project}/auth/v1/user  (Authorization: Bearer <access_token>)
 * Keep roles in a server-side profiles table, not in user metadata, because users can edit their own metadata.
 */

// #11 -> { user, token }
export async function register(payload) {
  const res = await mock(() => mockApi.register(payload));
  setToken(res.token);
  return res.user;
}

// #12 -> { user, token }
export async function login(email, password) {
  const res = await mock(() => mockApi.login({ email, password }));
  setToken(res.token);
  return res.user;
}

// #13 -> user (401 when the token is missing or expired)
export async function getMe() {
  return mock(() => mockApi.getMe());
}

export function logout() {
  setToken(null);
}
