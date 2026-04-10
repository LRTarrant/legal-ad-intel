import {
  getAdSaturationSummary,
  getTorts,
  getSegmentSummary,
  getTopAdvertisersBySegment,
  type AdSaturationRow,
  type Tort,
  type SegmentSummary,
  type TopAdvertiserBySegment,
} from "@/lib/queries";
import { Radio, Users, Building2, Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad Saturation | Legal Marketing Intelligence",
};

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

const SEGMENT_META: Record<string, { label: string; color: string; icon: string }> = {
  on_docket: { label: "On-Docket Firms", color: "text-emerald-400", icon: "scale" },
  off_docket: { label: "Off-Docket Firms", color: "text-amber-400", icon: "building" },
  aggregator: { label: "Aggregators", color: "text-purple-400", icon: "globe" },
};

function segmentColor(seg: string): string {
  return SEGMENT_META[seg]?.color ?? "text-zinc-400";
}

function segmentLabel(seg: string): string {
  return SEGMENT_META[seg]?.label ?? seg;
}

function segmentBg(seg: string): string {
  if (seg === "on_docket") return "bg-emerald-500/20 border-emerald-500/40";
  if (seg === "off_docket") return "bg-amber-500/20 border-amber-500/40";
  if (seg === "aggregator") return "bg-purple-500/20 border-purple-500/40";
  return "bg-zinc-800 border-zinc-700";
}

export default async function AdSaturationPage({
  searchParams,
}: {
  searchParams: Promise<{ tort?: string; state?: string }>;
}) {
  const params = await searchParams;
  const tortFilter = params.tort || undefined;
  const stateFilter = params.state || undefined;

  const [allData, torts, segments, topAdvertisers] = await Promise.all([
    getAdSaturationSummary({ tortSlug: tortFilter, limit: 500 }),
    getTorts(),
    getSegmentSummary(tortFilter),
    getTopAdvertisersBySegment(tortFilter, 25),
  ]);

  const data = stateFilter
    ? allData.filter((d) => d.state_abbr === stateFilter)
    : allData;

  const uniqueGeos = new Set(data.map((d) => d.geo_code)).size;
  const uniqueTorts = new Set(data.map((d) => d.tort_slug)).size;
  const totalObs = data.reduce((s, d) => s + (d.total_observations ?? 0), 0);
  const totalSpend = data.reduce((s, d) => s + (d.estimated_spend ?? 0), 0);
  const avgScore =
    data.filter((d) => d.saturation_score != null).length > 0
      ? data
          .filter((d) => d.saturation_score != null)
          .reduce((s, d) => s + d.saturation_score!, 0) /
        data.filter((d) => d.saturation_score != null).length
      : null;

  const states = Array.from(
    new Set(allData.map((d) => d.state_abbr).filter(Boolean) as string[])
  ).sort();

  const totalSegmentSpend = segments.reduce((s, seg) => s + seg.total_spend, 0);

  function filterUrl(key: string, val: string | undefined) {
    const p = new URLSearchParams();
    if (key === "tort" && val) p.set("tort", val);
    else if (tortFilter) p.set("tort", tortFilter);
    if (key === "state" && val) p.set("state", val);
    else if (stateFilter) p.set("state", stateFilter);
    const qs = p.toString();
    return `/ad-saturation${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 text-purple-400" />
          Ad Saturation
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Competitive ad saturation analysis across tort categories and
          geographic markets. Sorted by saturation score (0 = open market,
          100 = highly saturated).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500">Tort</span>
          <div className="flex flex-wrap gap-1">
            <Link
              href={filterUrl("tort", undefined)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !tortFilter
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              All
            </Link>
            {torts.map((t) => (
              <Link
                key={t.slug}
                href={filterUrl("tort", t.slug)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  tortFilter === t.slug
                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500">State</span>
          <div className="flex flex-wrap gap-1">
            <Link
              href={filterUrl("state", undefined)}
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
                href={filterUrl("state", st)}
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">TORT CATEGORIES</p>
          <p className="mt-2 text-2xl font-bold">{uniqueTorts}</p>
          <p className="text-xs text-zinc-500">Active torts</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">MARKETS</p>
          <p className="mt-2 text-2xl font-bold">{uniqueGeos}</p>
          <p className="text-xs text-zinc-500">DMAs tracked</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">AD OBSERVATIONS</p>
          <p className="mt-2 text-2xl font-bold">{fmt(totalObs)}</p>
          <p className="text-xs text-zinc-500">Placements tracked</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">EST. TOTAL SPEND</p>
          <p className="mt-2 text-2xl font-bold">{fmtCur(totalSpend)}</p>
          <p className="text-xs text-zinc-500">Across all markets</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">AVG SATURATION</p>
          <p className={`mt-2 text-2xl font-bold ${scoreCls(avgScore)}`}>{fmtScore(avgScore)}</p>
          <p className="text-xs text-zinc-500">0 = open \u00b7 100 = saturated</p>
        </div>
      </div>

      {/* Advertiser Segmentation */}
      {segments.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-purple-400" />
              Advertiser Segmentation
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Breakdown of advertising spend and creative volume by advertiser
              type: on-docket firms (named on complaints), off-docket firms
              (not on complaints), and lead aggregators.
            </p>
          </div>

          {/* Segment Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {segments.map((seg) => {
              const pct = totalSegmentSpend > 0
                ? ((seg.total_spend / totalSegmentSpend) * 100).toFixed(1)
                : "0";
              return (
                <div
                  key={seg.segment}
                  className={`rounded-xl border p-5 ${segmentBg(seg.segment)}`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${segmentColor(seg.segment)}`}>
                      {segmentLabel(seg.segment)}
                    </p>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                      {pct}% of spend
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-zinc-300">Advertisers</p>
                      <p className="text-lg font-bold text-white">
                        {seg.advertiser_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300">Est. Spend</p>
                      <p className="text-lg font-bold text-white">
                        {fmtCur(seg.total_spend)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300">Creatives</p>
                      <p className="text-lg font-bold text-white">
                        {fmt(seg.total_creatives)}
                      </p>
                    </div>
                  </div>
                  {/* Spend bar */}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        seg.segment === "on_docket"
                          ? "bg-emerald-500"
                          : seg.segment === "off_docket"
                          ? "bg-amber-500"
                          : "bg-purple-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Advertisers Table */}
          {topAdvertisers.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h3 className="text-base font-semibold">Top Advertisers by Segment</h3>
                <p className="text-sm text-zinc-400">
                  {topAdvertisers.length} advertisers
                  {tortFilter ? ` \u00b7 ${tortFilter}` : ""}
                </p>
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
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">
                          {adv.advertiser_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${segmentBg(
                              adv.segment
                            )} ${segmentColor(adv.segment)}`}
                          >
                            {segmentLabel(adv.segment)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{adv.entity_type}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                          {fmtCur(adv.total_spend)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                          {fmt(adv.total_creatives)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                          {adv.market_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold">Saturation Rankings</h2>
          <p className="text-sm text-zinc-400">
            {data.length} records
            {tortFilter ? ` \u00b7 Filtered to ${tortFilter}` : ""}
            {stateFilter ? ` \u00b7 ${stateFilter}` : ""}
          </p>
        </div>
        {data.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-500">
            <Radio className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-lg font-medium">No data matches current filters</p>
            <p className="mt-1 text-sm">Try adjusting the tort or state filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-100">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300">
                <tr>
                  <th className="px-4 py-3 text-right w-12">#</th>
                  <th className="px-4 py-3">Tort</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Advertisers</th>
                  <th className="px-4 py-3 text-right">Creatives</th>
                  <th className="px-4 py-3 text-right">Observations</th>
                  <th className="px-4 py-3 text-right">Est. Spend</th>
                  <th className="px-4 py-3 text-right">Population</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-right text-zinc-400">{i + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">{row.tort_label}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-300">{row.geo_name}</td>
                    <td className="px-4 py-3">{row.state_abbr ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${scoreBg(row.saturation_score)}`}
                            style={{ width: `${Math.min(row.saturation_score ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className={`font-semibold tabular-nums ${scoreCls(row.saturation_score)}`}>
                          {fmtScore(row.saturation_score)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.total_advertisers}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.total_creatives}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(row.total_observations)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtCur(row.estimated_spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(row.geo_population)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
