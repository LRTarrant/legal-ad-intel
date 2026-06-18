"use client";

/**
 * County Intelligence — combined accident-exposure + judicial-leaning map.
 *
 * Ported from the Claude Design "Alabama County Intelligence" surface. Merges
 * what used to be two separate tables (per-county accident data + judicial
 * profiles) into one visual: a color-coded county map with three view modes
 * (judicial profile / fatality heat / overlay), a hover/select detail panel,
 * and a collapsible, CSV-exportable full table.
 *
 * Reusable across states: pass the per-county `rows` (live, from
 * get_state_accident_summary) plus the static `geometry` for that state.
 */

import { useState, useMemo } from "react";

export interface CountyIntelRow {
  county: string;
  total_population: number | null;
  fatal_crashes: number;
  total_deaths: number;
  truck_deaths: number;
  moto_deaths: number;
  deaths_per_100k: number | null;
  rural_pct: number | null;
  judicial_profile: string | null;
}

export interface CountyGeometry {
  name: string;
  d: string;
}

interface Props {
  rows: CountyIntelRow[];
  geometry: CountyGeometry[];
  viewBox: { width: number; height: number };
  stateName: string;
  /** e.g. "alabama-county-intelligence.csv" */
  csvFileName: string;
  defaultView?: ViewMode;
}

type ViewMode = "judicial" | "heat" | "overlay";
type MetricKey = "rate" | "deaths" | "truck" | "moto";
type SortKey =
  | "name"
  | "pop"
  | "crashes"
  | "deaths"
  | "truck"
  | "moto"
  | "rate"
  | "rural"
  | "profile";

interface MergedCounty {
  name: string;
  d: string;
  profile: string; // "Conservative" | "Liberal" | "Moderate" | "Unknown"
  pop: number | null;
  crashes: number;
  deaths: number;
  truck: number;
  moto: number;
  rate: number | null;
  rural: number | null;
}

const JUD_COLORS: Record<string, string> = {
  Conservative: "#D64550",
  Liberal: "#2F6FED",
  Moderate: "#E0A030",
  Unknown: "#94A3B8",
};

const PROFILE_ORDER = ["Conservative", "Liberal", "Moderate"];

const HEAT_STOPS = [
  [233, 243, 244],
  [170, 216, 221],
  [95, 184, 196],
  [26, 140, 150],
  [17, 86, 98],
  [11, 29, 58],
];

const METRIC_META: Record<MetricKey, { label: string; dec: number; field: keyof MergedCounty }> = {
  rate: { label: "Deaths per 100K", dec: 1, field: "rate" },
  deaths: { label: "Total deaths", dec: 0, field: "deaths" },
  truck: { label: "Truck deaths", dec: 0, field: "truck" },
  moto: { label: "Motorcycle deaths", dec: 0, field: "moto" },
};

function tint(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (k: number) => Math.round(k + (255 - k) * amt);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function ramp(t: number): string {
  const stops = HEAT_STOPS;
  t = Math.max(0, Math.min(1, t));
  const seg = (stops.length - 1) * t;
  const i = Math.floor(seg);
  const f = seg - i;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  const c = (k: number) => Math.round(a[k] + (b[k] - a[k]) * f);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString();
}

function profileOf(raw: string | null): string {
  if (!raw) return "Unknown";
  const p = raw.trim().toLowerCase();
  if (p.includes("conservative")) return "Conservative";
  if (p.includes("liberal")) return "Liberal";
  if (p.includes("moderate")) return "Moderate";
  return "Unknown";
}

export function CountyIntelligenceMap({
  rows,
  geometry,
  viewBox,
  stateName,
  csvFileName,
  defaultView = "judicial",
}: Props) {
  const [mode, setMode] = useState<ViewMode>(defaultView);
  const [metric, setMetric] = useState<MetricKey>("rate");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("rate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");
  const [tableOpen, setTableOpen] = useState(false);

  /* -- Join live rows onto static geometry -- */
  const counties: MergedCounty[] = useMemo(() => {
    const byName = new Map<string, CountyIntelRow>();
    for (const r of rows) byName.set(r.county.toLowerCase(), r);
    return geometry.map((g) => {
      const r = byName.get(g.name.toLowerCase());
      return {
        name: g.name,
        d: g.d,
        profile: profileOf(r?.judicial_profile ?? null),
        pop: r?.total_population ?? null,
        crashes: r?.fatal_crashes ?? 0,
        deaths: r?.total_deaths ?? 0,
        truck: r?.truck_deaths ?? 0,
        moto: r?.moto_deaths ?? 0,
        rate: r?.deaths_per_100k ?? null,
        rural: r?.rural_pct ?? null,
      };
    });
  }, [rows, geometry]);

  /* -- Profile counts / chips -- */
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of counties) c[x.profile] = (c[x.profile] || 0) + 1;
    return c;
  }, [counties]);

  /* -- Heat domain for the selected metric -- */
  const metricField = METRIC_META[metric].field;
  const { min, max } = useMemo(() => {
    const vals = counties
      .map((c) => c[metricField] as number | null)
      .filter((v): v is number => v != null);
    return {
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals) : 1,
    };
  }, [counties, metricField]);

  const heatOf = (v: number | null): string => {
    if (v == null) return "#EEF2F6";
    if (max <= min) return ramp(0);
    return ramp(Math.sqrt((v - min) / (max - min)));
  };

  /* -- Rank-by-rate lookup -- */
  const rateRank = useMemo(() => {
    const ranked = [...counties]
      .filter((c) => c.rate != null)
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    const m = new Map<string, number>();
    ranked.forEach((c, i) => m.set(c.name, i + 1));
    return m;
  }, [counties]);

  const activeName = hovered || selected;
  const active = counties.find((c) => c.name === activeName) || null;
  const isJud = mode === "judicial";

  /* -- State summary -- */
  const totDeaths = counties.reduce((s, c) => s + c.deaths, 0);
  const totCrashes = counties.reduce((s, c) => s + c.crashes, 0);
  const topRate = [...counties]
    .filter((c) => c.rate != null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

  /* -- Table rows -- */
  const tableRows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const dir = sortDir === "asc" ? 1 : -1;
    return [...counties]
      .filter((c) => !f || c.name.toLowerCase().includes(f))
      .sort((a, b) => {
        let av: string | number | null;
        let bv: string | number | null;
        switch (sortKey) {
          case "name":
            return a.name.localeCompare(b.name) * dir;
          case "profile":
            return a.profile.localeCompare(b.profile) * dir;
          case "pop":
            av = a.pop;
            bv = b.pop;
            break;
          case "crashes":
            av = a.crashes;
            bv = b.crashes;
            break;
          case "deaths":
            av = a.deaths;
            bv = b.deaths;
            break;
          case "truck":
            av = a.truck;
            bv = b.truck;
            break;
          case "moto":
            av = a.moto;
            bv = b.moto;
            break;
          case "rural":
            av = a.rural;
            bv = b.rural;
            break;
          case "rate":
          default:
            av = a.rate;
            bv = b.rate;
            break;
        }
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return ((av as number) - (bv as number)) * dir;
      });
  }, [counties, filter, sortKey, sortDir]);

  function setSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "profile" ? "asc" : "desc");
    }
  }

  function downloadCsv() {
    const head = [
      "County",
      "Population",
      "Fatal Crashes",
      "Total Deaths",
      "Truck Deaths",
      "Motorcycle Deaths",
      "Deaths per 100K",
      "Rural %",
      "Judicial Profile",
    ];
    const lines = [head.join(",")];
    for (const c of tableRows) {
      lines.push(
        [
          c.name,
          c.pop ?? "",
          c.crashes,
          c.deaths,
          c.truck,
          c.moto,
          c.rate ?? "",
          c.rural ?? "",
          c.profile,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const segStyle = (on: boolean): React.CSSProperties => ({
    padding: "7px 13px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    border: "none",
    borderRadius: 7,
    cursor: "pointer",
    background: on ? "#0B1D3A" : "transparent",
    color: on ? "#fff" : "#6B7280",
    transition: "background 120ms ease, color 120ms ease",
    whiteSpace: "nowrap",
  });

  const dec = METRIC_META[metric].dec;

  const colDefs: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: "County", align: "left" },
    { key: "pop", label: "Population", align: "right" },
    { key: "crashes", label: "Fatal Crashes", align: "right" },
    { key: "deaths", label: "Total Deaths", align: "right" },
    { key: "truck", label: "Truck", align: "right" },
    { key: "moto", label: "Moto", align: "right" },
    { key: "rate", label: "Deaths/100K", align: "right" },
    { key: "rural", label: "Rural %", align: "right" },
    { key: "profile", label: "Judicial", align: "left" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(11,29,58,.06)",
        padding: 24,
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A8C96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0B1D3A", margin: 0 }}>County Intelligence</h2>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6B7280" }}>
            Accident exposure and judicial leaning across all {counties.length}{" "}
            {stateName} counties &mdash; one combined view.
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "#6B7280",
            background: "#F1F5F9",
            border: "1px solid #E2E8F0",
            borderRadius: 999,
            padding: "5px 11px",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "#1A8C96", display: "inline-block" }} />
          Merges &ldquo;Accident Data&rdquo; + &ldquo;Judicial Profiles&rdquo;
        </span>
      </div>

      {/* profile chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {PROFILE_ORDER.map((k) => {
          const col = JUD_COLORS[k];
          return (
            <span
              key={k}
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 11px",
                borderRadius: 999,
                background: tint(col, 0.85),
                color: col,
                border: `1px solid ${tint(col, 0.6)}`,
              }}
            >
              {counts[k] || 0} {k}
            </span>
          );
        })}
      </div>

      {/* controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 5 }}>
            View
          </div>
          <div style={{ display: "inline-flex", gap: 3, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 9, padding: 3 }}>
            {([
              ["judicial", "Judicial profile"],
              ["heat", "Fatality heat"],
              ["overlay", "Overlay"],
            ] as [ViewMode, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} style={segStyle(mode === k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {mode !== "judicial" && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 5 }}>
              Heat metric
            </div>
            <div style={{ display: "inline-flex", gap: 3, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 9, padding: 3 }}>
              {([
                ["rate", "Deaths/100K"],
                ["deaths", "Total deaths"],
                ["truck", "Truck"],
                ["moto", "Motorcycle"],
              ] as [MetricKey, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setMetric(k)} style={segStyle(metric === k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* map + side panel */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 18, alignItems: "stretch" }}>
        {/* map */}
        <div
          style={{
            flex: "1 1 440px",
            minWidth: 320,
            position: "relative",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            background: "#FBFCFD",
            padding: 10,
          }}
        >
          <svg
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            style={{ width: "100%", height: "auto", maxHeight: 600, display: "block", overflow: "visible" }}
          >
            {counties.map((c) => {
              const isActive = c.name === hovered || c.name === selected;
              let fill: string;
              let stroke: string;
              let sw: number;
              if (mode === "judicial") {
                fill = tint(JUD_COLORS[c.profile], 0.45);
                stroke = "#ffffff";
                sw = 0.8;
              } else if (mode === "heat") {
                fill = heatOf(c[metricField] as number | null);
                stroke = "#ffffff";
                sw = 0.6;
              } else {
                fill = heatOf(c[metricField] as number | null);
                stroke = JUD_COLORS[c.profile];
                sw = 2.2;
              }
              if (isActive) {
                stroke = "#0B1D3A";
                sw = mode === "overlay" ? 3 : 1.8;
              }
              return (
                <path
                  key={c.name}
                  d={c.d}
                  style={{
                    fill,
                    stroke,
                    strokeWidth: sw,
                    cursor: "pointer",
                    transition: "fill 140ms ease, stroke 140ms ease",
                    strokeLinejoin: "round",
                  }}
                  onMouseEnter={() => setHovered(c.name)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected((s) => (s === c.name ? null : c.name))}
                />
              );
            })}
          </svg>
        </div>

        {/* side panel */}
        <div style={{ flex: "1 1 300px", minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* legend */}
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", background: "#fff" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 10 }}>
              {isJud ? "Judicial profile" : mode === "overlay" ? "Overlay key" : "Fatality heat"}
            </div>

            {isJud ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PROFILE_ORDER.map((k) => {
                  const col = JUD_COLORS[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: tint(col, 0.45), border: `1px solid ${col}`, display: "inline-block", flex: "none" }} />
                      <span style={{ fontSize: 13, color: "#1E1E2E", fontWeight: 500 }}>{k}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                        {counts[k] || 0} counties
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#1E1E2E", fontWeight: 600, marginBottom: 8 }}>{METRIC_META[metric].label}</div>
                <div
                  style={{
                    height: 12,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${ramp(0)}, ${ramp(0.4)}, ${ramp(0.7)}, ${ramp(1)})`,
                    border: "1px solid #E2E8F0",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                  <span>{min.toFixed(dec)}</span>
                  <span>{max.toFixed(dec)}</span>
                </div>
                {mode === "overlay" && (
                  <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px dashed #E2E8F0" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 7 }}>Outline = judicial profile</div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {PROFILE_ORDER.map((k) => {
                        const col = JUD_COLORS[k];
                        return (
                          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 13, height: 13, borderRadius: 4, background: "#fff", border: `2.5px solid ${col}`, display: "inline-block", flex: "none" }} />
                            <span style={{ fontSize: 12, color: "#1E1E2E" }}>{k}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* active county detail */}
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, background: "#fff", flex: 1, minHeight: 200 }}>
            {active ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0B1D3A", margin: 0 }}>{active.name} County</h3>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: tint(JUD_COLORS[active.profile], 0.85),
                      color: JUD_COLORS[active.profile],
                      whiteSpace: "nowrap",
                    }}
                  >
                    {active.profile}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                    background: "#EEF2F6",
                    border: "1px solid #EEF2F6",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginTop: 14,
                  }}
                >
                  {[
                    { label: "Population", value: fmt(active.pop) },
                    { label: "Deaths / 100K", value: active.rate != null ? active.rate.toFixed(1) : "—" },
                    { label: "Fatal crashes", value: fmt(active.crashes) },
                    { label: "Total deaths", value: fmt(active.deaths) },
                    { label: "Truck deaths", value: fmt(active.truck) },
                    { label: "Motorcycle", value: fmt(active.moto) },
                    { label: "Rural share", value: active.rural != null ? active.rural.toFixed(1) + "%" : "—" },
                    { label: "Rank by rate", value: rateRank.has(active.name) ? "#" + rateRank.get(active.name) : "—" },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "#fff", padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" }}>{s.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#0B1D3A", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {selected && selected === activeName && (
                  <button
                    onClick={() => setSelected(null)}
                    style={{ marginTop: 12, fontSize: 12, color: "#1A8C96", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                  >
                    Clear selection &times;
                  </button>
                )}
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 14 }}>Hover or tap a county for detail.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { label: "Counties", value: String(counties.length) },
                    { label: "Total fatal crashes", value: fmt(totCrashes) },
                    { label: "Total deaths", value: fmt(totDeaths) },
                    { label: "Highest rate", value: topRate && topRate.rate != null ? `${topRate.name} (${topRate.rate.toFixed(0)})` : "—" },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#6B7280" }}>{s.label}</span>
                      <span style={{ color: "#0B1D3A", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* merged table */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0B1D3A", margin: 0 }}>All counties</h3>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>&mdash; full detail for every county</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => setTableOpen((o) => !o)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                padding: "7px 12px",
                borderRadius: 7,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 120ms ease",
                border: "1px solid #E2E8F0",
                background: tableOpen ? "#0B1D3A" : "#fff",
                color: tableOpen ? "#fff" : "#0B1D3A",
              }}
            >
              {tableOpen ? "Hide table" : `Show full table (${counties.length})`}
            </button>
            <button
              onClick={downloadCsv}
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                padding: "7px 12px",
                borderRadius: 7,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background 120ms ease",
                border: "1px solid #1A8C96",
                background: "#fff",
                color: "#1A8C96",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: -2 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download CSV
            </button>
          </div>
        </div>

        {tableOpen && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Filter by county name..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  borderRadius: 7,
                  padding: "7px 11px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: "#0B1D3A",
                  width: 240,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: "auto" }}>
                {tableRows.length} of {counties.length}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                    {colDefs.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => setSort(col.key)}
                        style={{
                          padding: "10px 8px",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: ".05em",
                          textTransform: "uppercase",
                          color: sortKey === col.key ? "#0B1D3A" : "#94A3B8",
                          cursor: "pointer",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                          textAlign: col.align,
                        }}
                      >
                        {col.label}
                        {sortKey === col.key ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((c) => {
                    const isActive = c.name === hovered || c.name === selected;
                    const col = JUD_COLORS[c.profile];
                    return (
                      <tr
                        key={c.name}
                        onMouseEnter={() => setHovered(c.name)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setSelected((s) => (s === c.name ? null : c.name))}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          background: isActive ? "rgba(26,140,150,.10)" : "#fff",
                          cursor: "pointer",
                          transition: "background 120ms ease",
                        }}
                      >
                        <td style={{ padding: "9px 8px", fontSize: 12, fontWeight: 600, color: "#0B1D3A", whiteSpace: "nowrap" }}>{c.name}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums" }}>{fmt(c.pop)}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums" }}>{fmt(c.crashes)}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", fontWeight: 700, color: "#0B1D3A", fontVariantNumeric: "tabular-nums" }}>{fmt(c.deaths)}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums" }}>{fmt(c.truck)}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums" }}>{fmt(c.moto)}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", fontWeight: 700, color: "#0B1D3A", fontVariantNumeric: "tabular-nums" }}>{c.rate != null ? c.rate.toFixed(1) : "—"}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12, textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums" }}>{c.rural != null ? c.rural.toFixed(1) + "%" : "—"}</td>
                        <td style={{ padding: "9px 8px" }}>
                          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: tint(col, 0.85), color: col, whiteSpace: "nowrap" }}>{c.profile}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* insight callout */}
      <div style={{ marginTop: 18, borderLeft: "3px solid #1A8C96", background: "#F0FAFB", borderRadius: "0 8px 8px 0", padding: "13px 16px" }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#334155" }}>
          High-opportunity markets combine a high fatality rate with a plaintiff-friendly (Liberal) judicial profile. Switch to{" "}
          <strong>Overlay</strong> to read both signals at once &mdash; fill shows fatality intensity, the outline shows judicial leaning. Counties dark in fill with a blue outline are the strongest ROI for plaintiff-firm advertising.
        </p>
      </div>
    </div>
  );
}
