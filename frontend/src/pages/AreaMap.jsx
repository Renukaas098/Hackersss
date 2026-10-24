import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { getAreaGaps } from "../api";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { CitySelect, GapStatus, PageHeader, ThresholdNotice } from "../components/ui";
import { Loading, ErrorState } from "../components/Status";
import { GAP_BANDS, cssVar, gapBand } from "../utils/format";

const BAND_VAR = { good: "--good", warn: "--warn", crit: "--crit", none: "--none" };

export default function AreaMap() {
  const { city, cityById, materialById } = useMeta();
  const { data, error, loading, reload } = useAsync(() => getAreaGaps({ city }), [city]);
  const c = cityById(city);

  return (
    <div className="stack">
      <PageHeader
        title={`Price gaps by area in ${c.name}`}
        subtitle="Median gap between the offered price and the local range, all materials."
      />
      <div className="filters">
        <CitySelect id="map-city" />
      </div>

      {loading && <Loading label="Loading areas" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="map-box">
            <MapContainer key={city} center={c.center} zoom={12} scrollWheelZoom={false} style={{ height: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {data.areas.map((a) => {
                const band = gapBand(a.medianGapPct);
                const color = cssVar(BAND_VAR[band.key]);
                return (
                  <CircleMarker
                    key={a.areaId}
                    center={[a.lat, a.lng]}
                    radius={8 + Math.sqrt(a.reportCount) * 2.5}
                    pathOptions={{
                      color: a.visible ? "#ffffff" : color,
                      weight: 2,
                      dashArray: a.visible ? null : "4 4",
                      fillColor: color,
                      fillOpacity: a.visible ? 0.85 : 0.25,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>
                      <b>{a.name}</b>
                      <br />
                      {a.visible
                        ? `${a.medianGapPct}% median gap · ${a.reportCount} reports`
                        : `Not enough reports (${a.reportCount} of ${data.threshold})`}
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          <div className="legend">
            {GAP_BANDS.map((b) => (
              <span key={b.key} className="gap-status">
                <i className={`dot ${b.key}`} aria-hidden="true" />
                {b.label}
              </span>
            ))}
          </div>

          {/* Table view of the same data: needed for accessibility and for the demo if tiles fail to load. */}
          <div className="table-box">
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th className="num">Reports</th>
                  <th>Median gap</th>
                  <th>Biggest gap in</th>
                </tr>
              </thead>
              <tbody>
                {[...data.areas]
                  .sort((x, y) => (y.medianGapPct ?? -1) - (x.medianGapPct ?? -1))
                  .map((a) => (
                    <tr key={a.areaId}>
                      <td>
                        <b>{a.name}</b>
                      </td>
                      <td className="num">{a.reportCount}</td>
                      <td>
                        {a.visible ? (
                          <GapStatus gapPct={a.medianGapPct}>
                            {a.medianGapPct}% · {gapBand(a.medianGapPct).label}
                          </GapStatus>
                        ) : (
                          <ThresholdNotice count={a.reportCount} threshold={data.threshold} />
                        )}
                      </td>
                      <td>{a.worstMaterialId ? materialById(a.worstMaterialId).name : "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
