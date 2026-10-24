// Data source switch. Mock mode is on until the backend is ready.
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

// Simulated network delay for mock responses, so loading states are visible.
export const MOCK_DELAY_MS = 250;

// BACKEND: base URL loading. Uncomment when the backend is deployed.
// export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
export const API_BASE_URL = "";

// Minimum reports before an area figure is shown (must match the backend).
export const REPORT_THRESHOLD = 5;

export const TOKEN_KEY = "fpi_token";
