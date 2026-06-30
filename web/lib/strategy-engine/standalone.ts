/**
 * Strategy Engine — standalone v1 contract types + pure composition helpers.
 *
 * The standalone `/strategy` surface (interview → deck) returns the `Strategy`
 * object the data contract specifies. This module holds:
 *   - the interview REQUEST shape + validation,
 *   - the `Strategy` RESPONSE shape (what the deck renders),
 *   - pure helpers (case-type → tort, lead crash metric, integrated plan,
 *     Campaign Builder handoff) and the final `composeStrategy` assembler.
 *
 * PURE — no Supabase / React / Next. The route fetches the layer data and runs
 * the deterministic core, then calls `composeStrategy`. Unit-tested in
 * standalone.test.ts.
 */

import { CHANNEL_LABELS } from "./types";
import type { ChannelKey, ChannelPlan, Confidence, StrategyProse, Voice } from "./types";
import type { Prerequisite } from "./tactics";
import type {
  LeadMetric,
  MeasuredChannel,
  OpportunityCounty,
  Recommendation,
  WatchItem,
} from "./recommendations";
import type {
  EconomicsCaseType,
  EconomicsResult,
  MarketTier,
  PiEconomicsBenchmark,
} from "./economics";

/* ── Interview request ──────────────────────────────────────────────────── */

/** PI economics block on the strategy payload. The deck recomputes the funnel
 *  client-side from `benchmark` + `monthly_spend.mid` as the user moves the
 *  intake levers; `default_result` is the server-computed initial state (also
 *  what a non-interactive/export consumer reads). Null when the case type has
 *  no PI ad-economics coverage. */
export interface StrategyEconomics {
  case_type: EconomicsCaseType;
  market_tier: MarketTier;
  monthly_spend: { min: number; max: number; mid: number };
  benchmark: PiEconomicsBenchmark;
  default_result: EconomicsResult;
}

export type ReadinessAnswer = "yes" | "no" | "unsure";

export interface StrategyInterviewRequest {
  /** Reader framing — maps to the engine Voice. */
  audience: Voice; // firm | agency | seller
  /** Interview case types (controlled vocab below); first = primary. */
  case_types: string[];
  /** 2-letter uppercase state. */
  state: string;
  /** Target Nielsen DMA (optional — narrows paid-search white space). */
  dma_code?: string | null;
  /** Selected county FIPS (5-digit fips_full); null = whole state. */
  county_fips?: string[] | null;
  budget_tier: string; // e.g. "under_25k" | "25k_75k" | "75k_plus"
  goal: string; // free-text or a controlled goal
  existing_channels: string[]; // channels the firm already runs
  /** Intake capacity: "steady" | "scale" | "high". */
  intake_capacity: string;
  /** Free-text: what winning looks like in 90 days + anything off-limits. */
  goal_context: string;
  /** Optional free-text: what's currently working / not working. */
  current_advertising_notes?: string;
  /** Foundation-readiness answers, keyed by READINESS_QUESTIONS[].key. */
  readiness?: Record<string, ReadinessAnswer>;
}

/** Interview case type → the tort/serp slug the data layers key on. */
export const CASE_TYPE_TO_TORT: Record<string, string> = {
  trucking: "truck_accident",
  truck_accident: "truck_accident",
  auto: "motor_vehicle",
  car_accident: "motor_vehicle",
  motor_vehicle: "motor_vehicle",
  motorcycle: "motorcycle",
  motorcycle_accident: "motorcycle",
  nursing_home: "nursing_home",
  workers_comp: "workers_comp",
  boating: "boating",
};

const AUDIENCES = new Set<Voice>(["firm", "agency", "seller"]);

export function validateInterview(body: StrategyInterviewRequest): string[] {
  const errors: string[] = [];
  if (!body.state || !/^[A-Z]{2}$/.test(body.state)) {
    errors.push("state is required (2-letter uppercase state code)");
  }
  if (!body.audience || !AUDIENCES.has(body.audience)) {
    errors.push("audience must be one of firm, agency, seller");
  }
  if (!Array.isArray(body.case_types) || body.case_types.length === 0) {
    errors.push("at least one case type is required");
  }
  if (!body.intake_capacity || body.intake_capacity.trim() === "") {
    errors.push("intake capacity is required");
  }
  if (!body.goal_context || body.goal_context.trim() === "") {
    errors.push("a note on what winning looks like is required");
  }
  return errors;
}

/**
 * The foundation-readiness questions. Each maps to one or more Plan 3
 * Prerequisites; a "yes" marks them satisfied, a "no" marks them missing, and
 * "unsure" leaves them to surface as a "confirm" in the readiness gate.
 */
export const READINESS_QUESTIONS: ReadonlyArray<{
  key: string;
  label: string;
  prerequisites: Prerequisite[];
}> = [
  { key: "landing_pages", label: "Dedicated landing pages for paid traffic?", prerequisites: ["landing_page"] },
  { key: "tracking", label: "Call + conversion tracking in place?", prerequisites: ["conversion_tracking", "call_tracking", "pixel"] },
  { key: "intake", label: "Does intake call leads back within minutes?", prerequisites: ["fast_intake"] },
  { key: "web_presence", label: "A site + claimed Google Business Profile to send traffic to?", prerequisites: ["site_health", "gbp_claimed", "credible_brand"] },
];

export function readinessToFoundation(
  readiness: Record<string, ReadinessAnswer> | undefined,
): Partial<Record<Prerequisite, boolean>> {
  const out: Partial<Record<Prerequisite, boolean>> = {};
  if (!readiness) return out;
  for (const q of READINESS_QUESTIONS) {
    const ans = readiness[q.key];
    if (ans === "yes") for (const p of q.prerequisites) out[p] = true;
    else if (ans === "no") for (const p of q.prerequisites) out[p] = false;
    // "unsure" or missing → leave undefined (the gate shows "confirm")
  }
  return out;
}

const INTAKE_LABEL: Record<string, string> = {
  steady: "needs a steady, manageable flow of leads",
  scale: "can scale up intake to handle a volume increase",
  high: "has high intake capacity and wants maximum volume",
};

export function buildGoalText(
  body: Pick<StrategyInterviewRequest, "goal" | "goal_context" | "intake_capacity" | "current_advertising_notes">,
): string {
  const parts = [`Primary objective: ${body.goal}.`];
  if (body.goal_context?.trim()) parts.push(`What winning looks like / constraints: ${body.goal_context.trim()}`);
  const intake = INTAKE_LABEL[body.intake_capacity];
  if (intake) parts.push(`Intake: the firm ${intake}.`);
  if (body.current_advertising_notes?.trim()) parts.push(`Currently running: ${body.current_advertising_notes.trim()}`);
  return parts.join(" ");
}

/** Primary tort slug for the data layers (first recognized case type). */
export function primaryTort(caseTypes: string[]): { slug: string; label: string } {
  for (const ct of caseTypes) {
    const slug = CASE_TYPE_TO_TORT[ct];
    if (slug) return { slug, label: prettyTort(slug) };
  }
  return { slug: "personal_injury", label: "Personal Injury" };
}

function prettyTort(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Which crash metric leads the opportunity, from the case types. */
export function leadMetricFor(caseTypes: string[]): LeadMetric {
  const set = new Set(caseTypes.map((c) => CASE_TYPE_TO_TORT[c] ?? c));
  if (set.has("truck_accident")) return "truck";
  if (set.has("motorcycle")) return "motorcycle";
  return "total";
}

/* ── Strategy response (what the deck renders) ──────────────────────────── */

export interface StrategyBrand {
  company_name: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

export interface CompetitiveChannel {
  channel: ChannelKey | "seo";
  label: string;
  active_firms: number;
  status: "open" | "contested" | "defended";
  /** false = inferred from absence of measured competition (modeled). */
  measured: boolean;
}

/** One real competitor creative for the "Inside their ads" slide
 *  (strategy_market_creatives): roster-scoped YouTube + market paid search. */
export interface MarketCreative {
  channel: "youtube" | "paid_search";
  format_label: string;
  advertiser: string | null;
  advertiser_domain: string | null;
  headline: string | null;
  body: string | null;
  image_url: string | null;
  link: string | null;
}

export interface IntegratedAllocation {
  channel: ChannelKey;
  label: string;
  stage: "awareness" | "consideration" | "conversion";
  /** Whole-percent share of the paid-media budget. */
  pct: number;
}

export interface ReadinessItem {
  /** Human-readable foundation item, e.g. "Dedicated landing pages for paid traffic". */
  label: string;
  /** "missing" = the firm said they don't have it; "confirm" = unverified. */
  status: "missing" | "confirm";
  /** Tactic labels that depend on this foundation. */
  tactics: string[];
}

export interface Strategy {
  brand: StrategyBrand;
  audience: Voice;
  market: { state: string; label: string; dma_code: string | null };
  case_types: string[];
  budget_tier: string;
  goal: string;
  opportunity: {
    counties: OpportunityCounty[];
    fars_year_min: number | null;
    fars_year_max: number | null;
    lead_metric: LeadMetric;
  };
  competitive: {
    advertisers: Array<{ name: string; share: number; rank: number }>;
    channels: CompetitiveChannel[];
    creative: MarketCreative[];
  };
  recommendations: Recommendation[];
  watch_list: WatchItem[];
  /** Foundation gaps for the selected tactics — the "before you spend a dollar" gate. */
  readiness: ReadinessItem[];
  integrated_plan: {
    allocation: IntegratedAllocation[];
    cadence: string;
    funnel_emphasis: string;
  };
  handoff: { case_type: string; dmas: string[]; channels: ChannelKey[] };
  prose: StrategyProse;
  confidence: Confidence;
  data_warnings: string[];
  cost_cents: number | null;
  /** PI ad-economics (budget → signed cases). Null when the case type has no coverage. */
  economics: StrategyEconomics | null;
}

/* ── Pure builders ──────────────────────────────────────────────────────── */

/** Default budget split per funnel stage, nudged by the plan's emphasis. */
const STAGE_SPLIT: Record<string, Record<"awareness" | "consideration" | "conversion", number>> = {
  brand_led: { awareness: 0.5, consideration: 0.3, conversion: 0.2 },
  conversion_led: { awareness: 0.25, consideration: 0.3, conversion: 0.45 },
};

/**
 * Distribute the (qualitative) paid-media budget across the recommended
 * channels: each stage gets a base share, split within the stage by each
 * channel's whitespace-weighted opportunity. Integers, summing to ~100.
 */
export function buildIntegratedPlan(plan: ChannelPlan): IntegratedAllocation[] {
  const split = STAGE_SPLIT[plan.funnel] ?? STAGE_SPLIT.brand_led;
  const stages = ["awareness", "consideration", "conversion"] as const;
  const raw: Array<IntegratedAllocation & { weight: number }> = [];

  for (const stage of stages) {
    const channels = plan.stages[stage];
    if (channels.length === 0) continue;
    const oppSum = channels.reduce((s, c) => s + Math.max(c.opportunity, 0.0001), 0);
    for (const c of channels) {
      const within = Math.max(c.opportunity, 0.0001) / oppSum;
      raw.push({
        channel: c.channel,
        label: CHANNEL_LABELS[c.channel],
        stage,
        pct: 0,
        weight: split[stage] * within,
      });
    }
  }

  const total = raw.reduce((s, r) => s + r.weight, 0) || 1;
  let allocated = 0;
  const out = raw.map((r, i) => {
    const pct = i === raw.length - 1 ? 100 - allocated : Math.round((r.weight / total) * 100);
    allocated += pct;
    return { channel: r.channel, label: r.label, stage: r.stage, pct };
  });
  return out;
}

/** Pre-load params for the Campaign Builder handoff. */
export function buildHandoff(
  tortSlug: string,
  dmaCode: string | null,
  recommendations: Recommendation[],
  stateDmas: string[],
): { case_type: string; dmas: string[]; channels: ChannelKey[] } {
  const dmas = dmaCode ? [dmaCode] : stateDmas;
  const channels = Array.from(new Set(recommendations.map((r) => r.channel)));
  return { case_type: tortSlug, dmas, channels };
}

/** Merge the measured channels with the recommendation channels' white space
 *  into the competitive "where the white space is" list. */
export function buildCompetitiveChannels(
  measured: MeasuredChannel[],
  recommendations: Recommendation[],
): CompetitiveChannel[] {
  const out: CompetitiveChannel[] = measured.map((m) => ({
    channel: m.channel,
    label: CHANNEL_LABELS[m.channel],
    active_firms: m.active_firms,
    status: m.status,
    measured: true,
  }));
  const seen = new Set(measured.map((m) => m.channel));
  for (const r of recommendations) {
    if (seen.has(r.channel)) continue;
    seen.add(r.channel);
    out.push({
      channel: r.channel,
      label: CHANNEL_LABELS[r.channel],
      active_firms: 0,
      status: "open",
      measured: false,
    });
  }
  return out;
}
