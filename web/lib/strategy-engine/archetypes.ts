/**
 * Strategy Engine — the deterministic archetype scorer.
 *
 * This is the core the council insisted on: a rules-and-data layer that
 * SELECTS and JUSTIFIES strategies. The AI never picks an archetype; it only
 * writes prose around what this module decides. Everything here is pure and
 * unit-tested (archetypes.test.ts).
 *
 * Three archetypes, scored 0..100 from the market data:
 *   - Head-to-Head   — meet the leaders head-on. LOCKED OUT by the Gorilla Rule.
 *   - Niche Carve-Out — differentiate when the market is crowded/dominated.
 *   - Audience Play   — concentrate where audience over-indexes + competitors thin.
 *
 * The "why this fits" / "why NOT the alternatives" copy is generated HERE,
 * from real numbers, because the council named that the single highest-leverage
 * trust element — and trust copy must trace to data, not to a language model.
 */

import type {
  AdvertiserShare,
  ChannelSignal,
  Confidence,
  GorillaVerdict,
  ScoredArchetype,
  StrategyInputs,
} from "./types";

/* ── Gorilla Rule thresholds (exported so tests pin them) ───────────────── */

/** A single advertiser holding ≥35% of observed activity is a "gorilla". */
export const GORILLA_SHARE_THRESHOLD = 0.35;
/** …or one holding ≥2.5× the #2 advertiser's share. */
export const GORILLA_MULTIPLE_THRESHOLD = 2.5;

/**
 * Detect a dominant incumbent (the Morgan & Morgan case). Operates on observed
 * share of activity, which is relative — never an absolute reach figure.
 */
export function detectGorilla(top: AdvertiserShare[]): GorillaVerdict {
  if (!top || top.length === 0) {
    return { present: false, name: null, share: null, reason: null };
  }
  const sorted = [...top].sort((a, b) => b.share - a.share);
  const leader = sorted[0];
  const second = sorted[1];

  const byShare = leader.share >= GORILLA_SHARE_THRESHOLD;
  const byMultiple =
    second != null &&
    second.share > 0 &&
    leader.share / second.share >= GORILLA_MULTIPLE_THRESHOLD;

  if (!byShare && !byMultiple) {
    return { present: false, name: null, share: null, reason: null };
  }

  const pct = Math.round(leader.share * 100);
  const reason = byShare
    ? `${leader.name} holds an estimated ${pct}% of observed advertising activity here.`
    : `${leader.name} runs an estimated ${(leader.share / second.share).toFixed(1)}× the activity of the next advertiser.`;

  return { present: true, name: leader.name, share: leader.share, reason };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Best whitespace-weighted opportunity across channels: max(fit*(1-comp)). */
function bestChannelOpportunity(channels: ChannelSignal[]): number {
  let best = 0;
  for (const c of channels) {
    const comp = c.competition ?? 0.5;
    const opp = c.fit * (1 - comp);
    if (opp > best) best = opp;
  }
  return best;
}

/** How many of the audience-fit channels clear a "strong fit" bar. */
function strongFitCount(channels: ChannelSignal[], bar = 0.6): number {
  return channels.filter((c) => c.fit >= bar).length;
}

/**
 * Confidence tier from how much signal actually drove a given archetype.
 * `drivers` is the list of availability flags this archetype leans on.
 */
function confidenceFrom(drivers: boolean[]): Confidence {
  const present = drivers.filter(Boolean).length;
  const ratio = drivers.length === 0 ? 0 : present / drivers.length;
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.5) return "moderate";
  return "directional";
}

/* ── The scorer ─────────────────────────────────────────────────────────── */

/**
 * Score all three archetypes against the inputs. Returns them sorted by score
 * descending, with locked-out archetypes sinking to the bottom but still
 * present (the card renders disabled, with the reason visible — never hidden).
 */
export function scoreArchetypes(inputs: StrategyInputs): ScoredArchetype[] {
  const gorilla = detectGorilla(inputs.top_advertisers);
  const sat = inputs.saturation; // 0..1 or null
  const satKnown = sat != null;
  const satVal = sat ?? 0.5;
  const bestOpp = bestChannelOpportunity(inputs.channels);
  const strongFits = strongFitCount(inputs.channels);

  /* Head-to-Head ------------------------------------------------------------
   * Wins in an open market: no dominant incumbent, room to buy share of voice.
   * Hard-locked when a gorilla is present (the council's "Gorilla Rule"). */
  const h2hBase = 40 + (1 - satVal) * 45; // lower saturation → more room
  const headToHead: ScoredArchetype = {
    key: "head_to_head",
    score: clamp(Math.round(gorilla.present ? 8 : h2hBase)),
    locked_out: gorilla.present,
    lock_reason: gorilla.present
      ? `Locked: ${gorilla.reason} Matching that spend head-on is a losing budget fight.`
      : null,
    why_this_fits: gorilla.present
      ? "Not recommended while a single advertiser dominates this market."
      : `No single advertiser dominates${satKnown ? ` and the market is ${satVal < 0.4 ? "still open" : "only moderately crowded"}` : ""} — there's room to buy share of voice against the field.`,
    why_not_alternatives:
      "Niche and Audience plays cede the broad market; Head-to-Head is only worth it when you can actually win share of voice.",
    recommended_cadence: "always_on",
    recommended_funnel: "brand_led",
    confidence: confidenceFrom([
      inputs.available.saturation,
      inputs.top_advertisers.length > 0,
    ]),
  };

  /* Niche Carve-Out ---------------------------------------------------------
   * Wins when the market is crowded OR dominated: differentiate instead of
   * outspend. Boosted by a gorilla and by a concentrated local signal. */
  const localConcentration =
    inputs.local_signal && inputs.local_signal.top_counties.length > 0 ? 1 : 0;
  const nicheBase =
    35 +
    satVal * 35 + // more saturation → more reason to carve a niche
    (gorilla.present ? 22 : 0) +
    localConcentration * 8;
  const niche: ScoredArchetype = {
    key: "niche_carve_out",
    score: clamp(Math.round(nicheBase)),
    locked_out: false,
    lock_reason: null,
    why_this_fits: gorilla.present
      ? `${gorilla.name} owns the broad market — a defensible case-type or county niche wins cases without fighting their budget.`
      : satKnown && satVal >= 0.5
        ? "The market is crowded; a focused case-type or geographic niche is more efficient than competing across the board."
        : "A focused niche concentrates a modest budget where it converts instead of spreading it thin.",
    why_not_alternatives: gorilla.present
      ? "Head-to-Head is off the table against the incumbent; Audience Play helps but a niche gives you a story to own, not just efficient reach."
      : "Head-to-Head burns budget on share of voice; Audience Play optimizes channels but doesn't give you a defensible position.",
    recommended_cadence: gorilla.present ? "always_on" : "surge",
    recommended_funnel: "conversion_led",
    confidence: confidenceFrom([
      inputs.available.saturation,
      inputs.available.local_signal,
      inputs.top_advertisers.length > 0,
    ]),
  };

  /* Audience Play -----------------------------------------------------------
   * Wins when there's clear audience-channel fit and channel-level whitespace:
   * concentrate where the target over-indexes and competitors are thin. */
  const audienceBase =
    30 +
    bestOpp * 55 + // strong fit × low competition
    Math.min(strongFits, 3) * 5;
  const audience: ScoredArchetype = {
    key: "audience_play",
    score: clamp(Math.round(audienceBase)),
    locked_out: false,
    lock_reason: null,
    why_this_fits:
      inputs.available.audience_fit && bestOpp > 0.3
        ? "Clear channel whitespace: the target audience over-indexes on channels competitors are under-using."
        : "Aligns spend to where the audience actually is, even before competitive data fills in.",
    why_not_alternatives:
      "Head-to-Head ignores where your audience over-indexes; Niche gives you a position but Audience Play makes every channel dollar more efficient first.",
    recommended_cadence: "surge",
    recommended_funnel: "conversion_led",
    confidence: confidenceFrom([
      inputs.available.audience_fit,
      inputs.available.competition,
      inputs.available.outlets,
    ]),
  };

  return [headToHead, niche, audience].sort((a, b) => {
    // Locked-out archetypes always sink below playable ones.
    if (a.locked_out !== b.locked_out) return a.locked_out ? 1 : -1;
    return b.score - a.score;
  });
}

/** The top playable (non-locked) archetype, or null if somehow all locked. */
export function topPlayable(scored: ScoredArchetype[]): ScoredArchetype | null {
  return scored.find((a) => !a.locked_out) ?? null;
}
