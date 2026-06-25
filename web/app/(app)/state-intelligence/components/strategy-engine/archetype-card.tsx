"use client";

import { Lock, Check } from "lucide-react";
import { scoreColor, type ChipTone } from "@/components/state-intelligence/viability";
import { CHIP_TONES } from "@/components/state-intelligence/VerdictCard";
import {
  ARCHETYPE_DEFINITIONS,
  ARCHETYPE_LABELS,
  type ScoredArchetype,
} from "@/lib/strategy-engine/types";

/** Map a 0–100 archetype fit score to a labeled chip. */
function fitChip(score: number): { label: string; tone: ChipTone } {
  if (score >= 66) return { label: "Strong fit", tone: "good" };
  if (score >= 40) return { label: "Possible fit", tone: "mid" };
  return { label: "Weak fit", tone: "bad" };
}

const CONFIDENCE_LABEL: Record<ScoredArchetype["confidence"], string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  directional: "Directional",
};

/**
 * One archetype card. Decision-first like the verdict bar: a fit-keyed top
 * rule, the score, and the two trust lines (why this fits / why not the
 * alternatives). A locked archetype renders visibly disabled with its reason
 * — never hidden (per the council, the Gorilla Rule should be shown, not silent).
 */
export function ArchetypeCard({
  archetype,
  selected,
  onSelect,
}: {
  archetype: ScoredArchetype;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = ARCHETYPE_LABELS[archetype.key];
  const definition = ARCHETYPE_DEFINITIONS[archetype.key];

  if (archetype.locked_out) {
    return (
      <div
        className="flex flex-col rounded-xl border border-cloud bg-cloud/30 p-5 opacity-90"
        style={{ borderTop: "3px solid #94A3B8" }}
        aria-disabled="true"
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-heading text-base font-bold text-slate-gray">{label}</h4>
          <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2.5 py-0.5 text-[11px] font-bold text-slate-gray">
            <Lock className="h-3 w-3" /> Locked
          </span>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-snug text-slate-gray">{definition}</p>
        <p className="mt-3 border-t border-cloud pt-3 text-[12.5px] leading-snug text-slate-gray">
          {archetype.lock_reason}
        </p>
      </div>
    );
  }

  const chip = fitChip(archetype.score);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col rounded-xl border bg-white p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal/60 motion-reduce:transition-none ${
        selected
          ? "border-intelligence-teal ring-2 ring-intelligence-teal/40"
          : "border-cloud hover:border-intelligence-teal/40"
      }`}
      style={{ borderTop: `3px solid ${scoreColor(archetype.score)}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-heading text-base font-bold text-midnight-navy">{label}</h4>
        {selected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-intelligence-teal px-2.5 py-0.5 text-[11px] font-bold text-white">
            <Check className="h-3 w-3" /> Selected
          </span>
        ) : (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CHIP_TONES[chip.tone]}`}
          >
            {chip.label}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[12.5px] leading-snug text-slate-gray">{definition}</p>

      <dl className="mt-3 space-y-2 border-t border-cloud pt-3 text-[12.5px] leading-snug">
        <div>
          <dt className="font-semibold text-midnight-navy">Why this fits</dt>
          <dd className="mt-0.5 text-slate-gray">{archetype.why_this_fits}</dd>
        </div>
        <div>
          <dt className="font-semibold text-midnight-navy">Why not the alternatives</dt>
          <dd className="mt-0.5 text-slate-gray">{archetype.why_not_alternatives}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2 pt-0.5">
        <span className="font-mono text-[11px] text-slate-gray">
          {CONFIDENCE_LABEL[archetype.confidence]}
        </span>
      </div>
    </button>
  );
}
