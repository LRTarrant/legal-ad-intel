import type { ChipTone, ViabilityBand } from "./viability";

/** Semantic tone → chip classes, shared by VerdictCard and ScoreChip.
 *  Text shades are pinned to clear WCAG AA on their own 50-tint background
 *  (amber-700 ≈ 4.8:1, red-700 ≈ 5.9:1; amber-600/red-600 fell below 4.5:1 on
 *  the small bold chip text). */
export const CHIP_TONES: Record<ChipTone, string> = {
  good: "bg-emerald-50 text-emerald-700",
  mid: "bg-amber-50 text-amber-700",
  bad: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

/** Pill chip for a viability band (used beside the composite score). */
export function ScoreChip({ band }: { band: ViabilityBand }) {
  return (
    <span
      className={`mt-3 inline-block self-start rounded-full px-3 py-1 text-xs font-bold ${CHIP_TONES[band.tone]}`}
    >
      {band.label}
    </span>
  );
}

/**
 * Decision-first "verdict" card: a colored top rule, a label, a big value,
 * a tone chip, and a one-line "so what". The signature element of the
 * state-intelligence verdict bar.
 */
export function VerdictCard({
  top,
  label,
  value,
  valueSuffix,
  chip,
  chipTone,
  note,
}: {
  /** Hex color for the 3px top accent rule (e.g. a viz-band color). */
  top: string;
  label: string;
  value: string;
  valueSuffix?: string;
  chip: string;
  chipTone: ChipTone;
  note: string;
}) {
  return (
    <div
      className="rounded-xl border border-cloud bg-white px-4.5 py-4 shadow-sm"
      style={{ borderTop: `3px solid ${top}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-heading text-2xl font-bold leading-tight tracking-tight text-midnight-navy">
          {value}
        </span>
        {valueSuffix && (
          <span className="font-mono text-xs text-slate-gray">{valueSuffix}</span>
        )}
      </div>
      <span
        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CHIP_TONES[chipTone]}`}
      >
        {chip}
      </span>
      <p className="mt-2.5 text-[11.5px] leading-snug text-slate-gray">{note}</p>
    </div>
  );
}
