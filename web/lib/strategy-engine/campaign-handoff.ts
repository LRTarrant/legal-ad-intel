/**
 * Strategy Engine → Campaign Builder handoff contract.
 *
 * Single source of truth for the URL the "Continue in Campaign Builder" link
 * carries. PHASE 1 is an additive widening of the existing URL-param handoff —
 * no draft record, no persisted object. Keep this the only place that knows the
 * param vocabulary so the Strategy side and (later) any other caller stay in
 * sync.
 *
 * What it owns:
 *   - budgetTierToRange()    — the budget translator (tier string → numeric range)
 *   - audienceToBuyerType()  — Strategy audience → Campaign Builder buyer_type map
 *   - buildCampaignBuilderHandoff() — assembles the widened URL, or flags a case
 *     type the PI campaign flow can't yet serve (nursing_home, workers_comp).
 */

/** Strategy tort slug → Campaign Builder pi_category enum (different vocab).
 *  Unmapped slugs (nursing_home, workers_comp) have no builder category. */
export const TORT_TO_PI_CATEGORY: Record<string, string> = {
  truck_accident: "truck_accident",
  motor_vehicle: "car_accident",
  motorcycle: "motorcycle_accident",
  boating: "boating_accident",
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/* ── Budget translator ─────────────────────────────────────────────────────
 * One function maps a Strategy budget_tier string → { tier, min, max, midpoint }.
 * Tiers match the intake's BUDGET_TIERS in strategy-client.tsx. Bounded tiers
 * use the arithmetic midpoint; the two open-ended tiers (under_10k, 75k_plus)
 * use a sensible representative range. Legacy aliases that tactics.ts still
 * accepts are covered too so a stale tier never silently drops the budget. */

export interface BudgetRange {
  tier: string;
  min: number;
  max: number;
  midpoint: number;
}

const BUDGET_RANGES: Record<string, Omit<BudgetRange, "tier">> = {
  under_10k: { min: 5000, max: 10000, midpoint: 7500 },
  "10k_25k": { min: 10000, max: 25000, midpoint: 17500 },
  "25k_75k": { min: 25000, max: 75000, midpoint: 50000 },
  "75k_plus": { min: 75000, max: 150000, midpoint: 112500 },
  // Legacy aliases still accepted by tactics.ts BUDGET_TIER_USD.
  under_25k: { min: 10000, max: 25000, midpoint: 17500 },
  "25k_plus": { min: 25000, max: 75000, midpoint: 50000 },
};

export function budgetTierToRange(
  tier: string | null | undefined,
): BudgetRange | null {
  if (!tier) return null;
  const range = BUDGET_RANGES[tier];
  return range ? { tier, ...range } : null;
}

/* ── Audience → buyer_type map ─────────────────────────────────────────────
 * Strategy collects `audience` (firm | agency | seller). Campaign Builder reads
 * buyer_type from the subscription via useFirms(), which is AUTHORITATIVE.
 * Strategy's audience is an intent hint only — this map exists so any future
 * consumer reconciles to the same vocabulary, but the subscription always wins;
 * callers must never override buyer_type with this value. */

export type StrategyAudience = "firm" | "agency" | "seller";
export type BuyerType = "law_firm" | "ad_agency" | "media_company";

const AUDIENCE_TO_BUYER_TYPE: Record<StrategyAudience, BuyerType> = {
  firm: "law_firm",
  agency: "ad_agency",
  seller: "media_company",
};

export function audienceToBuyerType(
  audience: string | null | undefined,
): BuyerType | null {
  if (!audience) return null;
  return AUDIENCE_TO_BUYER_TYPE[audience as StrategyAudience] ?? null;
}

/* ── Handoff URL builder ───────────────────────────────────────────────────── */

/** Minimal shape this builder reads off a composed Strategy object. */
export interface StrategyHandoffInput {
  market?: { state?: string; label?: string; dma_code?: string | null } | null;
  handoff?: { case_type?: string } | null;
  budget_tier?: string | null;
  goal?: string | null;
  brand?: { company_name?: string } | null;
}

export interface CampaignHandoff {
  /** Full /campaigns/builder URL, or null when the case type isn't served yet. */
  href: string | null;
  /** True when the Strategy case type has no Campaign Builder PI category
   *  (nursing_home, workers_comp) — caller shows an honest block instead. */
  unsupportedCaseType: boolean;
}

/**
 * Build the widened Campaign Builder handoff URL for a composed Strategy.
 *
 * Statewide (no DMA picked) is a first-class target: market_display_name becomes
 * "Statewide – <State>" and market_dma_code is omitted, which the PI campaign
 * flow accepts (the router requires market_display_name, not a DMA).
 */
export function buildCampaignBuilderHandoff(
  data: StrategyHandoffInput,
): CampaignHandoff {
  const caseType = data.handoff?.case_type ?? "";
  const piCategory = TORT_TO_PI_CATEGORY[caseType];
  if (!piCategory) {
    // nursing_home / workers_comp (or the personal_injury fallback) — no PI
    // category exists, so we refuse to hand off to an empty dropdown.
    return { href: null, unsupportedCaseType: true };
  }

  const state = data.market?.state ?? "";
  const dmaCode = data.market?.dma_code ?? null;
  const statewide = !dmaCode;
  const stateName = STATE_NAMES[state] ?? state;
  const marketDisplayName = statewide
    ? `Statewide – ${stateName}`
    : (data.market?.label ?? "");

  const params = new URLSearchParams();
  params.set("practice_area", "personal_injury");
  params.set("state", state);
  params.set("pi_category", piCategory);
  if (dmaCode) params.set("market_dma_code", dmaCode);
  if (marketDisplayName) params.set("market_display_name", marketDisplayName);

  const firmName = data.brand?.company_name?.trim();
  if (firmName) params.set("firm_name", firmName);

  if (data.budget_tier) {
    params.set("budget_tier", data.budget_tier);
    const range = budgetTierToRange(data.budget_tier);
    if (range) {
      params.set("budget_min", String(range.min));
      params.set("budget_max", String(range.max));
      params.set("budget_midpoint", String(range.midpoint));
    }
  }

  const goal = data.goal?.trim();
  if (goal) params.set("goal", goal);

  return { href: `/campaigns/builder?${params.toString()}`, unsupportedCaseType: false };
}
