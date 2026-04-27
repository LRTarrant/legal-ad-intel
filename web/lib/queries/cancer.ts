import { getSupabase } from "@/lib/supabase";

export interface CancerFilters {
  cancerSite?: string | null;
  cancerSites?: string[] | null;
  state?: string | null;
}

export interface CancerTotals {
  average_incidence_rate: number;
  counties_reporting: number;
  total_annual_cases: number;
}

export interface CancerStateSummary {
  state: string;
  average_incidence_rate: number;
  total_annual_cases: number;
  counties_reporting: number;
  highest_rate_county: string;
  trend_direction: string;
}

export interface CancerSiteSummary {
  cancer_site: string;
  average_incidence_rate: number;
  total_annual_cases: number;
  trend_direction: string;
}

export interface CancerCountyRow {
  fips: string;
  county_name: string;
  state: string;
  cancer_site: string;
  incidence_rate: number;
  average_annual_count: number;
  recent_trend: number | null;
  trend_direction: string;
  rural_urban: string | null;
}

export interface CancerOption {
  value: string;
}

export interface CancerHeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

/* ------------------------------------------------------------------ */
/*  RPC filter helpers                                                  */
/* ------------------------------------------------------------------ */

function toRpcFilters(filters?: CancerFilters) {
  return {
    filter_state: filters?.state ?? null,
    filter_cancer_site:
      filters?.cancerSites && filters.cancerSites.length > 0
        ? null
        : (filters?.cancerSite ?? null),
    filter_cancer_sites:
      filters?.cancerSites && filters.cancerSites.length > 0
        ? filters.cancerSites
        : null,
  };
}

function trendDirection(value: number | null): string {
  if (value == null || value === 0) return "Stable";
  return value > 0 ? "Rising" : "Falling";
}

/* ------------------------------------------------------------------ */
/*  Server-side aggregation RPCs                                        */
/*                                                                      */
/*  WARNING: Do NOT replace these with client-side pagination loops      */
/*  over cancer_incidence. The table has thousands of rows; paginating   */
/*  through it in 1000-row chunks fires many sequential queries that    */
/*  saturate the Supabase connection pool. See PR "fix(perf): FARS      */
/*  pagination storm" and the follow-up PR for this fix.                */
/* ------------------------------------------------------------------ */

export async function getCancerTotals(
  filters?: CancerFilters
): Promise<CancerTotals> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_totals", toRpcFilters(filters) as never)
    .throwOnError();
  const rows = (data ?? []) as unknown as {
    counties_reporting: number;
    average_incidence_rate: number;
    total_annual_cases: number;
  }[];
  const row = rows[0];
  return {
    counties_reporting: Number(row?.counties_reporting ?? 0),
    average_incidence_rate: Number(row?.average_incidence_rate ?? 0),
    total_annual_cases: Number(row?.total_annual_cases ?? 0),
  };
}

export async function getCancerByState(
  filters?: CancerFilters
): Promise<CancerStateSummary[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_by_state", toRpcFilters(filters) as never)
    .throwOnError();
  return ((data ?? []) as unknown as {
    state: string;
    average_incidence_rate: number;
    total_annual_cases: number;
    counties_reporting: number;
    highest_rate_county: string;
    highest_rate: number;
    avg_trend: number | null;
  }[]).map((row) => ({
    state: row.state,
    average_incidence_rate: Number(row.average_incidence_rate),
    total_annual_cases: Number(row.total_annual_cases),
    counties_reporting: Number(row.counties_reporting),
    highest_rate_county: row.highest_rate_county
      ? `${row.highest_rate_county} (${Number(row.highest_rate).toFixed(1)})`
      : "n/a",
    trend_direction: trendDirection(row.avg_trend),
  }));
}

export async function getCancerBySite(
  filters?: CancerFilters
): Promise<CancerSiteSummary[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_by_site", toRpcFilters(filters) as never)
    .throwOnError();
  return ((data ?? []) as unknown as {
    cancer_site: string;
    average_incidence_rate: number;
    total_annual_cases: number;
    avg_trend: number | null;
  }[]).map((row) => ({
    cancer_site: row.cancer_site,
    average_incidence_rate: Number(row.average_incidence_rate),
    total_annual_cases: Number(row.total_annual_cases),
    trend_direction: trendDirection(row.avg_trend),
  }));
}

export async function getCancerCountiesByState(
  state: string,
  filters?: CancerFilters
): Promise<CancerCountyRow[]> {
  const supabase = getSupabase();
  const rpcFilters = toRpcFilters(filters);
  const { data } = await supabase
    .rpc("get_cancer_counties_by_state", {
      p_state: state,
      filter_cancer_site: rpcFilters.filter_cancer_site,
      filter_cancer_sites: rpcFilters.filter_cancer_sites,
    } as never)
    .throwOnError();
  return ((data ?? []) as unknown as {
    fips: string;
    county_name: string;
    state: string;
    cancer_site: string;
    incidence_rate: number;
    average_annual_count: number;
    recent_trend: number | null;
    trend_direction: string;
    rural_urban: string | null;
  }[]).map((row) => ({
    fips: row.fips,
    county_name: row.county_name,
    state: row.state,
    cancer_site: row.cancer_site,
    incidence_rate: Number(row.incidence_rate),
    average_annual_count: Number(row.average_annual_count),
    recent_trend: row.recent_trend != null ? Number(row.recent_trend) : null,
    trend_direction: row.trend_direction,
    rural_urban: row.rural_urban,
  }));
}

export async function getCancerDistinctStates(): Promise<CancerOption[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_distinct_states")
    .throwOnError();
  return ((data ?? []) as unknown as { state: string }[]).map((row) => ({
    value: row.state,
  }));
}

export async function getCancerDistinctSites(): Promise<CancerOption[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_distinct_sites")
    .throwOnError();
  return ((data ?? []) as unknown as { cancer_site: string }[]).map((row) => ({
    value: row.cancer_site,
  }));
}

export async function getCancerTrendingSites(
  filters?: CancerFilters
): Promise<CancerSiteSummary[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_trending_sites", toRpcFilters(filters) as never)
    .throwOnError();
  return ((data ?? []) as unknown as {
    cancer_site: string;
    average_incidence_rate: number;
    total_annual_cases: number;
    avg_trend: number | null;
  }[]).map((row) => ({
    cancer_site: row.cancer_site,
    average_incidence_rate: Number(row.average_incidence_rate),
    total_annual_cases: Number(row.total_annual_cases),
    trend_direction: trendDirection(row.avg_trend),
  }));
}

/**
 * Returns cancer incidence heatmap data via a server-side aggregation RPC.
 *
 * WARNING: Do NOT replace this with a client-side pagination loop over
 * cancer_incidence. See the comment block above.
 */
export async function getCancerHeatmapPoints(
  filters?: CancerFilters
): Promise<CancerHeatmapPoint[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_cancer_heatmap", {
      filter_state: filters?.state ?? null,
      filter_cancer_site:
        filters?.cancerSites && filters.cancerSites.length > 0
          ? null
          : (filters?.cancerSite ?? null),
    } as never)
    .throwOnError();
  return ((data ?? []) as unknown as { latitude: number; longitude: number; intensity: number }[]).map(
    (row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      intensity: Math.max(Number(row.intensity ?? 1), 1),
    })
  );
}
