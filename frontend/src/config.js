// Data source switch. false = live Supabase (set in .env), true = in-browser mock data.
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "false") === "true";

// Simulated network delay for mock responses, so loading states are visible.
export const MOCK_DELAY_MS = 250;

// Supabase REST base, e.g. https://<project>.supabase.co/rest/v1 (no trailing slash).
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// All REST requests go here (see src/api/client.js).
export const API_BASE_URL = SUPABASE_URL;

// Fallback only. The live value comes from app_settings.threshold.
export const REPORT_THRESHOLD = 5;

export const TOKEN_KEY = "fpi_token";
