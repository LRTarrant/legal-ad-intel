import { getSupabase } from "@/lib/supabase";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface TortCostBenchmark {
  tort_name: string;
  criteria_tier: "broad" | "narrow" | "vendor_avg";
  cpl_low: number | null;
  cpl_high: number | null;
  cpa_low: number | null;
  cpa_high: number | null;
  cpk_low: number | null;
  cpk_high: number | null;
  lead_to_retainer_pct: number | null;
  attrition_pct: number | null;
  settlement_low: number | null;
  settlement_high: number | null;
  settlement_avg: number | null;
  lifecycle_phase: string | null;
  observed_date: string;
  source_name: string | null;
  source_url: string | null;
}

export interface CpaEstimate {
  tort_name: string;
  base_cpa_low: number;
  base_cpa_high: number;
  criteria_multiplier: number;
  geo_multiplier: number;
  estimated_cpa_low: number;
  estimated_cpa_high: number;
  lifecycle_phase: string;
  confidence: "high" | "medium" | "low" | "very_low";
}

export interface LifecycleCpaRange {
  lifecycle_phase: string;
  label: string;
  description: string;
  cpa_low: number;
  cpa_high: number;
}

/* ── Queries ───────────────────────────────────────────────────────────── */

/**
 * Fetch the latest benchmark per tort+criteria combo.
 * Optionally filter by tort name (fuzzy) and criteria tier.
 */
export async function getTortCostBenchmarks(
  tortName?: string,
  criteriaTier?: string
): Promise<TortCostBenchmark[]> {
  const supabase = getSupabase() as ReturnType<typeof getSupabase>;

  const { data, error } = await (supabase as any).rpc(
    "get_tort_cost_benchmarks",
    {
      p_tort_name: tortName ?? null,
      p_criteria_tier: criteriaTier ?? null,
    }
  );

  if (error) {
    console.error("Failed to fetch tort benchmarks:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    tort_name: row.tort_name as string,
    criteria_tier: row.criteria_tier as string,
    cpl_low: row.cpl_low != null ? Number(row.cpl_low) : null,
    cpl_high: row.cpl_high != null ? Number(row.cpl_high) : null,
    cpa_low: row.cpa_low != null ? Number(row.cpa_low) : null,
    cpa_high: row.cpa_high != null ? Number(row.cpa_high) : null,
    cpk_low: row.cpk_low != null ? Number(row.cpk_low) : null,
    cpk_high: row.cpk_high != null ? Number(row.cpk_high) : null,
    lead_to_retainer_pct: row.lead_to_retainer_pct != null ? Number(row.lead_to_retainer_pct) : null,
    attrition_pct: row.attrition_pct != null ? Number(row.attrition_pct) : null,
    settlement_low: row.settlement_low != null ? Number(row.settlement_low) : null,
    settlement_high: row.settlement_high != null ? Number(row.settlement_high) : null,
    settlement_avg: row.settlement_avg != null ? Number(row.settlement_avg) : null,
    lifecycle_phase: row.lifecycle_phase as string | null,
    observed_date: row.observed_date as string,
    source_name: row.source_name as string | null,
    source_url: row.source_url as string | null,
  }));
}

/**
 * Estimate CPA for a tort adjusted by criteria breadth and geo scope.
 */
export async function estimateTortCpa(
  tortName: string,
  opts?: {
    lifecyclePhase?: string;
    criteriaBreadth?: "broad" | "medium" | "narrow";
    geoScope?: "national" | "regional" | "state_limited";
  }
): Promise<CpaEstimate | null> {
  const supabase = getSupabase() as ReturnType<typeof getSupabase>;

  const { data, error } = await (supabase as any).rpc("estimate_tort_cpa", {
    p_tort_name: tortName,
    p_lifecycle_phase: opts?.lifecyclePhase ?? null,
    p_criteria_breadth: opts?.criteriaBreadth ?? "medium",
    p_geo_scope: opts?.geoScope ?? "national",
  });

  if (error) {
    console.error("CPA estimation failed:", error.message);
    return null;
  }

  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    tort_name: row.tort_name as string,
    base_cpa_low: Number(row.base_cpa_low),
    base_cpa_high: Number(row.base_cpa_high),
    criteria_multiplier: Number(row.criteria_multiplier),
    geo_multiplier: Number(row.geo_multiplier),
    estimated_cpa_low: Number(row.estimated_cpa_low),
    estimated_cpa_high: Number(row.estimated_cpa_high),
    lifecycle_phase: row.lifecycle_phase as string,
    confidence: row.confidence as CpaEstimate["confidence"],
  };
}

/**
 * Fetch lifecycle phase → CPA range reference data.
 */
export async function getLifecycleCpaRanges(): Promise<LifecycleCpaRange[]> {
  const supabase = getSupabase() as ReturnType<typeof getSupabase>;

  const { data, error } = await (supabase as any)
    .from("tort_lifecycle_cpa_ranges")
    .select("lifecycle_phase, label, description, cpa_low, cpa_high")
    .order("cpa_low", { ascending: true });

  if (error) {
    console.error("Failed to fetch lifecycle ranges:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    lifecycle_phase: row.lifecycle_phase as string,
    label: row.label as string,
    description: row.description as string,
    cpa_low: Number(row.cpa_low),
    cpa_high: Number(row.cpa_high),
  }));
}

/**
 * Fetch all historical benchmarks for a tort (time series).
 */
export async function getTortCostHistory(
  tortName: string
): Promise<TortCostBenchmark[]> {
  const supabase = getSupabase() as ReturnType<typeof getSupabase>;

  const { data, error } = await (supabase as any)
    .from("tort_cost_benchmarks")
    .select("*")
    .ilike("tort_name", `%${tortName}%`)
    .order("observed_date", { ascending: true });

  if (error) {
    console.error("Failed to fetch tort cost history:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    tort_name: row.tort_name as string,
    criteria_tier: row.criteria_tier as string,
    cpl_low: row.cpl_low != null ? Number(row.cpl_low) : null,
    cpl_high: row.cpl_high != null ? Number(row.cpl_high) : null,
    cpa_low: row.cpa_low != null ? Number(row.cpa_low) : null,
    cpa_high: row.cpa_high != null ? Number(row.cpa_high) : null,
    cpk_low: row.cpk_low != null ? Number(row.cpk_low) : null,
    cpk_high: row.cpk_high != null ? Number(row.cpk_high) : null,
    lead_to_retainer_pct: row.lead_to_retainer_pct != null ? Number(row.lead_to_retainer_pct) : null,
    attrition_pct: row.attrition_pct != null ? Number(row.attrition_pct) : null,
    settlement_low: row.settlement_low != null ? Number(row.settlement_low) : null,
    settlement_high: row.settlement_high != null ? Number(row.settlement_high) : null,
    settlement_avg: row.settlement_avg != null ? Number(row.settlement_avg) : null,
    lifecycle_phase: row.lifecycle_phase as string | null,
    observed_date: row.observed_date as string,
    source_name: row.source_name as string | null,
    source_url: row.source_url as string | null,
  }));
}
