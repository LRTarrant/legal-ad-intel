"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Thermometer,
  AlertTriangle,
  ArrowUpRight,
  Flame,
  Snowflake,
  Gavel,
  FileSearch,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  MapPin,
  Users,
  ExternalLink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RecallRow {
  id: string;
  product_description: string;
  product_code: string | null;
  recall_class: string | null;
  reason_for_recall: string | null;
  event_date_initiated: string | null;
  status: string | null;
  stage: number;
  stage_label: string;
  case_count: number;
  state_count: number;
  specialty_firm_count: number;
  mdl_petition_filed: boolean;
  mdl_formed: boolean;
}

export interface ManufacturerRow {
  id: string;
  canonical_name: string;
  slug: string | null;
  domicile_state: string | null;
  parent_name: string | null;
  max_stage: number;
  max_stage_label: string;
  recall_count: number;
  class_i_recall_count: number;
  total_cases: number;
  state_count: number;
  specialty_firm_count: number;
  mdl_petition_filed: boolean;
  mdl_formed: boolean;
  first_case_filed_at: string | null;
  last_case_filed_at: string | null;
  last_scored_at: string | null;
  recalls: RecallRow[];
}

export interface StageCounts {
  total: number;
  cold: number;
  warming: number;
  warm: number;
  hot: number;
  boiling: number;
}

export interface RecentEscalation {
  id: string;
  recall_id: string;
  manufacturer_id: string | null;
  manufacturer_name: string;
  product_description: string;
  recall_class: string | null;
  from_stage: number;
  to_stage: number;
  to_label: string;
  case_count_at_transition: number;
  trigger_reason: string | null;
  transitioned_at: string | null;
}

export interface RecallWatchlistPageData {
  stageCounts: StageCounts;
  manufacturers: ManufacturerRow[];
  recentEscalations: RecentEscalation[];
  totalRecalls: number;
  classIRecalls: number;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Stage palette                                                       */
/* ------------------------------------------------------------------ */

type StageTheme = {
  stage: number;
  label: string;
  badge: string; // chip bg+text
  bar: string; // solid bar color
  ring: string; // ring color when active
  softBg: string; // card tinted bg
  softBorder: string;
  dot: string;
};

const STAGE_THEMES: Record<number, StageTheme> = {
  1: {
    stage: 1,
    label: "Cold",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    bar: "bg-slate-400",
    ring: "ring-slate-400",
    softBg: "bg-slate-50",
    softBorder: "border-slate-200",
    dot: "bg-slate-400",
  },
  2: {
    stage: 2,
    label: "Warming",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    bar: "bg-sky-500",
    ring: "ring-sky-500",
    softBg: "bg-sky-50",
    softBorder: "border-sky-200",
    dot: "bg-sky-500",
  },
  3: {
    stage: 3,
    label: "Warm",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
    ring: "ring-amber-500",
    softBg: "bg-amber-50",
    softBorder: "border-amber-200",
    dot: "bg-amber-500",
  },
  4: {
    stage: 4,
    label: "Hot",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    bar: "bg-orange-500",
    ring: "ring-orange-500",
    softBg: "bg-orange-50",
    softBorder: "border-orange-200",
    dot: "bg-orange-500",
  },
  5: {
    stage: 5,
    label: "Boiling",
    badge: "bg-red-100 text-red-800 border-red-200",
    bar: "bg-red-600",
    ring: "ring-red-600",
    softBg: "bg-red-50",
    softBorder: "border-red-200",
    dot: "bg-red-600",
  },
};

function themeFor(stage: number): StageTheme {
  return STAGE_THEMES[stage] ?? STAGE_THEMES[1];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtRelative(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

type SortKey =
  | "stage"
  | "cases"
  | "recalls"
  | "states"
  | "specialty"
  | "name";

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export function RecallWatchlistClient({
  data,
}: {
  data: RecallWatchlistPageData;
}) {
  const [stageFilter, setStageFilter] = useState<number | null>(null); // null = all non-cold; "all" handled separately
  const [includeCold, setIncludeCold] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("stage");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let rows = data.manufacturers;
    if (stageFilter !== null) {
      rows = rows.filter((r) => r.max_stage === stageFilter);
    } else if (!includeCold) {
      rows = rows.filter((r) => r.max_stage > 1);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        if (r.canonical_name.toLowerCase().includes(q)) return true;
        if (r.parent_name && r.parent_name.toLowerCase().includes(q)) return true;
        if (r.domicile_state && r.domicile_state.toLowerCase().includes(q))
          return true;
        // Also search recall descriptions so users can find "pacemaker" etc.
        return r.recalls.some((rec) =>
          rec.product_description.toLowerCase().includes(q)
        );
      });
    }
    const sorted = rows.slice();
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "cases":
          if (b.total_cases !== a.total_cases)
            return b.total_cases - a.total_cases;
          break;
        case "recalls":
          if (b.recall_count !== a.recall_count)
            return b.recall_count - a.recall_count;
          break;
        case "states":
          if (b.state_count !== a.state_count)
            return b.state_count - a.state_count;
          break;
        case "specialty":
          if (b.specialty_firm_count !== a.specialty_firm_count)
            return b.specialty_firm_count - a.specialty_firm_count;
          break;
        case "name":
          return a.canonical_name.localeCompare(b.canonical_name);
        case "stage":
        default:
          if (b.max_stage !== a.max_stage) return b.max_stage - a.max_stage;
          break;
      }
      // tiebreaker: stage desc, then cases desc
      if (b.max_stage !== a.max_stage) return b.max_stage - a.max_stage;
      if (b.total_cases !== a.total_cases) return b.total_cases - a.total_cases;
      return a.canonical_name.localeCompare(b.canonical_name);
    });
    return sorted;
  }, [data.manufacturers, stageFilter, includeCold, search, sortKey]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { stageCounts } = data;
  const nonColdTotal =
    stageCounts.warming + stageCounts.warm + stageCounts.hot + stageCounts.boiling;

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Recall Watchlist
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800">
            <Thermometer className="h-3 w-3" />
            Pre-MDL Early-Warning Board
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Five-Stage Thermometer scoring across {data.totalRecalls.toLocaleString()}{" "}
          FDA Class I/II device recalls and{" "}
          {data.manufacturers.length.toLocaleString()} manufacturers.
        </p>
        <p className="mt-1 text-xs text-slate-gray">
          Cold → Boiling scoring based on CourtListener case counts, state
          diversity, specialty-firm involvement, and JPML/MDL milestones.
          Generated {fmtRelative(data.generatedAt)}.
        </p>
      </div>

      {/* 2. KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <KpiCard
          label="Total mfrs"
          value={stageCounts.total.toLocaleString()}
          icon={<FileSearch className="h-4 w-4" />}
          tone="neutral"
        />
        <StageKpi stage={1} count={stageCounts.cold} />
        <StageKpi stage={2} count={stageCounts.warming} />
        <StageKpi stage={3} count={stageCounts.warm} />
        <StageKpi stage={4} count={stageCounts.hot} />
        <StageKpi stage={5} count={stageCounts.boiling} />
      </div>

      {/* 3. Recent escalations strip */}
      {data.recentEscalations.length > 0 && (
        <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">
              Recently Escalated
            </h2>
            <span className="text-xs text-slate-gray">
              · Last {data.recentEscalations.length} stage transitions
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.recentEscalations.slice(0, 6).map((e) => {
              const toTheme = themeFor(e.to_stage);
              return (
                <div
                  key={e.id}
                  className={`rounded-lg border ${toTheme.softBorder} ${toTheme.softBg} p-4`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${toTheme.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${toTheme.dot}`} />
                      Stage {e.from_stage} → {e.to_stage} ({e.to_label})
                    </span>
                    <span className="text-slate-gray">
                      · {fmtRelative(e.transitioned_at)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-midnight-navy line-clamp-1">
                    {e.manufacturer_name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-gray line-clamp-2">
                    {e.product_description || "—"}
                  </div>
                  {e.trigger_reason && (
                    <div className="mt-2 text-[11px] text-slate-gray italic line-clamp-1">
                      {e.trigger_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Filter bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            active={stageFilter === null && !includeCold}
            onClick={() => {
              setStageFilter(null);
              setIncludeCold(false);
            }}
            label={`Active heat (${nonColdTotal})`}
            dotClass="bg-amber-500"
          />
          <FilterPill
            active={stageFilter === null && includeCold}
            onClick={() => {
              setStageFilter(null);
              setIncludeCold(true);
            }}
            label={`All mfrs (${stageCounts.total})`}
            dotClass="bg-slate-400"
          />
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {[5, 4, 3, 2, 1].map((s) => {
            const t = themeFor(s);
            const count =
              s === 1
                ? stageCounts.cold
                : s === 2
                  ? stageCounts.warming
                  : s === 3
                    ? stageCounts.warm
                    : s === 4
                      ? stageCounts.hot
                      : stageCounts.boiling;
            return (
              <FilterPill
                key={s}
                active={stageFilter === s}
                onClick={() => {
                  setStageFilter(stageFilter === s ? null : s);
                  setIncludeCold(s === 1 ? true : includeCold);
                }}
                label={`${t.label} (${count})`}
                dotClass={t.dot}
              />
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search manufacturer or product…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-midnight-navy placeholder:text-slate-400 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <option value="stage">Sort: Stage (hottest first)</option>
              <option value="cases">Sort: Case count</option>
              <option value="recalls">Sort: Recall count</option>
              <option value="states">Sort: States filed</option>
              <option value="specialty">Sort: Specialty firms</option>
              <option value="name">Sort: Manufacturer name</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Manufacturer board */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
          <Gavel className="h-4 w-4 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Manufacturer Heat Board
          </h2>
          <span className="text-xs text-slate-gray">
            · {filtered.length.toLocaleString()} of{" "}
            {data.manufacturers.length.toLocaleString()} shown
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            hasActiveFilter={
              stageFilter !== null || search.length > 0 || !includeCold
            }
            onReset={() => {
              setStageFilter(null);
              setSearch("");
              setIncludeCold(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-gray">
                  <th className="py-2 px-3 text-left font-semibold w-10"></th>
                  <th className="py-2 px-3 text-left font-semibold">Stage</th>
                  <th className="py-2 px-3 text-left font-semibold">Manufacturer</th>
                  <th className="py-2 px-3 text-right font-semibold">Recalls</th>
                  <th className="py-2 px-3 text-right font-semibold">Class I</th>
                  <th className="py-2 px-3 text-right font-semibold">Cases</th>
                  <th className="py-2 px-3 text-right font-semibold">States</th>
                  <th className="py-2 px-3 text-right font-semibold">Specialty</th>
                  <th className="py-2 px-3 text-left font-semibold">MDL</th>
                  <th className="py-2 px-3 text-left font-semibold">Last scored</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((m) => {
                  const t = themeFor(m.max_stage);
                  const isOpen = expanded.has(m.id);
                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                          isOpen ? "bg-slate-50" : ""
                        }`}
                        onClick={() => toggleExpanded(m.id)}
                      >
                        <td className="py-2 px-3">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <StageBar stage={m.max_stage} />
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${t.badge}`}
                            >
                              {m.max_stage_label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {m.slug ? (
                            <Link
                              href={`/advertising/recall-watchlist/${m.slug}`}
                              className="font-medium text-midnight-navy hover:text-intelligence-teal hover:underline"
                            >
                              {m.canonical_name}
                            </Link>
                          ) : (
                            <div className="font-medium text-midnight-navy">
                              {m.canonical_name}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-gray">
                            {m.parent_name && m.parent_name !== m.canonical_name
                              ? `${m.parent_name} · `
                              : ""}
                            {m.domicile_state ?? "—"}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                          {m.recall_count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                          {m.class_i_recall_count > 0 ? (
                            <span className="text-red-700 font-semibold">
                              {m.class_i_recall_count}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                          {m.total_cases}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                          {m.state_count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                          {m.specialty_firm_count}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {m.mdl_formed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 font-medium">
                              <Flame className="h-3 w-3" />
                              MDL formed
                            </span>
                          ) : m.mdl_petition_filed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 font-medium">
                              <Gavel className="h-3 w-3" />
                              Petition filed
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-gray">
                          {fmtRelative(m.last_scored_at)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <td colSpan={10} className="py-4 px-6">
                            <DrilldownCard mfr={m} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs text-slate-gray">
                Showing first 500 of {filtered.length.toLocaleString()} matches ·
                narrow your filters to see more
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Stage legend / methodology */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Five-Stage Thermometer
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((s) => {
            const t = themeFor(s);
            const copy = STAGE_COPY[s];
            return (
              <div
                key={s}
                className={`rounded-lg border p-3 ${t.softBorder} ${t.softBg}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                  Stage {s} · {t.label}
                </div>
                <p className="mt-1.5 text-xs text-midnight-navy/80 leading-relaxed">
                  {copy}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-gray">
          Scores refresh weekly (Mondays 6 AM CT) via a CourtListener party-search
          pipeline. Heuristics are manufacturer-level in v1 — product-code matching
          and docket enrichment ship Day 4.
        </p>
      </div>
    </div>
  );
}

const STAGE_COPY: Record<number, string> = {
  1: "No litigation observed yet. FDA recalls exist but no plaintiff cases have been filed against the manufacturer.",
  2: "1–4 cases filed in fewer than 3 states. Early signal; monitor for specialty-firm pickup.",
  3: "5+ cases OR 3+ states OR at least one specialty mass-tort firm on a complaint. Actionable intake opportunity.",
  4: "25+ cases across 5+ states with 2+ specialty firms, or a JPML petition filed. Pre-MDL maturity — plan media now.",
  5: "MDL formed, OR 50+ cases across 10+ states with 4+ specialty firms. Full mass-tort status, national media ramp.",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "warn" | "hot";
}) {
  const toneClass =
    tone === "hot"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-lg border ${toneClass} p-3 shadow-sm`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-gray font-semibold">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-midnight-navy font-mono">
        {value}
      </div>
    </div>
  );
}

function StageKpi({ stage, count }: { stage: number; count: number }) {
  const t = themeFor(stage);
  const Icon = stage === 1 ? Snowflake : stage >= 4 ? Flame : Thermometer;
  return (
    <div className={`rounded-lg border ${t.softBorder} ${t.softBg} p-3 shadow-sm`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-midnight-navy/70">
        <Icon className="h-3.5 w-3.5" />
        {t.label}
      </div>
      <div className="mt-1 text-2xl font-bold text-midnight-navy font-mono">
        {count.toLocaleString()}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-midnight-navy bg-midnight-navy text-white"
          : "border-slate-200 bg-white text-midnight-navy hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </button>
  );
}

function StageBar({ stage }: { stage: number }) {
  return (
    <div className="flex h-4 w-14 overflow-hidden rounded-sm border border-slate-200 bg-slate-50">
      {[1, 2, 3, 4, 5].map((s) => {
        const t = themeFor(s);
        return (
          <div
            key={s}
            className={`flex-1 ${
              stage >= s ? t.bar : "bg-slate-100"
            } ${s < 5 ? "border-r border-white/60" : ""}`}
          />
        );
      })}
    </div>
  );
}

function EmptyState({
  hasActiveFilter,
  onReset,
}: {
  hasActiveFilter: boolean;
  onReset: () => void;
}) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <AlertTriangle className="h-5 w-5 text-slate-400" />
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-midnight-navy">
        {hasActiveFilter ? "No manufacturers match" : "No heat detected yet"}
      </h3>
      <p className="mt-1 text-sm text-slate-gray max-w-md mx-auto">
        {hasActiveFilter
          ? "Try clearing your filters or searching a different manufacturer."
          : "The weekly thermometer job hasn’t surfaced any cases above Cold yet. Cases are pulled from CourtListener every Monday morning."}
      </p>
      {hasActiveFilter && (
        <button
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-midnight-navy hover:bg-slate-50"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-2 ${
        highlight
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-gray font-semibold">
        {icon}
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold font-mono ${
          highlight ? "text-red-700" : "text-midnight-navy"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DrilldownCard({ mfr }: { mfr: ManufacturerRow }) {
  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatTile label="Recalls" value={mfr.recall_count.toString()} />
        <StatTile
          label="Class I"
          value={mfr.class_i_recall_count.toString()}
          highlight={mfr.class_i_recall_count > 0}
        />
        <StatTile
          label="Cases"
          value={mfr.total_cases.toString()}
          icon={<Users className="h-3 w-3" />}
        />
        <StatTile
          label="States"
          value={mfr.state_count.toString()}
          icon={<MapPin className="h-3 w-3" />}
        />
        <StatTile
          label="Specialty firms"
          value={mfr.specialty_firm_count.toString()}
        />
        <StatTile
          label="First case"
          value={fmtDate(mfr.first_case_filed_at)}
          icon={<Clock className="h-3 w-3" />}
        />
      </div>

      {/* Recall list */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-gray">
          <FileSearch className="h-3.5 w-3.5" />
          FDA Recalls ({mfr.recalls.length}
          {mfr.recall_count > mfr.recalls.length
            ? ` of ${mfr.recall_count}, showing top 50 by heat`
            : ""}
          )
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-gray">
                <th className="py-1.5 px-2 text-left">Stage</th>
                <th className="py-1.5 px-2 text-left">Class</th>
                <th className="py-1.5 px-2 text-left">Product</th>
                <th className="py-1.5 px-2 text-left">Reason</th>
                <th className="py-1.5 px-2 text-left">Initiated</th>
                <th className="py-1.5 px-2 text-right">Cases</th>
                <th className="py-1.5 px-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {mfr.recalls.map((r) => {
                const t = themeFor(r.stage);
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-1.5 px-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px] font-medium ${t.badge}`}
                      >
                        <span className={`h-1 w-1 rounded-full ${t.dot}`} />
                        {r.stage_label}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      {r.recall_class === "Class I" ? (
                        <span className="rounded bg-red-100 text-red-800 border border-red-200 px-1.5 py-0 text-[10px] font-semibold">
                          I
                        </span>
                      ) : (
                        <span className="text-slate-400">{r.recall_class ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 max-w-md">
                      <div className="text-midnight-navy line-clamp-2">
                        {r.product_description || "—"}
                      </div>
                      {r.product_code && (
                        <div className="text-[10px] text-slate-gray font-mono">
                          {r.product_code}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-slate-gray max-w-xs line-clamp-2">
                      {r.reason_for_recall ?? "—"}
                    </td>
                    <td className="py-1.5 px-2 text-slate-gray whitespace-nowrap">
                      {fmtDate(r.event_date_initiated)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {r.case_count}
                    </td>
                    <td className="py-1.5 px-2 text-slate-gray">
                      {r.status ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-gray">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last scored {fmtRelative(mfr.last_scored_at)}
        </span>
        {mfr.mdl_formed && (
          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
            <Flame className="h-3 w-3" />
            MDL formed
          </span>
        )}
        {mfr.mdl_petition_filed && !mfr.mdl_formed && (
          <span className="inline-flex items-center gap-1 text-orange-700 font-semibold">
            <Gavel className="h-3 w-3" />
            JPML petition filed
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-slate-gray/70">
          <ArrowUpRight className="h-3 w-3" />
          Manufacturer deep-dive ships Day 4
          <ExternalLink className="h-3 w-3 opacity-0" />
        </span>
      </div>
    </div>
  );
}
