// Supabase REST implementation of the API contract.
// Reads the tables listed in api-contract and maps snake_case rows to the
// camelCase shapes the pages already use, so no page code changes.
import { ApiError, request, sbFilter } from "./client";

/* ---------- helpers ---------- */

const cache = new Map();
// Reference tables rarely change: fetch once per page load.
function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((e) => (cache.delete(key), Promise.reject(e))));
  return cache.get(key);
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const roundHalf = (v) => Math.round(v * 2) / 2;
const gapOf = (median, offered) => Math.round(((median - offered) / median) * 100);

const mapCity = (r) => ({ id: r.id, name: r.name, state: r.state, center: r.center });
const mapArea = (r) => ({ id: r.id, cityId: r.city_id, name: r.name, lat: r.lat, lng: r.lng });
const mapMaterial = (r) => ({ id: r.id, name: r.name, category: r.category, lowValue: r.low_value, unit: "kg" });
const mapGrade = (r) => ({ id: r.id, label: r.label, description: r.description });
const mapSource = (r) => ({ id: r.id, type: r.type, name: r.name, cityId: r.city_id, asOf: r.as_of });
const mapPrice = (r) => ({
  id: r.id,
  cityId: r.city_id,
  materialId: r.material_id,
  grade: r.grade,
  unit: r.unit,
  currency: r.currency,
  min: r.min,
  max: r.max,
  median: r.median,
  sourceId: r.source_id,
  asOf: r.as_of,
  sampleSize: r.sample_size,
  isSample: r.is_sample,
});

const getCities = () => cached("cities", async () => (await request("/cities?order=name")).map(mapCity));
const getAreas = () => cached("areas", async () => (await request("/areas?order=city_id,name")).map(mapArea));
const getMaterials = () => cached("materials", async () => (await request("/materials")).map(mapMaterial));
const getGrades = () => cached("grades", async () => (await request("/grades?order=id")).map(mapGrade));
const getSourceRows = () => cached("sources", async () => (await request("/sources")).map(mapSource));
const getSettings = () =>
  cached("settings", async () => {
    const rows = await request("/app_settings?limit=1");
    if (!rows.length) throw new ApiError("App settings are missing in the database.");
    return rows[0];
  });

async function pricesForCity(city) {
  return (await request(`/city_prices${sbFilter({ city_id: city })}`)).map(mapPrice);
}

function requireCity(cities, city) {
  if (!cities.some((c) => c.id === city)) throw new ApiError(`Unknown city "${city}".`, 400);
}

/* ---------- reference data ---------- */

// #1 GET /cities, /areas, /materials, /grades
export async function getMeta() {
  const [cities, areas, materials, grades] = await Promise.all([getCities(), getAreas(), getMaterials(), getGrades()]);
  // Keep the city order the UI and charts expect (as seeded), then fall back to name order.
  const order = ["pune", "kochi", "delhi"];
  cities.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99));
  return { cities, areas, materials, grades };
}

// #8 GET /sources
export async function getSources() {
  return getSourceRows();
}

// #7 GET /app_settings + /emission_factors
export async function getAssumptions() {
  const [s, factors] = await Promise.all([getSettings(), request("/emission_factors")]);
  return {
    threshold: s.threshold,
    gapFormula: s.gap_formula,
    prevailingGrade: s.prevailing_grade,
    landfillRetentionUplift: s.landfill_retention_uplift,
    landfillNote: s.landfill_note,
    emissionFactors: factors.map((f) => ({
      materialId: f.material_id,
      kgCO2ePerKg: f.kg_co2e_per_kg,
      status: f.status,
      source: f.source,
    })),
  };
}

// #2 GET /city_prices?city_id=eq.pune&material_id=eq.pet&grade=eq.B
export async function getPrices({ city, material, grade }) {
  const [rows, sources] = await Promise.all([
    request(`/city_prices${sbFilter({ city_id: city, material_id: material, grade }, "material_id,grade")}`),
    getSourceRows(),
  ]);
  const ranges = rows.map(mapPrice).map((p) => {
    const s = sources.find((x) => x.id === p.sourceId);
    return { ...p, source: s ? { id: s.id, name: s.name, type: s.type } : { id: p.sourceId, name: p.sourceId, type: "unknown" } };
  });
  const updatedAt = ranges.reduce((d, r) => (r.asOf > d ? r.asOf : d), "") || null;
  return { cityId: city, updatedAt, ranges };
}

/* ---------- reports ---------- */

const BUYER_TYPES = ["aggregator", "recycler", "other_shop", "other"];

// #3 POST /reports (validation runs here because the table has no checks yet)
export async function submitReport(r) {
  const [meta, settings] = await Promise.all([getMeta(), getSettings()]);
  requireCity(meta.cities, r.cityId);
  const area = meta.areas.find((a) => a.id === r.areaId);
  if (!area || area.cityId !== r.cityId) throw new ApiError("Pick an area in the selected city.", 400);
  if (!meta.materials.some((m) => m.id === r.materialId)) throw new ApiError("Pick a material.", 400);
  if (!meta.grades.some((g) => g.id === r.grade)) throw new ApiError("Pick a grade.", 400);
  const qty = Number(r.quantityKg);
  const offered = Number(r.offeredPrice);
  if (!(qty >= 0.1 && qty <= 5000)) throw new ApiError("Quantity must be between 0.1 and 5000 kg.", 400);
  if (!(offered > 0)) throw new ApiError("Enter the price you were offered in ₹ per kg.", 400);
  if (!BUYER_TYPES.includes(r.buyerType)) throw new ApiError("Pick who offered the price.", 400);

  const priceRows = await request(`/city_prices${sbFilter({ city_id: r.cityId, material_id: r.materialId, grade: r.grade })}`);
  if (!priceRows.length) throw new ApiError("There is no price range for this material and grade yet.", 400);
  const p = mapPrice(priceRows[0]);
  const flagged = offered < p.median * 0.2 || offered > p.median * 3;

  // The id column has no default, so the client creates one.
  const id = `rep_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await request("/reports", {
    method: "POST",
    body: {
      id,
      city_id: r.cityId,
      area_id: r.areaId,
      material_id: r.materialId,
      grade: r.grade,
      quantity_kg: qty,
      offered_price: offered,
      buyer_type: r.buyerType,
      offered_on: r.offeredOn,
      created_at: new Date().toISOString(),
      flagged,
      is_sample: false,
    },
    prefer: "return=minimal",
  });

  const [analytics, sources] = await Promise.all([
    request(`/area_analytics${sbFilter({ area_id: r.areaId })}`),
    getSourceRows(),
  ]);
  const a = analytics[0] || { report_count: 1, visible: false };
  const s = sources.find((x) => x.id === p.sourceId);
  return {
    reportId: id,
    comparison: {
      min: p.min,
      max: p.max,
      median: p.median,
      offeredPrice: offered,
      gapPct: gapOf(p.median, offered),
      position: offered < p.min ? "below" : offered > p.max ? "above" : "within",
      source: s ? { id: s.id, name: s.name, type: s.type } : null,
      asOf: p.asOf,
    },
    area: { areaId: area.id, name: area.name, reportCount: a.report_count, threshold: settings.threshold, visible: a.visible },
    flagged,
  };
}

/* ---------- aggregates ---------- */

// Gap figures per area, computed from non-flagged reports and the city's price ranges.
// TODO(backend): move into the area_analytics view (median_gap_pct, worst_material_id)
// so raw reports no longer need to be readable by the public key.
async function areaGapStats(city, { from, to } = {}) {
  const filters = { city_id: city, flagged: "false" };
  let query = `/reports${sbFilter(filters)}&select=area_id,material_id,grade,offered_price,offered_on`;
  if (from) query += `&offered_on=gte.${from}`;
  if (to) query += `&offered_on=lte.${to}`;
  const [reports, prices] = await Promise.all([request(query), pricesForCity(city)]);

  const byArea = {};
  for (const rep of reports) {
    const p = prices.find((x) => x.materialId === rep.material_id && x.grade === rep.grade);
    if (!p) continue;
    (byArea[rep.area_id] ||= []).push({ materialId: rep.material_id, offered: rep.offered_price, median: p.median, gap: gapOf(p.median, rep.offered_price) });
  }

  const stats = {};
  for (const [areaId, list] of Object.entries(byArea)) {
    const perMaterial = {};
    for (const x of list) (perMaterial[x.materialId] ||= []).push(x);
    const [worstMaterialId, worst] = Object.entries(perMaterial).sort(
      (a, b) => median(b[1].map((x) => x.gap)) - median(a[1].map((x) => x.gap))
    )[0];
    const medianOffered = roundHalf(median(worst.map((x) => x.offered)));
    const prevailingMedian = roundHalf(median(worst.map((x) => x.median)));
    stats[areaId] = {
      count: list.length,
      medianGapPct: Math.round(median(list.map((x) => x.gap))),
      worstMaterialId,
      medianOffered,
      prevailingMedian,
    };
  }
  return stats;
}

// #4 GET /area_analytics?city_id=eq.pune  (+ gap figures for visible areas)
export async function getAreaGaps({ city }) {
  const [rows, settings] = await Promise.all([request(`/area_analytics${sbFilter({ city_id: city }, "name")}`), getSettings()]);
  const anyVisible = rows.some((r) => r.visible);
  const stats = anyVisible ? await areaGapStats(city) : {};
  return {
    cityId: city,
    threshold: settings.threshold,
    areas: rows.map((r) => {
      const st = r.visible ? stats[r.area_id] : null;
      return {
        areaId: r.area_id,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        reportCount: r.report_count,
        visible: Boolean(r.visible && st),
        medianGapPct: st ? st.medianGapPct : null,
        worstMaterialId: st ? st.worstMaterialId : null,
      };
    }),
  };
}

async function citySummaries() {
  return request("/city_summaries");
}

// Month labels ("2026-05") from the period start, one per trend point.
function monthsFrom(periodFrom, n) {
  const [y, m] = periodFrom.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

// #5 GET /city_summaries?city_id=eq.pune
export async function getImpactSummary({ city }) {
  const rows = await request(`/city_summaries${sbFilter({ city_id: city })}`);
  if (!rows.length) throw new ApiError(`No impact summary for "${city}" yet.`, 404);
  const s = rows[0];
  return {
    cityId: s.city_id,
    period: { from: s.period_from, to: s.period_to },
    avgGapPct: s.avg_gap_pct,
    gapChangePts: s.gap_change_pts,
    reports: s.reports,
    kgReported: s.kg_reported,
    kgAtOrAboveRange: s.kg_at_or_above_range,
    shareAtOrAbove: s.share_at_or_above,
    co2eAvoidedKg: s.co2e_avoided_kg,
    landfillAvoidedKg: s.landfill_avoided_kg,
    isSample: s.is_sample,
  };
}

// #6 GET /city_summaries (all cities, for the comparison chart)
export async function getImpactTrend({ city, months = 6 }) {
  const [rows, meta] = await Promise.all([citySummaries(), getMeta()]);
  const own = rows.find((r) => r.city_id === city);
  if (!own) throw new ApiError(`No impact data for "${city}" yet.`, 404);
  const n = Math.min(months, own.gap_trend.length);
  const order = meta.cities.map((c) => c.id);
  const materialOrder = meta.materials.map((m) => m.id);
  return {
    months: monthsFrom(own.period_from, own.gap_trend.length).slice(-n),
    series: [...rows]
      .sort((a, b) => order.indexOf(a.city_id) - order.indexOf(b.city_id))
      .map((r) => ({ cityId: r.city_id, gapPct: r.gap_trend.slice(-n) })),
    volumeByMaterial: Object.entries(own.volumes || {})
      .sort((a, b) => materialOrder.indexOf(a[0]) - materialOrder.indexOf(b[0]))
      .map(([materialId, kg]) => ({ materialId, kg })),
  };
}

/* ---------- NGO ---------- */

// #9 computed from /reports + /city_prices (no ngo_summary table yet)
export async function getNgoSummary({ city, from, to }) {
  const [settings, meta, stats] = await Promise.all([getSettings(), getMeta(), areaGapStats(city, { from, to })]);
  const rows = Object.entries(stats)
    .filter(([, st]) => st.count >= settings.threshold)
    .map(([areaId, st]) => ({
      areaId,
      area: meta.areas.find((a) => a.id === areaId)?.name || areaId,
      reports: st.count,
      worstMaterialId: st.worstMaterialId,
      worstMaterial: meta.materials.find((m) => m.id === st.worstMaterialId)?.name || st.worstMaterialId,
      medianOffered: st.medianOffered,
      prevailingMedian: st.prevailingMedian,
      gapPct: st.medianGapPct,
      underpaidPerTonne: Math.round((st.prevailingMedian - st.medianOffered) * 1000),
    }))
    .sort((a, b) => b.gapPct - a.gapPct);
  return { cityId: city, from, to, threshold: settings.threshold, rows, isSample: false };
}

// #10 CSV built from the same rows
export async function exportNgoCsv({ city, from, to }) {
  const { rows } = await getNgoSummary({ city, from, to });
  const header = "area,reports,worst_material,median_offered_inr_per_kg,prevailing_median_inr_per_kg,gap_pct,underpaid_inr_per_tonne";
  const lines = rows.map((r) => [r.area, r.reports, `"${r.worstMaterial}"`, r.medianOffered, r.prevailingMedian, r.gapPct, r.underpaidPerTonne].join(","));
  return [header, ...lines].join("\n");
}
