// In-browser stand-in for the backend. Same response shapes as the real API,
// computed from the JSON files in this folder. State resets on page reload.
import cities from "./cities.json";
import areas from "./areas.json";
import materials from "./materials.json";
import grades from "./grades.json";
import sources from "./sources.json";
import prices from "./prices.json";
import seedReports from "./reports.json";
import areaAggregates from "./areaAggregates.json";
import impact from "./impact.json";
import assumptions from "./assumptions.json";
import usersFile from "./users.json";
import { ApiError, getToken } from "../api/client";
import { REPORT_THRESHOLD } from "../config";

const reports = [...seedReports];
const users = [...usersFile.users];
const extraReports = {}; // areaId -> reports submitted this session

const byId = (list, id) => list.find((x) => x.id === id);
const sourceFor = (id) => {
  const s = byId(sources, id);
  return { id: s.id, name: s.name, type: s.type };
};
const priceFor = (cityId, materialId, grade) =>
  prices.find((p) => p.cityId === cityId && p.materialId === materialId && p.grade === grade);

function requireCity(city) {
  if (!byId(cities, city)) throw new ApiError(`Unknown city "${city}".`, 400);
}

function currentUser() {
  const token = getToken();
  if (!token || !token.startsWith("mock-token:")) return null;
  const user = byId(users, token.slice("mock-token:".length));
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function requireNgo() {
  const user = currentUser();
  if (!user) throw new ApiError("Log in to see this page.", 401);
  if (user.role !== "ngo") throw new ApiError("This view is for NGO partners only.", 403);
  return user;
}

/* ---------- reference data ---------- */

export function getMeta() {
  return { cities, areas, materials, grades };
}

export function getSources() {
  return sources;
}

export function getAssumptions() {
  return assumptions;
}

export function getPrices({ city, material, grade }) {
  requireCity(city);
  const ranges = prices
    .filter(
      (p) =>
        p.cityId === city &&
        (!material || material === "all" || p.materialId === material) &&
        (!grade || grade === "all" || p.grade === grade)
    )
    .map((p) => ({ ...p, source: sourceFor(p.sourceId) }));
  return { cityId: city, updatedAt: "2026-10-22", ranges };
}

/* ---------- reports ---------- */

export function submitReport(r) {
  requireCity(r.cityId);
  const area = byId(areas, r.areaId);
  if (!area || area.cityId !== r.cityId) throw new ApiError("Pick an area in the selected city.", 400);
  if (!byId(materials, r.materialId)) throw new ApiError("Pick a material.", 400);
  if (!byId(grades, r.grade)) throw new ApiError("Pick a grade.", 400);
  const qty = Number(r.quantityKg);
  const offered = Number(r.offeredPrice);
  if (!(qty >= 0.1 && qty <= 5000)) throw new ApiError("Quantity must be between 0.1 and 5000 kg.", 400);
  if (!(offered > 0)) throw new ApiError("Enter the price you were offered in ₹ per kg.", 400);

  const p = priceFor(r.cityId, r.materialId, r.grade);
  const gapPct = Math.round(((p.median - offered) / p.median) * 100);
  const flagged = offered < p.median * 0.2 || offered > p.median * 3;
  const position = offered < p.min ? "below" : offered > p.max ? "above" : "within";

  const user = currentUser();
  const saved = {
    id: `rep_${1001 + reports.length}`,
    ...r,
    quantityKg: qty,
    offeredPrice: offered,
    createdAt: new Date().toISOString(),
    flagged,
    partnerId: user?.partnerId ?? null, // never the user id
    isSample: true,
  };
  reports.push(saved);
  extraReports[area.id] = (extraReports[area.id] || 0) + 1;

  const reportCount = baseCount(area.id) + extraReports[area.id];
  return {
    reportId: saved.id,
    comparison: { min: p.min, max: p.max, median: p.median, offeredPrice: offered, gapPct, position, source: sourceFor(p.sourceId), asOf: p.asOf },
    area: { areaId: area.id, name: area.name, reportCount, threshold: REPORT_THRESHOLD, visible: reportCount >= REPORT_THRESHOLD },
    flagged,
  };
}

/* ---------- aggregates ---------- */

function baseCount(areaId) {
  const area = byId(areas, areaId);
  return areaAggregates[area.cityId].find((a) => a.areaId === areaId).reportCount;
}

export function getAreaGaps({ city }) {
  requireCity(city);
  const rows = areaAggregates[city].map((a) => {
    const reportCount = a.reportCount + (extraReports[a.areaId] || 0);
    const visible = reportCount >= REPORT_THRESHOLD && a.medianGapPct != null;
    return {
      areaId: a.areaId,
      name: a.name,
      lat: a.lat,
      lng: a.lng,
      reportCount,
      visible,
      medianGapPct: visible ? a.medianGapPct : null,
      worstMaterialId: visible ? a.worstMaterialId : null,
    };
  });
  return { cityId: city, threshold: REPORT_THRESHOLD, areas: rows };
}

const factor = (materialId) => assumptions.emissionFactors.find((e) => e.materialId === materialId).kgCO2ePerKg;

export function getImpactSummary({ city }) {
  requireCity(city);
  const vol = impact.volumes[city];
  const kgReported = Object.values(vol).reduce((a, b) => a + b, 0);
  const co2 = Object.entries(vol).reduce((s, [m, kg]) => s + kg * factor(m), 0);
  const lowValueKg = materials.filter((m) => m.lowValue).reduce((s, m) => s + (vol[m.id] || 0), 0);
  const trend = impact.gapTrend[city];
  const reportCount = areaAggregates[city].reduce((s, a) => s + a.reportCount + (extraReports[a.areaId] || 0), 0);
  return {
    cityId: city,
    period: impact.period,
    avgGapPct: trend[trend.length - 1],
    gapChangePts: trend[trend.length - 1] - trend[0],
    reports: reportCount,
    kgReported,
    kgAtOrAboveRange: Math.round(kgReported * impact.shareAtOrAbove[city]),
    shareAtOrAbove: impact.shareAtOrAbove[city],
    co2eAvoidedKg: Math.round(co2),
    landfillAvoidedKg: Math.round(lowValueKg * assumptions.landfillRetentionUplift),
    isSample: true,
  };
}

export function getImpactTrend({ city, months = 6 }) {
  requireCity(city);
  const n = Math.min(months, impact.months.length);
  return {
    months: impact.months.slice(-n),
    series: cities.map((c) => ({ cityId: c.id, gapPct: impact.gapTrend[c.id].slice(-n) })),
    volumeByMaterial: Object.entries(impact.volumes[city]).map(([materialId, kg]) => ({ materialId, kg })),
  };
}

/* ---------- NGO ---------- */

function ngoRows(city) {
  return areaAggregates[city]
    .filter((a) => a.visible)
    .sort((a, b) => b.medianGapPct - a.medianGapPct)
    .map((a) => ({
      areaId: a.areaId,
      area: a.name,
      reports: a.reportCount + (extraReports[a.areaId] || 0),
      worstMaterialId: a.worstMaterialId,
      worstMaterial: byId(materials, a.worstMaterialId).name,
      medianOffered: a.medianOffered,
      prevailingMedian: a.prevailingMedian,
      gapPct: a.medianGapPct,
      underpaidPerTonne: Math.round((a.prevailingMedian - a.medianOffered) * 1000),
    }));
}

export function getNgoSummary({ city, from, to }) {
  requireNgo();
  requireCity(city);
  return { cityId: city, from, to, threshold: REPORT_THRESHOLD, rows: ngoRows(city), isSample: true };
}

export function exportNgoCsv({ city }) {
  requireNgo();
  requireCity(city);
  const header = "area,reports,worst_material,median_offered_inr_per_kg,prevailing_median_inr_per_kg,gap_pct,underpaid_inr_per_tonne,is_sample";
  const lines = ngoRows(city).map((r) =>
    [r.area, r.reports, `"${r.worstMaterial}"`, r.medianOffered, r.prevailingMedian, r.gapPct, r.underpaidPerTonne, "true"].join(",")
  );
  return [header, ...lines].join("\n");
}

/* ---------- auth ---------- */

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function register({ role, email, password, cityId, areaId, inviteCode, organisationName }) {
  if (!["shop", "ngo"].includes(role)) throw new ApiError("Choose shop or NGO.", 400);
  if (!EMAIL_RE.test(email || "")) throw new ApiError("Enter a valid email address.", 400);
  if ((password || "").length < 8) throw new ApiError("Use at least 8 characters for the password.", 400);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    throw new ApiError("An account with this email already exists. Log in instead.", 409);
  requireCity(cityId);

  let user;
  if (role === "shop") {
    const invite = usersFile.inviteCodes.find((c) => c.code === (inviteCode || "").trim().toUpperCase());
    if (!invite) throw new ApiError("That invite code is not valid. Ask your NGO for a code like PUNE-NGO-4821.", 400);
    const area = byId(areas, areaId);
    if (!area || area.cityId !== cityId) throw new ApiError("Pick an area in the selected city.", 400);
    user = { id: `usr_${2000 + users.length}`, role, email, password, cityId, areaId, partnerId: invite.partnerId, name: `Shop in ${area.name}` };
  } else {
    if (!(organisationName || "").trim()) throw new ApiError("Enter your organisation name.", 400);
    user = { id: `usr_${2000 + users.length}`, role, email, password, cityId, name: organisationName.trim() };
  }
  users.push(user);
  const { password: _, ...safe } = user;
  return { user: safe, token: `mock-token:${user.id}` };
}

export function login({ email, password }) {
  const user = users.find((u) => u.email.toLowerCase() === (email || "").trim().toLowerCase());
  if (!user || user.password !== password) throw new ApiError("Email or password is wrong.", 401);
  const { password: _, ...safe } = user;
  return { user: safe, token: `mock-token:${user.id}` };
}

export function getMe() {
  const user = currentUser();
  if (!user) throw new ApiError("Not logged in.", 401);
  return user;
}
