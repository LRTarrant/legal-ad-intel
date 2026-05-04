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
  ChevronDown,
  ChevronUp,
  FileText,
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

      <div className="rounded-md bg-slate-50 border border-slate-100 p-3 text-xs text-slate-gray leading-relaxed">
        <strong className="text-midnight-navy">What&apos;s next:</strong>{" "}
        Radio script, video script, voiceover, and asset rendering for PI
        campaigns ship in the next release. For now, copy these sections
        into your existing creative workflow.
      </div>
    </div>
  );
}
