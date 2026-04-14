import { getChannelFitScores, type ChannelFitScore } from "@/lib/queries";
import Link from "next/link";
import { Radio, Zap, BarChart3, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Channel Strategy | Legal Marketing Intelligence",
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

function StrategySummaryCard({
  scores,
  tortLabel,
  marketLabel,
}: {
  scores: ChannelFitScore[];
  tortLabel: string;
  marketLabel: string;
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

function TopChannelsChart({ scores }: { scores: ChannelFitScore[] }) {
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
          return (
            <div key={s.channel} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-charcoal">
                    {channelLabel(s.channel)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${scoreTierColor(s.normalized_score)}`}
                  >
                    {scoreTierLabel(s.normalized_score)}
                  </span>
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
  let errorMsg: string | null = null;

  try {
    scores = await getChannelFitScores(tortId, profileName, marketId);
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
            Channel Strategy
          </h1>
          <p className="text-sm text-slate-gray">
            Audience-weighted channel recommendations by tort and market
          </p>
        </div>
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
          />

          {/* 2. Top 5 Visual Bar Chart */}
          <TopChannelsChart scores={scores} />

          {/* 3. Full Rankings Table */}
          <FullScoreTable scores={scores} />

          {/* Methodology footer */}
          <div className="rounded-md bg-cloud/60 px-4 py-3 text-xs text-slate-gray leading-relaxed">
            <strong className="text-charcoal">Methodology:</strong> Each
            channel score = Σ(age_band_weight × channel_index) across 6 age
            bands, then normalized so the top channel = 100%. Scores reflect
            audience-channel alignment — not reach, CPM, or ROI.
          </div>
        </div>
      )}
    </>
  );
}
