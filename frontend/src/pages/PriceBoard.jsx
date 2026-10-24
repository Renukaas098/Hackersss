import { useMemo, useState } from "react";
import { getPrices } from "../api";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { CitySelect, PageHeader, RangeBar, Select, SourceChip } from "../components/ui";
import { Loading, ErrorState, Empty } from "../components/Status";
import { inr } from "../utils/format";

export default function PriceBoard() {
  const { meta, city, cityById, materialById } = useMeta();
  const [category, setCategory] = useState("all");
  const [material, setMaterial] = useState("all");
  const [grade, setGrade] = useState("B");
  const [sort, setSort] = useState("material");

  // Category is filtered here; material and grade go to the server.
  const { data, error, loading, reload } = useAsync(() => getPrices({ city, material, grade }), [city, material, grade]);

  const categories = [...new Set(meta.materials.map((m) => m.category))];
  const materialOptions = meta.materials.filter((m) => category === "all" || m.category === category);

  const rows = useMemo(() => {
    if (!data) return [];
    const list = data.ranges.filter((r) => category === "all" || materialById(r.materialId).category === category);
    const order = meta.materials.map((m) => m.id);
    return [...list].sort((a, b) =>
      sort === "price"
        ? b.median - a.median
        : order.indexOf(a.materialId) - order.indexOf(b.materialId) || a.grade.localeCompare(b.grade)
    );
  }, [data, category, sort, meta.materials, materialById]);

  const scaleMax = Math.max(1, ...rows.map((r) => r.max)) * 1.05;

  return (
    <div className="stack">
      <PageHeader
        title={`Price ranges in ${cityById(city).name}`}
        subtitle={`₹ per kg paid by shops and aggregators${data ? `. Updated ${data.updatedAt}.` : "."}`}
      />
      <div className="filters">
        <CitySelect id="pb-city" />
        <Select
          id="pb-category"
          label="Category"
          value={category}
          allLabel="All"
          onChange={(v) => {
            setCategory(v);
            setMaterial("all");
          }}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
        <Select
          id="pb-material"
          label="Material"
          value={material}
          allLabel="All"
          onChange={setMaterial}
          options={materialOptions.map((m) => ({ value: m.id, label: m.name }))}
        />
        <Select
          id="pb-grade"
          label="Grade"
          value={grade}
          allLabel="All grades"
          onChange={setGrade}
          options={meta.grades.map((g) => ({ value: g.id, label: g.label }))}
        />
        <Select
          id="pb-sort"
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "material", label: "Material" },
            { value: "price", label: "Highest median" },
          ]}
        />
      </div>

      {loading && <Loading label="Loading prices" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && !rows.length && <Empty>No ranges match these filters yet.</Empty>}
      {rows.length > 0 && (
        <div className="table-box">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Grade</th>
                <th className="num">Min</th>
                <th className="num">Median</th>
                <th className="num">Max</th>
                <th className="col-range">Range</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{materialById(r.materialId).name}</b>
                  </td>
                  <td>{r.grade}</td>
                  <td className="num">{inr(r.min)}</td>
                  <td className="num">
                    <b>{inr(r.median)}</b>
                  </td>
                  <td className="num">{inr(r.max)}</td>
                  <td className="col-range">
                    <RangeBar min={r.min} max={r.max} median={r.median} scaleMax={scaleMax} />
                  </td>
                  <td>
                    <SourceChip source={r.source} asOf={r.asOf} sampleSize={r.sampleSize} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="note">
        {meta.grades.map((g) => (
          <span key={g.id}>
            <b>{g.label}</b>: {g.description}.{" "}
          </span>
        ))}
      </p>
    </div>
  );
}
