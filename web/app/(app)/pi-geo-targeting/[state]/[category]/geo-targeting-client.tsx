"use client";

/**
 * Client component for the PI Geo Targeting page.
 *
 * Renders two stacked tables (Counties, Metros) with column sorting
 * and a CSV download button. Pure read view — no mutations. The CSV
 * button hits the same /api endpoint with ?format=csv so the file
 * mirrors what the user sees on screen exactly.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Download,
  Loader2,
  MapPin,
} from "lucide-react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeMeta,
  type UpgradeReason,
} from "@/lib/billing/upgrade-copy";
import type {
  GeoTargetCountyRow,
  GeoTargetingReport,
  GeoTargetMetroRow,
} from "@/app/api/pi/geo-targeting/testable";
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";

export interface GeoTargetingPageParams {
  state: string;
  pi_category: PICategory;
}

export function GeoTargetingClient({
  params,
}: {
  params: GeoTargetingPageParams;
}) {
  const [report, setReport] = useState<GeoTargetingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<{
    reason: UpgradeReason;
    meta: UpgradeMeta;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const url = `/api/pi/geo-targeting?state=${encodeURIComponent(params.state)}&pi_category=${encodeURIComponent(params.pi_category)}`;
    fetchWithDemoMode(url)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          if (isEntitlementError(json)) {
            setUpgrade(reasonFromEntitlementError(json, "personal_injury"));
            return;
          }
          throw new Error(
            json.error ??
              (Array.isArray(json.errors) && json.errors.length > 0
                ? json.errors.join("; ")
                : `Request failed (${res.status})`),
          );
        }
        setReport(json as GeoTargetingReport);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [params.state, params.pi_category]);

  const csvUrl = `/api/pi/geo-targeting?state=${encodeURIComponent(params.state)}&pi_category=${encodeURIComponent(params.pi_category)}&format=csv`;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            PI Geo Targeting — {params.state} ·{" "}
            {humanCategory(params.pi_category)}
          </h1>
          <p className="mt-1 text-sm text-slate-gray">
            County- and metro-level fatal-crash density. Source data: FARS
            (NHTSA) + internal county_msa_crosswalk. Use as a starting point
            for Google Ads / DV360 / Meta geo lists.
          </p>
        </div>
        <a
          href={csvUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-intelligence-teal/30 bg-white px-4 py-2 text-sm font-semibold text-intelligence-teal transition hover:bg-intelligence-teal/5"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-lg bg-white p-6 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-intelligence-teal" />
          <span className="text-sm text-slate-gray">Loading FARS data…</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-alert/20 bg-alert/5 p-3 text-sm text-alert">
          {error}
        </div>
      )}

      {upgrade && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your subscription doesn&apos;t include this state for PI campaigns.
        </div>
      )}

      {report && !loading && (
        <>
          {/* State summary */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-intelligence-teal">
              <MapPin className="h-4 w-4" />
              State summary
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Fatal crashes"
                value={report.state_total_fatal_crashes.toLocaleString()}
                sub={report.lookback_label}
              />
              <Stat
                label="Counties with data"
                value={report.counties.length}
              />
              <Stat label="Metro areas" value={report.metros.length} />
              <Stat label="Source" value={report.source} mono />
            </div>
            {report.notes && (
              <p className="mt-3 rounded-md bg-cloud/40 px-3 py-2 text-xs italic text-slate-gray">
                {report.notes}
              </p>
            )}
          </div>

          {/* Metros table */}
          {report.metros.length > 0 && (
            <MetroTable metros={report.metros} />
          )}

          {/* Counties table */}
          {report.counties.length > 0 && (
            <CountiesTable counties={report.counties} />
          )}
        </>
      )}
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string | number;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
        {label}
      </div>
      <div
        className={`mt-0.5 text-lg font-semibold text-midnight-navy ${mono ? "font-mono text-sm" : ""}`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-gray">{sub}</div>}
    </div>
  );
}

/* ── Metros table ──────────────────────────────────────────────────────── */

type MetroSortKey =
  | "rank"
  | "cbsa_title"
  | "fatal_crashes"
  | "county_count";

function MetroTable({ metros }: { metros: GeoTargetMetroRow[] }) {
  const [sortKey, setSortKey] = useState<MetroSortKey>("fatal_crashes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const out = [...metros];
    out.sort((a, b) => {
      const aV = a[sortKey];
      const bV = b[sortKey];
      const cmp =
        typeof aV === "number" && typeof bV === "number"
          ? aV - bV
          : String(aV).localeCompare(String(bV));
      return sortDir === "desc" ? -cmp : cmp;
    });
    return out;
  }, [metros, sortKey, sortDir]);

  function toggleSort(key: MetroSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "cbsa_title" ? "asc" : "desc");
    }
  }

  return (
    <div className="rounded-lg bg-white shadow-sm">
      <div className="border-b border-cloud px-6 py-3 text-xs font-semibold uppercase tracking-wider text-intelligence-teal">
        Metro areas (CBSA)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cloud/30 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
              <Th label="Rank" sortKey="rank" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <Th label="Metro" sortKey="cbsa_title" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <Th label="Fatal crashes" sortKey="fatal_crashes" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <Th label="Counties" sortKey="county_count" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <th className="px-4 py-2">Top counties</th>
              <th className="px-4 py-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.cbsa_code} className="border-t border-cloud">
                <td className="px-4 py-2 text-slate-gray">{m.rank}</td>
                <td className="px-4 py-2 font-semibold text-midnight-navy">
                  {m.cbsa_title}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {m.fatal_crashes.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-gray">
                  {m.county_count}
                </td>
                <td className="px-4 py-2 text-xs text-slate-gray">
                  {m.county_preview}
                </td>
                <td className="px-4 py-2">
                  <PriorityPill p={m.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Counties table ────────────────────────────────────────────────────── */

type CountySortKey =
  | "rank"
  | "county_name"
  | "fatal_crashes"
  | "motorcycle_share"
  | "truck_share"
  | "drunk_share"
  | "rural_share"
  | "cbsa_title";

function CountiesTable({ counties }: { counties: GeoTargetCountyRow[] }) {
  const [sortKey, setSortKey] = useState<CountySortKey>("fatal_crashes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return counties;
    return counties.filter(
      (c) =>
        c.county_name.toLowerCase().includes(f) ||
        c.cbsa_title?.toLowerCase().includes(f),
    );
  }, [counties, filter]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      const aV = a[sortKey];
      const bV = b[sortKey];
      const cmp =
        typeof aV === "number" && typeof bV === "number"
          ? aV - bV
          : String(aV ?? "").localeCompare(String(bV ?? ""));
      return sortDir === "desc" ? -cmp : cmp;
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: CountySortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "county_name" || key === "cbsa_title" ? "asc" : "desc",
      );
    }
  }

  return (
    <div className="rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-cloud px-6 py-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-intelligence-teal">
          Counties
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by county or metro…"
          className="w-64 rounded-md border border-cloud bg-white px-3 py-1.5 text-sm focus:border-intelligence-teal focus:outline-none"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cloud/30 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
              <Th label="Rank" sortKey="rank" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <Th label="County" sortKey="county_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <Th label="Fatal" sortKey="fatal_crashes" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <Th label="MC %" sortKey="motorcycle_share" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <Th label="Truck %" sortKey="truck_share" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <Th label="Drunk %" sortKey="drunk_share" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <Th label="Rural %" sortKey="rural_share" current={sortKey} dir={sortDir} onClick={toggleSort} numeric />
              <Th label="Metro" sortKey="cbsa_title" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.fips_full ?? c.county_name} className="border-t border-cloud">
                <td className="px-4 py-2 text-slate-gray">{c.rank}</td>
                <td className="px-4 py-2 font-semibold text-midnight-navy">
                  {c.county_name}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {c.fatal_crashes.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-gray">
                  {(c.motorcycle_share * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-gray">
                  {(c.truck_share * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-gray">
                  {(c.drunk_share * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-gray">
                  {(c.rural_share * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-xs text-slate-gray">
                  {c.cbsa_title ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <PriorityPill p={c.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <p className="px-6 py-4 text-sm text-slate-gray">
          No counties match your filter.
        </p>
      )}
    </div>
  );
}

/* ── Header cell with sort indicator ───────────────────────────────────── */

function Th<K extends string>({
  label,
  sortKey,
  current,
  dir,
  onClick,
  numeric,
}: {
  label: string;
  sortKey: K;
  current: K;
  dir: "asc" | "desc";
  onClick: (k: K) => void;
  numeric?: boolean;
}) {
  const active = current === sortKey;
  const Icon = active ? (dir === "asc" ? ArrowDownAZ : ArrowUpDown) : ArrowUpDown;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-2 ${numeric ? "text-right" : ""}`}
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon
          className={`h-3 w-3 ${active ? "text-intelligence-teal" : "text-slate-gray/40"}`}
        />
      </span>
    </th>
  );
}

/* ── Priority pill ─────────────────────────────────────────────────────── */

function PriorityPill({ p }: { p: "high" | "medium" | "low" }) {
  const cls =
    p === "high"
      ? "bg-emerald-100 text-emerald-900"
      : p === "medium"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {p}
    </span>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function humanCategory(c: PICategory): string {
  switch (c) {
    case "car_accident":
      return "Car accident";
    case "truck_accident":
      return "Truck accident";
    case "motorcycle_accident":
      return "Motorcycle accident";
    case "pedestrian_accident":
      return "Pedestrian accident";
    case "bicycle_accident":
      return "Bicycle accident";
    default:
      return c;
  }
}
