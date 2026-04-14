import { getChannelFitScores, type ChannelFitScore } from "@/lib/queries";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Channel-Fit Scores | Legal Marketing Intelligence",
};

/** Pretty-print a snake_case channel name */
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

/** Colour-code the normalized score bar */
function scoreColor(normalized: number): string {
  if (normalized >= 0.8) return "bg-intelligence-teal";
  if (normalized >= 0.6) return "bg-steel-blue";
  if (normalized >= 0.4) return "bg-slate-gray/60";
  return "bg-slate-gray/30";
}

function ScoreBar({ score }: { score: ChannelFitScore }) {
  const pct = Math.round(score.normalized_score * 100);
  return (
    <tr className="border-b border-cloud last:border-0">
      <td className="py-3 pr-4 text-sm font-medium text-charcoal whitespace-nowrap">
        {channelLabel(score.channel)}
      </td>
      <td className="py-3 px-4 w-full">
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 rounded-full bg-cloud overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreColor(score.normalized_score)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-gray tabular-nums w-10 text-right">
            {pct}%
          </span>
        </div>
      </td>
      <td className="py-3 pl-4 text-right text-xs tabular-nums text-slate-gray whitespace-nowrap">
        {score.raw_score.toFixed(4)}
      </td>
    </tr>
  );
}

export default async function TestChannelFitPage() {
  const tortId = "AUTO_INJURY";
  const profileName = "default";
  const marketId = "US_TEST";

  let scores: ChannelFitScore[] = [];
  let errorMsg: string | null = null;

  try {
    scores = await getChannelFitScores(tortId, profileName, marketId);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Radio className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Channel-Fit Scores
          </h1>
          <p className="text-sm text-slate-gray">
            Weighted audience-channel alignment for{" "}
            <span className="font-semibold text-charcoal">{tortId}</span>
            {" · "}
            <span className="text-xs">{profileName} profile · {marketId}</span>
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-6 rounded-lg border border-alert/30 bg-alert/5 p-4 text-sm text-alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      ) : scores.length === 0 ? (
        <p className="mt-6 text-sm text-slate-gray">
          No scores returned. Check that seed data exists for {tortId} / {marketId}.
        </p>
      ) : (
        <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-midnight-navy mb-4">
            Ranked Channel Fit
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                <th className="pb-2 pr-4">Channel</th>
                <th className="pb-2 px-4">Normalized Score</th>
                <th className="pb-2 pl-4 text-right">Raw Score</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <ScoreBar key={s.channel} score={s} />
              ))}
            </tbody>
          </table>

          <div className="mt-6 rounded-md bg-cloud/60 px-4 py-3 text-xs text-slate-gray leading-relaxed">
            <strong className="text-charcoal">How it works:</strong>{" "}
            Each channel score = Σ(age_band_weight × channel_index) across all
            age bands, then normalized so the top channel = 100%.
            Source indices tagged <code className="text-intelligence-teal">pew_2025_benchmark</code>;
            audience weights tagged <code className="text-intelligence-teal">internal_assumption</code>.
          </div>
        </section>
      )}
    </>
  );
}
