// Small shared pieces used across pages.
import { useMeta } from "../context/MetaContext";
import { gapBand, inr } from "../utils/format";

export function SampleDataBadge() {
  return <span className="badge-sample">Sample data</span>;
}

export function PageHeader({ title, subtitle, sample = true, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="row">
        {children}
        {sample && <SampleDataBadge />}
      </div>
    </div>
  );
}

export function SourceChip({ source, asOf, sampleSize }) {
  return (
    <div className="source-chip">
      <div>{source?.name}</div>
      <div>
        {asOf}
        {sampleSize != null && ` · n=${sampleSize}`}
      </div>
    </div>
  );
}

// min–max bar with a median tick and an optional offered-price dot.
export function RangeBar({ min, max, median, offered, scaleMax }) {
  const top = scaleMax || Math.max(max, offered || 0) * 1.15;
  const pc = (v) => `${Math.max(0, Math.min(100, (v / top) * 100))}%`;
  return (
    <div className="rangebar" aria-label={`Range ${inr(min)} to ${inr(max)}, median ${inr(median)}`}>
      <div className="rb-range" style={{ left: pc(min), width: `calc(${pc(max)} - ${pc(min)})` }} />
      <div className="rb-median" style={{ left: pc(median) }} />
      {offered != null && <div className="rb-offer" style={{ left: pc(offered) }} title={`Offered ${inr(offered)}`} />}
    </div>
  );
}

export function GapStatus({ gapPct, children }) {
  const b = gapBand(gapPct);
  return (
    <span className="gap-status">
      <i className={`dot ${b.key}`} aria-hidden="true" />
      {children ?? (gapPct == null ? b.label : `${gapPct}%`)}
    </span>
  );
}

export function ThresholdNotice({ count, threshold }) {
  return (
    <span className="threshold">
      Not enough reports yet ({count} of {threshold})
    </span>
  );
}

export function CitySelect({ id = "city" }) {
  const { meta, city, setCity } = useMeta();
  return (
    <label className="field" htmlFor={id}>
      City
      <select id={id} value={city} onChange={(e) => setCity(e.target.value)}>
        {meta.cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Select({ id, label, value, onChange, options, allLabel }) {
  return (
    <label className="field" htmlFor={id}>
      {label}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel && <option value="all">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
