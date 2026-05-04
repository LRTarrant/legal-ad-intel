"use client";

/**
 * PIScriptCard — renders the generated PI script template.
 *
 * Sections (per SPEC §2.2):
 *   HOOK → PROBLEM → AUTHORITY → CTA → DISCLAIMER
 *
 * If severity modifiers were applied, also show a small chip row
 * indicating which modifiers shaped the output. The base (pre-modifier)
 * template is available in the response too for analytics use, but we
 * don't render it here — the user wants to see what they'll actually
 * use, not the diff.
 *
 * The toneHint is shown collapsed by default — it's voice direction
 * for the LLM in the next step (radio/video script generation), not
 * something the user typically needs to see.
 */

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { PIPlanResult } from "./pi-config-form";

interface PIScriptCardProps {
  result: PIPlanResult;
  accentColor: string;
}

function Section({
  label,
  body,
  accentColor,
}: {
  label: string;
  body: string;
  accentColor: string;
}) {
  return (
    <div>
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: accentColor }}
      >
        {label}
      </div>
      <p className="text-sm text-midnight-navy leading-relaxed whitespace-pre-line">
        {body}
      </p>
    </div>
  );
}

export function PIScriptCard({ result, accentColor }: PIScriptCardProps) {
  const [showToneHint, setShowToneHint] = useState(false);
  const t = result.template;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          {t.displayName}
        </h3>

        {result.severity_modifiers.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            {result.severity_modifiers.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                <Sparkles className="h-3 w-3" />
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      <Section label="Hook" body={t.hook} accentColor={accentColor} />
      <Section label="Problem" body={t.problem} accentColor={accentColor} />
      <Section label="Authority" body={t.authority} accentColor={accentColor} />
      {t.socialProof && (
        <Section
          label="Social proof"
          body={t.socialProof}
          accentColor={accentColor}
        />
      )}
      <Section label="Call to action" body={t.cta} accentColor={accentColor} />
      <Section
        label="Disclaimer"
        body={t.baseDisclaimer}
        accentColor={accentColor}
      />

      <div className="border-t border-slate-100 pt-4">
        <button
          onClick={() => setShowToneHint((s) => !s)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
        >
          <Volume2 className="h-3.5 w-3.5" />
          Voice direction (for audio/video)
          {showToneHint ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        {showToneHint && (
          <p className="mt-2 text-xs italic text-slate-gray leading-relaxed">
            {t.toneHint}
          </p>
        )}
      </div>

      {/* Compliance summary */}
      <ComplianceSummary result={result} accentColor={accentColor} />

      <div className="rounded-md bg-slate-50 border border-slate-100 p-3 text-xs text-slate-gray leading-relaxed">
        <strong className="text-midnight-navy">What&apos;s next:</strong>{" "}
        Radio script, video script, voiceover, and asset rendering for PI
        campaigns ship in the next release. For now, copy these sections
        into your existing creative workflow.
      </div>
    </div>
  );
}

/**
 * ComplianceSummary — surfaces state-specific advertising flags.
 *
 * Three visual states:
 *   - Has 'review' flags: amber alert; user must take an extra step
 *     (TX/FL pre-publication review, etc.)
 *   - Has only 'warning' flags: subtle yellow callout; phrases to
 *     review before publishing
 *   - No flags: green check; "Compliance check passed" with the state
 *     name. Doesn't claim the script is bar-compliant — just that the
 *     automated scan didn't surface concerns.
 *
 * Always includes a short "this is not legal advice" disclaimer.
 */
function ComplianceSummary({
  result,
  accentColor,
}: {
  result: PIPlanResult;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { compliance } = result;
  const flags = compliance.flags;

  const reviewFlags = flags.filter((f) => f.severity === "review");
  const warningFlags = flags.filter((f) => f.severity === "warning");
  const hasReview = reviewFlags.length > 0;
  const hasWarnings = warningFlags.length > 0;
  const stateLabel = compliance.state_name || "this state";

  // Pick visual style based on the most severe flag
  const tone = hasReview
    ? {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-900",
        Icon: AlertTriangle,
        iconColor: "text-amber-600",
      }
    : hasWarnings
      ? {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-900",
          Icon: Info,
          iconColor: "text-yellow-600",
        }
      : {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-900",
          Icon: ShieldCheck,
          iconColor: "text-emerald-600",
        };

  const headline = hasReview
    ? `${stateLabel} requires additional review before publication`
    : hasWarnings
      ? `${flags.length} compliance ${flags.length === 1 ? "item" : "items"} to review for ${stateLabel}`
      : `Compliance scan passed for ${stateLabel}`;

  return (
    <div className={`rounded-md border ${tone.border} ${tone.bg} p-3`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex w-full items-center justify-between text-left text-sm font-medium ${tone.text}`}
      >
        <span className="flex items-center gap-2">
          <tone.Icon className={`h-4 w-4 ${tone.iconColor}`} />
          {headline}
        </span>
        {flags.length > 0 ? (
          expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : null}
      </button>

      {expanded && flags.length > 0 && (
        <ul className={`mt-3 space-y-2 text-xs ${tone.text}`}>
          {flags.map((f, idx) => (
            <li key={idx} className="leading-relaxed">
              <span className="font-semibold">{f.summary}</span>
              {f.detail && (
                <>
                  {" — "}
                  <span className="opacity-90">{f.detail}</span>
                </>
              )}
              {f.section && (
                <span className="ml-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {f.section}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className={`mt-3 text-[11px] italic opacity-75 ${tone.text}`}>
        This is automated marketing-risk guidance, not legal review.
        Verify your state&apos;s current bar rules and have ads cleared
        by counsel before publication.
      </p>
      {/* accentColor is unused here intentionally — compliance uses
          severity-specific colors so users learn the visual language
          (amber = review, yellow = warning, green = clear). */}
      <span className="hidden" data-accent={accentColor} />
    </div>
  );
}
