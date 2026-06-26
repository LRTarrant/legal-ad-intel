/**
 * Strategy Engine — shared domain types.
 *
 * This module is PURE: no Next, no Supabase, no React. The deterministic
 * rules core (archetypes.ts, channel-plan.ts) consumes `StrategyInputs` and
 * emits a fully-formed plan; the AI layer only writes prose around it.
 *
 * Design contract (from the 2026-06-25 model council + DESIGN.md):
 *   - The engine SELECTS and SCORES strategies from data; AI is the writer.
 *   - Every recommendation traces to a data point.
 *   - NEVER output absolute reach / impressions / audience-size numbers.
 *     Shares (0..1), competition indices (0..1), and rates (per-100k) are
 *     relative/directional and allowed; raw audience counts are not.
 *
 * State-parameterized on purpose (Alabama-first, portable later): nothing
 * here hardcodes a state.
 */

/* ── Enumerations ───────────────────────────────────────────────────────── */

/** The three strategy archetypes (cadence/funnel are dials inside each). */
export type ArchetypeKey = "head_to_head" | "niche_carve_out" | "audience_play";

/** Cadence dial. */
export type Cadence = "always_on" | "surge";

/** Funnel-emphasis dial. */
export type FunnelEmphasis = "brand_led" | "conversion_led";

/** Output voice (changes prose only, never the deterministic plan). */
export type Voice = "firm" | "agency" | "seller";

/**
 * Confidence tier — the ONLY magnitude language the engine emits. Driven by
 * how much of the underlying signal was actually populated, never by a
 * fabricated precision number.
 */
export type Confidence = "high" | "moderate" | "directional";

/** Funnel stage a channel is sequenced into. */
export type FunnelStage = "awareness" | "consideration" | "conversion";

/**
 * Canonical channel keys. These line up 1:1 with the `*_index` columns on
 * `media_profiles`, so the assembler maps without a lookup table.
 */
export type ChannelKey =
  | "tv_linear"
  | "ctv"
  | "radio"
  | "podcast"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "search"
  | "print";

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  tv_linear: "Local broadcast TV",
  ctv: "Connected TV / streaming",
  radio: "Radio",
  podcast: "Podcast",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  search: "Paid search",
  print: "Print",
};

export const ARCHETYPE_LABELS: Record<ArchetypeKey, string> = {
  head_to_head: "Head-to-Head",
  niche_carve_out: "Niche Carve-Out",
  audience_play: "Audience Play",
};

/** One-line definitions surfaced on the archetype cards. */
export const ARCHETYPE_DEFINITIONS: Record<ArchetypeKey, string> = {
  head_to_head:
    "Meet the market leaders on their own channels and outspend for share of voice.",
  niche_carve_out:
    "Sidestep the spend war by owning a defensible case-type or geographic niche.",
  audience_play:
    "Concentrate budget where your target audience over-indexes and competitors are thin.",
};

/* ── Inputs (produced by assemble-inputs.ts) ────────────────────────────── */

/** A competing advertiser's observed share of activity in the market. */
export interface AdvertiserShare {
  name: string;
  /** Share of observed spend/activity in [0,1]. Relative, not a reach count. */
  share: number;
  /** Activity rank, 1 = largest. */
  rank: number;
}

/** Per-channel audience-fit + competitive-density signal. */
export interface ChannelSignal {
  channel: ChannelKey;
  /** Audience fit normalized to [0,1] (media_consumption_baseline, or the
   *  legacy media_profiles indices as a fallback). */
  fit: number;
  /** Competitive density in [0,1] (channel_competition_scores). null = unknown. */
  competition: number | null;
  /**
   * Basis of the fit score, for honest narration (the AI says "news-consumption
   * proxy" when only a news row backs the channel). Omitted on the legacy
   * media_profiles path. See audience-fit.ts.
   */
  fit_scope?: "general" | "news_proxy";
  /** Attribution sources behind the fit (e.g. Pew, Nielsen). */
  fit_sources?: string[];
}

/** A named local outlet the plan can recommend by name. */
export interface NamedOutlet {
  /** Call sign or outlet name, e.g. "WVNN" or "102.5 The Bull". */
  name: string;
  channel: ChannelKey;
  /** e.g. "news_talk", "sports", "country". Optional. */
  format_genre?: string;
  /** DMA this outlet sits in. */
  dma_name?: string;
  /** Network affiliation if broadcast, e.g. "ABC". */
  network?: string;
}

/** County → DMA translation row (the geographic abstraction, shown as a feature). */
export interface CountyDmaLink {
  county_name: string;
  dma_name: string;
  /** Nielsen DMA rank, lower = bigger. null if unknown. */
  dma_rank: number | null;
}

/** The proprietary local signal (FARS), expressed as rates only — no reach. */
export interface LocalSignal {
  source: "FARS";
  top_counties: Array<{
    county_name: string;
    /** Fatalities per 100k population — a rate, directional, not a reach. */
    deaths_per_100k: number | null;
    /** Share of fatalities that were rural, [0,1]. */
    rural_pct: number | null;
  }>;
}

/** Which signal blocks were actually populated (drives confidence + honesty). */
export interface InputAvailability {
  saturation: boolean;
  competition: boolean;
  audience_fit: boolean;
  outlets: boolean;
  local_signal: boolean;
}

/**
 * Everything the deterministic core needs. The assembler builds this from
 * Supabase; the same shape is re-built server-side in the generate route
 * (never trusted from the client).
 */
export interface StrategyInputs {
  state_abbr: string;
  state_name: string;
  /** Tort slug the market data is keyed on, e.g. "car_accident". */
  tort_slug: string;
  tort_label: string;
  /** Market saturation in [0,1] (ad_saturation_scores). null = unknown. */
  saturation: number | null;
  /** Distinct advertiser count — a competitive-density figure, not a reach. */
  total_advertisers: number | null;
  top_advertisers: AdvertiserShare[];
  channels: ChannelSignal[];
  outlets: NamedOutlet[];
  county_dma: CountyDmaLink[];
  /** Primary DMA used as the market key for channel tables. */
  top_dma_name: string | null;
  local_signal: LocalSignal | null;
  available: InputAvailability;
}

/* ── Scored output (produced by archetypes.ts) ──────────────────────────── */

export interface GorillaVerdict {
  present: boolean;
  /** The dominant advertiser, if any. */
  name: string | null;
  /** Their estimated share of observed activity, [0,1]. */
  share: number | null;
  /** Human-readable reason, used in card copy. null when not present. */
  reason: string | null;
}

export interface ScoredArchetype {
  key: ArchetypeKey;
  /** 0..100 fit score (drives the card's top-rule color via scoreColor). */
  score: number;
  /** Locked out by a hard rule (e.g. the Gorilla Rule). Renders disabled. */
  locked_out: boolean;
  /** Reason for the lock, shown on the disabled card. null when not locked. */
  lock_reason: string | null;
  /** Data-traced "why this fits" line (deterministic, not LLM-written). */
  why_this_fits: string;
  /** Data-traced "why not the alternatives" line (the top trust element). */
  why_not_alternatives: string;
  recommended_cadence: Cadence;
  recommended_funnel: FunnelEmphasis;
  confidence: Confidence;
}

/* ── Channel plan (produced by channel-plan.ts) ─────────────────────────── */

export interface PlannedChannel {
  channel: ChannelKey;
  label: string;
  stage: FunnelStage;
  fit: number;
  competition: number | null;
  /** fit * (1 - competition) — the whitespace-weighted opportunity, [0,1]. */
  opportunity: number;
  /** Named outlets to act on for this channel (may be empty). */
  outlets: NamedOutlet[];
  /** Data-traced rationale (deterministic). */
  rationale: string;
  /** Fit basis carried through for the AI digest. See ChannelSignal. */
  fit_scope?: "general" | "news_proxy";
  /** Attribution sources behind the fit (e.g. Pew, Nielsen). */
  fit_sources?: string[];
}

export interface ChannelPlan {
  archetype: ArchetypeKey;
  cadence: Cadence;
  funnel: FunnelEmphasis;
  /** Channels grouped by funnel stage, each ranked by opportunity. */
  stages: Record<FunnelStage, PlannedChannel[]>;
  /** The county → DMA translation, surfaced as a feature. */
  county_dma_translation: CountyDmaLink[];
  confidence: Confidence;
}

/** One concrete next action — the terminal "first 3 moves". */
export interface FirstMove {
  /** Imperative action, e.g. "Call the WVNN sales desk". */
  action: string;
  /** The named outlet / target, if any. */
  target: string | null;
  /** A draft outreach question the user can actually ask. */
  outreach_question: string;
}

/**
 * The full deterministic result (everything except the AI prose). The
 * generate route attaches `prose` of this shape's sibling type.
 */
export interface StrategyPlan {
  state_abbr: string;
  state_name: string;
  tort_label: string;
  archetype: ScoredArchetype;
  gorilla: GorillaVerdict;
  channel_plan: ChannelPlan;
  first_moves: FirstMove[];
  confidence: Confidence;
}

/** The AI-written prose layer (validated JSON from the generate route). */
export interface StrategyProse {
  /** 2-3 sentence market read, opens with the sharpest signal. */
  market_read: string;
  /** Why this archetype, in the chosen voice. */
  approach_rationale: string;
  /** One paragraph framing the channel sequence. */
  channel_narrative: string;
  /** Optional caveat (e.g. thin data on a block). */
  notes?: string;
}

/** What the generate route returns to the client. */
export interface GeneratedStrategy {
  plan: StrategyPlan;
  prose: StrategyProse;
  voice: Voice;
  cost_cents: number | null;
}
