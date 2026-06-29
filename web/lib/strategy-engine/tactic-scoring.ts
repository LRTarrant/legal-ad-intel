/**
 * Strategy Engine — deterministic tactic scorer.
 *
 * Turns the assembled market signals + the interview into a scored tactic
 * menu. Code owns every number here; the Plan 3 AI reads the menu, selects a
 * funnel-sequenced mix, and narrates — it does not recompute these scores.
 *
 * Per-tactic scores:
 *   - funnel_fit: goal-weighted value of the tactic's funnel stage.
 *   - audience_fit / competition: read straight off StrategyInputs.channels
 *     (the tactic's `channel`); null when that channel has no signal — never
 *     fabricated.
 *   - whitespace: 1 - competition (more open = more opportunity).
 *   - affordable: min_monthly_usd <= budget.
 *   - composite: a transparent blend used ONLY to order the menu; the AI sees
 *     the component scores, not just this.
 * Market opportunity intensity is a directional [0,1] from the FARS local
 * signal, surfaced once at the menu level.
 */
import type { StrategyInputs, ChannelSignal, LocalSignal } from "./types";
import {
  TACTIC_LIBRARY,
  funnelWeights,
  isAffordable,
  recommendedTacticCount,
  type Tactic,
  type GoalKind,
} from "./tactics";

export interface ScoredTactic {
  tactic: Tactic;
  funnel_fit: number;
  audience_fit: number | null;
  audience_fit_scope?: "general" | "news_proxy";
  audience_fit_sources?: string[];
  competition: number | null;
  whitespace: number | null;
  affordable: boolean;
  composite: number;
}

export interface TacticMenu {
  goal: GoalKind;
  budget_monthly_usd: number;
  recommended_tactic_count: number;
  market_opportunity_intensity: number | null;
  tactics: ScoredTactic[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Directional market opportunity from FARS death rates. Normalized against a
 * 20/100k reference (a high-but-not-extreme PI death rate); purely relative,
 * never an absolute claim. null when there's no local signal.
 */
export function computeOpportunityIntensity(local: LocalSignal | null): number | null {
  if (!local || local.top_counties.length === 0) return null;
  const rates = local.top_counties
    .map((c) => c.deaths_per_100k)
    .filter((r): r is number => r != null);
  if (rates.length === 0) return null;
  const peak = Math.max(...rates);
  return clamp01(peak / 20);
}

function signalFor(channels: ChannelSignal[], tactic: Tactic): ChannelSignal | undefined {
  return channels.find((c) => c.channel === tactic.channel);
}

export function buildTacticMenu(
  inputs: StrategyInputs,
  opts: { goal: GoalKind; budgetMonthlyUsd: number },
): TacticMenu {
  const weights = funnelWeights(opts.goal);

  const tactics: ScoredTactic[] = TACTIC_LIBRARY.map((tactic) => {
    const sig = signalFor(inputs.channels, tactic);
    const funnel_fit = weights[tactic.funnel_stage];
    const audience_fit = sig ? sig.fit : null;
    const competition = sig && sig.competition != null ? sig.competition : null;
    const whitespace = competition == null ? null : clamp01(1 - competition);
    const affordable = isAffordable(tactic, opts.budgetMonthlyUsd);

    // Diagnostic ordering blend. Unknown sub-scores fall back to a neutral 0.5
    // for ORDERING ONLY (the exposed audience_fit/competition stay null).
    // Unaffordable tactics sink so the menu leads with what the budget funds.
    const blend =
      0.4 * funnel_fit +
      0.3 * (audience_fit ?? 0.5) +
      0.3 * (whitespace ?? 0.5);
    const composite = affordable ? blend : blend * 0.25;

    return {
      tactic,
      funnel_fit,
      audience_fit,
      audience_fit_scope: sig?.fit_scope,
      audience_fit_sources: sig?.fit_sources,
      competition,
      whitespace,
      affordable,
      composite,
    };
  }).sort((a, b) => b.composite - a.composite);

  return {
    goal: opts.goal,
    budget_monthly_usd: opts.budgetMonthlyUsd,
    recommended_tactic_count: recommendedTacticCount(opts.budgetMonthlyUsd),
    market_opportunity_intensity: computeOpportunityIntensity(inputs.local_signal),
    tactics,
  };
}
