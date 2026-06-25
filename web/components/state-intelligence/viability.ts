/**
 * Shared viability scoring helpers for state-intelligence pages.
 * `viabilityBand` maps a 0–100 composite score to a favorable/challenging/difficult
 * band; `scoreColor` returns the green/amber/red viz-band color (per DESIGN.md).
 */

export type ScoreTone = "good" | "mid" | "bad";
export type ChipTone = ScoreTone | "info";

export interface ViabilityBand {
  label: string;
  tone: ScoreTone;
}

/** Map a 0–100 PI-viability composite score to a labeled band. */
export function viabilityBand(score: number): ViabilityBand {
  if (score >= 75) return { label: "Favorable", tone: "good" };
  if (score >= 50) return { label: "Challenging", tone: "mid" };
  return { label: "Difficult", tone: "bad" };
}

/** Sequential red → amber → green by score (viz-red / viz-amber / viz-green). */
export function scoreColor(s: number): string {
  if (s <= 25) return "#DC2626";
  if (s <= 74) return "#E0A030";
  return "#16A34A";
}
