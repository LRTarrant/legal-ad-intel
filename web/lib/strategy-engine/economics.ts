/**
 * Strategy Engine — PI ad economics (v1).
 *
 * PURE module (no Supabase, no React). Turns a `pi_ad_economics` benchmark row
 * (CPC + conversion presets + case value, fetched in the route) into an honest,
 * VISIBLE funnel: monthly spend → clicks → leads → signed cases → cost-per-case.
 *
 * Design contract:
 *  - The funnel returns the FULL STAGE BREAKDOWN, never just the final number —
 *    a later target-CPA / gap feature reads the individual stages.
 *  - CPC and case value are FIXED (from the table, by case_type × market_tier).
 *    The two soft, firm-specific inputs are LEVERS: click-to-lead and
 *    lead-to-signed, each a 3-way preset. Default = competent / average.
 *  - cost-per-case is a RANGE (driven by the CPC low/typical/high spread at the
 *    selected lever), and we also expose the lever ENVELOPE (best strong+elite →
 *    worst weak+poor at typical CPC) so the headline shows the upside, not a
 *    single scary default number.
 *  - fee-per-case (case value × pre-suit contingency) rides alongside every
 *    cost-per-case so a high acquisition cost is read against what a case is
 *    worth — absorbable for trucking, not for auto.
 */

export type EconomicsCaseType = "auto" | "trucking" | "motorcycle";
export type MarketTier = "tier_1" | "tier_2" | "small";
export type ClickToLeadLever = "weak" | "competent" | "strong";
export type LeadToSignedLever = "poor" | "average" | "elite";
export type Confidence = "high" | "medium" | "low" | "very_low";

/** A `pi_ad_economics` row, mapped to numbers (see lib/queries/pi-economics.ts). */
export interface PiEconomicsBenchmark {
  case_type: EconomicsCaseType;
  market_tier: MarketTier;
  cpc_low: number;
  cpc_typical: number;
  cpc_high: number;
  click_to_lead: Record<ClickToLeadLever, number>; // percents, e.g. { weak: 5, competent: 8, strong: 25 }
  lead_to_signed: Record<LeadToSignedLever, number>; // percents, e.g. { poor: 4, average: 10, elite: 20 }
  case_value_median: number | null;
  case_value_tail: number | null;
  case_value_tail_note: string | null;
  contingency_presuit_pct: number;
  contingency_litigated_pct: number;
  provenance: EconomicsProvenance;
}

export interface EconomicsProvenance {
  cpc_source: string | null;
  cpc_confidence: Confidence | null;
  conversion_source: string | null;
  click_to_lead_confidence: Confidence | null;
  lead_to_signed_confidence: Confidence | null;
  case_value_source: string | null;
  case_value_confidence: Confidence | null;
  reported_vs_estimate: "reported" | "estimate" | "blended" | null;
  source_notes: string | null;
}

export interface EconomicsLevers {
  clickToLead: ClickToLeadLever;
  leadToSigned: LeadToSignedLever;
}

export const DEFAULT_LEVERS: EconomicsLevers = { clickToLead: "competent", leadToSigned: "average" };

/** One fully-broken-out funnel pass. v2 (target-CPA gap) reads these stages. */
export interface FunnelStages {
  monthly_spend: number;
  cpc: number;
  clicks: number;
  click_to_lead_pct: number; // percent (e.g. 8)
  leads: number;
  lead_to_signed_pct: number; // percent (e.g. 10)
  signed_cases: number;
  cost_per_signed_case: number;
}

export interface EconomicsResult {
  case_type: EconomicsCaseType;
  market_tier: MarketTier;
  monthly_spend: number;
  levers: EconomicsLevers;
  /** The funnel at the selected levers + TYPICAL cpc (the headline path). */
  funnel: FunnelStages;
  /** cost-per-case spread from CPC low/typical/high at the selected levers. */
  cost_per_case_low: number;
  cost_per_case_typical: number;
  cost_per_case_high: number;
  /** The envelope the LEVERS produce at typical cpc: best (strong+elite) → worst (weak+poor). */
  lever_best_cost_per_case: number;
  lever_worst_cost_per_case: number;
  /** ROI context. */
  case_value_median: number | null;
  case_value_tail: number | null;
  case_value_tail_note: string | null;
  fee_per_case: number | null; // case_value_median × pre-suit contingency
  /** fee_per_case >= cost_per_case_typical → the average case absorbs acquisition. */
  fee_covers_acquisition: boolean | null;
  /** false when cost_per_case_typical lands outside a wide sanity band (likely a data/math bug, NOT a high-but-real premium read). */
  plausible: boolean;
  provenance: EconomicsProvenance;
}

const round = (n: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * One funnel pass. spend ÷ CPC = clicks → × click-to-lead = leads →
 * × lead-to-signed = signed cases; cost-per-case = spend ÷ signed cases.
 * Rates are PERCENTS (8 = 8%). Derived figures are rounded for display; the
 * rate inputs are preserved so a v2 feature can recompute precisely.
 */
export function computeFunnel(
  monthlySpend: number,
  cpc: number,
  clickToLeadPct: number,
  leadToSignedPct: number,
): FunnelStages {
  const ctl = clickToLeadPct / 100;
  const lts = leadToSignedPct / 100;
  const clicks = cpc > 0 ? monthlySpend / cpc : 0;
  const leads = clicks * ctl;
  const signed = leads * lts;
  const costPerCase = signed > 0 ? monthlySpend / signed : 0;
  return {
    monthly_spend: round(monthlySpend),
    cpc: round(cpc, 2),
    clicks: round(clicks, 1),
    click_to_lead_pct: clickToLeadPct,
    leads: round(leads, 1),
    lead_to_signed_pct: leadToSignedPct,
    signed_cases: round(signed, 1),
    cost_per_signed_case: round(costPerCase),
  };
}

/** cost-per-case = CPC / (ctl × lts); independent of spend. */
function costPerCase(cpc: number, clickToLeadPct: number, leadToSignedPct: number): number {
  const denom = (clickToLeadPct / 100) * (leadToSignedPct / 100);
  return denom > 0 ? round(cpc / denom) : 0;
}

const PLAUSIBLE_MIN = 500;
const PLAUSIBLE_MAX = 60_000;

/**
 * Build the full economics read for a benchmark + monthly spend + lever choice.
 * Pure and deterministic — shared by the route (initial, default levers) and the
 * deck (live recompute as the user moves the levers).
 */
export function computeEconomics(
  b: PiEconomicsBenchmark,
  monthlySpend: number,
  levers: EconomicsLevers = DEFAULT_LEVERS,
): EconomicsResult {
  const ctl = b.click_to_lead[levers.clickToLead];
  const lts = b.lead_to_signed[levers.leadToSigned];

  const funnel = computeFunnel(monthlySpend, b.cpc_typical, ctl, lts);

  const cost_per_case_low = costPerCase(b.cpc_low, ctl, lts);
  const cost_per_case_typical = costPerCase(b.cpc_typical, ctl, lts);
  const cost_per_case_high = costPerCase(b.cpc_high, ctl, lts);

  // Lever envelope at typical CPC: best = strongest intake, worst = weakest.
  const lever_best_cost_per_case = costPerCase(
    b.cpc_typical,
    b.click_to_lead.strong,
    b.lead_to_signed.elite,
  );
  const lever_worst_cost_per_case = costPerCase(
    b.cpc_typical,
    b.click_to_lead.weak,
    b.lead_to_signed.poor,
  );

  const fee_per_case =
    b.case_value_median != null
      ? round((b.case_value_median * b.contingency_presuit_pct) / 100)
      : null;

  return {
    case_type: b.case_type,
    market_tier: b.market_tier,
    monthly_spend: round(monthlySpend),
    levers,
    funnel,
    cost_per_case_low,
    cost_per_case_typical,
    cost_per_case_high,
    lever_best_cost_per_case,
    lever_worst_cost_per_case,
    case_value_median: b.case_value_median,
    case_value_tail: b.case_value_tail,
    case_value_tail_note: b.case_value_tail_note,
    fee_per_case,
    fee_covers_acquisition:
      fee_per_case != null ? fee_per_case >= cost_per_case_typical : null,
    plausible:
      cost_per_case_typical >= PLAUSIBLE_MIN && cost_per_case_typical <= PLAUSIBLE_MAX,
    provenance: b.provenance,
  };
}

/* ── Resolvers (interview → table keys) ──────────────────────────────────── */

/** Strategy tort slug (from primaryTort) → economics case_type, or null when
 *  the case type has no PI ad-economics coverage (nursing_home/workers_comp/
 *  boating/general PI) — the route then omits the cost section honestly. */
const TORT_SLUG_TO_ECONOMICS: Record<string, EconomicsCaseType> = {
  truck_accident: "trucking",
  motor_vehicle: "auto",
  motorcycle: "motorcycle",
};
export function economicsCaseType(tortSlug: string): EconomicsCaseType | null {
  return TORT_SLUG_TO_ECONOMICS[tortSlug] ?? null;
}

/** Nielsen DMA rank → market tier (heuristic; tunable). Statewide / unknown
 *  rank falls to tier_2 as a neutral middle rather than guessing big or small. */
export function resolveMarketTier(dmaRank: number | null | undefined): MarketTier {
  if (dmaRank == null) return "tier_2";
  if (dmaRank <= 25) return "tier_1";
  if (dmaRank <= 75) return "tier_2";
  return "small";
}
