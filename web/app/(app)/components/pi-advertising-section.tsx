"use client";

import { useState, useEffect } from "react";
import { Search, Megaphone, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getSupabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PIAdvertisingSummary {
  total_competitors: number;
  total_observations: number;
  top_competitor: string | null;
  most_contested_case_type: string | null;
  least_contested_case_type: string | null;
  metro_count: number;
}

interface PICompetitor {
  state_abbr: string;
  advertiser_domain: string;
  advertiser_name: string;
  website: string | null;
  metros_active: string[];
  case_types_active: string[];
  total_observations: number;
  avg_ad_position: number;
  first_seen: string;
  last_seen: string;
  presence_score: number;
}

interface PIMetroSaturation {
  metro_name: string;
  metro_label: string;
  competitor_count: number;
  total_observations: number;
  top_competitor: string | null;
  saturation_level: string;
}

interface PICaseTypeCompetition {
  case_type: string;
  case_label: string;
  competitor_count: number;
  avg_position: number;
  total_observations: number;
  saturation_level: string;
}

export interface PIAdvertisingData {
  summary: PIAdvertisingSummary | null;
  competitors: PICompetitor[];
  metros: PIMetroSaturation[];
  caseTypes: PICaseTypeCompetition[];
}

interface Props {
  stateAbbr: string;
  onDataLoaded?: (data: PIAdvertisingData) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CASE_TYPE_LABELS: Record<string, string> = {
  general_pi: "General PI",
  motor_vehicle: "Motor Vehicle",
  truck: "Truck Accidents",
  motorcycle: "Motorcycle",
  construction: "Construction",
  slip_and_fall: "Slip & Fall",
};

function formatCaseType(ct: string | null): string {
  if (!ct) return "N/A";
  return CASE_TYPE_LABELS[ct] ?? ct.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SATURATION_COLORS: Record<string, string> = {
  High: "#EF4444",
  Medium: "#F59E0B",
  Low: "#22C55E",
};

function saturationBadge(level: string) {
  const bg =
    level === "High"
      ? "bg-red-100 text-red-700 border-red-200"
      : level === "Medium"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bg}`}
    >
      {level}
    </span>
  );
}

function presenceBadge(score: number) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700"
      : score >= 40
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${color}`}
    >
      {score.toFixed(0)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PIAdvertisingSection({ stateAbbr, onDataLoaded }: Props) {
  const [summary, setSummary] = useState<PIAdvertisingSummary | null>(null);
  const [competitors, setCompetitors] = useState<PICompetitor[]>([]);
  const [metros, setMetros] = useState<PIMetroSaturation[]>([]);
  const [caseTypes, setCaseTypes] = useState<PICaseTypeCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const supabase = getSupabase();
      const sb = supabase as unknown as {
        rpc: (
          fn: string,
          params: Record<string, string>
        ) => Promise<{ data: unknown; error: unknown }>;
      };

      const results = await Promise.allSettled([
        sb.rpc("get_pi_advertising_summary", { p_state: stateAbbr }),
        sb.rpc("get_pi_competitors", { p_state: stateAbbr }),
        sb.rpc("get_pi_metro_saturation", { p_state: stateAbbr }),
        sb.rpc("get_pi_case_type_competition", { p_state: stateAbbr }),
      ]);

      if (cancelled) return;

      // Summary (single JSON object)
      if (results[0].status === "fulfilled") {
        const res = results[0].value as { data: unknown; error: unknown };
        if (!res.error && res.data) {
          const d = Array.isArray(res.data) ? res.data[0] : res.data;
          setSummary(d as PIAdvertisingSummary);
        }
      } else {
        console.error("[PI Ads] summary failed:", results[0].reason);
      }

      // Competitors — filter out google.com
      if (results[1].status === "fulfilled") {
        const res = results[1].value as { data: unknown; error: unknown };
        if (!res.error && res.data) {
          const rows = (res.data as PICompetitor[]).filter(
            (c) => c.advertiser_domain !== "google.com"
          );
          setCompetitors(rows);
        }
      } else {
        console.error("[PI Ads] competitors failed:", results[1].reason);
      }

      // Metro saturation
      if (results[2].status === "fulfilled") {
        const res = results[2].value as { data: unknown; error: unknown };
        if (!res.error && res.data) {
          setMetros(res.data as PIMetroSaturation[]);
        }
      } else {
        console.error("[PI Ads] metro saturation failed:", results[2].reason);
      }

      // Case type competition
      if (results[3].status === "fulfilled") {
        const res = results[3].value as { data: unknown; error: unknown };
        if (!res.error && res.data) {
          setCaseTypes(res.data as PICaseTypeCompetition[]);
        }
      } else {
        console.error("[PI Ads] case type competition failed:", results[3].reason);
      }

      // Determine if we have any meaningful data
      const hasSummary =
        results[0].status === "fulfilled" &&
        !(results[0].value as { data: unknown; error: unknown }).error &&
        (results[0].value as { data: unknown }).data;
      const hasCompetitors =
        results[1].status === "fulfilled" &&
        !(results[1].value as { data: unknown; error: unknown }).error &&
        Array.isArray((results[1].value as { data: unknown }).data) &&
        ((results[1].value as { data: PICompetitor[] }).data).filter(
          (c) => c.advertiser_domain !== "google.com"
        ).length > 0;

      setHasData(!!(hasSummary || hasCompetitors));

      // Expose fetched data to parent for Ask AI context
      if (onDataLoaded) {
        let summaryData: PIAdvertisingSummary | null = null;
        let competitorData: PICompetitor[] = [];
        let metroData: PIMetroSaturation[] = [];
        let caseTypeData: PICaseTypeCompetition[] = [];

        const r0 = results[0];
        if (r0.status === "fulfilled") {
          const res = r0.value as { data: unknown; error: unknown };
          if (!res.error && res.data) {
            const d = Array.isArray(res.data) ? res.data[0] : res.data;
            summaryData = d as PIAdvertisingSummary;
          }
        }
        const r1 = results[1];
        if (r1.status === "fulfilled") {
          const res = r1.value as { data: unknown; error: unknown };
          if (!res.error && Array.isArray(res.data)) {
            competitorData = (res.data as PICompetitor[]).filter(
              (c) => c.advertiser_domain !== "google.com"
            );
          }
        }
        const r2 = results[2];
        if (r2.status === "fulfilled") {
          const res = r2.value as { data: unknown; error: unknown };
          if (!res.error && res.data) {
            metroData = (res.data as PIMetroSaturation[]) ?? [];
          }
        }
        const r3 = results[3];
        if (r3.status === "fulfilled") {
          const res = r3.value as { data: unknown; error: unknown };
          if (!res.error && res.data) {
            caseTypeData = (res.data as PICaseTypeCompetition[]) ?? [];
          }
        }

        onDataLoaded({
          summary: summaryData,
          competitors: competitorData,
          metros: metroData,
          caseTypes: caseTypeData,
        });
      }

      setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [stateAbbr]);

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Search Advertising Landscape
          </h2>
        </div>
        <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
          <div className="w-8 h-8 mx-auto mb-3 animate-spin rounded-full border-2 border-intelligence-teal border-t-transparent" />
          <p className="text-sm font-medium text-midnight-navy/60">
            Loading advertising data...
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Empty state                                                      */
  /* ---------------------------------------------------------------- */

  if (!hasData) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Search Advertising Landscape
          </h2>
        </div>
        <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
          <Megaphone className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
          <p className="text-sm font-medium text-midnight-navy/60">
            No advertising data available yet
          </p>
          <p className="mt-2 text-xs text-slate-gray max-w-md mx-auto">
            Search advertising data for this state is being collected and will
            appear here once available.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const totalMetros = metros.length;
  const topCompetitor = competitors[0] ?? null;

  // Insight for competitor table
  const competitorInsight =
    topCompetitor && topCompetitor.presence_score >= 80
      ? `${topCompetitor.advertiser_name} dominates this market with presence across ${topCompetitor.metros_active?.length ?? 0} metros and ${topCompetitor.case_types_active?.length ?? 0} case types`
      : `No single firm dominates — the market is fragmented across ${competitors.length} competitors`;

  // Insight for case type chart
  const lowSaturationCaseTypes = caseTypes
    .filter((ct) => ct.saturation_level === "Low")
    .sort((a, b) => a.competitor_count - b.competitor_count);
  const caseTypeInsight =
    lowSaturationCaseTypes.length > 0
      ? `${lowSaturationCaseTypes[0].case_label} advertising is nearly absent — low-competition entry point`
      : "All case types are moderately to highly contested in this state";

  // Insight for metro breakdown
  const sortedMetrosByCompetitors = [...metros].sort(
    (a, b) => a.competitor_count - b.competitor_count
  );
  const lowestCompetitorMetro = sortedMetrosByCompetitors[0];
  const metroInsight = lowestCompetitorMetro
    ? `${lowestCompetitorMetro.metro_label} has the fewest competitors (${lowestCompetitorMetro.competitor_count}) — consider prioritizing this market`
    : null;

  // Chart data
  const chartData = caseTypes.map((ct) => ({
    name: ct.case_label,
    competitors: ct.competitor_count,
    fill: SATURATION_COLORS[ct.saturation_level] ?? "#64748B",
  }));

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Search Advertising Landscape
          </h2>
        </div>

        {/* -------------------------------------------------------- */}
        {/* Panel 1: Overview Stats                                   */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm border">
            <div className="flex items-center gap-1.5 mb-2">
              <Megaphone className="w-3.5 h-3.5 text-intelligence-teal" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Active Advertisers
              </p>
            </div>
            <p className="text-3xl font-bold text-midnight-navy">
              {summary?.total_competitors?.toLocaleString() ?? "—"}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm border">
            <div className="flex items-center gap-1.5 mb-2">
              <Search className="w-3.5 h-3.5 text-intelligence-teal" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Ad Observations
              </p>
            </div>
            <p className="text-3xl font-bold text-midnight-navy">
              {summary?.total_observations?.toLocaleString() ?? "—"}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm border border-l-4 border-l-amber-400">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Most Contested
              </p>
            </div>
            <p className="text-2xl font-bold text-midnight-navy">
              {formatCaseType(summary?.most_contested_case_type ?? null)}
            </p>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm border border-l-4 border-l-emerald-400">
            <div className="flex items-center gap-1.5 mb-2">
              <Search className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Biggest Opportunity
              </p>
            </div>
            <p className="text-2xl font-bold text-midnight-navy">
              {formatCaseType(summary?.least_contested_case_type ?? null)}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Panel 2: Top PI Competitors Table                           */}
      {/* ---------------------------------------------------------- */}
      {competitors.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border">
          <h3 className="text-lg font-bold text-midnight-navy mb-4">
            Top PI Search Competitors
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-cloud">
                  <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray whitespace-nowrap">
                    #
                  </th>
                  <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray whitespace-nowrap">
                    Firm
                  </th>
                  <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray whitespace-nowrap">
                    Presence
                  </th>
                  <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray whitespace-nowrap">
                    Metros
                  </th>
                  <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray whitespace-nowrap">
                    Case Types
                  </th>
                  <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray whitespace-nowrap">
                    Avg Position
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => (
                  <tr
                    key={c.advertiser_domain}
                    className={`border-b border-cloud/50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-cloud/20"}`}
                  >
                    <td className="py-2.5 px-2 text-midnight-navy font-medium">
                      {i + 1}
                    </td>
                    <td className="py-2.5 px-2">
                      <p className="font-medium text-midnight-navy">
                        {c.advertiser_name}
                      </p>
                      <p className="text-slate-gray text-[10px]">
                        {c.advertiser_domain}
                      </p>
                    </td>
                    <td className="py-2.5 px-2">
                      {presenceBadge(c.presence_score)}
                    </td>
                    <td className="py-2.5 px-2 text-midnight-navy">
                      {c.metros_active?.length ?? 0}/{totalMetros}
                    </td>
                    <td className="py-2.5 px-2 text-midnight-navy">
                      {c.case_types_active?.length ?? 0}/6
                    </td>
                    <td className="py-2.5 px-2 text-midnight-navy">
                      {c.avg_ad_position?.toFixed(1) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <strong>{competitorInsight.split(" ")[0]}</strong>{" "}
              {competitorInsight.split(" ").slice(1).join(" ")}
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Panel 3: Case Type Competition Chart                        */}
      {/* ---------------------------------------------------------- */}
      {caseTypes.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border">
          <h3 className="text-lg font-bold text-midnight-navy mb-4">
            Case Type Competition
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, caseTypes.length * 50)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 11, fill: "#1B2A4A" }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: unknown) => [value as number, "Competitors"]}
              />
              <Bar dataKey="competitors" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">{caseTypeInsight}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Panel 4: Metro Competition Breakdown                        */}
      {/* ---------------------------------------------------------- */}
      {metros.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm border">
          <h3 className="text-lg font-bold text-midnight-navy mb-4">
            Metro Competition Breakdown
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {metros.map((m) => (
              <div
                key={m.metro_name}
                className="rounded-lg border border-cloud bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-midnight-navy">
                    {m.metro_label}
                  </h4>
                  {saturationBadge(m.saturation_level)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-midnight-navy/70">
                    <strong>{m.competitor_count}</strong> competitors
                  </p>
                  <p className="text-xs text-slate-gray">
                    Top: {m.top_competitor ?? "—"}
                  </p>
                  <p className="text-xs text-slate-gray">
                    {m.total_observations.toLocaleString()} observations
                  </p>
                </div>
              </div>
            ))}
          </div>
          {metroInsight && (
            <div className="mt-4 rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">{metroInsight}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: build dataSummary string for Ask AI context                 */
/* ------------------------------------------------------------------ */

export function buildPIAdSummary(data: PIAdvertisingData): string {
  const { summary, competitors } = data;
  if (!summary) return "";
  const topComp = competitors[0];
  return `Search Advertising: ${summary.total_competitors} active advertisers detected across ${summary.metro_count} metros. Most contested: ${formatCaseType(summary.most_contested_case_type)}. Least contested: ${formatCaseType(summary.least_contested_case_type)}. Top competitor: ${topComp ? `${topComp.advertiser_name} (presence score: ${topComp.presence_score.toFixed(0)})` : "N/A"}.`;
}
