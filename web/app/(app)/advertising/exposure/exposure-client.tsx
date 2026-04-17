"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Biohazard,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Skull,
  FlaskConical,
  MapPin,
  Award,
  AlertTriangle,
  BarChart3,
  Layers,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PesticideStateRow {
  state_name: string;
  state_fips: string;
  avg_high_lbs: number;
  avg_low_lbs: number;
  county_count: number;
  total_high_lbs: number;
}

export interface PesticideCountyRow {
  county_name: string | null;
  state_name: string;
  fips: string;
  avg_high_lbs: number;
  avg_low_lbs: number;
  years_active: number;
}

export interface DiseaseMortalityRow {
  state_name: string;
  state_fips: string;
  disease: string;
  mortality_rate: number;
  deaths_count: number | null;
  year: number;
  change_pct: number | null;
  change_period: string | null;
}

export interface CrossRefRow {
  rank: number;
  state_name: string;
  state_abbr: string;
  pesticide_lbs: number;
  mortality_rate: number;
  surge_pct: number | null;
  pi_score: number | null;
  composite_score: number;
  grade: string;
}

export interface ExposurePageData {
  pesticideStates: {
    paraquat: PesticideStateRow[];
    glyphosate: PesticideStateRow[];
  };
  pesticideCounties: {
    paraquat: PesticideCountyRow[];
    glyphosate: PesticideCountyRow[];
  };
  pesticideYearlyStates: Record<
    string,
    Record<string, PesticideStateRow[]>
  >;
  pesticideYearlyCounties: Record<
    string,
    Record<string, PesticideCountyRow[]>
  >;
  diseaseMortality: DiseaseMortalityRow[];
  crossRef: {
    paraquat: CrossRefRow[];
    glyphosate: CrossRefRow[];
  };
  summaryStats: {
    paraquat: { totalLbs: number; stateCount: number; countyCount: number; topState: string };
    glyphosate: { totalLbs: number; stateCount: number; countyCount: number; topState: string };
  };
  yearlyStats: Record<string, Record<string, { totalLbs: number; stateCount: number; countyCount: number; topState: string }>>;
  diseaseSummary: {
    avgRate: number;
    highestState: string;
    highestRate: number;
    aboveAvgCount: number;
    fastestSurge: string;
    fastestSurgePct: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function fmtDec(n: number, d = 1): string {
  return n.toFixed(d);
}

type SortDir = "asc" | "desc";

function sortRows<T>(rows: T[], key: keyof T, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const base =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === "asc" ? base : -base;
  });
}

const COMPOUND_TORT_MAP: Record<string, { tort: string; href: string }> = {
  PARAQUAT: { tort: "Paraquat", href: "/advertising/torts/paraquat" },
  GLYPHOSATE: { tort: "Roundup", href: "/advertising/torts/roundup" },
};

const DISEASE_TORT_MAP: Record<string, { tort: string; href: string }> = {
  "Parkinsons Disease": { tort: "Paraquat", href: "/advertising/torts/paraquat" },
};

function gradeColor(grade: string): { bg: string; text: string } {
  switch (grade) {
    case "A+":
      return { bg: "#065f46", text: "#ffffff" };
    case "A":
      return { bg: "#059669", text: "#ffffff" };
    case "B+":
      return { bg: "#1A8C96", text: "#ffffff" };
    case "B":
      return { bg: "#2E5077", text: "#ffffff" };
    default:
      return { bg: "#6B7280", text: "#ffffff" };
  }
}

function tierInfo(grade: string) {
  switch (grade) {
    case "A+":
      return { tier: 1, label: "Tier 1 — Prime Targets", color: "#065f46", bgColor: "#ecfdf5" };
    case "A":
      return { tier: 2, label: "Tier 2 — High Value", color: "#059669", bgColor: "#f0fdf4" };
    case "B+":
      return { tier: 3, label: "Tier 3 — Opportunity Markets", color: "#1A8C96", bgColor: "#f0fdfa" };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-intelligence-teal" />}
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
          {label}
        </p>
      </div>
      <p className="font-heading text-2xl font-bold text-midnight-navy">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-gray">{sub}</p>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  const isActive = sortKey === currentKey;
  return (
    <th
      className={`py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy select-none whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          <span className="text-intelligence-teal">
            {currentDir === "asc" ? "↑" : "↓"}
          </span>
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

function TabButton({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active
          ? "bg-intelligence-teal text-white shadow-md"
          : "bg-white text-midnight-navy hover:bg-cloud ring-1 ring-midnight-navy/10"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Client Component                                              */
/* ------------------------------------------------------------------ */

export function ExposureClient({ data }: { data: ExposurePageData }) {
  const [activeTab, setActiveTab] = useState<"pesticide" | "disease" | "crossref">("pesticide");
  const [compound, setCompound] = useState<"PARAQUAT" | "GLYPHOSATE">("PARAQUAT");
  const [year, setYear] = useState<string>("avg");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [disease] = useState<string>("Parkinsons Disease");

  // Pesticide sort
  const [pestSortKey, setPestSortKey] = useState<string>("avg_high_lbs");
  const [pestSortDir, setPestSortDir] = useState<SortDir>("desc");

  // County sort
  const [countySortKey, setCountySortKey] = useState<string>("avg_high_lbs");
  const [countySortDir, setCountySortDir] = useState<SortDir>("desc");

  // Disease sort
  const [disSortKey, setDisSortKey] = useState<string>("mortality_rate");
  const [disSortDir, setDisSortDir] = useState<SortDir>("desc");

  // Cross-ref sort
  const [crSortKey, setCrSortKey] = useState<string>("composite_score");
  const [crSortDir, setCrSortDir] = useState<SortDir>("desc");

  function togglePestSort(key: string) {
    if (key === pestSortKey) {
      setPestSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setPestSortKey(key);
      setPestSortDir(key === "state_name" ? "asc" : "desc");
    }
  }

  function toggleCountySort(key: string) {
    if (key === countySortKey) {
      setCountySortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setCountySortKey(key);
      setCountySortDir(key === "county_name" || key === "state_name" ? "asc" : "desc");
    }
  }

  function toggleDisSort(key: string) {
    if (key === disSortKey) {
      setDisSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setDisSortKey(key);
      setDisSortDir(key === "state_name" ? "asc" : "desc");
    }
  }

  function toggleCrSort(key: string) {
    if (key === crSortKey) {
      setCrSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setCrSortKey(key);
      setCrSortDir(key === "state_name" ? "asc" : "desc");
    }
  }

  /* ---- Derived data: pesticide tab ---- */
  const compKey = compound.toLowerCase() as "paraquat" | "glyphosate";

  const pestStateRows = useMemo(() => {
    let rows: PesticideStateRow[];
    if (year === "avg") {
      rows = data.pesticideStates[compKey];
    } else {
      rows = data.pesticideYearlyStates[compKey]?.[year] ?? [];
    }
    if (stateFilter !== "all") {
      rows = rows.filter((r) => r.state_name === stateFilter);
    }
    return sortRows(rows, pestSortKey as keyof PesticideStateRow, pestSortDir);
  }, [data, compKey, year, stateFilter, pestSortKey, pestSortDir]);

  const pestCountyRows = useMemo(() => {
    let rows: PesticideCountyRow[];
    if (year === "avg") {
      rows = data.pesticideCounties[compKey];
    } else {
      rows = data.pesticideYearlyCounties[compKey]?.[year] ?? [];
    }
    if (stateFilter !== "all") {
      rows = rows.filter((r) => r.state_name === stateFilter);
    }
    return sortRows(rows, countySortKey as keyof PesticideCountyRow, countySortDir).slice(
      0,
      stateFilter !== "all" ? 100 : 25
    );
  }, [data, compKey, year, stateFilter, countySortKey, countySortDir]);

  const pestStats = useMemo(() => {
    if (year === "avg") {
      return data.summaryStats[compKey];
    }
    return data.yearlyStats[compKey]?.[year] ?? { totalLbs: 0, stateCount: 0, countyCount: 0, topState: "N/A" };
  }, [data, compKey, year]);

  const allStates = useMemo(() => {
    const stateSet = new Set<string>();
    data.pesticideStates.paraquat.forEach((r) => stateSet.add(r.state_name));
    data.pesticideStates.glyphosate.forEach((r) => stateSet.add(r.state_name));
    return Array.from(stateSet).sort();
  }, [data]);

  /* ---- Derived data: disease tab ---- */
  const diseaseRows = useMemo(() => {
    const rows = data.diseaseMortality.filter((r) => r.disease === disease);
    return sortRows(rows, disSortKey as keyof DiseaseMortalityRow, disSortDir);
  }, [data, disease, disSortKey, disSortDir]);

  /* ---- Derived data: cross-ref tab ---- */
  const crossRefRows = useMemo(() => {
    const rows = data.crossRef[compKey];
    return sortRows(rows, crSortKey as keyof CrossRefRow, crSortDir);
  }, [data, compKey, crSortKey, crSortDir]);

  const tiers = useMemo(() => {
    const rows = data.crossRef[compKey];
    return {
      tier1: rows.filter((r) => r.grade === "A+"),
      tier2: rows.filter((r) => r.grade === "A"),
      tier3: rows.filter((r) => r.grade === "B+"),
    };
  }, [data, compKey]);

  const compoundLabel = compound === "PARAQUAT" ? "Paraquat" : "Glyphosate";
  const diseaseLabel = compound === "PARAQUAT" ? "Parkinson's Disease" : "Non-Hodgkin Lymphoma";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Biohazard className="h-7 w-7 shrink-0 text-intelligence-teal" />
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Environmental &amp; Occupational Exposure Intelligence
          </h1>
          <p className="text-sm text-slate-gray">
            Pesticide usage, disease burden, and litigation targeting data for U.S. counties
          </p>
        </div>
      </div>

      {/* Description card */}
      <div className="rounded-xl bg-intelligence-teal/5 border border-intelligence-teal/20 p-5">
        <p className="text-sm text-midnight-navy leading-relaxed">
          This intelligence module cross-references <strong>county-level pesticide exposure data</strong> (USGS)
          with <strong>state-level disease mortality</strong> (CDC) and our proprietary{" "}
          <strong>PI viability scores</strong> to identify the highest-value markets for environmental
          tort case acquisition. Use the Cross-Reference tab for composite targeting intelligence.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          label="Pesticide Exposure"
          active={activeTab === "pesticide"}
          onClick={() => setActiveTab("pesticide")}
          icon={FlaskConical}
        />
        <TabButton
          label="Disease Mortality"
          active={activeTab === "disease"}
          onClick={() => setActiveTab("disease")}
          icon={Skull}
        />
        <TabButton
          label="Cross-Reference"
          active={activeTab === "crossref"}
          onClick={() => setActiveTab("crossref")}
          icon={Target}
        />
      </div>

      {/* ============================================================ */}
      {/*  TAB 1: PESTICIDE EXPOSURE                                    */}
      {/* ============================================================ */}
      {activeTab === "pesticide" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-midnight-navy/5">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Compound
              </label>
              <select
                value={compound}
                onChange={(e) => setCompound(e.target.value as "PARAQUAT" | "GLYPHOSATE")}
                className="rounded-md border border-cloud px-3 py-1.5 text-sm text-midnight-navy bg-cloud/50 focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30"
              >
                <option value="PARAQUAT">Paraquat</option>
                <option value="GLYPHOSATE">Glyphosate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-md border border-cloud px-3 py-1.5 text-sm text-midnight-navy bg-cloud/50 focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30"
              >
                <option value="avg">5-Year Average</option>
                <option value="2013">2013</option>
                <option value="2014">2014</option>
                <option value="2015">2015</option>
                <option value="2016">2016</option>
                <option value="2017">2017</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="rounded-md border border-cloud px-3 py-1.5 text-sm text-midnight-navy bg-cloud/50 focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30"
              >
                <option value="all">All States</option>
                {allStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total U.S. Usage"
              value={`${fmtNum(pestStats.totalLbs)} lbs`}
              sub={`${compoundLabel} · ${year === "avg" ? "5-yr avg/yr" : year}`}
              icon={BarChart3}
            />
            <SummaryCard
              label="States with Usage"
              value={String(pestStats.stateCount)}
              sub="Reporting states"
              icon={MapPin}
            />
            <SummaryCard
              label="Counties with Usage"
              value={fmtNum(pestStats.countyCount)}
              sub="County-level records"
              icon={Layers}
            />
            <SummaryCard
              label="Top State"
              value={pestStats.topState}
              sub="Highest total usage"
              icon={Award}
            />
          </div>

          {/* State Rankings Table */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
              State Rankings — {compoundLabel}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <SortHeader label="State" sortKey="state_name" currentKey={pestSortKey} currentDir={pestSortDir} onSort={togglePestSort} />
                    <SortHeader label="Avg Usage (High, lbs)" sortKey="avg_high_lbs" currentKey={pestSortKey} currentDir={pestSortDir} onSort={togglePestSort} align="right" />
                    <SortHeader label="Avg Usage (Low, lbs)" sortKey="avg_low_lbs" currentKey={pestSortKey} currentDir={pestSortDir} onSort={togglePestSort} align="right" />
                    <SortHeader label="Counties" sortKey="county_count" currentKey={pestSortKey} currentDir={pestSortDir} onSort={togglePestSort} align="right" />
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Related Tort
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pestStateRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-gray">
                        No data for selected filters.
                      </td>
                    </tr>
                  ) : (
                    pestStateRows.map((row) => {
                      const tort = COMPOUND_TORT_MAP[compound];
                      return (
                        <tr key={row.state_name} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-intelligence-teal">
                            {row.state_name}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {fmtNum(row.avg_high_lbs)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {fmtNum(row.avg_low_lbs)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {row.county_count}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {tort && (
                              <Link
                                href={tort.href}
                                className="text-xs font-semibold text-intelligence-teal hover:underline"
                              >
                                {tort.tort} ↗
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Counties Table */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-1">
              {stateFilter !== "all" ? `Top Counties — ${stateFilter}` : "Top 25 Counties Nationally"} — {compoundLabel}
            </h2>
            <p className="text-xs text-slate-gray mb-4">
              County-level usage ranked by EPest-High estimate
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <SortHeader label="County" sortKey="county_name" currentKey={countySortKey} currentDir={countySortDir} onSort={toggleCountySort} />
                    <SortHeader label="State" sortKey="state_name" currentKey={countySortKey} currentDir={countySortDir} onSort={toggleCountySort} />
                    <SortHeader label="Usage High (lbs)" sortKey="avg_high_lbs" currentKey={countySortKey} currentDir={countySortDir} onSort={toggleCountySort} align="right" />
                    <SortHeader label="Usage Low (lbs)" sortKey="avg_low_lbs" currentKey={countySortKey} currentDir={countySortDir} onSort={toggleCountySort} align="right" />
                    <SortHeader label="Years Active" sortKey="years_active" currentKey={countySortKey} currentDir={countySortDir} onSort={toggleCountySort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {pestCountyRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-gray">
                        No county data for selected filters.
                      </td>
                    </tr>
                  ) : (
                    pestCountyRows.map((row) => (
                      <tr key={row.fips} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-midnight-navy">
                          {row.county_name || row.fips}
                        </td>
                        <td className="py-3 px-3 text-slate-gray">{row.state_name}</td>
                        <td className="py-3 px-3 text-right font-mono text-sm">
                          {fmtNum(row.avg_high_lbs)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm">
                          {fmtNum(row.avg_low_lbs)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm">
                          {row.years_active}/5
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data source */}
          <p className="text-xs text-slate-gray italic">
            Source:{" "}
            <a
              href="https://water.usgs.gov/nawqa/pnsp/usage/maps/county-level/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-intelligence-teal hover:underline"
            >
              USGS Pesticide National Synthesis Project
            </a>
            , 2013–2017
          </p>
        </>
      )}

      {/* ============================================================ */}
      {/*  TAB 2: DISEASE MORTALITY                                     */}
      {/* ============================================================ */}
      {activeTab === "disease" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-midnight-navy/5">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Disease
              </label>
              <select
                value={disease}
                disabled
                className="rounded-md border border-cloud px-3 py-1.5 text-sm text-midnight-navy bg-cloud/50 focus:outline-none"
              >
                <option value="Parkinsons Disease">Parkinson&apos;s Disease</option>
              </select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="National Avg Rate"
              value={fmtDec(data.diseaseSummary.avgRate)}
              sub="Deaths per 100K"
              icon={Activity}
            />
            <SummaryCard
              label="Highest-Rate State"
              value={data.diseaseSummary.highestState}
              sub={`${fmtDec(data.diseaseSummary.highestRate)} per 100K`}
              icon={AlertTriangle}
            />
            <SummaryCard
              label="Above Average States"
              value={String(data.diseaseSummary.aboveAvgCount)}
              sub="States above national avg"
              icon={TrendingUp}
            />
            <SummaryCard
              label="Fastest Surge"
              value={data.diseaseSummary.fastestSurge}
              sub={`+${fmtDec(data.diseaseSummary.fastestSurgePct)}% change`}
              icon={TrendingUp}
            />
          </div>

          {/* State Rankings Table */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
              State Rankings — Parkinson&apos;s Disease Mortality
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <SortHeader label="State" sortKey="state_name" currentKey={disSortKey} currentDir={disSortDir} onSort={toggleDisSort} />
                    <SortHeader label="Mortality Rate" sortKey="mortality_rate" currentKey={disSortKey} currentDir={disSortDir} onSort={toggleDisSort} align="right" />
                    <SortHeader label="Deaths (2023)" sortKey="deaths_count" currentKey={disSortKey} currentDir={disSortDir} onSort={toggleDisSort} align="right" />
                    <SortHeader label="5yr Change %" sortKey="change_pct" currentKey={disSortKey} currentDir={disSortDir} onSort={toggleDisSort} align="right" />
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                      Trend
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Related Tort
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {diseaseRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-slate-gray">
                        No disease mortality data available.
                      </td>
                    </tr>
                  ) : (
                    diseaseRows.map((row) => {
                      const tort = DISEASE_TORT_MAP[row.disease];
                      const isRising = (row.change_pct ?? 0) > 0;
                      return (
                        <tr key={row.state_name} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-intelligence-teal">
                            {row.state_name}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {fmtDec(row.mortality_rate)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {row.deaths_count != null ? fmtNum(row.deaths_count) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {row.change_pct != null ? (
                              <span className={isRising ? "text-alert" : "text-success"}>
                                {isRising ? "+" : ""}
                                {fmtDec(row.change_pct)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {row.change_pct != null ? (
                              isRising ? (
                                <TrendingUp className="w-4 h-4 text-alert inline-block" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-success inline-block" />
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {tort && (
                              <Link
                                href={tort.href}
                                className="text-xs font-semibold text-intelligence-teal hover:underline"
                              >
                                {tort.tort} ↗
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data source */}
          <p className="text-xs text-slate-gray italic">
            Source:{" "}
            <a
              href="https://www.cdc.gov/nchs/state-stats/deaths/parkinsons-disease.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-intelligence-teal hover:underline"
            >
              CDC Stats of the States
            </a>
            , 2023
          </p>
        </>
      )}

      {/* ============================================================ */}
      {/*  TAB 3: CROSS-REFERENCE (TARGETING INTELLIGENCE)              */}
      {/* ============================================================ */}
      {activeTab === "crossref" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-midnight-navy/5">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Compound
              </label>
              <select
                value={compound}
                onChange={(e) => setCompound(e.target.value as "PARAQUAT" | "GLYPHOSATE")}
                className="rounded-md border border-cloud px-3 py-1.5 text-sm text-midnight-navy bg-cloud/50 focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30"
              >
                <option value="PARAQUAT">Paraquat</option>
                <option value="GLYPHOSATE">Glyphosate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Disease (Auto-Matched)
              </label>
              <div className="rounded-md border border-cloud px-3 py-1.5 text-sm text-midnight-navy bg-cloud/30">
                {diseaseLabel}
              </div>
            </div>
          </div>

          {/* Insight Callout */}
          <div className="rounded-xl border-l-4 border-intelligence-teal bg-intelligence-teal/5 p-5">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-intelligence-teal shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-midnight-navy mb-1">
                  Targeting Intelligence
                </p>
                <p className="text-sm text-midnight-navy/80 leading-relaxed">
                  States in <strong>Tier 1</strong> combine heavy {compoundLabel.toLowerCase()} agricultural usage,
                  elevated {diseaseLabel.toLowerCase()} mortality, and plaintiff-friendly legal environments.
                  These represent the highest-value markets for case acquisition advertising.
                </p>
              </div>
            </div>
          </div>

          {/* Tier Breakdown Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {([
              { grade: "A+", states: tiers.tier1 },
              { grade: "A", states: tiers.tier2 },
              { grade: "B+", states: tiers.tier3 },
            ] as const).map(({ grade, states }) => {
              const info = tierInfo(grade);
              if (!info) return null;
              return (
                <div
                  key={grade}
                  className="rounded-xl p-5 shadow-sm ring-1"
                  style={{ background: info.bgColor, boxShadow: `inset 0 0 0 1px ${info.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold text-white"
                      style={{ background: info.color }}
                    >
                      {grade}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: info.color }}>
                      {info.label}
                    </span>
                  </div>
                  <p className="text-xs text-midnight-navy/70 mb-2">
                    {states.length} state{states.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {states.map((s) => (
                      <span
                        key={s.state_name}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: info.color + "18", color: info.color }}
                      >
                        {s.state_abbr || s.state_name}
                      </span>
                    ))}
                    {states.length === 0 && (
                      <span className="text-xs text-slate-gray italic">No states at this tier</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Composite Target Score Table */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-heading text-lg font-semibold text-midnight-navy">
                Composite Target Scores
              </h2>
              <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-intelligence-teal">
                Premium Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-gray mb-4">
              Weighted: 35% usage + 25% mortality + 25% PI viability + 15% disease surge
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <SortHeader label="#" sortKey="rank" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} />
                    <SortHeader label="State" sortKey="state_name" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} />
                    <SortHeader label={`${compoundLabel} (lbs/yr)`} sortKey="pesticide_lbs" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="Mortality Rate" sortKey="mortality_rate" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="Surge %" sortKey="surge_pct" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="PI Score" sortKey="pi_score" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="Composite" sortKey="composite_score" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {crossRefRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-slate-gray">
                        No cross-reference data available.
                      </td>
                    </tr>
                  ) : (
                    crossRefRows.map((row) => {
                      const gc = gradeColor(row.grade);
                      return (
                        <tr key={row.state_name} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-sm text-slate-gray">
                            {row.rank}
                          </td>
                          <td className="py-3 px-3 font-semibold text-intelligence-teal">
                            {row.state_name}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {fmtNum(row.pesticide_lbs)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {fmtDec(row.mortality_rate)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {row.surge_pct != null ? (
                              <span className={(row.surge_pct > 0) ? "text-alert" : "text-success"}>
                                {row.surge_pct > 0 ? "+" : ""}
                                {fmtDec(row.surge_pct)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm">
                            {row.pi_score != null ? fmtDec(row.pi_score, 0) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-sm font-bold">
                            {fmtDec(row.composite_score, 1)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider"
                              style={{ backgroundColor: gc.bg, color: gc.text }}
                            >
                              {row.grade}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compound-to-Disease-to-Tort Mapping */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
              Compound → Disease → Tort Mapping
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Compound
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Associated Disease
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Tort
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 px-3 font-semibold text-midnight-navy">Paraquat</td>
                    <td className="py-3 px-3">Parkinson&apos;s Disease</td>
                    <td className="py-3 px-3">
                      <Link href="/advertising/torts/paraquat" className="text-intelligence-teal hover:underline font-semibold">
                        Paraquat ↗
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-success/10 border border-success/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 px-3 font-semibold text-midnight-navy">Glyphosate</td>
                    <td className="py-3 px-3">Non-Hodgkin Lymphoma</td>
                    <td className="py-3 px-3">
                      <Link href="/advertising/torts/roundup" className="text-intelligence-teal hover:underline font-semibold">
                        Roundup ↗
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-success/10 border border-success/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Data sources */}
          <div className="text-xs text-slate-gray italic space-y-1">
            <p>
              Sources:{" "}
              <a
                href="https://water.usgs.gov/nawqa/pnsp/usage/maps/county-level/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-intelligence-teal hover:underline"
              >
                USGS Pesticide National Synthesis Project
              </a>
              , 2013–2017 |{" "}
              <a
                href="https://www.cdc.gov/nchs/state-stats/deaths/parkinsons-disease.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-intelligence-teal hover:underline"
              >
                CDC Stats of the States
              </a>
              , 2023
            </p>
          </div>
        </>
      )}
    </div>
  );
}
