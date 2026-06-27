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
import type {
  LeadMetric,
  MeasuredChannel,
  OpportunityCounty,
  Recommendation,
  WatchItem,
} from "./recommendations";

/* ── Interview request ──────────────────────────────────────────────────── */

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
  return errors;
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

export interface IntegratedAllocation {
  channel: ChannelKey;
  label: string;
  stage: "awareness" | "consideration" | "conversion";
  /** Whole-percent share of the paid-media budget. */
  pct: number;
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
    creative: unknown[]; // wired in PR 3b (existing in-app creative capture)
  };
  recommendations: Recommendation[];
  watch_list: WatchItem[];
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
