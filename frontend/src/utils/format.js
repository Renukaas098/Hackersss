export const inr = (v) => (v == null ? "–" : `₹${Number.isInteger(v) ? v : v.toFixed(1)}`);

export const kg = (v) => `${Number(v).toLocaleString("en-IN")} kg`;

export const num = (v) => Number(v).toLocaleString("en-IN");

export const today = () => new Date().toISOString().slice(0, 10);

export const monthLabel = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleString("en-IN", { month: "short" });

// Gap bands shared by the map, NGO table and legend.
export function gapBand(gapPct) {
  if (gapPct == null) return { key: "none", label: "Not enough reports" };
  if (gapPct < 10) return { key: "good", label: "Within 10%" };
  if (gapPct <= 20) return { key: "warn", label: "10–20% below" };
  return { key: "crit", label: "Over 20% below" };
}

export const GAP_BANDS = [gapBand(5), gapBand(15), gapBand(25), gapBand(null)];

// Reads a CSS custom property, for chart and map colors.
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
