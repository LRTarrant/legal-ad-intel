import {
  getTortBySlug,
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getAdvertiserPlatforms,
  getAdSaturationWindowed,
  getTortCostBenchmarks,
} from "@/lib/queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Eye,
  Monitor,
  ArrowRight,
} from "lucide-react";
import { CostBenchmarkScorecard } from "../../../components/cost-benchmark-scorecard";


export const dynamic = "force-dynamic";

/* ── Metadata ──────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tortSlug: string }>;
}) {
  const { tortSlug } = await params;
  const tort = await getTortBySlug(tortSlug);
  return {
    title: tort
      ? `${tort.label} Advertising Intelligence | Legal Marketing Intelligence`
      : "Tort Advertising Intelligence",
  };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtCur(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

const SEGMENT_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  on_docket:  { label: "On-Docket Firms",  color: "#10B981", bg: "#ECFDF5", bar: "bg-emerald-500" },
  off_docket: { label: "Off-Docket Firms", color: "#F59E0B", bg: "#FFFBEB", bar: "bg-amber-500" },
  aggregator: { label: "Aggregators",       color: "#7C3AED", bg: "#FAF5FF", bar: "bg-purple-500" },
  unknown:    { label: "Unknown",           color: "#6B7280", bg: "#F9FAFB", bar: "bg-slate-400" },
};

function segMeta(seg: string) {
  return SEGMENT_META[seg] ?? SEGMENT_META.unknown;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta:       "#3B82F6",
  google:     "#10B981",
  tiktok:     "#EC4899",
  youtube:    "#EF4444",
  ispot:      "#8B5CF6",
  mediaradar: "#F59E0B",
  tv:         "#6366F1",
};

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function TortAdvertisingPage({
  params,
}: {
  params: Promise<{ tortSlug: string }>;
}) {
  const { tortSlug } = await params;
  const tort = await getTortBySlug(tortSlug);
  if (!tort) notFound();

  // Default to last 90 days for saturation window
  const now = new Date();
  const windowEnd = now.toISOString().slice(0, 10);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 90);
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  // Parallel data fetch
  const [segments, topAdvertisers, platforms, saturation, benchmarks] =
    await Promise.all([
      getSegmentSummary(tortSlug),
      getTopAdvertisersBySegment(tortSlug, 25),
      getAdvertiserPlatforms(tortSlug),
      getAdSaturationWindowed(windowStart, windowEnd, tortSlug),
      getTortCostBenchmarks(tort.label),
    ]);

  // Build platform lookup by advertiser
  const platformMap = new Map<string, string[]>();
  for (const p of platforms) {
    if (p.advertiser_name) {
      platformMap.set(p.advertiser_name, p.platforms);
    }
  }

  // Aggregate stats
  const totalAdvertisers = segments.reduce((s, r) => s + r.advertiser_count, 0);
  const totalSpend = segments.reduce((s, r) => s + r.total_spend, 0);
  const totalCreatives = segments.reduce((s, r) => s + r.total_creatives, 0);

  // All unique platforms
  const allPlatforms = new Set<string>();
  for (const p of platforms) {
    for (const plat of p.platforms) allPlatforms.add(plat);
  }

  // Get saturation markets (top by saturation score)
  const topMarkets = [...saturation]
    .sort((a, b) => (b.saturation_score ?? 0) - (a.saturation_score ?? 0))
    .slice(0, 10);

  // Find best matching benchmark
  const tortLabelLower = tort.label.toLowerCase();
  const benchmark = benchmarks.find((b) =>
    b.tort_name.toLowerCase().includes(tortLabelLower) ||
    tortLabelLower.includes(b.tort_name.toLowerCase().split(" ")[0])
  ) ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/torts"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Torts
          </span>
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-midnight-navy">
          {tort.label}
        </h1>
        <p className="mt-1 text-slate-gray">
          Advertising intelligence for {tort.label} — who is advertising, where,
          how much, and on what platforms.
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Advertisers
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">{fmtNum(totalAdvertisers)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Est. Spend
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">{fmtCur(totalSpend)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Unique Creatives
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">{fmtNum(totalCreatives)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Monitor className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Platforms
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">{allPlatforms.size}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Array.from(allPlatforms).sort().map((p) => (
              <span
                key={p}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Benchmark Scorecard */}
      <CostBenchmarkScorecard data={benchmark} />

      {/* Segment Breakdown */}
      {segments.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
            Advertiser Segments
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {segments.map((seg) => {
              const meta = segMeta(seg.segment);
              const spendPct = totalSpend > 0 ? (seg.total_spend / totalSpend) * 100 : 0;
              return (
                <div
                  key={seg.segment}
                  className="rounded-lg border p-4"
                  style={{ borderColor: meta.color + "40", backgroundColor: meta.bg }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                    {meta.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-midnight-navy">
                    {seg.advertiser_count}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-slate-gray">
                      <span>Spend</span>
                      <span className="font-medium text-midnight-navy">{fmtCur(seg.total_spend)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/60">
                      <div
                        className={`h-1.5 rounded-full ${meta.bar}`}
                        style={{ width: `${Math.min(spendPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-gray">
                      <span>Creatives</span>
                      <span className="font-medium text-midnight-navy">{fmtNum(seg.total_creatives)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Advertisers Table */}
      {topAdvertisers.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">
              Top Advertisers
            </h2>
            <Link
              href={`/advertising/saturation/${tortSlug}`}
              className="flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
            >
              Full saturation view <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertiser
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                    Segment
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                    Platforms
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Est. Spend
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Creatives
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Markets
                  </th>
                </tr>
              </thead>
              <tbody>
                {topAdvertisers.map((adv, i) => {
                  const meta = segMeta(adv.segment);
                  const advPlatforms = platformMap.get(adv.advertiser_name) ?? [];
                  return (
                    <tr
                      key={`${adv.advertiser_name}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {adv.advertiser_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {advPlatforms.length > 0 ? (
                            advPlatforms.map((p) => (
                              <span
                                key={p}
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                                style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-gray">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                        {fmtCur(adv.total_spend)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-midnight-navy">
                        {fmtNum(adv.total_creatives)}
                      </td>
                      <td className="py-3 pl-3 text-right text-sm text-midnight-navy">
                        {fmtNum(adv.market_count)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Markets by Saturation */}
      {topMarkets.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
            Top Markets by Saturation
          </h2>
          <div className="space-y-2">
            {topMarkets.map((m, i) => {
              const score = m.saturation_score ?? 0;
              const scoreColor =
                score >= 75 ? "#EF4444" :
                score >= 50 ? "#F59E0B" :
                score >= 25 ? "#F59E0B" :
                "#10B981";
              return (
                <div
                  key={`${m.geo_name}-${i}`}
                  className="flex items-center gap-4 rounded-md bg-cloud/60 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-midnight-navy truncate">
                      {m.geo_name}
                      {m.state_abbr && (
                        <span className="ml-1.5 text-xs text-slate-gray">
                          {m.state_abbr}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-gray">
                      {fmtNum(m.total_advertisers)} advertisers · {fmtCur(m.estimated_spend)} spend
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-2 rounded-full bg-white">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(score, 100)}%`,
                          backgroundColor: scoreColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold w-10 text-right"
                      style={{ color: scoreColor }}
                    >
                      {score.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/advertising/saturation/${tortSlug}`}
          className="rounded-lg border-2 border-intelligence-teal px-5 py-2.5 text-sm font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white"
        >
          Full Saturation Analysis →
        </Link>
        <Link
          href="/advertising/cost-benchmarks"
          className="rounded-lg border-2 border-cloud px-5 py-2.5 text-sm font-semibold text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          All Cost Benchmarks →
        </Link>
        <Link
          href="/advertising/channel-planner"
          className="rounded-lg border-2 border-cloud px-5 py-2.5 text-sm font-semibold text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          Channel Planner →
        </Link>
      </div>
    </div>
  );
}
