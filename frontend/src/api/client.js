import { API_BASE_URL, MOCK_DELAY_MS, TOKEN_KEY } from "../config";

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

// Thrown by an endpoint whose backend call is still commented out.
export function notConnected(endpoint) {
  return new ApiError(
    `${endpoint} is not connected yet. Set VITE_USE_MOCK=true, or uncomment its BACKEND line in src/api/index.js.`
  );
}

// Real transport used by the BACKEND lines in src/api/index.js.
export async function request(path, { method = "GET", body, auth = false, raw = false } = {}) {
  if (!API_BASE_URL && !import.meta.env.DEV) {
    throw new ApiError("API_BASE_URL is empty. Uncomment the base URL loading in src/config.js.");
  }
  const headers = { Accept: raw ? "text/csv" : "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

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
    if (res.status === 401) setToken(null);
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  }
  if (res.status === 204) return null;
  return raw ? res.text() : res.json();
}
