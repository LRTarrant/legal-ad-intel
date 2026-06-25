/**
 * Strategy Engine — deterministic channel planner.
 *
 * Turns the audience-fit + competition signal into a funnel-sequenced plan
 * of channels, each carrying NAMED local outlets. Ranking is transparent:
 *   opportunity = fit × (1 − competition)
 * biased by the chosen archetype and dials. The AI never sees this math; it
 * only narrates the result. Pure + unit-tested (channel-plan.test.ts).
 *
 * The council's hard rule lives here too: the plan emits confidence tiers and
 * relative opportunity scores, never absolute reach / impressions.
 */

import { CHANNEL_LABELS } from "./types";
import type {
  ArchetypeKey,
  Cadence,
  ChannelKey,
  ChannelPlan,
  ChannelSignal,
  Confidence,
  FirstMove,
  FunnelEmphasis,
  FunnelStage,
  GorillaVerdict,
  NamedOutlet,
  PlannedChannel,
  ScoredArchetype,
  StrategyInputs,
  StrategyPlan,
} from "./types";

/* ── Channel → funnel-stage affinity ────────────────────────────────────── */

/**
 * Where each channel does its best work in the funnel. A channel can serve
 * multiple stages; we place it in its single strongest stage to keep the plan
 * legible (the council warned against wall-of-charts overwhelm).
 */
const CHANNEL_PRIMARY_STAGE: Record<ChannelKey, FunnelStage> = {
  tv_linear: "awareness",
  ctv: "awareness",
  radio: "awareness",
  youtube: "consideration",
  podcast: "consideration",
  facebook: "consideration",
  instagram: "consideration",
  tiktok: "consideration",
  search: "conversion",
  print: "awareness",
};

/* ── Archetype + dial weighting ─────────────────────────────────────────── */

/**
 * Per-archetype multipliers on a channel's opportunity, by stage. Head-to-Head
 * leans broad-reach awareness; Niche leans targeted/efficient; Audience Play
 * trusts the fit signal and stays near-neutral.
 */
const ARCHETYPE_STAGE_WEIGHT: Record<
  ArchetypeKey,
  Record<FunnelStage, number>
> = {
  head_to_head: { awareness: 1.25, consideration: 1.0, conversion: 0.9 },
  niche_carve_out: { awareness: 0.85, consideration: 1.15, conversion: 1.2 },
  audience_play: { awareness: 1.0, consideration: 1.1, conversion: 1.05 },
};

/** Funnel-emphasis dial: shift weight toward brand (awareness) or conversion. */
const FUNNEL_WEIGHT: Record<FunnelEmphasis, Record<FunnelStage, number>> = {
  brand_led: { awareness: 1.25, consideration: 1.0, conversion: 0.85 },
  conversion_led: { awareness: 0.85, consideration: 1.05, conversion: 1.3 },
};

const STAGE_ORDER: FunnelStage[] = ["awareness", "consideration", "conversion"];

/** How many channels to surface per stage (keep it actionable, not a dump). */
const MAX_CHANNELS_PER_STAGE = 2;

/* ── Helpers ────────────────────────────────────────────────────────────── */

function rawOpportunity(c: ChannelSignal): number {
  const comp = c.competition ?? 0.5;
  return c.fit * (1 - comp);
}

function outletsFor(
  channel: ChannelKey,
  outlets: NamedOutlet[],
  limit = 2,
): NamedOutlet[] {
  return outlets.filter((o) => o.channel === channel).slice(0, limit);
}

function rationaleFor(
  c: ChannelSignal,
  outlets: NamedOutlet[],
  gorilla: GorillaVerdict,
): string {
  const label = CHANNEL_LABELS[c.channel];
  const comp = c.competition;
  const fitPct = Math.round(c.fit * 100);
  const parts: string[] = [];

  if (comp != null && comp <= 0.35) {
    parts.push(`${label}: strong audience fit (${fitPct} index) with few competitors here`);
  } else if (comp != null && comp >= 0.65) {
    const who = gorilla.present && gorilla.name ? ` (${gorilla.name} is active here)` : "";
    parts.push(`${label}: high audience fit (${fitPct} index) but a contested channel${who}`);
  } else {
    parts.push(`${label}: audience fit ${fitPct} index`);
  }

  if (outlets.length > 0) {
    const names = outlets.map((o) => o.name).join(", ");
    parts.push(`run on ${names}`);
  }
  return parts.join(" — ");
}

function planConfidence(inputs: StrategyInputs): Confidence {
  const flags = [
    inputs.available.audience_fit,
    inputs.available.competition,
    inputs.available.outlets,
  ];
  const present = flags.filter(Boolean).length;
  if (present >= 3) return "high";
  if (present === 2) return "moderate";
  return "directional";
}

/* ── The planner ────────────────────────────────────────────────────────── */

export function buildChannelPlan(
  archetype: ArchetypeKey,
  cadence: Cadence,
  funnel: FunnelEmphasis,
  inputs: StrategyInputs,
  gorilla: GorillaVerdict,
): ChannelPlan {
  const stages: Record<FunnelStage, PlannedChannel[]> = {
    awareness: [],
    consideration: [],
    conversion: [],
  };

  // Score every channel, weighted by archetype + funnel dial, then bucket it
  // into its primary stage.
  const scored = inputs.channels.map((c) => {
    const stage = CHANNEL_PRIMARY_STAGE[c.channel];
    const weight =
      ARCHETYPE_STAGE_WEIGHT[archetype][stage] * FUNNEL_WEIGHT[funnel][stage];
    const opp = rawOpportunity(c);
    const outlets = outletsFor(c.channel, inputs.outlets);
    const planned: PlannedChannel = {
      channel: c.channel,
      label: CHANNEL_LABELS[c.channel],
      stage,
      fit: c.fit,
      competition: c.competition,
      opportunity: opp,
      outlets,
      rationale: rationaleFor(c, outlets, gorilla),
    };
    return { planned, weighted: opp * weight };
  });

  // Rank within each stage by the weighted opportunity, cap per stage.
  for (const stage of STAGE_ORDER) {
    const inStage = scored
      .filter((s) => s.planned.stage === stage)
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, MAX_CHANNELS_PER_STAGE)
      .map((s) => s.planned);
    stages[stage] = inStage;
  }

  return {
    archetype,
    cadence,
    funnel,
    stages,
    county_dma_translation: inputs.county_dma,
    confidence: planConfidence(inputs),
  };
}

/* ── Terminal action: the "first 3 moves" ───────────────────────────────── */

/**
 * The council's terminal action: end in concrete, low-risk next steps that
 * live inside the tool — a named outlet, a target, and a question to actually
 * ask. Built deterministically from the plan's top opportunities.
 */
export function buildFirstMoves(plan: ChannelPlan, inputs: StrategyInputs): FirstMove[] {
  const moves: FirstMove[] = [];

  // Flatten the plan in funnel order, take the highest-opportunity channels
  // that carry a named outlet first.
  const ordered: PlannedChannel[] = STAGE_ORDER.flatMap((s) => plan.stages[s]);
  const withOutlet = ordered.filter((c) => c.outlets.length > 0);
  const seed = (withOutlet.length > 0 ? withOutlet : ordered).slice(0, 2);

  for (const ch of seed) {
    const outlet = ch.outlets[0];
    if (outlet) {
      moves.push({
        action: `Contact ${outlet.name} (${ch.label}${outlet.dma_name ? `, ${outlet.dma_name}` : ""})`,
        target: outlet.name,
        outreach_question: `What does a 90-day ${ch.label.toLowerCase()} flight cost on ${outlet.name}, and what audience does the ${outlet.format_genre ?? "daypart"} reach skew to?`,
      });
    } else {
      moves.push({
        action: `Scope ${ch.label} inventory in ${inputs.top_dma_name ?? inputs.state_name}`,
        target: null,
        outreach_question: `Which ${ch.label.toLowerCase()} placements have the lightest competition from PI advertisers right now?`,
      });
    }
  }

  // Always close with a measurement move so the strategy is testable.
  moves.push({
    action: "Stand up call tracking before the first dollar runs",
    target: null,
    outreach_question:
      "Can we put a unique tracking number on each channel so we can see signed-case rate, not just calls?",
  });

  return moves.slice(0, 3);
}

/* ── Assemble the full deterministic plan ───────────────────────────────── */

/**
 * Compose the scored archetype + channel plan + first moves into the full
 * StrategyPlan. `chosen` is the archetype the user selected (must not be
 * locked); cadence/funnel default to the archetype's recommendations.
 */
export function buildStrategyPlan(
  inputs: StrategyInputs,
  chosen: ScoredArchetype,
  gorilla: GorillaVerdict,
  cadence: Cadence = chosen.recommended_cadence,
  funnel: FunnelEmphasis = chosen.recommended_funnel,
): StrategyPlan {
  const channelPlan = buildChannelPlan(chosen.key, cadence, funnel, inputs, gorilla);
  const firstMoves = buildFirstMoves(channelPlan, inputs);

  // Overall confidence is the weaker of the archetype's and the plan's.
  const rank: Record<Confidence, number> = {
    directional: 0,
    moderate: 1,
    high: 2,
  };
  const overall: Confidence =
    rank[chosen.confidence] <= rank[channelPlan.confidence]
      ? chosen.confidence
      : channelPlan.confidence;

  return {
    state_abbr: inputs.state_abbr,
    state_name: inputs.state_name,
    tort_label: inputs.tort_label,
    archetype: chosen,
    gorilla,
    channel_plan: channelPlan,
    first_moves: firstMoves,
    confidence: overall,
  };
}
