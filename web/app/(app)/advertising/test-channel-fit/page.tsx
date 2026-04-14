import {
  getChannelFitScores,
  getCompetitionScores,
  type ChannelFitScore,
} from "@/lib/queries";
import Link from "next/link";
import { Radio, Zap, BarChart3, TrendingUp, Shield } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Advertising Channel Planner | Legal Marketing Intelligence",
};

/* ── Config ─────────────────────────────────────────────── */

const TORTS = [
  { id: "AUTO_INJURY", label: "Auto Injury" },
  { id: "TRUCK_ACCIDENT", label: "Truck Accident" },
  { id: "ROUNDUP", label: "Roundup" },
] as const;

const MARKETS = [
  { id: "US_TEST", label: "US Benchmark" },
  { id: "OLDER_TV_DMA", label: "Older / TV-Heavy DMA" },
  { id: "DIGITAL_YOUNG_DMA", label: "Digital-First DMA" },
  { id: "BALANCED_SUBURBAN_DMA", label: "Balanced Suburban DMA" },
] as const;

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
            href={`/advertising/test-channel-fit?${params.toString()}`}
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
          const combined = combinedLabel(s.normalized_score, competitionMap.get(s.channel));
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
              <p className="text-2xl font-bold text-intelligence-teal tabular-nums">
                {pct}%
              </p>
              {combined && (
                <p className="mt-1.5 text-[11px] font-medium text-slate-gray">
                  {combined}
                </p>
              )}
              <div className="mt-1">
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
          const combined = combinedLabel(s.normalized_score, competitionMap.get(s.channel));
          return (
            <div key={s.channel} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-charcoal">
                    {channelLabel(s.channel)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${scoreTierColor(s.normalized_score)}`}
                  >
                    {scoreTierLabel(s.normalized_score)}
                  </span>
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
              {combined && (
                <p className="mt-0.5 text-[11px] text-slate-gray">
                  {combined}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FullScoreTable({ scores }: { scores: ChannelFitScore[] }) {
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
            <th className="pb-2 pl-4 text-right">Raw</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => {
            const pct = Math.round(s.normalized_score * 100);
            return (
              <tr
                key={s.channel}
                className="border-b border-cloud last:border-0"
              >
                <td className="py-2.5 pr-4 text-xs font-semibold text-slate-gray tabular-nums w-8">
                  {i + 1}
                </td>
                <td className="py-2.5 pr-4 text-sm font-medium text-charcoal whitespace-nowrap">
                  {channelLabel(s.channel)}
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
  let errorMsg: string | null = null;

  try {
    [scores, competitionMap] = await Promise.all([
      getChannelFitScores(tortId, profileName, marketId),
      getCompetitionScores(marketId, tortId),
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
            Note: Scores reflect audience fit only. They do not account for
            media cost, competitive saturation, or expected ROI. Use them as a
            starting point alongside your own pricing and market knowledge.
          </p>
        </AdvertisingInsight>
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
      ) : scores.length === 0 ? (
        <p className="mt-6 text-sm text-slate-gray">
          No scores returned. Check seed data for {tortId} / {marketId}.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {/* 1. Strategy Summary */}
          <StrategySummaryCard
            scores={scores}
            tortLabel={tortLabel}
            marketLabel={marketLabel}
            competitionMap={competitionMap}
          />

          {/* 2. Top 5 Visual Bar Chart */}
          <TopChannelsChart scores={scores} competitionMap={competitionMap} />

          {/* 3. Full Rankings Table */}
          <FullScoreTable scores={scores} />

          {/* Methodology & Sources */}
          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-midnight-navy mb-3">
              Methodology & Sources
            </h2>

            <div className="space-y-3 text-sm text-charcoal leading-relaxed">
              <div>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  Audience Profiles
                </h3>
                <p>
                  Each tort type has an audience profile that distributes
                  claimant likelihood across six age bands (18–24 through 65+).
                  Weights are currently internal assumptions based on case-mix
                  patterns — e.g., Auto Injury skews working-age, Roundup skews
                  55+ due to long-latency cancer.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  Media Consumption Inputs
                </h3>
                <p>
                  Per-market, per-age-band indices (0–1) represent relative
                  media usage across 10 channels. The US Benchmark market
                  uses indices loosely modeled on Pew Research and Nielsen
                  audience data. Values are directionally accurate but have
                  not been calibrated to a specific survey vintage.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  Synthetic Test Markets
                </h3>
                <p>
                  The Older / TV-Heavy, Digital-First, and Balanced Suburban
                  DMA markets are synthetic profiles designed to illustrate how
                  local media patterns shift channel recommendations. They are
                  not mapped to specific Nielsen DMAs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  Scoring Formula
                </h3>
                <p>
                  For each channel: raw score = Σ(age_band_weight ×
                  channel_index) across all six age bands. Scores are then
                  normalized so the highest-scoring channel = 100%. This makes
                  rankings comparable across tort/market combinations.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  Competition / Saturation Scores
                </h3>
                <p>
                  Each channel displays a competition intensity score (Low / Medium / High)
                  alongside its audience-fit rating. These scores are currently
                  synthetic placeholders seeded per market. Future versions will
                  derive them from actual channel-level advertising activity data
                  (Facebook Ad Library, Google Ads Transparency, TikTok Creative
                  Center, etc.) to reflect real competitive saturation.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  Current Limitations
                </h3>
                <ul className="list-disc list-inside space-y-1 text-slate-gray">
                  <li>
                    Scores measure audience–channel alignment only, not cost
                    efficiency or expected ROI.
                  </li>
                  <li>
                    Competition scores are synthetic placeholders and do not yet
                    reflect real ad-spend data.
                  </li>
                  <li>
                    Age-band weights do not yet incorporate gender, income, or
                    geographic density.
                  </li>
                  <li>
                    Channel indices are static and do not reflect seasonal or
                    campaign-level variation.
                  </li>
                </ul>
              </div>
            </div>

            {/* Prototype data notice */}
            <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-xs leading-relaxed">
              <strong className="text-warning">Prototype Data Notice:</strong>
              <span className="text-charcoal">
                {" "}All audience profiles, media indices, and test markets on this
                page use benchmark and synthetic inputs created for development
                purposes. Future versions will integrate named external datasets
                (e.g., Pew Research Center, Nielsen, MRI-Simmons, U.S. Census)
                and licensed sources where available. Treat current outputs as
                directional — not production-grade.
              </span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
