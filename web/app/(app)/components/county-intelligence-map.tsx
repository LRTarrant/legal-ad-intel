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
 *
 * Optional layers:
 *  - `demographics` — census race/income/poverty/age/commute per county.
 *  - `boating` — per-county USCG boating accidents/deaths/injuries; when present
 *    a "Boating" heat metric is added and boating deaths join the detail card.
 *  - `stateCode` + `farsYears`/`boatingYears` — enables an interactive year
 *    filter that re-queries get_state_accident_summary / get_state_boating_summary
 *    for a single year (NULL = all years, the default).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

/**
 * Years present in the source datasets (single source of truth for the year
 * dropdown + coverage caption across all callers). Extend FARS when a new NHTSA
 * Annual Report File year lands; extend boating when USCG BARD publishes a new
 * year. Both `fars_fatalities` and `boating_accidents` carry a plain `year` col.
 */
export const FARS_DATA_YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
export const BOATING_DATA_YEARS = [2019, 2020, 2021, 2022, 2023];

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

/** Per-county USCG boating summary (from get_state_boating_summary). */
export interface BoatingMapRow {
  county: string;
  accident_count: number;
  total_deaths: number;
  total_injuries: number;
}

export interface CountyGeometry {
  name: string;
  d: string;
}

export interface JudicialRow {
  county_name: string;
  judicial_profile: string | null;
}

/**
 * Per-county census demographics (from the `census_demographics` table). Optional
 * — when supplied, the detail card and table gain a demographics layer (race &
 * ethnicity mix, median income, poverty, median age, and mean commute time).
 * Joined to geometry/accident rows by normalized county name.
 */
export interface CountyDemographicsRow {
  county_name: string;
  median_age: number | null;
  pct_white: number | null;
  pct_black: number | null;
  pct_hispanic: number | null;
  pct_asian: number | null;
  pct_native: number | null;
  median_household_income: number | null;
  pct_poverty: number | null;
  mean_commute_minutes: number | null;
}

interface Props {
  rows: CountyIntelRow[];
  geometry: CountyGeometry[];
  viewBox: { width: number; height: number };
  stateName: string;
  /** e.g. "alabama-county-intelligence.csv" */
  csvFileName: string;
  /**
   * Optional separate judicial-profile list (e.g. getJudicialProfiles). Used to
   * color counties that have a profile but no accident rows, and as a fallback
   * when the accident row's judicial_profile is null.
   */
  judicialProfiles?: JudicialRow[];
  /**
   * Optional per-county census demographics. When present (and non-empty), the
   * detail card and table show a demographics layer including mean commute time.
   */
  demographics?: CountyDemographicsRow[];
  /**
   * Optional per-county boating summary. When provided, a "Boating" heat metric
   * is enabled and boating deaths/accidents/injuries appear in the detail card,
   * table, and CSV.
   */
  boating?: BoatingMapRow[];
  /** State abbreviation (e.g. "AL"). Required to enable the year filter. */
  stateCode?: string;
  /** Years available for the FARS crash data (drives the year dropdown). */
  farsYears?: number[];
  /** Years available for the USCG boating data (drives the coverage caption). */
  boatingYears?: number[];
  /** Link to the full boating analysis page. Default `/boating-accidents`. */
  boatingHref?: string;
  /** Link to the market (MSA) demographics page. Default `/market-demographics`. */
  marketsHref?: string;
  defaultView?: ViewMode;
}

type ViewMode = "judicial" | "heat" | "overlay";
type MetricKey = "rate" | "deaths" | "truck" | "moto" | "boating";
type SortKey =
  | "name"
  | "pop"
  | "crashes"
  | "deaths"
  | "truck"
  | "moto"
  | "boat"
  | "rate"
  | "rural"
  | "profile"
  | "white"
  | "black"
  | "hispanic"
  | "age"
  | "income"
  | "poverty"
  | "commute";

interface MergedCounty {
  /** Unique row identity (name is NOT unique — VA/MD/MO/NV have same-named city + county). */
  key: string;
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
  // Boating (null when the county has no boating row for the active year)
  boatAccidents: number | null;
  boatDeaths: number | null;
  boatInjuries: number | null;
  // Census demographics (null when no demographics row joined)
  white: number | null;
  black: number | null;
  hispanic: number | null;
  asian: number | null;
  native: number | null;
  income: number | null;
  poverty: number | null;
  age: number | null;
  commute: number | null;
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
  boating: { label: "Boating deaths", dec: 0, field: "boatDeaths" },
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

function money(n: number | null | undefined): string {
  return n == null ? "—" : "$" + Math.round(n / 1000) + "K";
}

function pct(n: number | null | undefined): string {
  return n == null ? "—" : n.toFixed(1) + "%";
}

function commuteFmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toFixed(1) + " min";
}

/** Accent used for the demographics layer (race bars, commute highlight). */
const DEMO_ACCENT = "#1A8C96";

function profileOf(raw: string | null): string {
  if (!raw) return "Unknown";
  const p = raw.trim().toLowerCase();
  if (p.includes("conservative")) return "Conservative";
  if (p.includes("liberal")) return "Liberal";
  if (p.includes("moderate")) return "Moderate";
  return "Unknown";
}

/**
 * Normalize a county name for joining across sources (geometry, accident rows,
 * judicial list): strip the trailing descriptor (County / Parish / Borough /
 * Census Area / Municipality) and all non-alphanumerics, then lowercase. This
 * collapses "DeKalb"/"De Kalb", "St. Clair"/"St Clair", "Acadia Parish"/"Acadia".
 */
function normName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\s+(county|parish|borough|census area|municipality|city and borough|municipio)\s*$/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

export function CountyIntelligenceMap({
  rows,
  geometry,
  viewBox,
  stateName,
  csvFileName,
  judicialProfiles,
  demographics,
  boating,
  stateCode,
  farsYears,
  boatingYears,
  boatingHref = "/boating-accidents",
  marketsHref = "/market-demographics",
  defaultView = "judicial",
}: Props) {
  const hasDemographics = (demographics?.length ?? 0) > 0;
  const boatingEnabled = boating !== undefined;
  const [mode, setMode] = useState<ViewMode>(defaultView);
  const [metric, setMetric] = useState<MetricKey>("rate");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("rate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");
  const [tableOpen, setTableOpen] = useState(false);

  /* -- Year filter: null = all years (server-fetched props); a year value
        re-queries the two summary RPCs and overrides rows + boating. -- */
  const yearFilterEnabled = !!stateCode && (farsYears?.length ?? 0) > 0;
  const [year, setYear] = useState<number | null>(null);
  const [yearLoading, setYearLoading] = useState(false);
  const [override, setOverride] = useState<{ rows: CountyIntelRow[]; boating: BoatingMapRow[] } | null>(null);

  const activeRows = override?.rows ?? rows;
  const activeBoating = override?.boating ?? boating ?? [];
  const boatingYearsSet = useMemo(() => new Set(boatingYears ?? []), [boatingYears]);
  const boatingHasYear = year == null || boatingYearsSet.has(year);

  async function selectYear(y: number | null) {
    setYear(y);
    if (y == null) {
      setOverride(null);
      return;
    }
    if (!stateCode) return;
    setYearLoading(true);
    try {
      const sb = getSupabase() as unknown as {
        rpc: (f: string, p: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      };
      const [acc, boat] = await Promise.all([
        sb.rpc("get_state_accident_summary", { p_state: stateCode, p_year: y }),
        boatingEnabled
          ? sb.rpc("get_state_boating_summary", { p_state: stateCode, p_year: y })
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (acc.error) throw acc.error;
      const accRows = ((acc.data ?? []) as CountyIntelRow[]).filter(
        (r) => r.county !== null && r.county !== undefined,
      );
      const boatRows = boat.error ? [] : ((boat.data ?? []) as BoatingMapRow[]);
      setOverride({ rows: accRows, boating: boatRows });
    } catch (e) {
      console.error("[CountyIntelligenceMap] year refetch failed", e);
    } finally {
      setYearLoading(false);
    }
  }

  /* -- Join live rows onto static geometry (by normalized county name) -- */
  const counties: MergedCounty[] = useMemo(() => {
    const byName = new Map<string, CountyIntelRow>();
    for (const r of activeRows) {
      const k = normName(r.county);
      if (k) byName.set(k, r);
    }
    const boatByName = new Map<string, BoatingMapRow>();
    for (const bRow of activeBoating) {
      const k = normName(bRow.county);
      if (k) boatByName.set(k, bRow);
    }
    const judByName = new Map<string, string>();
    for (const j of judicialProfiles ?? []) {
      const k = normName(j.county_name);
      if (k && j.judicial_profile) judByName.set(k, j.judicial_profile);
    }
    const demoByName = new Map<string, CountyDemographicsRow>();
    for (const dRow of demographics ?? []) {
      const k = normName(dRow.county_name);
      if (k) demoByName.set(k, dRow);
    }
    return geometry.map((g, i) => {
      const nkey = normName(g.name);
      const r = byName.get(nkey);
      const bRow = boatByName.get(nkey);
      const dRow = demoByName.get(nkey);
      const rawProfile = r?.judicial_profile ?? judByName.get(nkey) ?? null;
      return {
        key: `${g.name}#${i}`,
        name: g.name,
        d: g.d,
        profile: profileOf(rawProfile),
        pop: r?.total_population ?? null,
        crashes: r?.fatal_crashes ?? 0,
        deaths: r?.total_deaths ?? 0,
        truck: r?.truck_deaths ?? 0,
        moto: r?.moto_deaths ?? 0,
        rate: r?.deaths_per_100k ?? null,
        rural: r?.rural_pct ?? null,
        boatAccidents: bRow?.accident_count ?? null,
        boatDeaths: bRow?.total_deaths ?? null,
        boatInjuries: bRow?.total_injuries ?? null,
        white: dRow?.pct_white ?? null,
        black: dRow?.pct_black ?? null,
        hispanic: dRow?.pct_hispanic ?? null,
        asian: dRow?.pct_asian ?? null,
        native: dRow?.pct_native ?? null,
        income: dRow?.median_household_income ?? null,
        poverty: dRow?.pct_poverty ?? null,
        age: dRow?.median_age ?? null,
        commute: dRow?.mean_commute_minutes ?? null,
      };
    });
  }, [activeRows, activeBoating, geometry, judicialProfiles, demographics]);

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

  const activeKey = hovered || selected;
  const active = counties.find((c) => c.key === activeKey) || null;
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
          case "boat":
            av = a.boatDeaths;
            bv = b.boatDeaths;
            break;
          case "rural":
            av = a.rural;
            bv = b.rural;
            break;
          case "white":
            av = a.white;
            bv = b.white;
            break;
          case "black":
            av = a.black;
            bv = b.black;
            break;
          case "hispanic":
            av = a.hispanic;
            bv = b.hispanic;
            break;
          case "age":
            av = a.age;
            bv = b.age;
            break;
          case "income":
            av = a.income;
            bv = b.income;
            break;
          case "poverty":
            av = a.poverty;
            bv = b.poverty;
            break;
          case "commute":
            av = a.commute;
            bv = b.commute;
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
      ...(hasDemographics
        ? [
            "% White",
            "% Black",
            "% Hispanic",
            "% Asian",
            "% Native",
            "Median Age",
            "Median HH Income",
            "Poverty %",
            "Mean Commute (min)",
          ]
        : []),
      "Fatal Crashes",
      "Total Deaths",
      "Truck Deaths",
      "Motorcycle Deaths",
      ...(boatingEnabled ? ["Boating Accidents", "Boating Deaths", "Boating Injuries"] : []),
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
          ...(hasDemographics
            ? [
                c.white ?? "",
                c.black ?? "",
                c.hispanic ?? "",
                c.asian ?? "",
                c.native ?? "",
                c.age ?? "",
                c.income ?? "",
                c.poverty ?? "",
                c.commute ?? "",
              ]
            : []),
          c.crashes,
          c.deaths,
          c.truck,
          c.moto,
          ...(boatingEnabled ? [c.boatAccidents ?? "", c.boatDeaths ?? "", c.boatInjuries ?? ""] : []),
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

  const heatMetrics: [MetricKey, string][] = [
    ["rate", "Deaths/100K"],
    ["deaths", "Total deaths"],
    ["truck", "Truck"],
    ["moto", "Motorcycle"],
    ...((boatingEnabled ? [["boating", "Boating"]] : []) as [MetricKey, string][]),
  ];

  /* -- Active-county accident-exposure stats, with the selected metric pulled
        to the front and highlighted (so toggling Truck/Moto/Boating changes
        what the card foregrounds). -- */
  function exposureStats(c: MergedCounty) {
    const base: { key: MetricKey; label: string; value: string }[] = [
      { key: "rate", label: "Deaths / 100K", value: c.rate != null ? c.rate.toFixed(1) : "—" },
      { key: "deaths", label: "Total deaths", value: fmt(c.deaths) },
      { key: "truck", label: "Truck deaths", value: fmt(c.truck) },
      { key: "moto", label: "Motorcycle deaths", value: fmt(c.moto) },
      ...(boatingEnabled
        ? [{ key: "boating" as MetricKey, label: "Boating deaths", value: c.boatDeaths == null ? "—" : fmt(c.boatDeaths) }]
        : []),
    ];
    const selectedStat = base.find((s) => s.key === metric);
    const rest = base.filter((s) => s.key !== metric);
    return selectedStat ? [selectedStat, ...rest] : base;
  }

  interface ColDef {
    key: SortKey;
    label: string;
    align: "left" | "right";
    /** Special cell rendering: county name (bold) or judicial badge. */
    kind?: "name" | "profile";
    /** Bold + navy numeric cell. */
    emphasize?: boolean;
    value: (c: MergedCounty) => string;
  }

  const colDefs: ColDef[] = [
    { key: "name", label: "County", align: "left", kind: "name", value: (c) => c.name },
    { key: "pop", label: "Population", align: "right", value: (c) => fmt(c.pop) },
    ...(hasDemographics
      ? ([
          { key: "white", label: "% White", align: "right", value: (c) => pct(c.white) },
          { key: "black", label: "% Black", align: "right", value: (c) => pct(c.black) },
          { key: "hispanic", label: "% Hispanic", align: "right", value: (c) => pct(c.hispanic) },
          { key: "age", label: "Median Age", align: "right", value: (c) => (c.age != null ? c.age.toFixed(1) : "—") },
          { key: "income", label: "Med. Income", align: "right", value: (c) => money(c.income) },
          { key: "poverty", label: "Poverty %", align: "right", value: (c) => pct(c.poverty) },
          { key: "commute", label: "Commute", align: "right", emphasize: true, value: (c) => commuteFmt(c.commute) },
        ] as ColDef[])
      : []),
    { key: "crashes", label: "Fatal Crashes", align: "right", value: (c) => fmt(c.crashes) },
    { key: "deaths", label: "Total Deaths", align: "right", emphasize: true, value: (c) => fmt(c.deaths) },
    { key: "truck", label: "Truck", align: "right", value: (c) => fmt(c.truck) },
    { key: "moto", label: "Moto", align: "right", value: (c) => fmt(c.moto) },
    ...(boatingEnabled
      ? ([{ key: "boat", label: "Boating", align: "right", value: (c) => (c.boatDeaths == null ? "—" : fmt(c.boatDeaths)) }] as ColDef[])
      : []),
    { key: "rate", label: "Deaths/100K", align: "right", emphasize: true, value: (c) => (c.rate != null ? c.rate.toFixed(1) : "—") },
    { key: "rural", label: "Rural %", align: "right", value: (c) => (c.rural != null ? c.rural.toFixed(1) + "%" : "—") },
    { key: "profile", label: "Judicial", align: "left", kind: "profile", value: (c) => c.profile },
  ];

  const coverageParts: string[] = [];
  if (farsYears?.length) coverageParts.push(`FARS ${Math.min(...farsYears)}–${Math.max(...farsYears)}`);
  if (boatingEnabled && boatingYears?.length)
    coverageParts.push(`USCG boating ${Math.min(...boatingYears)}–${Math.max(...boatingYears)}`);
  const coverageText = coverageParts.join(" · ");

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
            {hasDemographics ? "Accident exposure, judicial leaning, and census demographics" : "Accident exposure and judicial leaning"} across all {counties.length}{" "}
            {stateName}{" "}
            counties &mdash; one combined view.
          </p>
          {coverageText && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94A3B8" }}>
              Data coverage: {coverageText}
              {year != null ? ` — showing ${year}` : " — showing all years"}
            </p>
          )}
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
              {heatMetrics.map(([k, l]) => (
                <button key={k} onClick={() => setMetric(k)} style={segStyle(metric === k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
        {yearFilterEnabled && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 5 }}>
              Year{yearLoading ? " — loading…" : ""}
            </div>
            <select
              value={year ?? ""}
              onChange={(e) => selectYear(e.target.value === "" ? null : Number(e.target.value))}
              disabled={yearLoading}
              style={{
                padding: "7px 11px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                color: "#0B1D3A",
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                cursor: yearLoading ? "wait" : "pointer",
              }}
            >
              <option value="">All years</option>
              {[...(farsYears ?? [])]
                .sort((a, b) => b - a)
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {metric === "boating" && !boatingHasYear && (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "7px 11px" }}>
          USCG boating data is only available through {boatingYears?.length ? Math.max(...boatingYears) : 2023}. No boating figures for {year}.
        </p>
      )}

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
            opacity: yearLoading ? 0.55 : 1,
            transition: "opacity 150ms ease",
          }}
        >
          <svg
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            style={{ width: "100%", height: "auto", maxHeight: 600, display: "block", overflow: "visible" }}
          >
            {counties.map((c) => {
              const isActive = c.key === hovered || c.key === selected;
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
                  key={c.key}
                  d={c.d}
                  style={{
                    fill,
                    stroke,
                    strokeWidth: sw,
                    cursor: "pointer",
                    transition: "fill 140ms ease, stroke 140ms ease",
                    strokeLinejoin: "round",
                  }}
                  onMouseEnter={() => setHovered(c.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected((s) => (s === c.key ? null : c.key))}
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
                {hasDemographics ? (
                  <>
                    {/* demographic stat cells */}
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
                        { label: "Median age", value: active.age != null ? active.age.toFixed(1) : "—" },
                        { label: "Median HH income", value: money(active.income) },
                        { label: "Poverty rate", value: pct(active.poverty) },
                      ].map((s) => (
                        <div key={s.label} style={{ background: "#fff", padding: "9px 12px" }}>
                          <div style={{ fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" }}>{s.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1D3A", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* mean commute time — highlighted (new signal) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginTop: 10,
                        padding: "10px 13px",
                        borderRadius: 8,
                        background: tint(DEMO_ACCENT, 0.9),
                        border: `1px solid ${tint(DEMO_ACCENT, 0.7)}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={DEMO_ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "#0B1D3A", fontWeight: 600 }}>Mean commute</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#0B1D3A", fontVariantNumeric: "tabular-nums" }}>{commuteFmt(active.commute)}</span>
                    </div>

                    {/* race & ethnicity bars */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 10 }}>
                        Race &amp; ethnicity
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {[
                          { label: "White", v: active.white },
                          { label: "Black", v: active.black },
                          { label: "Hispanic", v: active.hispanic },
                          { label: "Asian", v: active.asian },
                          { label: "Native", v: active.native },
                        ].map((b) => (
                          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 60, fontSize: 12, color: "#475569", flex: "none" }}>{b.label}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "#EDF1F5", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: Math.max(2, Math.min(100, b.v ?? 0)) + "%",
                                  height: "100%",
                                  borderRadius: 999,
                                  background: DEMO_ACCENT,
                                  transition: "width 220ms ease",
                                }}
                              />
                            </div>
                            <span style={{ width: 44, textAlign: "right", fontSize: 12, fontWeight: 600, color: "#0B1D3A", fontVariantNumeric: "tabular-nums", flex: "none" }}>{pct(b.v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* accident exposure footer (selected metric foregrounded) */}
                    <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px dashed #E2E8F0" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 9 }}>
                        Accident exposure
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {exposureStats(active).map((s, i) => {
                          const hot = mode !== "judicial" && i === 0;
                          return (
                            <div
                              key={s.key}
                              style={{
                                padding: hot ? "6px 11px" : "6px 0",
                                borderRadius: hot ? 8 : 0,
                                background: hot ? tint(DEMO_ACCENT, 0.9) : "transparent",
                                border: hot ? `1px solid ${tint(DEMO_ACCENT, 0.7)}` : "1px solid transparent",
                              }}
                            >
                              <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1D3A", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{s.label}</div>
                            </div>
                          );
                        })}
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1D3A", fontVariantNumeric: "tabular-nums" }}>
                            {rateRank.has(active.name) ? "#" + rateRank.get(active.name) : "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>Rank by rate</div>
                        </div>
                      </div>
                      {boatingEnabled && active.boatAccidents != null && (
                        <div style={{ marginTop: 9, fontSize: 12, color: "#475569" }}>
                          Boating: <strong style={{ color: "#0B1D3A" }}>{fmt(active.boatAccidents)}</strong> accidents
                          {" · "}
                          <strong style={{ color: "#0B1D3A" }}>{fmt(active.boatInjuries)}</strong> injuries
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                        { key: "pop", label: "Population", value: fmt(active.pop) },
                        { key: "rate", label: "Deaths / 100K", value: active.rate != null ? active.rate.toFixed(1) : "—" },
                        { key: "crashes", label: "Fatal crashes", value: fmt(active.crashes) },
                        { key: "deaths", label: "Total deaths", value: fmt(active.deaths) },
                        { key: "truck", label: "Truck deaths", value: fmt(active.truck) },
                        { key: "moto", label: "Motorcycle", value: fmt(active.moto) },
                        ...(boatingEnabled
                          ? [{ key: "boating", label: "Boating deaths", value: active.boatDeaths == null ? "—" : fmt(active.boatDeaths) }]
                          : []),
                        { key: "rural", label: "Rural share", value: active.rural != null ? active.rural.toFixed(1) + "%" : "—" },
                        { key: "rank", label: "Rank by rate", value: rateRank.has(active.name) ? "#" + rateRank.get(active.name) : "—" },
                      ].map((s) => {
                        const hot = mode !== "judicial" && s.key === metric;
                        return (
                          <div key={s.label} style={{ background: hot ? tint(DEMO_ACCENT, 0.9) : "#fff", padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, letterSpacing: ".05em", textTransform: "uppercase", color: hot ? "#0B1D3A" : "#94A3B8", fontWeight: hot ? 700 : 400 }}>{s.label}</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: "#0B1D3A", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                          </div>
                        );
                      })}
                    </div>
                    {boatingEnabled && active.boatAccidents != null && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
                        Boating: <strong style={{ color: "#0B1D3A" }}>{fmt(active.boatAccidents)}</strong> accidents
                        {" · "}
                        <strong style={{ color: "#0B1D3A" }}>{fmt(active.boatInjuries)}</strong> injuries
                      </div>
                    )}
                  </>
                )}
                {selected && selected === activeKey && (
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
                <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 14 }}>
                  {hasDemographics ? "Hover or tap a county for census demographics & accident exposure." : "Hover or tap a county for detail."}
                </div>
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
                    const isActive = c.key === hovered || c.key === selected;
                    const col = JUD_COLORS[c.profile];
                    return (
                      <tr
                        key={c.key}
                        onMouseEnter={() => setHovered(c.key)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setSelected((s) => (s === c.key ? null : c.key))}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          background: isActive ? "rgba(26,140,150,.10)" : "#fff",
                          cursor: "pointer",
                          transition: "background 120ms ease",
                        }}
                      >
                        {colDefs.map((cd) => {
                          if (cd.kind === "name") {
                            return (
                              <td key={cd.key} style={{ padding: "9px 8px", fontSize: 12, fontWeight: 600, color: "#0B1D3A", whiteSpace: "nowrap" }}>
                                {c.name}
                              </td>
                            );
                          }
                          if (cd.kind === "profile") {
                            return (
                              <td key={cd.key} style={{ padding: "9px 8px" }}>
                                <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: tint(col, 0.85), color: col, whiteSpace: "nowrap" }}>{c.profile}</span>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={cd.key}
                              style={{
                                padding: "9px 8px",
                                fontSize: 12,
                                textAlign: "right",
                                fontWeight: cd.emphasize ? 700 : 400,
                                color: cd.emphasize ? "#0B1D3A" : "#475569",
                                fontVariantNumeric: "tabular-nums",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {cd.value(c)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* deeper-analysis links */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
        {boatingEnabled && (
          <Link
            href={boatingHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              fontWeight: 600,
              color: "#1A8C96",
              textDecoration: "none",
              border: "1px solid #1A8C96",
              borderRadius: 8,
              padding: "8px 13px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1" />
              <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
              <path d="M19 13V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6" />
              <path d="M12 10v4" />
            </svg>
            Full boating accident analysis &rarr;
          </Link>
        )}
        <Link
          href={marketsHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: "#0B1D3A",
            textDecoration: "none",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "8px 13px",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Market demographics by metro (MSA) &rarr;
        </Link>
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
