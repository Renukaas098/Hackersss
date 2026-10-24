import { useState } from "react";
import { Link } from "react-router-dom";
import { getImpactSummary, getPrices } from "../api";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { CitySelect, SampleDataBadge, Select, SourceChip } from "../components/ui";
import { Loading, ErrorState } from "../components/Status";
import { inr, num } from "../utils/format";
import { REPORT_THRESHOLD } from "../config";

export default function Home() {
  const { meta, city, cityById } = useMeta();
  const [material, setMaterial] = useState("pet");
  const [grade, setGrade] = useState("B");

  const lookup = useAsync(() => getPrices({ city, material, grade }), [city, material, grade]);
  const stats = useAsync(() => getImpactSummary({ city }), [city]);
  const range = lookup.data?.ranges[0];

  return (
    <div className="stack-lg">
      <section className="hero">
        <div className="eyebrow">For scrap shops and waste-picker NGOs</div>
        <h1 className="hero-title">Know the fair price before you sell.</h1>
        <p className="lede">
          Local price ranges for recyclables, with the source and date on every number. Log what you were offered,
          anonymously, and see how it compares.
        </p>
        <div className="row">
          <Link className="btn" to="/prices">
            See price ranges
          </Link>
          <Link className="btn ghost" to="/report">
            Report an offer
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="row spread">
          <h2>Quick lookup</h2>
          <SampleDataBadge />
        </div>
        <div className="filters">
          <CitySelect id="home-city" />
          <Select
            id="home-material"
            label="Material"
            value={material}
            onChange={setMaterial}
            options={meta.materials.map((m) => ({ value: m.id, label: m.name }))}
          />
          <Select
            id="home-grade"
            label="Grade"
            value={grade}
            onChange={setGrade}
            options={meta.grades.map((g) => ({ value: g.id, label: g.label }))}
          />
        </div>
        {lookup.loading && <Loading label="Finding the range" />}
        {lookup.error && <ErrorState error={lookup.error} onRetry={lookup.reload} />}
        {range && (
          <div className="lookup-result">
            <div className="lookup-range">
              {inr(range.min)}–{inr(range.max)} <span className="muted">per kg</span>
            </div>
            <div>
              <div>
                Median <b>{inr(range.median)}</b> in {cityById(city).name}
              </div>
              <SourceChip source={range.source} asOf={range.asOf} sampleSize={range.sampleSize} />
            </div>
          </div>
        )}
      </section>

      {stats.data && (
        <section className="kpis">
          <div className="kpi">
            <div className="kpi-v">{stats.data.avgGapPct}%</div>
            <div className="kpi-l">average gap below the fair range in {cityById(city).name}</div>
          </div>
          <div className="kpi">
            <div className="kpi-v">{num(stats.data.reports)}</div>
            <div className="kpi-l">anonymous offers logged</div>
          </div>
          <div className="kpi">
            <div className="kpi-v">{(stats.data.co2eAvoidedKg / 1000).toFixed(1)} t</div>
            <div className="kpi-l">CO2e avoided (estimate)</div>
          </div>
        </section>
      )}

      <section className="grid3">
        <div className="card">
          <h3>Price Range Board</h3>
          <p className="muted">Ranges by city, material and grade. Never a single number.</p>
        </div>
        <div className="card">
          <h3>What was I offered?</h3>
          <p className="muted">A two-minute anonymous form. Nothing shows for an area until {REPORT_THRESHOLD} reports exist.</p>
        </div>
        <div className="card">
          <h3>Impact Dashboard</h3>
          <p className="muted">Gap trend, kg sold at a fair price, and estimated CO2e and landfill impact.</p>
        </div>
      </section>
    </div>
  );
}
