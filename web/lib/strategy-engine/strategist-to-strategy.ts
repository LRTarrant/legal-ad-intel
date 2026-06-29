/**
 * Strategy Engine — map the grounded StrategistOutput into the deck's existing
 * Strategy shape (recommendations / integrated_plan.allocation / prose), so the
 * AI's real tactic selections drive the live deck without a deck rewrite (4c
 * does the native rendering). Competitive + opportunity stay deterministic in
 * the route; this only maps the strategist-owned pieces.
 *
 * Code still owns every number: the link values come from the scored tactic and
 * code-owned reach targets, never from an AI string.
 */
import type { MediaBrief, StrategistOutput } from "./strategist";
import type { TacticMenu, ScoredTactic } from "./tactic-scoring";
import type { Recommendation, RecommendationLink, ProofPoint, DataDepth } from "./recommendations";
import { CHANNEL_LABELS } from "./recommendations";
import type { IntegratedAllocation } from "./standalone";
import type { StrategyProse } from "./types";

export interface StrategistMapFacts {
  market_label: string;
  top_advertiser: string | null;
  opportunity_intensity: number | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function link(value: string, source: string, text: string): RecommendationLink {
  return { value, source, text, depth: "primary" };
}

export function briefToRecommendation(
  brief: MediaBrief,
  scored: ScoredTactic,
  facts: StrategistMapFacts,
): Recommendation {
  const fmt = brief.format_call.length ? ` — ${brief.format_call.join(" / ")}` : "";
  const headline = `${brief.tactic.label}${fmt} in ${facts.market_label}`;

  const oppValue = brief.reach_target
    ? `${brief.reach_target.reach_pct}% reach goal`
    : facts.opportunity_intensity != null
      ? pct(facts.opportunity_intensity)
      : "priority market";
  const opportunity = link(oppValue, "Plan target", brief.rationale);

  const wsValue =
    scored.whitespace == null ? "unmeasured" : scored.whitespace >= 0.5 ? "open" : "contested";
  const white_space = link(wsValue, "competitive scan", `Competitive whitespace: ${wsValue}.`);

  const fitValue = scored.audience_fit == null ? "directional" : pct(scored.audience_fit);
  const fitText = scored.audience_fit_scope === "news_proxy" ? "Audience fit (news-consumption proxy)." : "Audience fit for this market.";
  const fit = link(fitValue, (scored.audience_fit_sources ?? []).join(", ") || "media baseline", fitText);

  const proof: ProofPoint[] = [];
  if (brief.reach_target) proof.push({ value: `freq ${brief.reach_target.min_frequency}+`, source: "media-planning target" });
  if (brief.affordable === false) proof.push({ value: "stretch", source: "above budget floor" });

  const buy: Recommendation["buy"] =
    brief.example_outlets.length > 0
      ? { kind: "outlets", outlets: brief.example_outlets }
      : { kind: "channel_target", target: brief.tactic.label };

  const data_depth: DataDepth = scored.audience_fit == null || scored.whitespace == null ? "moderate" : "strong";

  return { channel: brief.tactic.channel, headline, opportunity, white_space, fit, proof, buy, data_depth };
}

export function strategistToRecommendations(
  out: StrategistOutput,
  menu: TacticMenu,
  facts: StrategistMapFacts,
): Recommendation[] {
  const byKey = new Map(menu.tactics.map((s) => [s.tactic.key, s]));
  return out.briefs
    .map((b) => {
      const scored = byKey.get(b.tactic.key);
      return scored ? briefToRecommendation(b, scored, facts) : null;
    })
    .filter((r): r is Recommendation => r !== null);
}

export function strategistToAllocation(out: StrategistOutput): IntegratedAllocation[] {
  return out.briefs.map((b) => ({
    channel: b.tactic.channel,
    label: CHANNEL_LABELS[b.tactic.channel],
    stage: b.tactic.funnel_stage,
    pct: b.allocation_pct,
  }));
}

export function strategistToProse(out: StrategistOutput, facts: StrategistMapFacts): StrategyProse {
  const lead = facts.top_advertiser
    ? `${facts.market_label}: ${facts.top_advertiser} leads the competitive field.`
    : `${facts.market_label}: an open competitive field.`;
  const count = out.briefs.length;
  const approach = `${count} ${count === 1 ? "tactic" : "tactics"} selected for this budget and goal, sequenced across the funnel.`;
  return {
    market_read: lead,
    approach_rationale: approach,
    channel_narrative: out.narrative && out.narrative.trim() ? out.narrative : approach,
  };
}
