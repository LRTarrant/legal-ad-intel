import {
  getChannelFitScores,
  getCompetitionScores,
  getMarketRecommendations,
  type ChannelFitScore,
  type MarketRecommendation,
} from "@/lib/queries";
import Link from "next/link";
import { Radio, Zap, BarChart3, TrendingUp, Shield, MapPin } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";
import { MethodologySources } from "../../components/methodology-sources";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Advertising Channel Planner | Legal Marketing Intelligence",
};

/* ── Config ─────────────────────────────────────────────── */

const TORTS = [
  { id: "AUTO_INJURY", label: "Auto Injury" },
  { id: "TRUCK_ACCIDENT", label: "Truck Accident" },
  { id: "ROUNDUP", label: "Roundup" },
  { id: "ca94471b-4d49-4bd7-b03e-a0dd595b7c6a", label: "Social Media Addiction" },
  { id: "3da55112-adda-4ae9-b440-cd132780e980", label: "Hair Relaxer" },
] as const;

const QUICK_START_TORTS = [
  { id: "ca94471b-4d49-4bd7-b03e-a0dd595b7c6a", label: "Social Media Addiction" },
  { id: "3da55112-adda-4ae9-b440-cd132780e980", label: "Hair Relaxer" },
] as const;

const MARKETS = [
  { id: "US_TEST", label: "US Benchmark" },
  { id: "OLDER_TV_DMA", label: "Older / TV-Heavy DMA" },
  { id: "DIGITAL_YOUNG_DMA", label: "Digital-First DMA" },
  { id: "BALANCED_SUBURBAN_DMA", label: "Balanced Suburban DMA" },
] as const;

/**
 * Maps synthetic market IDs used by the fit-score engine to the closest
 * real DMA market UUID in channel_competition_scores. This lets the
 * competition overlay show data-driven scores while fit scoring still
 * uses the synthetic media-consumption profiles.
 */
const COMPETITION_MARKET_MAP: Record<string, string> = {
  US_TEST:                "2aa914df-a6b6-4b80-92ca-c97342b40390", // Los Angeles
  OLDER_TV_DMA:           "122f3a67-b28e-4a29-92e8-be286d2075a7", // Tampa-St. Petersburg
  DIGITAL_YOUNG_DMA:      "dda96263-b203-428a-b8e3-72c887424fe8", // New York
  BALANCED_SUBURBAN_DMA:  "c65ca15f-ee5f-4760-a7f7-b2eef5caffef", // Houston
};

/* ── Helpers ────────────────────────────────────────────── */

function channelLabel(channel: string): string {
  const labels: Record<string, string> = {
    tv_linear: "TV (Linear)",
    ctv_streaming: "CTV / Streaming",
    radio: "Radio",
    podcast: "Podcast",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    search: "Search",
    print: "Print",
  };
  return labels[channel] ?? channel;
}

function scoreColor(normalized: number): string {
  if (normalized >= 0.8) return "bg-intelligence-teal";
  if (normalized >= 0.6) return "bg-steel-blue";
  if (normalized >= 0.4) return "bg-slate-gray/60";
  return "bg-slate-gray/30";
}

function scoreTierLabel(normalized: number): string {
  if (normalized >= 0.8) return "Primary";
  if (normalized >= 0.6) return "Strong";
  if (normalized >= 0.4) return "Moderate";
  return "Low Fit";
}

function scoreTierColor(normalized: number): string {
  if (normalized >= 0.8) return "text-intelligence-teal";
  if (normalized >= 0.6) return "text-steel-blue";
  return "text-slate-gray";
}

/* ── Competition helpers ─────────────────────────────────── */

function competitionBucket(score: number): "Low" | "Medium" | "High" {
  if (score <= 0.33) return "Low";
  if (score <= 0.66) return "Medium";
  return "High";
}

function competitionBadgeStyle(bucket: "Low" | "Medium" | "High"): string {
  switch (bucket) {
    case "Low":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "High":
      return "bg-red-50 text-red-700 ring-red-200";
  }
}

function fitLabel(normalized: number): string {
  if (normalized >= 0.8) return "High fit";
  if (normalized >= 0.6) return "Strong fit";
  if (normalized >= 0.4) return "Moderate fit";
  return "Low fit";
}

function combinedLabel(
  normalized: number,
  competitionScore: number | undefined
): string | null {
  if (competitionScore == null) return null;
  return `${fitLabel(normalized)} / ${competitionBucket(competitionScore)} competition`;
}

/* ── Recommendation engine ───────────────────────────────── */

type Recommendation =
  | "Priority Test"
  | "Core Channel"
  | "Competitive Channel"
  | "Selective Test"
  | "Monitor"
  | "Low Priority";

/**
 * Maps audience-fit tier × competition bucket to an actionable label.
 * Fit tiers: High (≥0.8), Strong (≥0.6), Moderate (≥0.4), Low (<0.4)
 * Competition: Low (≤0.33), Medium (0.34–0.66), High (≥0.67)
 */
function getRecommendation(
  normalized: number,
  competitionScore: number | undefined
): Recommendation | null {
  if (competitionScore == null) return null;
  const comp = competitionBucket(competitionScore);

  // High fit (≥0.8)
  if (normalized >= 0.8) {
    if (comp === "Low") return "Priority Test";
    if (comp === "Medium") return "Core Channel";
    return "Competitive Channel";
  }
  // Strong fit (≥0.6)
  if (normalized >= 0.6) {
    if (comp === "Low") return "Priority Test";
    if (comp === "Medium") return "Selective Test";
    return "Monitor";
  }
  // Moderate fit (≥0.4)
  if (normalized >= 0.4) {
    if (comp === "Low") return "Selective Test";
    return "Low Priority";
  }
  // Low fit (<0.4)
  return "Low Priority";
}

function recommendationStyle(rec: Recommendation): string {
  switch (rec) {
    case "Priority Test":
      return "bg-intelligence-teal/10 text-intelligence-teal ring-intelligence-teal/30";
    case "Core Channel":
      return "bg-steel-blue/10 text-steel-blue ring-steel-blue/30";
    case "Competitive Channel":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Selective Test":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "Monitor":
      return "bg-slate-50 text-slate-600 ring-slate-200";
    case "Low Priority":
      return "bg-slate-50 text-slate-400 ring-slate-200";
  }
}

function RecommendationBadge({
  normalized,
  competitionScore,
}: {
  normalized: number;
  competitionScore: number | undefined;
}) {
  const rec = getRecommendation(normalized, competitionScore);
  if (!rec) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${recommendationStyle(rec)}`}
    >
      {rec}
    </span>
  );
}

/** Build a natural-language strategy blurb from scored channels. */
function buildStrategySummary(
  scores: ChannelFitScore[],
  tortLabel: string,
  marketLabel: string
): { lead: string; support: string[]; avoid: string[]; blurb: string } {
  const sorted = [...scores].sort(
    (a, b) => b.normalized_score - a.normalized_score
  );

  const lead = sorted[0];
  const support = sorted.slice(1, 3);
  const avoid = sorted.filter((s) => s.normalized_score < 0.4);

  const pct = (s: ChannelFitScore) =>
    `${Math.round(s.normalized_score * 100)}%`;

  let blurb = `Lead with **${channelLabel(lead.channel)}** (${pct(lead)}) as the primary channel for ${tortLabel} in ${marketLabel}. `;
  blurb += `Support with **${channelLabel(support[0].channel)}** (${pct(support[0])}) and **${channelLabel(support[1].channel)}** (${pct(support[1])}). `;

  if (avoid.length > 0) {
    const avoidNames = avoid.map((s) => channelLabel(s.channel)).join(", ");
    blurb += `Consider deprioritizing ${avoidNames} — these channels show weak audience alignment in this market.`;
  }

  return {
    lead: channelLabel(lead.channel),
    support: support.map((s) => channelLabel(s.channel)),
    avoid: avoid.map((s) => channelLabel(s.channel)),
    blurb,
  };
}

/* ── Role badge ────────────────────────────────────────── */

type ChannelRole = 'lead_gen' | 'brand' | 'hybrid';

function roleBadgeStyle(role: ChannelRole): string {
  switch (role) {
    case 'lead_gen':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'brand':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'hybrid':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
  }
}

function roleLabel(role: ChannelRole): string {
  switch (role) {
    case 'lead_gen': return 'Lead-gen';
    case 'brand': return 'Brand';
    case 'hybrid': return 'Hybrid';
  }
}

function RoleBadge({ role }: { role: ChannelRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${roleBadgeStyle(role)}`}
    >
      {roleLabel(role)}
    </span>
  );
}

/* ── Components ─────────────────────────────────────────── */

function PillSelector<T extends string>({
  items,
  activeId,
  paramName,
  otherParams,
}: {
  items: readonly { id: T; label: string }[];
  activeId: T;
  paramName: string;
  otherParams: Record<string, string>;
}) {
  return (
    <nav className="flex gap-2 flex-wrap">
      {items.map((item) => {
        const isActive = item.id === activeId;
        const params = new URLSearchParams({
          ...otherParams,
          [paramName]: item.id,
        });
        return (
          <Link
            key={item.id}
            href={`/advertising/channel-planner?${params.toString()}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-intelligence-teal text-white shadow-sm"
                : "bg-white text-charcoal hover:bg-cloud border border-cloud"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function CompetitionBadge({ channel, competitionMap }: { channel: string; competitionMap: Map<string, number> }) {
  const score = competitionMap.get(channel);
  if (score == null) return null;
  const bucket = competitionBucket(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${competitionBadgeStyle(bucket)}`}
    >
      <Shield className="h-2.5 w-2.5" />
      {bucket} competition
    </span>
  );
}

function StrategySummaryCard({
  scores,
  tortLabel,
  marketLabel,
  competitionMap,
}: {
  scores: ChannelFitScore[];
  tortLabel: string;
  marketLabel: string;
  competitionMap: Map<string, number>;
}) {
  const strategy = buildStrategySummary(scores, tortLabel, marketLabel);
  const top3 = scores.slice(0, 3);

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-intelligence-teal" />
        <h2 className="text-lg font-semibold text-midnight-navy">
          Strategy Summary
        </h2>
      </div>

      {/* Recommendation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {top3.map((s, i) => {
          const pct = Math.round(s.normalized_score * 100);
          const role = i === 0 ? "Lead Channel" : "Support Channel";
          const ringColor =
            i === 0
              ? "ring-intelligence-teal/30 bg-intelligence-teal/5"
              : "ring-steel-blue/20 bg-steel-blue/5";
          const badgeColor =
            i === 0
              ? "bg-intelligence-teal text-white"
              : "bg-steel-blue/10 text-steel-blue";
          const compScore = competitionMap.get(s.channel);
          return (
            <div
              key={s.channel}
              className={`rounded-lg ring-1 p-4 ${ringColor}`}
            >
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide mb-2 ${badgeColor}`}
              >
                {role}
              </span>
              <p className="text-lg font-bold text-midnight-navy">
                {channelLabel(s.channel)}
              </p>
              <RoleBadge role={s.role} />
              <p className="text-2xl font-bold text-intelligence-teal tabular-nums">
                {pct}%
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <RecommendationBadge normalized={s.normalized_score} competitionScore={compScore} />
                <CompetitionBadge channel={s.channel} competitionMap={competitionMap} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Natural-language blurb */}
      <div className="rounded-md bg-cloud/60 px-4 py-3 text-sm text-charcoal leading-relaxed">
        <FormattedBlurb text={strategy.blurb} />
      </div>
    </section>
  );
}

/** Render markdown-style **bold** in JSX */
function FormattedBlurb({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <p>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-midnight-navy">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function TopChannelsChart({ scores, competitionMap }: { scores: ChannelFitScore[]; competitionMap: Map<string, number> }) {
  const top5 = scores.slice(0, 5);
  const maxRaw = top5[0]?.raw_score ?? 1;

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="h-5 w-5 text-intelligence-teal" />
        <h2 className="text-lg font-semibold text-midnight-navy">
          Top 5 Channels
        </h2>
      </div>

      <div className="space-y-3">
        {top5.map((s) => {
          const pct = Math.round(s.normalized_score * 100);
          const rawPct = Math.round((s.raw_score / maxRaw) * 100);
          const compScore = competitionMap.get(s.channel);
          return (
            <div key={s.channel} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-charcoal">
                    {channelLabel(s.channel)}
                  </span>
                  <RoleBadge role={s.role} />
                  <RecommendationBadge normalized={s.normalized_score} competitionScore={compScore} />
                  <CompetitionBadge channel={s.channel} competitionMap={competitionMap} />
                </div>
                <span className="text-sm font-bold tabular-nums text-midnight-navy">
                  {pct}%
                </span>
              </div>
              <div className="relative h-8 rounded-lg bg-cloud overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg transition-all ${scoreColor(s.normalized_score)}`}
                  style={{ width: `${rawPct}%` }}
                />
                {/* Inner raw score label */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-medium text-white drop-shadow-sm">
                    {s.raw_score.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FullScoreTable({ scores, competitionMap }: { scores: ChannelFitScore[]; competitionMap: Map<string, number> }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-intelligence-teal" />
        <h2 className="text-lg font-semibold text-midnight-navy">
          All Channels
        </h2>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
            <th className="pb-2 pr-4">Rank</th>
            <th className="pb-2 pr-4">Channel</th>
            <th className="pb-2 px-4">Score</th>
            <th className="pb-2 px-3 text-center">Rec.</th>
            <th className="pb-2 pl-4 text-right">Raw</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => {
            const pct = Math.round(s.normalized_score * 100);
            const compScore = competitionMap.get(s.channel);
            return (
              <tr
                key={s.channel}
                className="border-b border-cloud last:border-0"
              >
                <td className="py-2.5 pr-4 text-xs font-semibold text-slate-gray tabular-nums w-8">
                  {i + 1}
                </td>
                <td className="py-2.5 pr-4 text-sm font-medium text-charcoal">
                  <div className="flex items-center gap-1.5">
                    <span className="whitespace-nowrap">{channelLabel(s.channel)}</span>
                    <RoleBadge role={s.role} />
                  </div>
                </td>
                <td className="py-2.5 px-4 w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-cloud overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scoreColor(s.normalized_score)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-gray tabular-nums w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <RecommendationBadge normalized={s.normalized_score} competitionScore={compScore} />
                </td>
                <td className="py-2.5 pl-4 text-right text-xs tabular-nums text-slate-gray whitespace-nowrap">
                  {s.raw_score.toFixed(4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function CompetitionOnlyTable({ competitionMap }: { competitionMap: Map<string, number> }) {
  const entries = [...competitionMap.entries()]
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-intelligence-teal" />
        <h2 className="text-lg font-semibold text-midnight-navy">
          Competition by Channel
        </h2>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
            <th className="pb-2 pr-4">Rank</th>
            <th className="pb-2 pr-4">Channel</th>
            <th className="pb-2 px-4">Competition</th>
            <th className="pb-2 pl-4 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([channel, score], i) => {
            const bucket = competitionBucket(score);
            const pct = Math.round(score * 100);
            return (
              <tr key={channel} className="border-b border-cloud last:border-0">
                <td className="py-2.5 pr-4 text-xs font-semibold text-slate-gray tabular-nums w-8">
                  {i + 1}
                </td>
                <td className="py-2.5 pr-4 text-sm font-medium text-charcoal whitespace-nowrap">
                  {channelLabel(channel)}
                </td>
                <td className="py-2.5 px-4 w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-cloud overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          bucket === "High" ? "bg-red-400" : bucket === "Medium" ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${competitionBadgeStyle(bucket)}`}
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {bucket}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pl-4 text-right text-xs tabular-nums text-slate-gray whitespace-nowrap">
                  {score.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function RecommendedMarkets({
  recommendations,
  tortId,
  currentMarketId,
}: {
  recommendations: MarketRecommendation[];
  tortId: string;
  currentMarketId: string;
}) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <MapPin className="h-5 w-5 text-intelligence-teal" />
        <h2 className="text-lg font-semibold text-midnight-navy">
          Recommended Markets &amp; Channels
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const isActive = rec.market_id === currentMarketId;
          const oppPct = Math.round(rec.opportunity_score * 100);
          const badgeColor =
            rec.opportunity_score >= 0.85
              ? "bg-intelligence-teal text-white"
              : rec.opportunity_score >= 0.75
                ? "bg-steel-blue text-white"
                : "bg-slate-gray/20 text-slate-gray";

          const ch1Fit = Math.round(rec.top_channel_1_fit * 100);
          const ch2Fit = Math.round(rec.top_channel_2_fit * 100);
          const ch1Bucket = competitionBucket(rec.top_channel_1_comp);
          const ch2Bucket = competitionBucket(rec.top_channel_2_comp);

          const params = new URLSearchParams({
            tort_id: tortId,
            market_id: rec.market_id,
          });

          return (
            <Link
              key={rec.market_id}
              href={`/advertising/channel-planner?${params.toString()}`}
              className={`block rounded-lg border p-4 transition-shadow hover:shadow-md ${
                isActive
                  ? "ring-2 ring-intelligence-teal border-intelligence-teal/30"
                  : "border-cloud hover:border-steel-blue/30"
              }`}
            >
              {/* Top row: market name + opportunity badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-midnight-navy">
                  {rec.market_label}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${badgeColor}`}
                >
                  {oppPct}%
                </span>
              </div>

              {/* Channel pills */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 text-xs font-medium text-charcoal">
                  {channelLabel(rec.top_channel_1)} · {ch1Fit}%
                  <RoleBadge role={rec.top_channel_1_role} />
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${competitionBadgeStyle(ch1Bucket)}`}
                  >
                    {ch1Bucket}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 text-xs font-medium text-charcoal">
                  {channelLabel(rec.top_channel_2)} · {ch2Fit}%
                  <RoleBadge role={rec.top_channel_2_role} />
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${competitionBadgeStyle(ch2Bucket)}`}
                  >
                    {ch2Bucket}
                  </span>
                </span>
              </div>

              {/* Rationale */}
              <p className="text-xs text-slate-gray italic">{rec.rationale}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default async function TestChannelFitPage({
  searchParams,
}: {
  searchParams: Promise<{ tort_id?: string; market_id?: string }>;
}) {
  const sp = await searchParams;

  const tortId = TORTS.find((t) => t.id === sp.tort_id)?.id ?? TORTS[0].id;
  const marketId =
    MARKETS.find((m) => m.id === sp.market_id)?.id ?? MARKETS[0].id;
  const tortLabel = TORTS.find((t) => t.id === tortId)!.label;
  const marketLabel = MARKETS.find((m) => m.id === marketId)!.label;
  const profileName = "default";

  let scores: ChannelFitScore[] = [];
  let competitionMap = new Map<string, number>();
  let recommendations: MarketRecommendation[] = [];
  let errorMsg: string | null = null;

  try {
    const competitionMarketId = COMPETITION_MARKET_MAP[marketId] ?? marketId;
    [scores, competitionMap, recommendations] = await Promise.all([
      getChannelFitScores(tortId, profileName, marketId),
      getCompetitionScores(competitionMarketId),
      getMarketRecommendations(tortId),
    ]);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Radio className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Advertising Channel Planner
          </h1>
          <p className="text-sm text-slate-gray">
            See which advertising channels best reach your target audience in each market.
          </p>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-5">
        <AdvertisingInsight>
          <p>
            This tool scores each advertising channel based on how well it
            reaches the typical claimant audience for a given tort type and
            market. Use it to prioritize your media mix before building a
            campaign.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              <strong>Pick a tort</strong> to set the audience profile (e.g.,
              Auto Injury skews working-age; Roundup skews 55+).
            </li>
            <li>
              <strong>Pick a market</strong> to reflect local media-consumption
              patterns (e.g., a TV-heavy DMA vs. a digital-first metro).
            </li>
            <li>
              <strong>Read the scores</strong> as relative audience-channel
              alignment — the top channel is normalized to 100%.
            </li>
          </ul>
          <p className="mt-2 text-slate-gray">
            Note: Scores combine audience fit with competition intensity to
            generate action-oriented recommendations (e.g., Priority Test,
            Core Channel). These are planning heuristics — use them as a
            starting point alongside your own pricing and market knowledge.
          </p>
        </AdvertisingInsight>
      </div>

      {/* Quick Start */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
          Quick Start
        </p>
        <nav className="flex gap-2 flex-wrap">
          {QUICK_START_TORTS.map((tort) => {
            const isActive = tortId === tort.id;
            const params = new URLSearchParams({
              tort_id: tort.id,
              market_id: marketId,
            });
            return (
              <Link
                key={tort.id}
                href={`/advertising/channel-planner?${params.toString()}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-intelligence-teal text-white shadow-sm"
                    : "bg-white text-charcoal hover:bg-cloud border border-cloud"
                }`}
              >
                {tort.label}
              </Link>
            );
          })}
          {QUICK_START_TORTS.some((t) => t.id === tortId) && (
            <Link
              href={`/advertising/channel-planner?tort_id=${TORTS[0].id}&market_id=${marketId}`}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors bg-white text-charcoal hover:bg-cloud border border-cloud"
            >
              View All
            </Link>
          )}
        </nav>
      </div>

      {/* Selectors */}
      <div className="mt-5 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
            Tort
          </p>
          <PillSelector
            items={TORTS}
            activeId={tortId}
            paramName="tort_id"
            otherParams={{ market_id: marketId }}
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
            Market
          </p>
          <PillSelector
            items={MARKETS}
            activeId={marketId}
            paramName="market_id"
            otherParams={{ tort_id: tortId }}
          />
        </div>
      </div>

      {/* Content */}
      {errorMsg ? (
        <div className="mt-6 rounded-lg border border-alert/30 bg-alert/5 p-4 text-sm text-alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      ) : scores.length === 0 && competitionMap.size === 0 ? (
        <p className="mt-6 text-sm text-slate-gray">
          No scores returned. Check seed data for {tortId} / {marketId}.
        </p>
      ) : scores.length === 0 ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
            Audience-fit scoring is not yet available for this tort. Competition overlay data is shown below.
          </div>

          {/* Competition-only table */}
          <CompetitionOnlyTable competitionMap={competitionMap} />

          {/* Methodology & Sources */}
          <MethodologySources
            isPrototypeData
            sections={[
              {
                title: "Competition / Saturation Scores",
                content:
                  "Competition scores are derived from real advertising activity in ad_events. For each market \u00d7 channel combination, the score reflects: (a) distinct advertiser count (60% weight) and (b) total estimated spend (40% weight), normalized against the global maximum and clamped to 0.05\u20130.95. Channel mapping: social \u2192 Facebook / Instagram / TikTok; TV \u2192 TV Linear; CTV \u2192 CTV Streaming; digital \u2192 YouTube; search and radio map directly. Podcast and print have no observed ad data yet. Scores refresh weekly via automated pipeline.",
              },
            ]}
            limitations={[
              "Competition scores depend on ad pipeline coverage \u2014 channels or markets with low observation counts may understate true competition.",
              "Audience-fit scoring is not yet available for this tort type.",
            ]}
            dataNotice="Competition scores are derived from real advertising activity data collected via Meta Ad Library, Google Ads Transparency, TikTok Creative Center, and SERP monitoring pipelines."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* 1. Strategy Summary */}
          <StrategySummaryCard
            scores={scores}
            tortLabel={tortLabel}
            marketLabel={marketLabel}
            competitionMap={competitionMap}
          />

          {/* 2. Recommended Markets & Channels */}
          {recommendations.length > 0 && (
            <RecommendedMarkets
              recommendations={recommendations}
              tortId={tortId}
              currentMarketId={marketId}
            />
          )}

          {/* 3. Top 5 Visual Bar Chart */}
          <TopChannelsChart scores={scores} competitionMap={competitionMap} />

          {/* 3. Full Rankings Table */}
          <FullScoreTable scores={scores} competitionMap={competitionMap} />

          {/* Methodology & Sources */}
          <MethodologySources
            isPrototypeData
            sections={[
              {
                title: "Audience Profiles",
                content:
                  "Each tort type has an audience profile that distributes claimant likelihood across six age bands (18\u201324 through 65+). Weights are modeled assumptions based on case-mix patterns and demographic heuristics \u2014 e.g., Auto Injury skews working-age, Roundup skews 55+ due to long-latency cancer, Social Media Addiction targets parents of affected minors (heavy 35\u201354 skew), and Hair Relaxer targets women 35\u201360 with long-term product use history. These are directional estimates, not calibrated to specific epidemiological or survey data.",
              },
              {
                title: "Channel Roles",
                content:
                  "Each channel is classified as Lead-gen, Brand, or Hybrid based on how plaintiff firms typically use it. Lead-gen channels (Search, Facebook, Instagram, YouTube, TikTok, Radio, Podcast) directly generate case inquiries. Brand channels (TV Linear, Print) build long-term awareness and reputation. Hybrid channels (CTV/Streaming) serve both purposes. Mass tort campaigns usually optimize for lead-gen channels that can deliver lower cost per signed case; single-incident PI often blends brand channels with lead-gen to support long-term reputation and referrals.",
              },
              {
                title: "Media Consumption Inputs",
                content:
                  "Per-market, per-age-band indices (0\u20131) represent relative media usage across 10 channels. The US Benchmark market uses indices loosely modeled on Pew Research and Nielsen audience data. Values are directionally accurate but have not been calibrated to a specific survey vintage.",
              },
              {
                title: "Synthetic Test Markets",
                content:
                  "The Older / TV-Heavy, Digital-First, and Balanced Suburban DMA markets are synthetic profiles designed to illustrate how local media patterns shift channel recommendations. They are not mapped to specific Nielsen DMAs.",
              },
              {
                title: "Scoring Formula",
                content:
                  "For each channel: raw score = \u03a3(age_band_weight \u00d7 channel_index) across all six age bands. Scores are then normalized so the highest-scoring channel = 100%. This makes rankings comparable across tort/market combinations.",
              },
              {
                title: "Competition / Saturation Scores",
                content:
                  "Competition scores are derived from real advertising activity in ad_events. For each market \u00d7 channel combination, the score reflects: (a) distinct advertiser count (60% weight) and (b) total estimated spend (40% weight), normalized against the global maximum and clamped to 0.05\u20130.95. Channel mapping: social \u2192 Facebook / Instagram / TikTok; TV \u2192 TV Linear; CTV \u2192 CTV Streaming; digital \u2192 YouTube; search and radio map directly. Podcast and print have no observed ad data yet. Scores refresh weekly via automated pipeline.",
              },
              {
                title: "Market Recommendations",
                content:
                  "Market opportunity scores combine audience-fit strength (average of top-2 channel fit scores) with a competition discount (market-wide average competition intensity, weighted at 50% maximum penalty). Formula: opportunity = avg_top2_fit \u00d7 (1 \u2212 avg_competition \u00d7 0.5). This favors markets where the audience aligns well and competition is manageable. Channel recommendations within each market use the same fit \u00d7 (1 \u2212 comp \u00d7 0.5) formula at the individual channel level. Rationale tags are generated from competition thresholds.",
              },
              {
                title: "Recommendation Labels",
                content:
                  "Each channel receives an action-oriented label derived from its audience-fit tier and competition bucket. These are planning heuristics based on the current prototype inputs \u2014 not definitive media-buy guidance. The mapping is:",
                bullets: [
                  'High/Strong fit + Low competition \u2192 <strong class="text-charcoal">Priority Test</strong>',
                  'High fit + Medium competition \u2192 <strong class="text-charcoal">Core Channel</strong>',
                  'High fit + High competition \u2192 <strong class="text-charcoal">Competitive Channel</strong>',
                  'Strong fit + Medium competition / Moderate fit + Low competition \u2192 <strong class="text-charcoal">Selective Test</strong>',
                  'Strong fit + High competition \u2192 <strong class="text-charcoal">Monitor</strong>',
                  'Moderate/Low fit + Medium/High competition \u2192 <strong class="text-charcoal">Low Priority</strong>',
                ],
              },
            ]}
            limitations={[
              "Scores measure audience\u2013channel alignment only, not cost efficiency or expected ROI.",
              "Competition scores depend on ad pipeline coverage \u2014 channels or markets with low observation counts may understate true competition.",
              "Age-band weights do not yet incorporate gender, income, or geographic density. Social Media Addiction and Hair Relaxer profiles are modeled from demographic heuristics rather than case-level data.",
              "Channel indices are static and do not reflect seasonal or campaign-level variation.",
              "Market recommendations are based on 4 synthetic market profiles and do not cover all DMAs. Opportunity scores should be treated as relative rankings, not absolute measures.",
            ]}
            dataNotice="Audience-fit profiles and media consumption indices use benchmark and synthetic inputs. Competition scores are derived from real advertising activity data collected via Meta Ad Library, Google Ads Transparency, TikTok Creative Center, and SERP monitoring pipelines. Treat audience-fit outputs as directional; competition scores reflect actual observed market activity."
          />
        </div>
      )}
    </>
  );
}
