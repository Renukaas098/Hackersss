import { getAssumptions, getSources } from "../api";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { PageHeader } from "../components/ui";
import { Loading, ErrorState } from "../components/Status";

const SOURCE_TYPES = {
  recycler_rate_list: "Recycler rate list",
  ngo_sheet: "NGO rate sheet",
  municipal: "Municipal rates",
  shop_reports: "Shop reports",
};

export default function Methodology() {
  const { meta, cityById, materialById } = useMeta();
  const assumptions = useAsync(() => getAssumptions(), []);
  const sources = useAsync(() => getSources(), []);
  const a = assumptions.data;

  return (
    <div className="stack">
      <PageHeader title="How the numbers are made" subtitle="Every figure on this site comes from the rules below." />

      {(assumptions.loading || sources.loading) && <Loading />}
      {assumptions.error && <ErrorState error={assumptions.error} onRetry={assumptions.reload} />}

      {a && (
        <div className="grid2">
          <div className="card">
            <h3>Privacy threshold</h3>
            <p className="muted">
              An area figure appears only after <b>{a.threshold}</b> reports for that area. Individual reports, buyers and
              shops are never shown.
            </p>
          </div>
          <div className="card">
            <h3>Price gap</h3>
            <p className="muted">
              <code>{a.gapFormula}</code>. The prevailing median uses grade {a.prevailingGrade}.
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Material grades</h3>
        <ul className="tight muted">
          {meta.grades.map((g) => (
            <li key={g.id}>
              <b>{g.label}</b>: {g.description}
            </li>
          ))}
        </ul>
      </div>

      {a && (
        <div className="table-box">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th className="num">kg CO2e avoided per kg</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {a.emissionFactors.map((e) => (
                <tr key={e.materialId}>
                  <td>{materialById(e.materialId).name}</td>
                  <td className="num">{e.kgCO2ePerKg}</td>
                  <td>
                    {e.status === "placeholder" ? <span className="pill warn">Placeholder</span> : e.source}
                    {e.status === "placeholder" && <span className="note"> {e.source}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sources.data && (
        <div className="table-box">
          <table>
            <thead>
              <tr>
                <th>Price source</th>
                <th>Type</th>
                <th>City</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {sources.data.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{SOURCE_TYPES[s.type] || s.type}</td>
                  <td>{s.cityId ? cityById(s.cityId).name : "All cities"}</td>
                  <td>{s.asOf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3>Limitations</h3>
        <ul className="tight muted">
          <li>We cannot change the market price. We close the gap between what sellers are offered and what the market pays.</li>
          <li>Data quality depends on partners and reports. The pilot is how we validate it.</li>
          <li>All dashboard figures in this version are illustrative sample data.</li>
        </ul>
      </div>
    </div>
  );
}
