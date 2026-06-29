/* ------------------------------------------------------------------ */
/*  Shared "Legal Landscape & PI Viability" card — Design D shape.     */
/*                                                                    */
/*  One combined read: composite-score panel + facts grid + CSS       */
/*  component-score bars + judicial-profile mix + a callout. Mirrors   */
/*  the shipped Alabama section (alabama-client.tsx §2), parameterized  */
/*  so the v2 [slug] shell renders the same shape; notes adapt per      */
/*  state (comparative states never inherit Alabama's contributory     */
/*  copy). Case-type cards stay in their own section — not here.       */
/* ------------------------------------------------------------------ */

import { Database } from "lucide-react";
import { ScoreChip } from "./VerdictCard";
import { viabilityBand, scoreColor, type ChipTone } from "./viability";
import { negligenceMeta } from "./state-verdict";

interface PiViabilityData {
  negligence_rule: string;
  statute_of_limitations: string;
  composite_score: number | string;
  avg_jury_verdict: number | string | null;
  non_economic_cap: string | null;
  punitive_cap: string | null;
  negligence_score: number | null;
  non_economic_score: number | null;
  punitive_score: number | null;
  med_mal_score: number | null;
  sol_score: number | null;
  verdict_score: number | null;
}

/* Negligence-rule value text color by severity tone. */
const TONE_TEXT: Record<ChipTone, string> = {
  bad: "text-red-700",
  mid: "text-amber-700",
  good: "text-emerald-700",
  info: "text-midnight-navy",
};

const JUD_COLORS = {
  conservative: "#D64550",
  liberal: "#2F6FED",
  moderate: "#E0A030",
} as const;

function fmtCur(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function StateLegalViability({
  stateName,
  piData,
  judicial,
  legalNote,
}: {
  stateName: string;
  piData: PiViabilityData | null;
  /** County counts by judicial lean (from the page's profileCounts). */
  judicial: { conservative: number; liberal: number; moderate: number };
  /** Optional hand-written narrative (config.content.legalLandscape). */
  legalNote?: string;
}) {
  return (
    <div className="rounded-xl border border-cloud bg-white p-6 shadow-sm">
      <h3 className="font-heading text-xl font-bold text-midnight-navy">
        Should a firm bring PI cases in {stateName}?
      </h3>
      <p className="mt-1.5 text-sm text-slate-gray">
        Negligence rule, statute, damage caps, judicial mix and case-type demand &mdash; one
        combined read on PI viability.
      </p>

      {piData ? (
        <LegalViabilityBody
          stateName={stateName}
          piData={piData}
          judicial={judicial}
          legalNote={legalNote}
        />
      ) : (
        <div className="mt-5 rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
          <Database className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
          <p className="text-sm font-medium text-slate-gray">
            PI viability scores are not available for {stateName} yet.
          </p>
        </div>
      )}
    </div>
  );
}

function LegalViabilityBody({
  piData,
  judicial,
  legalNote,
  stateName,
}: {
  piData: PiViabilityData;
  judicial: { conservative: number; liberal: number; moderate: number };
  legalNote?: string;
  stateName: string;
}) {
  const composite = Number(piData.composite_score) || 0;
  const band = viabilityBand(composite);
  const neg = negligenceMeta(piData.negligence_rule);

  const componentScores = [
    { name: "Negligence rule", score: piData.negligence_score ?? 0 },
    { name: "Non-economic caps", score: piData.non_economic_score ?? 0 },
    { name: "Punitive caps", score: piData.punitive_score ?? 0 },
    { name: "Med-mal caps", score: piData.med_mal_score ?? 0 },
    { name: "Statute of limitations", score: piData.sol_score ?? 0 },
    { name: "Jury verdicts", score: piData.verdict_score ?? 0 },
  ];

  const lowest = [...componentScores]
    .filter((c) => c.score > 0)
    .sort((a, b) => a.score - b.score)[0];
  const panelNote =
    composite >= 75
      ? "Favorable across damage caps, statute, and jury verdicts."
      : lowest
        ? `${lowest.name} is the biggest drag on viability.`
        : "Composite of negligence, caps, statute, and verdict signals.";

  const { conservative, liberal, moderate } = judicial;
  const judTotal = conservative + liberal + moderate;

  const avgVerdict =
    piData.avg_jury_verdict != null
      ? typeof piData.avg_jury_verdict === "string" &&
        /^[a-zA-Z]/.test(piData.avg_jury_verdict)
        ? piData.avg_jury_verdict
        : fmtCur(Number(piData.avg_jury_verdict))
      : "—";

  return (
    <>
      {/* viability + facts */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* composite panel */}
        <div className="flex flex-col rounded-xl bg-cloud/40 p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
            Composite PI viability
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold text-midnight-navy">
              {composite || "—"}
            </span>
            <span className="font-mono text-base text-slate-gray">/ 100</span>
          </div>
          <ScoreChip band={band} />
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-cloud">
            <div
              className="h-full rounded-full"
              style={{ width: `${composite}%`, background: scoreColor(composite) }}
            />
          </div>
          <p className="mt-3.5 text-[12.5px] leading-relaxed text-slate-gray">{panelNote}</p>
        </div>

        {/* facts grid */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-cloud sm:grid-cols-3">
          <Fact
            label="Negligence rule"
            value={neg.full}
            valueClass={TONE_TEXT[neg.tone]}
            note={neg.note}
          />
          <Fact
            label="Statute of limitations"
            value={piData.statute_of_limitations}
            note="From date of injury."
          />
          <Fact label="Non-econ caps" value={piData.non_economic_cap ?? "None"} note="Personal injury." />
          <Fact label="Punitive caps" value={piData.punitive_cap ?? "None"} note="Statutory limit." />
          <Fact label="Avg. jury verdict" value={avgVerdict} note="Median PI award." />
          <Fact label="Composite score" value={String(composite)} note="0–100 scale." />
        </div>
      </div>

      {/* component scores + judicial mix */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
            Component scores
          </div>
          <div className="flex flex-col gap-2.5">
            {componentScores.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-[150px] flex-none text-[12.5px] text-slate-gray">{c.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cloud">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.score}%`, background: scoreColor(c.score) }}
                  />
                </div>
                <span className="w-9 flex-none text-right font-mono text-[12.5px] font-semibold text-midnight-navy">
                  {c.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
            Judicial profile mix
          </div>
          {judTotal > 0 ? (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full border border-cloud">
                <div style={{ width: `${(conservative / judTotal) * 100}%`, background: JUD_COLORS.conservative }} />
                <div style={{ width: `${(liberal / judTotal) * 100}%`, background: JUD_COLORS.liberal }} />
                <div style={{ width: `${(moderate / judTotal) * 100}%`, background: JUD_COLORS.moderate }} />
              </div>
              <div className="mt-3.5 flex flex-col gap-2">
                <JudRow color={JUD_COLORS.conservative} label="Conservative" count={conservative} />
                <JudRow color={JUD_COLORS.liberal} label="Liberal" count={liberal} />
                <JudRow color={JUD_COLORS.moderate} label="Moderate" count={moderate} />
              </div>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-slate-gray">
              Judicial-profile data isn&apos;t available for {stateName} yet.
            </p>
          )}
        </div>
      </div>

      {/* narrative callout (full border, no side-stripe) */}
      <div className="mt-6 rounded-lg border border-intelligence-teal/20 bg-intelligence-teal/[0.05] px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-midnight-navy/80">
          {legalNote ??
            `${stateName}'s negligence rule, damage caps, and statute of limitations set the boundaries of recoverable claims and the urgency of intake. Case-selection criteria and advertising positioning follow directly from this regime.`}
        </p>
      </div>
    </>
  );
}

function Fact({
  label,
  value,
  note,
  valueClass,
}: {
  label: string;
  value: string;
  note: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
        {label}
      </div>
      <div className={`mt-1.5 text-[17px] font-bold ${valueClass ?? "text-midnight-navy"}`}>
        {value}
      </div>
      <div className="mt-1 text-[11.5px] leading-snug text-slate-gray">{note}</div>
    </div>
  );
}

function JudRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-3 w-3 flex-none rounded" style={{ background: color }} />
      <span className="text-[13px] font-medium text-midnight-navy">{label}</span>
      <span className="ml-auto font-mono text-[12.5px] text-slate-gray">{count} counties</span>
    </div>
  );
}
