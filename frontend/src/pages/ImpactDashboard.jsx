import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { getAssumptions, getImpactSummary, getImpactTrend } from "../api";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { CitySelect, PageHeader } from "../components/ui";
import { Loading, ErrorState } from "../components/Status";
import { cssVar, kg, monthLabel, num } from "../utils/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip);

const SERIES_VARS = ["--s1", "--s2", "--s3"];

export default function ImpactDashboard() {
  const { city, cityById, materialById } = useMeta();
  const summary = useAsync(() => getImpactSummary({ city }), [city]);
  const trend = useAsync(() => getImpactTrend({ city, months: 6 }), [city]);
  const assumptions = useAsync(() => getAssumptions(), []);
  const s = summary.data;

  const ink = cssVar("--muted");
  const grid = cssVar("--line");
  const tooltip = { backgroundColor: cssVar("--ink"), titleColor: cssVar("--surface"), bodyColor: cssVar("--surface"), padding: 10 };

  return (
    <div className="stack">
      <PageHeader
        title={`Impact in ${cityById(city).name}`}
        subtitle={s ? `${s.period.from} to ${s.period.to} · reports from partner shops` : "Partner shop reports"}
      />
      <div className="filters">
        <CitySelect id="impact-city" />
      </div>

      {summary.loading && <Loading label="Loading impact numbers" />}
      {summary.error && <ErrorState error={summary.error} onRetry={summary.reload} />}
      {s && (
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-l">Average price gap</div>
            <div className="kpi-v">{s.avgGapPct}%</div>
            <div className="kpi-d good-text">
              {s.gapChangePts <= 0 ? "▼" : "▲"} {Math.abs(s.gapChangePts)} pts since {monthLabel(s.period.from.slice(0, 7))}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Sold at or above range</div>
            <div className="kpi-v">{kg(s.kgAtOrAboveRange)}</div>
            <div className="kpi-d muted">
              {Math.round(s.shareAtOrAbove * 100)}% of {kg(s.kgReported)} reported
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-l">CO2e avoided (estimate)</div>
            <div className="kpi-v">{(s.co2eAvoidedKg / 1000).toFixed(1)} t</div>
            <div className="kpi-d muted">kg recycled × emission factor</div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Kept out of landfill (estimate)</div>
            <div className="kpi-v">{kg(s.landfillAvoidedKg)}</div>
            <div className="kpi-d muted">low-value kg × retention uplift</div>
          </div>
        </div>
      )}

      {trend.error && <ErrorState error={trend.error} onRetry={trend.reload} />}
      {trend.data && (
        <div className="grid2">
          <div className="card">
            <h3>Price gap trend, all cities</h3>
            <div className="legend">
              {trend.data.series.map((sr, i) => (
                <span key={sr.cityId}>
                  <i className="swatch" style={{ background: cssVar(SERIES_VARS[i]) }} />
                  {cityById(sr.cityId).name}
                </span>
              ))}
            </div>
            <div className="chart-box">
              <Line
                aria-label="Line chart of the monthly average price gap by city"
                data={{
                  labels: trend.data.months.map(monthLabel),
                  datasets: trend.data.series.map((sr, i) => {
                    const color = cssVar(SERIES_VARS[i]);
                    const active = sr.cityId === city;
                    return {
                      label: cityById(sr.cityId).name,
                      data: sr.gapPct,
                      borderColor: color,
                      backgroundColor: color,
                      borderWidth: active ? 3 : 2,
                      pointRadius: active ? 4 : 0,
                      pointHoverRadius: 5,
                      pointBorderColor: cssVar("--surface"),
                      pointBorderWidth: 2,
                      tension: 0.25,
                    };
                  }),
                }}
                options={{
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: { ...tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y}% below median` } },
                  },
                  scales: {
                    y: { min: 0, ticks: { color: ink, callback: (v) => `${v}%` }, grid: { color: grid }, border: { display: false } },
                    x: { ticks: { color: ink }, grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
          <div className="card">
            <h3>kg sold by material, {cityById(city).name}</h3>
            <div className="chart-box">
              <Bar
                aria-label="Bar chart of kilograms sold by material"
                data={{
                  labels: trend.data.volumeByMaterial.map((v) => materialById(v.materialId).name.split(" (")[0].split(" /")[0]),
                  datasets: [
                    {
                      label: "kg sold",
                      data: trend.data.volumeByMaterial.map((v) => v.kg),
                      backgroundColor: cssVar("--s1"),
                      borderRadius: { topLeft: 4, topRight: 4 },
                      borderSkipped: "bottom",
                      maxBarThickness: 36,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => ` ${num(c.parsed.y)} kg` } } },
                  scales: {
                    y: { beginAtZero: true, ticks: { color: ink, callback: (v) => num(v) }, grid: { color: grid }, border: { display: false } },
                    x: { ticks: { color: ink, autoSkip: false, maxRotation: 40 }, grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {assumptions.data && (
        <div className="card">
          <h3>Assumptions behind these numbers</h3>
          <ul className="tight muted">
            <li>
              <code>{assumptions.data.gapFormula}</code>
            </li>
            <li>{assumptions.data.landfillNote}</li>
            <li>Emission factors are placeholders until a cited source replaces them. See Methodology.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
