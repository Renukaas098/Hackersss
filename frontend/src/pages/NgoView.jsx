import { useState } from "react";
import { exportNgoCsv, getNgoSummary } from "../api";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { CitySelect, GapStatus, PageHeader } from "../components/ui";
import { Loading, ErrorState, Empty } from "../components/Status";
import { inr, num, today } from "../utils/format";

function downloadText(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function NgoView() {
  const { city, cityById } = useMeta();
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState(today());
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const { data, error, loading, reload } = useAsync(() => getNgoSummary({ city, from, to }), [city, from, to]);

  async function onExport() {
    setExporting(true);
    setExportMsg("");
    try {
      const csv = await exportNgoCsv({ city, from, to });
      downloadText(csv, `underpayment-${city}-${from}-to-${to}.csv`);
      setExportMsg("CSV downloaded.");
    } catch (err) {
      setExportMsg(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title={`Underpayment by area, ${cityById(city).name}`}
        subtitle={`For advocacy and rate negotiation. Areas with fewer than ${data?.threshold ?? 5} reports are left out.`}
      />
      <div className="filters">
        <CitySelect id="ngo-city" />
        <label className="field" htmlFor="ngo-from">
          From
          <input id="ngo-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field" htmlFor="ngo-to">
          To
          <input id="ngo-to" type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="btn" type="button" onClick={onExport} disabled={exporting || !data?.rows.length}>
          {exporting ? "Preparing…" : "Export CSV"}
        </button>
        {exportMsg && (
          <span className="note" role="status">
            {exportMsg}
          </span>
        )}
      </div>

      {loading && <Loading label="Loading area summary" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && !data.rows.length && <Empty>No area in this city has enough reports for this period yet.</Empty>}
      {data?.rows.length > 0 && (
        <div className="table-box">
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th className="num">Reports</th>
                <th>Biggest gap in</th>
                <th className="num">Median offered</th>
                <th className="num">Fair median</th>
                <th>Gap</th>
                <th className="num">₹ lost per tonne</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.areaId}>
                  <td>
                    <b>{r.area}</b>
                  </td>
                  <td className="num">{r.reports}</td>
                  <td>{r.worstMaterial}</td>
                  <td className="num">{inr(r.medianOffered)}</td>
                  <td className="num">{inr(r.prevailingMedian)}</td>
                  <td>
                    <GapStatus gapPct={r.gapPct} />
                  </td>
                  <td className="num">{num(r.underpaidPerTonne)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
