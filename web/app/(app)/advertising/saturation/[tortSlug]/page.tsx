import {
  getAdSaturationWindowed,
  getTortBySlug,
  getTorts,
  getSegmentSummary,
  getTopAdvertisersBySegment,
  type AdSaturationRow,
} from "@/lib/queries";
import { Radio, ArrowLeft, Users, TrendingUp, MapPin, Megaphone, BarChart3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TimeWindowSelector } from "../_components/TimeWindowSelector";
import { computeDateRange } from "../_components/time-window-utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tortSlug: string }>;
}) {
  const { tortSlug } = await params;
  const tort = await getTortBySlug(tortSlug);
  return {
    title: tort
      ? `${tort.label} Ad Intelligence | Legal Marketing Intelligence`
      : "Tort Ad Intelligence | Legal Marketing Intelligence",
  };
}

function fmt(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

function fmtCur(n: number | null): string {
  if (n == null) return "\u2014";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtScore(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toFixed(1);
}

function scoreCls(s: number | null): string {
  if (s == null) return "text-zinc-400";
  if (s >= 75) return "text-red-400";
  if (s >= 50) return "text-amber-400";
  if (s >= 25) return "text-yellow-400";
  return "text-emerald-400";
}

function scoreBg(s: number | null): string {
  if (s == null) return "bg-zinc-700";
  if (s >= 75) return "bg-red-500/60";
  if (s >= 50) return "bg-amber-500/60";
  if (s >= 25) return "bg-yellow-500/60";
  return "bg-emerald-500/60";
}

const SEGMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  on_docket: { label: "On-Docket Firms", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/40" },
  off_docket: { label: "Off-Docket Firms", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/40" },
  aggregator: { label: "Aggregators", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/40" },
};

function segmentColor(seg: string) { return SEGMENT_META[seg]?.color ?? "text-zinc-400"; }
function segmentLabel(seg: string) { return SEGMENT_META[seg]?.label ?? seg; }
function segmentBg(seg: string) { return SEGMENT_META[seg]?.bg ?? "bg-zinc-800 border-zinc-700"; }
function segmentBarColor(seg: string) {
  if (seg === "on_docket") return "bg-emerald-500";
  if (seg === "off_docket") return "bg-amber-500";
  return "bg-purple-500";
}

export default async function TortDrillDownPage({
  params,
  searchParams,
}: {
  params: Promise<{ tortSlug: string }>;
  searchParams: Promise<{ state?: string; window?: string; from?: string; to?: string }>;
}) {
  const { tortSlug: rawSlug } = await params;
  const tortSlug = rawSlug.replace(/-/g, "_");
  const sp = await searchParams;
  const stateFilter = sp.state || undefined;
  const { windowStart, windowEnd } = computeDateRange(sp.window, sp.from, sp.to);

  const tort = await getTortBySlug(tortSlug);
  if (!tort) notFound();

  const [windowedData, segments, topAdvertisers, allTorts] = await Promise.all([
    getAdSaturationWindowed(windowStart, windowEnd, tortSlug),
    getSegmentSummary(tortSlug),
    getTopAdvertisersBySegment(tortSlug, 30),
    getTorts(),
  ]);

  // Map windowed rows to AdSaturationRow shape
  const allData: AdSaturationRow[] = windowedData.map((row, i) => ({
    id: `${row.tort_id}:${row.geo_target_id}`,
    tort_id: row.tort_id,
    geo_target_id: row.geo_target_id,
    tort_slug: row.tort_slug,
    tort_label: row.tort_label,
    tort_category: row.tort_category,
    geo_type: row.geo_type ?? "",
    geo_code: row.geo_code ?? "",
    geo_name: row.geo_name,
    state_abbr: row.state_abbr,
    geo_population: row.geo_population,
    period_start: windowStart,
    period_end: windowEnd,
    total_advertisers: row.total_advertisers,
    total_creatives: row.total_creatives,
    total_observations: row.total_observations,
    estimated_spend: row.estimated_spend,
    estimated_impressions: null,
    saturation_score: row.saturation_score,
    spend_rank: i + 1,
    format_breakdown: null,
    top_advertisers: null,
    computed_at: new Date().toISOString(),
  }));

  const data = stateFilter ? allData.filter((d) => d.state_abbr === stateFilter) : allData;

  // KPI computations
  const uniqueGeos = new Set(data.map((d) => d.geo_code)).size;
  const totalAdvertisers = data.reduce((s, d) => s + d.total_advertisers, 0);
  const totalCreatives = data.reduce((s, d) => s + d.total_creatives, 0);
  const totalObs = data.reduce((s, d) => s + (d.total_observations ?? 0), 0);
  const totalSpend = data.reduce((s, d) => s + (d.estimated_spend ?? 0), 0);
  const scored = data.filter((d) => d.saturation_score != null);
  const avgScore = scored.length > 0
    ? scored.reduce((s, d) => s + d.saturation_score!, 0) / scored.length
    : null;

  const states = Array.from(new Set(allData.map((d) => d.state_abbr).filter(Boolean) as string[])).sort();
  const totalSegmentSpend = segments.reduce((s, seg) => s + seg.total_spend, 0);

  // Top markets: sort by saturation score desc
  const topMarkets = [...data]
    .sort((a, b) => (b.saturation_score ?? 0) - (a.saturation_score ?? 0))
    .slice(0, 20);

  // Format breakdown aggregation
  const formatTotals: Record<string, number> = {};
  data.forEach((d) => {
    if (d.format_breakdown) {
      Object.entries(d.format_breakdown).forEach(([k, v]) => {
        formatTotals[k] = (formatTotals[k] ?? 0) + v;
      });
    }
  });

  function filterUrl(state: string | undefined) {
    const p = new URLSearchParams();
    if (state) p.set("state", state);
    // Preserve time window params
    if (sp.window && sp.window !== "30d") p.set("window", sp.window);
    if (sp.window === "custom" && sp.from) p.set("from", sp.from);
    if (sp.window === "custom" && sp.to) p.set("to", sp.to);
    const qs = p.toString();
    return `/advertising/saturation/${tortSlug}${qs ? `?${qs}` : ""}`;
  }

  // Build tort switcher URLs that preserve time window params
  function tortUrl(slug: string) {
    const p = new URLSearchParams();
    if (sp.window && sp.window !== "30d") p.set("window", sp.window);
    if (sp.window === "custom" && sp.from) p.set("from", sp.from);
    if (sp.window === "custom" && sp.to) p.set("to", sp.to);
    const qs = p.toString();
    return `/advertising/saturation/${slug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-8">
      {/* Header + Breadcrumb */}
      <div>
        <Link
          href="/advertising/saturation"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-purple-400 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Ad Saturation
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 text-purple-400" />
          {tort.label}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Tort-specific advertising intelligence for <strong className="text-zinc-200">{tort.label}</strong>.
          {tort.category && <span className="ml-1 text-zinc-500">Category: {tort.category}</span>}
        </p>
        <Link
          href={`/advertising/torts/${tortSlug}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
        >
          View Full Advertising Page →
        </Link>
        {/* Tort Switcher */}
        <div className="mt-4 flex flex-wrap gap-1">
          {allTorts.map((t) => (
            <Link
              key={t.slug}
              href={tortUrl(t.slug)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                t.slug === tortSlug
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Time Window Selector */}
      <Suspense fallback={null}>
        <TimeWindowSelector />
      </Suspense>

      {/* State Filter */}
      {states.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500">State</span>
          <div className="flex flex-wrap gap-1">
            <Link
              href={filterUrl(undefined)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !stateFilter
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              All
            </Link>
            {states.map((st) => (
              <Link
                key={st}
                href={filterUrl(st)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  stateFilter === st
                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {st}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white">MARKETS</p>
          <p className="mt-2 text-2xl font-bold text-white">{uniqueGeos}</p>
          <p className="text-xs text-zinc-200">DMAs with activity</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white">ADVERTISERS</p>
          <p className="mt-2 text-2xl font-bold text-white">{fmt(totalAdvertisers)}</p>
          <p className="text-xs text-zinc-200">Active advertisers</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white">CREATIVES</p>
          <p className="mt-2 text-2xl font-bold text-white">{fmt(totalCreatives)}</p>
          <p className="text-xs text-zinc-200">Unique creatives</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white">OBSERVATIONS</p>
          <p className="mt-2 text-2xl font-bold text-white">{fmt(totalObs)}</p>
          <p className="text-xs text-zinc-200">Ad placements</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white">EST. SPEND</p>
          <p className="mt-2 text-2xl font-bold text-white">{fmtCur(totalSpend)}</p>
          <p className="text-xs text-zinc-200">Total estimated</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white">AVG SATURATION</p>
          <p className={`mt-2 text-2xl font-bold ${scoreCls(avgScore)}`}>{fmtScore(avgScore)}</p>
          <p className="text-xs text-zinc-200">0 = open · 100 = saturated</p>
        </div>
      </div>

      {/* Advertiser Segment Mix */}
      {segments.length > 0 && (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-purple-400" />
            Advertiser Segment Mix
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {segments.map((seg) => {
              const pct = totalSegmentSpend > 0 ? ((seg.total_spend / totalSegmentSpend) * 100).toFixed(1) : "0";
              return (
                <div key={seg.segment} className={`rounded-xl border p-5 ${segmentBg(seg.segment)}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${segmentColor(seg.segment)}`}>{segmentLabel(seg.segment)}</p>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">{pct}% of spend</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-zinc-700">Advertisers</p>
                      <p className="text-lg font-bold text-zinc-900">{seg.advertiser_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-700">Est. Spend</p>
                      <p className="text-lg font-bold text-zinc-900">{fmtCur(seg.total_spend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-700">Creatives</p>
                      <p className="text-lg font-bold text-zinc-900">{fmt(seg.total_creatives)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${segmentBarColor(seg.segment)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Advertisers Table */}
          {topAdvertisers.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h3 className="text-base font-semibold">Top Advertisers</h3>
                <p className="text-sm text-zinc-400">{topAdvertisers.length} advertisers for {tort.label}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-100">
                  <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300">
                    <tr>
                      <th className="px-4 py-3">Advertiser</th>
                      <th className="px-4 py-3">Segment</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Est. Spend</th>
                      <th className="px-4 py-3 text-right">Creatives</th>
                      <th className="px-4 py-3 text-right">Markets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-700/50">
                    {topAdvertisers.map((adv, i) => (
                      <tr key={`${adv.advertiser_name}-${i}`} className="hover:bg-zinc-800/50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">{adv.advertiser_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${segmentBg(adv.segment)} ${segmentColor(adv.segment)}`}>
                            {segmentLabel(adv.segment)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{adv.entity_type}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtCur(adv.total_spend)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(adv.total_creatives)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{adv.market_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Markets Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-purple-400" />
            Top Markets
          </h2>
          <p className="text-sm text-zinc-400">
            {topMarkets.length} markets ranked by saturation score
            {stateFilter ? ` · ${stateFilter}` : ""}
          </p>
        </div>
        {topMarkets.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-500">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-lg font-medium">No market data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-100">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300">
                <tr>
                  <th className="px-4 py-3 text-right w-12">#</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Advertisers</th>
                  <th className="px-4 py-3 text-right">Creatives</th>
                  <th className="px-4 py-3 text-right">Est. Spend</th>
                  <th className="px-4 py-3 text-right">Population</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {topMarkets.map((row, i) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-right text-zinc-400">{i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">{row.geo_name}</td>
                    <td className="px-4 py-3">{row.state_abbr ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div className={`h-full rounded-full ${scoreBg(row.saturation_score)}`} style={{ width: `${Math.min(row.saturation_score ?? 0, 100)}%` }} />
                        </div>
                        <span className={`font-semibold tabular-nums ${scoreCls(row.saturation_score)}`}>{fmtScore(row.saturation_score)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.total_advertisers}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.total_creatives}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtCur(row.estimated_spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(row.geo_population)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Format Breakdown + Creative Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Format Breakdown */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            Format Breakdown
          </h3>
          {Object.keys(formatTotals).length === 0 ? (
            <p className="text-sm text-zinc-500">No format data available yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(formatTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([format, count]) => {
                  const totalFormat = Object.values(formatTotals).reduce((s, v) => s + v, 0);
                  const pct = totalFormat > 0 ? (count / totalFormat) * 100 : 0;
                  return (
                    <div key={format}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-zinc-300">{format}</span>
                        <span className="text-zinc-400">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Creative Activity / Movement Placeholder */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold mb-4">
            <Megaphone className="h-4 w-4 text-purple-400" />
            Creative Activity
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">Creative movement tracking coming soon</p>
            <p className="mt-1 text-xs text-zinc-200">
              New creative launches, paused campaigns, and spend velocity changes
              will appear here as data pipelines are connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
