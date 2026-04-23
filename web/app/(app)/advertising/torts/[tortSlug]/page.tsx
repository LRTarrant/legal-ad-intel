import {
  getTortBySlug,
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getAdvertiserPlatforms,
  getAdSaturationWindowed,
  getTortCostBenchmarks,
  getSerpVisibilityWindowed,
  getSerpTopResults,
  getSampleAds,
} from "@/lib/queries";
import nextDynamic from "next/dynamic";
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
import { TortViewTracker } from "./tort-view-tracker";
import type { TortAdvertisingData } from "../../../components/tort-advertising-section";

const TortAdvertisingSection = nextDynamic(
  () =>
    import("../../../components/tort-advertising-section").then(
      (m) => m.TortAdvertisingSection
    ),
);

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

  // Parallel data fetch — includes SERP + sample ads for shared component
  const [segments, topAdvertisers, platforms, saturation, benchmarks, serpVisibility, serpResults, sampleAds] =
    await Promise.all([
      getSegmentSummary(tortSlug),
      getTopAdvertisersBySegment(tortSlug, 25),
      getAdvertiserPlatforms(tortSlug),
      getAdSaturationWindowed(windowStart, windowEnd, tortSlug),
      getTortCostBenchmarks(),
      getSerpVisibilityWindowed(windowStart, windowEnd, tortSlug),
      getSerpTopResults(tortSlug, 5),
      getSampleAds(tortSlug, 12),
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
    .slice(0, 15);

  // Find best matching benchmark
  const tortLabelLower = tort.label.toLowerCase();
  const tortLabelWords = tortLabelLower.split(/[\s\/,]+/).filter(Boolean);
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes(tortLabelLower) || tortLabelLower.includes(bName)) return true;
      return tortLabelWords.some((w) => w.length > 3 && bName.includes(w));
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  // Build data for the shared advertising section
  const advertisingData: TortAdvertisingData = {
    tortSlug,
    segments,
    topAdvertisers,
    platformMap: Object.fromEntries(platformMap),
    totalAdvertisers,
    totalSpend,
    totalCreatives,
    allPlatforms: Array.from(allPlatforms).sort(),
    topMarkets,
    benchmark,
    hasLiveData,
    serpVisibility,
    serpResults,
    sampleAds,
  };

  return (
    <div className="space-y-8">
      <TortViewTracker slug={tortSlug} name={tort.label} />
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

      {/* ── Unified Advertising Section (5 modules) ── */}
      <TortAdvertisingSection data={advertisingData} />

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
