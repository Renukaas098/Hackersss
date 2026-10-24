// One function per backend endpoint. Pages import only from here.
//
// While USE_MOCK is true every function answers from src/mock.
// To connect an endpoint: uncomment its BACKEND line and delete the
// `throw notConnected(...)` under it. Response shapes are identical.
import { USE_MOCK } from "../config";
import { mock, notConnected, setToken } from "./client";
// BACKEND: uncomment when the first endpoint is connected.
// import { request, qs } from "./client";
import * as mockApi from "../mock/mockApi";

/* ---------- reference data ---------- */

// #1 GET /api/meta -> { cities, areas, materials, grades }
export async function getMeta() {
  if (USE_MOCK) return mock(() => mockApi.getMeta());
  // BACKEND:
  // return request("/api/meta");
  throw notConnected("GET /api/meta");
}

// #2 GET /api/prices?city=&material=&grade= -> { cityId, updatedAt, ranges }
export async function getPrices({ city, material, grade } = {}) {
  if (USE_MOCK) return mock(() => mockApi.getPrices({ city, material, grade }));
  // BACKEND:
  // return request(`/api/prices${qs({ city, material, grade })}`);
  throw notConnected("GET /api/prices");
}

// #8 GET /api/sources -> [{ id, type, name, cityId, asOf }]
export async function getSources() {
  if (USE_MOCK) return mock(() => mockApi.getSources());
  // BACKEND:
  // return request("/api/sources");
  throw notConnected("GET /api/sources");
}

// #7 GET /api/assumptions -> { threshold, gapFormula, emissionFactors, ... }
export async function getAssumptions() {
  if (USE_MOCK) return mock(() => mockApi.getAssumptions());
  // BACKEND:
  // return request("/api/assumptions");
  throw notConnected("GET /api/assumptions");
}

/* ---------- reports ---------- */

// #3 POST /api/reports -> { reportId, comparison, area, flagged }
// auth is optional: a logged-in shop's token lets the server attach the partner NGO id.
export async function submitReport(report) {
  if (USE_MOCK) return mock(() => mockApi.submitReport(report));
  // BACKEND:
  // return request("/api/reports", { method: "POST", body: report, auth: true });
  throw notConnected("POST /api/reports");
}

/* ---------- aggregates ---------- */

// #4 GET /api/areas/gaps?city=&material= -> { cityId, threshold, areas }
export async function getAreaGaps({ city, material } = {}) {
  if (USE_MOCK) return mock(() => mockApi.getAreaGaps({ city, material }));
  // BACKEND:
  // return request(`/api/areas/gaps${qs({ city, material })}`);
  throw notConnected("GET /api/areas/gaps");
}

// #5 GET /api/impact/summary?city= -> KPI numbers
export async function getImpactSummary({ city }) {
  if (USE_MOCK) return mock(() => mockApi.getImpactSummary({ city }));
  // BACKEND:
  // return request(`/api/impact/summary${qs({ city })}`);
  throw notConnected("GET /api/impact/summary");
}

// #6 GET /api/impact/trend?city=&months= -> { months, series, volumeByMaterial }
export async function getImpactTrend({ city, months = 6 }) {
  if (USE_MOCK) return mock(() => mockApi.getImpactTrend({ city, months }));
  // BACKEND:
  // return request(`/api/impact/trend${qs({ city, months })}`);
  throw notConnected("GET /api/impact/trend");
}

/* ---------- NGO (requires role "ngo") ---------- */

// #9 GET /api/ngo/summary?city=&from=&to= -> { rows }
export async function getNgoSummary({ city, from, to }) {
  if (USE_MOCK) return mock(() => mockApi.getNgoSummary({ city, from, to }));
  // BACKEND:
  // return request(`/api/ngo/summary${qs({ city, from, to })}`, { auth: true });
  throw notConnected("GET /api/ngo/summary");
}

// #10 GET /api/ngo/export?city=&from=&to=&format=csv -> text/csv
export async function exportNgoCsv({ city, from, to }) {
  if (USE_MOCK) return mock(() => mockApi.exportNgoCsv({ city, from, to }));
  // BACKEND:
  // return request(`/api/ngo/export${qs({ city, from, to, format: "csv" })}`, { auth: true, raw: true });
  throw notConnected("GET /api/ngo/export");
}

/* ---------- auth ---------- */

// #11 POST /api/auth/register -> { user, token }
export async function register(payload) {
  let res;
  if (USE_MOCK) res = await mock(() => mockApi.register(payload));
  // BACKEND:
  // else res = await request("/api/auth/register", { method: "POST", body: payload });
  else throw notConnected("POST /api/auth/register");
  setToken(res.token);
  return res.user;
}

// #12 POST /api/auth/login -> { user, token }
export async function login(email, password) {
  let res;
  if (USE_MOCK) res = await mock(() => mockApi.login({ email, password }));
  // BACKEND:
  // else res = await request("/api/auth/login", { method: "POST", body: { email, password } });
  else throw notConnected("POST /api/auth/login");
  setToken(res.token);
  return res.user;
}

// #13 GET /api/auth/me -> user (401 when the token is missing or expired)
export async function getMe() {
  if (USE_MOCK) return mock(() => mockApi.getMe());
  // BACKEND:
  // return request("/api/auth/me", { auth: true });
  throw notConnected("GET /api/auth/me");
}

export function logout() {
  setToken(null);
  // BACKEND: only if the server keeps sessions:
  // request("/api/auth/logout", { method: "POST", auth: true }).catch(() => {});
}
