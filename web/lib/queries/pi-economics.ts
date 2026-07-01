/**
 * Read the PI ad-economics benchmark for a case_type × market_tier pair.
 *
 * Mirrors lib/queries/tort-benchmarks.ts (RPC + row mapping), but takes the
 * caller's Supabase client (the Strategy route's authenticated server client)
 * rather than a singleton, so it reads under the same auth context as the rest
 * of the generate route. The funnel math is applied separately in
 * lib/strategy-engine/economics.ts — this only fetches the inputs.
 */
import type {
  PiEconomicsBenchmark,
  EconomicsCaseType,
  MarketTier,
  ClickToLeadLever,
  LeadToSignedLever,
  Confidence,
} from "@/lib/strategy-engine/economics";

/* eslint-disable @typescript-eslint/no-explicit-any */

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

/** Fetch the latest benchmark row for the pair, or null when none exists
 *  (case type without PI economics coverage — the route omits the section). */
export async function fetchPiEconomicsBenchmark(
  sb: { rpc: (...args: any[]) => PromiseLike<{ data: unknown; error: unknown }> },
  caseType: EconomicsCaseType,
  marketTier: MarketTier,
): Promise<PiEconomicsBenchmark | null> {
  const { data, error } = await sb.rpc("get_pi_ad_economics", {
    p_case_type: caseType,
    p_market_tier: marketTier,
  });

  if (error) {
    console.error("PI economics fetch failed:", (error as { message?: string })?.message ?? error);
    return null;
  }

  const row = ((data as any[]) ?? [])[0];
  if (!row) return null;

  return {
    case_type: row.case_type as EconomicsCaseType,
    market_tier: row.market_tier as MarketTier,
    cpc_low: num(row.cpc_low),
    cpc_typical: num(row.cpc_typical),
    cpc_high: num(row.cpc_high),
    click_to_lead: {
      weak: num(row.click_to_lead_weak),
      competent: num(row.click_to_lead_competent),
      strong: num(row.click_to_lead_strong),
    } as Record<ClickToLeadLever, number>,
    lead_to_signed: {
      poor: num(row.lead_to_signed_poor),
      average: num(row.lead_to_signed_average),
      elite: num(row.lead_to_signed_elite),
    } as Record<LeadToSignedLever, number>,
    case_value_median: numOrNull(row.case_value_median),
    case_value_tail: numOrNull(row.case_value_tail),
    case_value_tail_note: (row.case_value_tail_note as string | null) ?? null,
    contingency_presuit_pct: num(row.contingency_presuit_pct),
    contingency_litigated_pct: num(row.contingency_litigated_pct),
    provenance: {
      cpc_source: (row.cpc_source as string | null) ?? null,
      cpc_confidence: (row.cpc_confidence as Confidence | null) ?? null,
      conversion_source: (row.conversion_source as string | null) ?? null,
      click_to_lead_confidence: (row.click_to_lead_confidence as Confidence | null) ?? null,
      lead_to_signed_confidence: (row.lead_to_signed_confidence as Confidence | null) ?? null,
      case_value_source: (row.case_value_source as string | null) ?? null,
      case_value_confidence: (row.case_value_confidence as Confidence | null) ?? null,
      reported_vs_estimate: (row.reported_vs_estimate as "reported" | "estimate" | "blended" | null) ?? null,
      source_notes: (row.source_notes as string | null) ?? null,
    },
  };
}
