/**
 * Strategy Engine — deterministic media-planning standards.
 *
 * Reach/frequency here are PLANNING TARGETS the user briefs a media rep
 * against ("aim for ~60% reach at frequency 4+"), never delivered-reach
 * claims. Allocation is a code-owned budget split; the AI selects tactics,
 * this computes the percentages.
 */
import type { FunnelStage } from "./types";
import type { Tactic } from "./tactics";
import type { TacticMenu } from "./tactic-scoring";

export interface ReachFrequencyTarget {
  /** Target net reach as a percent of the market — a goal, not a delivery claim. */
  reach_pct: number;
  /** Minimum effective frequency to brief against. */
  min_frequency: number;
}

/**
 * Reach/frequency is the planning language for upper-funnel reach plays.
 * Lower-funnel intent tactics (search, SEO, lead-forms) are briefed on
 * conversion, not reach, so they return null.
 */
const STAGE_TARGETS: Partial<Record<FunnelStage, ReachFrequencyTarget>> = {
  awareness: { reach_pct: 60, min_frequency: 4 },
  consideration: { reach_pct: 40, min_frequency: 3 },
};

export function reachFrequencyTarget(tactic: Tactic): ReachFrequencyTarget | null {
  return STAGE_TARGETS[tactic.funnel_stage] ?? null;
}

/**
 * Whole-percent budget split across the selected tactics, summing to exactly
 * 100 (largest-remainder rounding). Weighted by each tactic's goal-aligned
 * funnel_fit, floored so nothing rounds to a 0% line item.
 */
export function computeAllocation(selectedKeys: string[], menu: TacticMenu): Map<string, number> {
  const selected = menu.tactics.filter((s) => selectedKeys.includes(s.tactic.key));
  const out = new Map<string, number>();
  if (selected.length === 0) return out;

  const weights = selected.map((s) => Math.max(0.05, s.funnel_fit));
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * 100);
  const floors = raw.map((r) => Math.floor(r));
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  // Hand the leftover whole points to the largest fractional parts.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const pct = [...floors];
  for (let k = 0; k < remainder; k++) pct[order[k % order.length].i] += 1;

  selected.forEach((s, i) => out.set(s.tactic.key, pct[i]));
  return out;
}
