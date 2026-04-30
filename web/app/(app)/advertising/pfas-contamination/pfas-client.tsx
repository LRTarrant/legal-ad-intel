"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Radiation,
  ArrowUpDown,
  Target,
  Activity,
  MapPin,
  Award,
  AlertTriangle,
  BarChart3,
  Layers,
  ChevronRight,
  Scale,
  Droplets,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PfasSite {
  id: string;
  state: string;
  installation_name: string;
  pfas_ppt: number;
  severity: string;
}

export interface PfasSummary {
  totalSites: number;
  aboveEpa: number;
  aboveEpaPct: string;
  above10k: number;
  highestReading: number;
  highestSiteName: string;
  highestSiteState: string;
}

export interface Top25Site {
  rank: number;
  installation_name: string;
  state: string;
  pfas_ppt: number;
  severity: string;
}

export interface StateRanking {
  state: string;
  siteCount: number;
  maxPpt: number;
  highCount: number;
}

export interface CrossRefState {
  rank: number;
  state: string;
  siteCount: number;
  highContamSites: number;
  maxPpt: number;
  kidneyRate: number;
  bladderRate: number;
  piScore: number;
  judicial: string;
  compositeScore: number;
  isPriority: boolean;
}

export interface PfasPageData {
  sites: PfasSite[];
  summary: PfasSummary;
  top25: Top25Site[];
  stateRanking: StateRanking[];
  uniqueStates: string[];
  crossRefStates: CrossRefState[];
  cancerByState: Record<string, { kidney: number; bladder: number }>;
  piByState: Record<string, number>;
  judicialByState: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtPpt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function severityBadge(severity: string) {
  switch (severity) {
    case "extreme":
      return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
    case "high":
      return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" };
    case "moderate":
      return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" };
    default:
      return { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" };
  }
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

export function PfasClient({ data }: { data: PfasPageData }) {
  const [activeTab, setActiveTab] = useState<"overview" | "state" | "crossref">("overview");
  const [selectedState, setSelectedState] = useState<string>(data.uniqueStates[0] ?? "");

  // Top 25 sort
  const [topSortKey, setTopSortKey] = useState<string>("pfas_ppt");
  const [topSortDir, setTopSortDir] = useState<SortDir>("desc");
  const [topStateFilter, setTopStateFilter] = useState<string>("all");

  // Cross-ref sort
  const [crSortKey, setCrSortKey] = useState<string>("compositeScore");
  const [crSortDir, setCrSortDir] = useState<SortDir>("desc");

  function toggleTopSort(key: string) {
    if (key === topSortKey) {
      setTopSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTopSortKey(key);
      setTopSortDir(key === "installation_name" || key === "state" ? "asc" : "desc");
    }
  }

  function toggleCrSort(key: string) {
    if (key === crSortKey) {
      setCrSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setCrSortKey(key);
      setCrSortDir(key === "state" ? "asc" : "desc");
    }
  }

  // Filter top 25 by state
  const filteredTop25 = useMemo(() => {
    let rows = data.sites;
    if (topStateFilter !== "all") {
      rows = rows.filter((s) => s.state === topStateFilter);
    }
    const sorted = sortRows(rows as (PfasSite & Record<string, unknown>)[], topSortKey as keyof PfasSite, topSortDir);
    return sorted.slice(0, 25);
  }, [data.sites, topStateFilter, topSortKey, topSortDir]);

  // State detail sites
  const stateSites = useMemo(() => {
    return data.sites
      .filter((s) => s.state === selectedState)
      .sort((a, b) => b.pfas_ppt - a.pfas_ppt);
  }, [data.sites, selectedState]);

  // State-level bar chart data
  const stateBarData = useMemo(() => {
    return [...data.stateRanking].sort((a, b) => b.siteCount - a.siteCount).slice(0, 20);
  }, [data.stateRanking]);

  // Sorted cross-ref
  const sortedCrossRef = useMemo(() => {
    return sortRows(
      data.crossRefStates as (CrossRefState & Record<string, unknown>)[],
      crSortKey as keyof CrossRefState,
      crSortDir
    ) as CrossRefState[];
  }, [data.crossRefStates, crSortKey, crSortDir]);

  const maxBarSites = stateBarData.length > 0 ? stateBarData[0].siteCount : 1;

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <Link
          href="/advertising/afff-firefighting-foam"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            AFFF / Firefighter Foam Tort
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Radiation className="w-7 h-7 text-intelligence-teal" />
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            PFAS Contamination Intelligence
          </h1>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          PFAS contamination levels at 500+ U.S. military installations — geographic targeting for AFFF plaintiff recruitment
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Source: DOD assessments via pfaswaterexperts.org (as of July 2024) · EPA advisory: 4 ppt
        </p>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total Sites"
          value={fmtNum(data.summary.totalSites)}
          sub="Military installations assessed"
          icon={MapPin}
        />
        <SummaryCard
          label="Above EPA Limit"
          value={`${fmtNum(data.summary.aboveEpa)} (${data.summary.aboveEpaPct}%)`}
          sub="Exceeding 4 ppt advisory"
          icon={AlertTriangle}
        />
        <SummaryCard
          label="Above 10,000 ppt"
          value={fmtNum(data.summary.above10k)}
          sub="Extreme contamination"
          icon={Activity}
        />
        <SummaryCard
          label="Highest Reading"
          value={`${fmtPpt(data.summary.highestReading)} ppt`}
          sub={`${data.summary.highestSiteName}, ${data.summary.highestSiteState}`}
          icon={Radiation}
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          label="Contamination Overview"
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={BarChart3}
        />
        <TabButton
          label="State Detail View"
          active={activeTab === "state"}
          onClick={() => setActiveTab("state")}
          icon={Layers}
        />
        <TabButton
          label="Cross-Reference Analysis"
          active={activeTab === "crossref"}
          onClick={() => setActiveTab("crossref")}
          icon={Target}
        />
      </div>

      {/* ── Tab 1: Contamination Overview ──────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* State-Level Bar Chart */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-1">
              States by Number of Contaminated Sites
            </h2>
            <p className="mb-4 text-xs text-slate-gray">
              Top 20 states ranked by total military installations with PFAS detections
            </p>
            <div className="space-y-1.5">
              {stateBarData.map((s) => {
                const pct = (s.siteCount / maxBarSites) * 100;
                const barColor =
                  s.maxPpt > 100000 ? "#EF4444" :
                  s.maxPpt > 10000 ? "#F59E0B" :
                  s.maxPpt > 1000 ? "#FBBF24" :
                  "#10B981";
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="w-32 text-[11px] font-semibold text-midnight-navy text-right shrink-0">
                      {s.state}
                    </span>
                    <div className="flex-1 h-5 bg-cloud rounded">
                      <div
                        className="h-5 rounded transition-all"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="w-16 text-xs text-midnight-navy/70 shrink-0">
                      {s.siteCount} sites
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 25 Most Contaminated Table */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-midnight-navy">
                  Most Contaminated Installations
                </h2>
                <p className="text-xs text-slate-gray">
                  Top 25 by total PFAS concentration (parts per trillion)
                </p>
              </div>
              <select
                className="rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy"
                value={topStateFilter}
                onChange={(e) => setTopStateFilter(e.target.value)}
              >
                <option value="all">All States</option>
                {data.uniqueStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray w-10">
                      #
                    </th>
                    <SortHeader label="Installation" sortKey="installation_name" currentKey={topSortKey} currentDir={topSortDir} onSort={toggleTopSort} />
                    <SortHeader label="State" sortKey="state" currentKey={topSortKey} currentDir={topSortDir} onSort={toggleTopSort} />
                    <SortHeader label="Total PFAS (ppt)" sortKey="pfas_ppt" currentKey={topSortKey} currentDir={topSortDir} onSort={toggleTopSort} align="right" />
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTop25.map((s, i) => {
                    const badge = severityBadge(s.severity);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-xs text-slate-gray font-mono">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-midnight-navy">
                          {s.installation_name}
                        </td>
                        <td className="py-2.5 px-3 text-midnight-navy/80">
                          {s.state}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-midnight-navy">
                          {fmtNum(s.pfas_ppt)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {s.severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Tab 2: State Detail View ───────────────────────────── */}
      {activeTab === "state" && (
        <>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <h2 className="font-heading text-lg font-semibold text-midnight-navy">
                State Detail View
              </h2>
              <select
                className="rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                {data.uniqueStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Installations Table */}
            <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
              Installations in {selectedState}
              <span className="ml-2 text-xs font-normal text-slate-gray">
                ({stateSites.length} sites)
              </span>
            </h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Installation Name
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Total PFAS (ppt)
                    </th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stateSites.map((s) => {
                    const badge = severityBadge(s.severity);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-medium text-midnight-navy">
                          {s.installation_name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-midnight-navy">
                          {fmtNum(s.pfas_ppt)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {s.severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {stateSites.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-sm text-slate-gray">
                        No PFAS sites found for this state.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cross-Reference Panel */}
            <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
              Cross-Reference Data — {selectedState}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Cancer Incidence */}
              <div className="rounded-lg border border-intelligence-teal/20 bg-intelligence-teal/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Cancer Incidence
                  </p>
                </div>
                {(() => {
                  const cancer = data.cancerByState[selectedState];
                  if (!cancer || (cancer.kidney === 0 && cancer.bladder === 0)) {
                    return <p className="text-sm text-midnight-navy/60">No data available</p>;
                  }
                  return (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-gray">Kidney &amp; Renal Pelvis</p>
                        <p className="text-lg font-bold text-midnight-navy">
                          {cancer.kidney > 0 ? cancer.kidney.toFixed(1) : "—"}
                          <span className="ml-1 text-xs font-normal text-slate-gray">per 100K</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-gray">Bladder</p>
                        <p className="text-lg font-bold text-midnight-navy">
                          {cancer.bladder > 0 ? cancer.bladder.toFixed(1) : "—"}
                          <span className="ml-1 text-xs font-normal text-slate-gray">per 100K</span>
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* PI Viability */}
              <div className="rounded-lg border border-intelligence-teal/20 bg-intelligence-teal/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    PI Viability
                  </p>
                </div>
                {(() => {
                  const pi = data.piByState[selectedState];
                  if (pi == null) {
                    return <p className="text-sm text-midnight-navy/60">No data available</p>;
                  }
                  const tier =
                    pi >= 90 ? "Very High" :
                    pi >= 75 ? "High" :
                    pi >= 60 ? "Moderate" :
                    "Low";
                  return (
                    <div>
                      <p className="text-2xl font-bold text-midnight-navy">
                        {pi.toFixed(1)}
                      </p>
                      <p className="mt-1 text-xs text-slate-gray">
                        Composite Score — {tier}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Judicial Profile */}
              <div className="rounded-lg border border-intelligence-teal/20 bg-intelligence-teal/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Judicial Profile
                  </p>
                </div>
                {(() => {
                  const judicial = data.judicialByState[selectedState];
                  if (!judicial) {
                    return <p className="text-sm text-midnight-navy/60">No data available</p>;
                  }
                  const color =
                    judicial === "Liberal" ? "text-blue-600 bg-blue-50" :
                    judicial === "Moderate" ? "text-amber-600 bg-amber-50" :
                    "text-red-600 bg-red-50";
                  return (
                    <div>
                      <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${color}`}>
                        {judicial}
                      </span>
                      <p className="mt-2 text-xs text-slate-gray">
                        Predominant judicial orientation
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Tab 3: Cross-Reference Analysis ────────────────────── */}
      {activeTab === "crossref" && (
        <>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-1">
              Composite Targeting Score
            </h2>
            <p className="mb-4 text-xs text-slate-gray">
              States ranked by combined contamination density, cancer incidence, judicial favorability, and PI viability.
              Top 10 highlighted as &ldquo;Priority Markets.&rdquo;
            </p>

            {/* Weighting legend */}
            <div className="mb-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                <Droplets className="w-3 h-3" /> Contamination 30%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                <Activity className="w-3 h-3" /> Cancer Incidence 25%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Scale className="w-3 h-3" /> PI Viability 25%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                <Award className="w-3 h-3" /> Judicial 20%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray w-10">
                      #
                    </th>
                    <SortHeader label="State" sortKey="state" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} />
                    <SortHeader label="High-Contam Sites" sortKey="highContamSites" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="Kidney Rate" sortKey="kidneyRate" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="Bladder Rate" sortKey="bladderRate" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                      Judicial
                    </th>
                    <SortHeader label="PI Score" sortKey="piScore" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                    <SortHeader label="Composite" sortKey="compositeScore" currentKey={crSortKey} currentDir={crSortDir} onSort={toggleCrSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedCrossRef.map((s, i) => {
                    const judicialColor =
                      s.judicial === "Liberal" ? "text-blue-600 bg-blue-50" :
                      s.judicial === "Moderate" ? "text-amber-600 bg-amber-50" :
                      "text-red-600 bg-red-50";
                    return (
                      <tr
                        key={s.state}
                        className={`border-b border-cloud/50 transition-colors ${
                          s.isPriority
                            ? "bg-intelligence-teal/[0.04] hover:bg-intelligence-teal/[0.08]"
                            : "hover:bg-cloud/40"
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          {s.isPriority ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-intelligence-teal text-[10px] font-bold text-white">
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-gray font-mono">{i + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-midnight-navy">
                          {s.state}
                          {s.isPriority && (
                            <span className="ml-1.5 inline-block rounded-full bg-intelligence-teal/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-intelligence-teal">
                              Priority
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-midnight-navy">
                          {s.highContamSites}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                          {s.kidneyRate > 0 ? s.kidneyRate.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                          {s.bladderRate > 0 ? s.bladderRate.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${judicialColor}`}>
                            {s.judicial}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-midnight-navy">
                          {s.piScore > 0 ? s.piScore.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-block rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-xs font-bold text-intelligence-teal">
                            {s.compositeScore.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insight Callout */}
          <div className="rounded-md border border-intelligence-teal/20 bg-intelligence-teal/[0.06] px-4 py-3">
            <p className="text-sm leading-relaxed text-midnight-navy/80">
              Priority Markets combine high PFAS contamination density with elevated
              cancer incidence rates, favorable PI viability, and plaintiff-friendly
              judicial climates. Firms targeting these states for AFFF plaintiff
              recruitment may find both a larger potential claimant pool and more
              favorable litigation outcomes.
            </p>
          </div>

          {/* Cross-links */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/advertising/afff-firefighting-foam"
              className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
            >
              View AFFF Tort Profile
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/judicial-profiles"
              className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
            >
              View Judicial Profiles
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/pi-viability"
              className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
            >
              View PI Viability Scores
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/cancer-incidence"
              className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
            >
              View Cancer Incidence Data
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}

      {/* ── Footer / Disclaimer ─────────────────────────────────── */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          Data sourced from DOD PFAS assessments via pfaswaterexperts.org (as of July 2024).
          EPA health advisory level: 4 ppt (2022 interim updated advisory).
          Cross-reference data from CDC/NCI cancer statistics, judicial profile databases,
          and PI viability scoring models. This page does not constitute legal advice.
        </p>
      </div>
    </div>
  );
}
