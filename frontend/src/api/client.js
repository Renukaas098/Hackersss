import { API_BASE_URL, MOCK_DELAY_MS, SUPABASE_ANON_KEY, TOKEN_KEY } from "../config";

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Builds "?a=1&b=2", skipping empty and "all" values.
export function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all");
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

// Supabase (PostgREST) filters: { city_id: "pune" } -> "?city_id=eq.pune".
// Empty and "all" values are skipped. Pass `order` as "col1,col2".
export function sbFilter(params = {}, order) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all")
    .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`);
  if (order) parts.push(`order=${encodeURIComponent(order)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

// Session token for the app's own login (still mock auth, see src/api/index.js).
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: session lasts until reload */
  }
}

// Mock transport: waits a little like a network call and returns a copy.
export async function mock(handler) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  const result = await handler();
  return typeof result === "string" ? result : structuredClone(result);
}

// Turns a PostgREST error into a sentence the user can act on.
function friendlyMessage(status, data) {
  if (status === 401 || status === 403) return "The app is not allowed to read this data. Check the Supabase key and table policies.";
  if (status === 404) return "This data is not available on the server yet.";
  if (data?.code === "23505") return "This report was already saved.";
  if (data?.code === "23503") return "One of the selected options is not in the database.";
  if (data?.code === "23502" || data?.code === "22P02") return "Some details are missing or in the wrong format.";
  return data?.message || `Request failed (${status}).`;
}

// Supabase REST transport. `path` is relative to SUPABASE_URL (…/rest/v1), e.g. "/cities".
export async function request(path, { method = "GET", body, prefer, raw = false } = {}) {
  if (!API_BASE_URL || !SUPABASE_ANON_KEY) {
    throw new ApiError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.");
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: raw ? "text/csv" : "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.");
  }

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* body was not JSON */
    }
    if (import.meta.env.DEV) console.warn(`[api] ${method} ${path} -> ${res.status}`, data);
    throw new ApiError(friendlyMessage(res.status, data), res.status, data);
  }
  if (res.status === 204 || (res.status === 201 && prefer === "return=minimal")) return null;
  return raw ? res.text() : res.json();
}
