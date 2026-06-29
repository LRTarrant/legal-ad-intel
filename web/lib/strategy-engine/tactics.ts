/**
 * Strategy Engine — curated tactic library (deterministic facts).
 *
 * Each tactic decomposes a channel into a funnel-specific buy with a budget
 * floor, foundation prerequisites, and a geo-targeting granularity. This is
 * the menu the Plan 3 AI selects from; it may NOT invent tactics outside it.
 * `channel` maps each tactic onto StrategyInputs.channels so the scorer can
 * read audience fit + competition without a second data source.
 *
 * Min-spend figures are planning floors (the spend below which a tactic can't
 * register), not quotes. OOH/billboards is intentionally omitted from v1 — it
 * has no clean audience-fit signal in media_consumption_baseline (no engine
 * ChannelKey), so including it would mean a fabricated fit. Revisit when an
 * OOH fit signal exists.
 */
import type { ChannelKey } from "./types";
import type { FunnelStage } from "./types";

export type Prerequisite =
  | "landing_page"
  | "conversion_tracking"
  | "call_tracking"
  | "fast_intake"
  | "pixel"
  | "gbp_claimed"
  | "site_health"
  | "brand_creative"
  | "video_creative"
  | "audio_creative"
  | "credible_brand";

/** How precisely a tactic can target the county-level injury hotspots. */
export type GeoGranularity = "geo_precise" | "dma" | "national";

export interface Tactic {
  /** Unique snake_case key. */
  key: string;
  /** Maps to StrategyInputs.channels for fit + competition lookup. */
  channel: ChannelKey;
  label: string;
  funnel_stage: FunnelStage;
  /** Planning floor in monthly USD — below this the tactic can't register. */
  min_monthly_usd: number;
  prerequisites: Prerequisite[];
  geo_granularity: GeoGranularity;
  /** SEO and the like pay off over months, not days. */
  long_horizon?: boolean;
  /** Format/genre options for the media-brief grammar (e.g. radio genres). */
  format_dimensions?: string[];
}

export const TACTIC_LIBRARY: Tactic[] = [
  // ── Intent / Conversion (bottom funnel) ──────────────────────────────────
  {
    key: "google_search",
    channel: "search",
    label: "Google Search (injury keywords)",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["landing_page", "conversion_tracking", "call_tracking"],
    geo_granularity: "geo_precise",
  },
  {
    key: "seo_gbp",
    channel: "search",
    label: "SEO + Google Business Profile",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["gbp_claimed", "site_health"],
    geo_granularity: "geo_precise",
    long_horizon: true,
  },
  {
    key: "meta_lead_form",
    channel: "facebook",
    label: "Meta Lead-Form / Advantage+ conversion",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["fast_intake"],
    geo_granularity: "geo_precise",
  },
  {
    key: "meta_retargeting",
    channel: "facebook",
    label: "Meta retargeting",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["landing_page", "pixel"],
    geo_granularity: "geo_precise",
  },
  // ── Consideration (mid funnel) ───────────────────────────────────────────
  {
    key: "google_pmax",
    channel: "search",
    label: "Google Performance Max",
    funnel_stage: "consideration",
    min_monthly_usd: 2500,
    prerequisites: ["landing_page", "conversion_tracking"],
    geo_granularity: "geo_precise",
  },
  {
    key: "google_demand_gen",
    channel: "youtube",
    label: "Google Demand Gen",
    funnel_stage: "consideration",
    min_monthly_usd: 2500,
    prerequisites: ["landing_page"],
    geo_granularity: "geo_precise",
  },
  {
    key: "podcast",
    channel: "podcast",
    label: "Podcast sponsorships",
    funnel_stage: "consideration",
    min_monthly_usd: 3000,
    prerequisites: ["audio_creative"],
    geo_granularity: "national",
  },
  // ── Awareness (top funnel) ───────────────────────────────────────────────
  {
    key: "meta_awareness",
    channel: "facebook",
    label: "Meta broad awareness video",
    funnel_stage: "awareness",
    min_monthly_usd: 2000,
    prerequisites: ["brand_creative"],
    geo_granularity: "geo_precise",
  },
  {
    key: "tiktok_awareness",
    channel: "tiktok",
    label: "TikTok awareness (younger torts)",
    funnel_stage: "awareness",
    min_monthly_usd: 2500,
    prerequisites: ["brand_creative", "video_creative"],
    geo_granularity: "dma",
  },
  {
    key: "youtube_ads",
    channel: "youtube",
    label: "YouTube in-stream / bumper",
    funnel_stage: "awareness",
    min_monthly_usd: 3000,
    prerequisites: ["video_creative"],
    geo_granularity: "geo_precise",
  },
  {
    key: "ctv_ott",
    channel: "ctv",
    label: "CTV / OTT",
    funnel_stage: "awareness",
    min_monthly_usd: 5000,
    prerequisites: ["video_creative", "credible_brand"],
    geo_granularity: "dma",
  },
  {
    key: "radio",
    channel: "radio",
    label: "Broadcast radio",
    funnel_stage: "awareness",
    min_monthly_usd: 5000,
    prerequisites: ["audio_creative"],
    geo_granularity: "dma",
    format_dimensions: ["news_talk", "country", "urban", "spanish", "sports", "classic_hits"],
  },
  {
    key: "linear_tv",
    channel: "tv_linear",
    label: "Linear broadcast TV",
    funnel_stage: "awareness",
    min_monthly_usd: 15000,
    prerequisites: ["video_creative", "credible_brand"],
    geo_granularity: "dma",
  },
];

/**
 * The interview's primary objective. Maps the user's goal onto a funnel
 * emphasis: leads-shaped goals pull weight to conversion, brand-shaped goals
 * pull it to awareness. The AI (Plan 3) uses these weights as the "match the
 * goal with the tactic" rule.
 */
export type GoalKind = "max_volume" | "lower_cpa" | "new_tort" | "brand" | "defend";

const FUNNEL_WEIGHTS: Record<GoalKind, Record<FunnelStage, number>> = {
  max_volume: { awareness: 0.2, consideration: 0.35, conversion: 1 },
  lower_cpa: { awareness: 0.15, consideration: 0.3, conversion: 1 },
  new_tort: { awareness: 1, consideration: 0.7, conversion: 0.4 },
  brand: { awareness: 1, consideration: 0.6, conversion: 0.3 },
  defend: { awareness: 0.5, consideration: 1, conversion: 0.8 },
};

export function funnelWeights(goal: GoalKind): Record<FunnelStage, number> {
  return FUNNEL_WEIGHTS[goal];
}

/**
 * Best-effort classifier for the interview's free-text / controlled goal.
 * Plan 4 may pass a controlled GoalKind directly; until then this keyword map
 * keeps the engine working off the existing free-text `goal`. Defaults to
 * max_volume (the most common PI objective) when nothing matches.
 */
export function classifyGoal(goal: string): GoalKind {
  const g = goal.toLowerCase();
  if (/(cost per|cpa|cpl|cheaper|efficien)/.test(g)) return "lower_cpa";
  if (/(new tort|enter|expand into|launch)/.test(g)) return "new_tort";
  if (/(brand|awareness|recogni|top of mind)/.test(g)) return "brand";
  if (/(defend|protect|hold|incumbent|share)/.test(g)) return "defend";
  if (/(volume|more cases|max|scale|grow)/.test(g)) return "max_volume";
  return "max_volume";
}

/**
 * Budget honesty. The plan must be realistic about what a budget can fund:
 * an affordability filter (don't pitch a tactic below its floor) and a
 * concentration rule (at low budgets, do 1-2 tactics well rather than five
 * badly). Code owns these numbers; the AI narrates honestly within them.
 */

/** Representative planning monthly USD for a controlled budget tier. */
const BUDGET_TIER_USD: Record<string, number> = {
  // Plan 4 tiers
  under_10k: 7000,
  "10k_25k": 17000,
  "25k_75k": 50000,
  "75k_plus": 100000,
  // legacy interview tiers (kept until Plan 4 swaps the field)
  under_25k: 17000,
  "25k_plus": 50000,
};

export function budgetTierToMonthlyUsd(tier: string): number {
  return BUDGET_TIER_USD[tier] ?? 7000; // safe default, never 0
}

export function isAffordable(tactic: Tactic, monthlyUsd: number): boolean {
  return tactic.min_monthly_usd <= monthlyUsd;
}

/**
 * How many tactics a budget can realistically support. Roughly one more tactic
 * per ~$6k above the entry floor, clamped to [1,6]. A $2k budget → 1 tactic;
 * ~$8k → 2; large budgets cap at 6 (beyond that, depth beats breadth).
 */
export function recommendedTacticCount(monthlyUsd: number): number {
  const n = 1 + Math.floor((monthlyUsd - 1500) / 6000);
  return Math.max(1, Math.min(6, n));
}
