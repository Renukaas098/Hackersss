import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { submitReport } from "../api";
import { useMeta } from "../context/MetaContext";
import { CitySelect, PageHeader, RangeBar, SourceChip } from "../components/ui";
import { inr, today } from "../utils/format";

const BUYERS = [
  { value: "aggregator", label: "Aggregator" },
  { value: "recycler", label: "Recycler" },
  { value: "other_shop", label: "Another scrap shop" },
  { value: "other", label: "Other" },
];

function emptyForm(city, areas) {
  return {
    areaId: areas.find((a) => a.cityId === city)?.id || "",
    materialId: "pet",
    grade: "B",
    quantityKg: "",
    offeredPrice: "",
    buyerType: "aggregator",
    offeredOn: today(),
  };
}

export default function ReportOffer() {
  const { meta, city, cityById, materialById, gradeById } = useMeta();
  const [form, setForm] = useState(() => emptyForm(city, meta.areas));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [result, setResult] = useState(null);

  const cityAreas = meta.areas.filter((a) => a.cityId === city);

  // Keep the area valid when the city changes.
  useEffect(() => {
    setForm((f) => (cityAreas.some((a) => a.id === f.areaId) ? f : { ...f, areaId: cityAreas[0]?.id || "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function validate() {
    const e = {};
    const qty = Number(form.quantityKg);
    const price = Number(form.offeredPrice);
    if (!form.areaId) e.areaId = "Pick your area.";
    if (!(qty >= 0.1 && qty <= 5000)) e.quantityKg = "Enter a quantity between 0.1 and 5000 kg.";
    if (!(price > 0)) e.offeredPrice = "Enter the price you were offered in ₹ per kg.";
    if (!form.offeredOn || form.offeredOn > today()) e.offeredOn = "Pick a date that is not in the future.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await submitReport({
        cityId: city,
        ...form,
        quantityKg: Number(form.quantityKg),
        offeredPrice: Number(form.offeredPrice),
      });
      setResult({ ...res, materialId: form.materialId, grade: form.grade, cityId: city });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const c = result.comparison;
    const below = c.gapPct > 0;
    return (
      <div className="stack">
        <div className="thanks">
          <div className="eyebrow">Thank you. Your report is anonymous.</div>
          <div className="thanks-row">
            <div className="thanks-big">{inr(c.offeredPrice)}/kg</div>
            <p>
              You were offered{" "}
              <b>
                {Math.abs(c.gapPct)}% {below ? "below" : "above"}
              </b>{" "}
              the local median for {materialById(result.materialId).name}, {gradeById(result.grade).label}, in{" "}
              {cityById(result.cityId).name}.
            </p>
          </div>
          <RangeBar min={c.min} max={c.max} median={c.median} offered={c.offeredPrice} />
          <div className="row spread note">
            <span>
              Range {inr(c.min)}–{inr(c.max)} · median {inr(c.median)}
            </span>
            <SourceChip source={c.source} asOf={c.asOf} />
          </div>
          {result.flagged && (
            <p className="note">This price is far from the usual range, so it will be checked before it counts.</p>
          )}
          <p className="note">
            {result.area.name} now has {result.area.reportCount} reports.{" "}
            {result.area.visible
              ? "It shows on the area map."
              : `It appears on the map after ${result.area.threshold} reports.`}{" "}
            We never show a single report or the name of a buyer.
          </p>
          <div className="row">
            <button
              className="btn"
              type="button"
              onClick={() => {
                setResult(null);
                setForm(emptyForm(city, meta.areas));
              }}
            >
              Report another offer
            </button>
            <Link className="btn ghost" to="/prices">
              See all prices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeader
        title="What were you offered?"
        subtitle="Takes under two minutes. We do not ask for your name, phone number, or shop name."
      />
      <form className="card form-grid" onSubmit={onSubmit} noValidate>
        <CitySelect id="rep-city" />
        <label className="field" htmlFor="rep-area">
          Area
          <select id="rep-area" value={form.areaId} onChange={set("areaId")} aria-invalid={!!errors.areaId}>
            {cityAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.areaId && <span className="field-error">{errors.areaId}</span>}
        </label>
        <label className="field" htmlFor="rep-material">
          Material
          <select id="rep-material" value={form.materialId} onChange={set("materialId")}>
            {meta.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="rep-grade">
          Grade
          <select id="rep-grade" value={form.grade} onChange={set("grade")}>
            {meta.grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}: {g.description}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="rep-qty">
          Quantity (kg)
          <input
            id="rep-qty"
            type="number"
            inputMode="decimal"
            min="0.1"
            max="5000"
            step="0.1"
            placeholder="e.g. 40"
            value={form.quantityKg}
            onChange={set("quantityKg")}
            aria-invalid={!!errors.quantityKg}
          />
          {errors.quantityKg && <span className="field-error">{errors.quantityKg}</span>}
        </label>
        <label className="field" htmlFor="rep-price">
          Price offered (₹ per kg)
          <input
            id="rep-price"
            type="number"
            inputMode="decimal"
            min="0.5"
            step="0.5"
            placeholder="e.g. 15"
            value={form.offeredPrice}
            onChange={set("offeredPrice")}
            aria-invalid={!!errors.offeredPrice}
          />
          {errors.offeredPrice && <span className="field-error">{errors.offeredPrice}</span>}
        </label>
        <label className="field" htmlFor="rep-buyer">
          Who offered it?
          <select id="rep-buyer" value={form.buyerType} onChange={set("buyerType")}>
            {BUYERS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="rep-date">
          Date of offer
          <input
            id="rep-date"
            type="date"
            max={today()}
            value={form.offeredOn}
            onChange={set("offeredOn")}
            aria-invalid={!!errors.offeredOn}
          />
          {errors.offeredOn && <span className="field-error">{errors.offeredOn}</span>}
        </label>
        <div className="form-actions">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
          {serverError && (
            <span className="field-error" role="alert">
              {serverError}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
