import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type FarsFatalityRow = Database["public"]["Tables"]["fars_fatalities"]["Row"];
type RpcFunctions = Database["public"]["Functions"];
type FatalitiesFilterArgs = {
  filter_state?: string | null;
  filter_county?: number | null;
};

export interface FatalitiesFilters {
  state?: string | null;
  county?: number | null;
}

export interface FatalityStateOption {
  state: string;
}

export interface FatalityCountyOption {
  county_fips: number;
  county_name: string;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

export interface FatalitySummaryByState {
  state: string;
  total_fatalities: number;
  total_crashes: number;
  drunk_driving_crashes: number;
}

export interface FatalityTrendByYear {
  year: number;
  total_fatalities: number;
  total_crashes: number;
}

export interface FatalityRecord {
  id: number;
  st_case: number;
  state: string;
  county_fips: number;
  county_name: string | null;
  crash_date: string;
  fatalities: number;
  drunk_drivers: number;
  latitude: number | null;
  longitude: number | null;
  year: number;
  persons: number;
  vehicles: number;
}

type TotalsRow = RpcFunctions["get_fars_totals"]["Returns"][number];
type TrendRow = RpcFunctions["get_fars_fatality_trend_by_year"]["Returns"][number];
type StateTrendRow =
  RpcFunctions["get_fars_state_fatality_trend_by_year"]["Returns"][number];
type TopStateRow =
  RpcFunctions["get_fars_top_states_by_fatalities"]["Returns"][number];
type DrunkDrivingRow =
  RpcFunctions["get_fars_drunk_driving_stats"]["Returns"][number];
type DistinctStateRow =
  RpcFunctions["get_fars_distinct_states"]["Returns"][number];
type CountyRow = RpcFunctions["get_fars_counties_by_state"]["Returns"][number];

function toRpcFilters(
  filters?: FatalitiesFilters
): FatalitiesFilterArgs {
  return {
    filter_state: filters?.state ?? null,
    filter_county: filters?.county ?? null,
  };
}

function buildRecentCrashQuery(filters?: FatalitiesFilters) {
  const supabase = getSupabase();
  let query = supabase.from("fars_fatalities").select("*");

  if (filters?.state) {
    query = query.eq("state", filters.state);
  }

  if (filters?.county != null) {
    query = query.eq("county_fips", filters.county);
  }

  return query;
}

/** Total fatalities across all years (via RPC) */
export async function getTotalFatalities(
  filters?: FatalitiesFilters
): Promise<number> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_totals", toRpcFilters(filters) as never)
    .throwOnError();
  const rows = (data ?? []) as TotalsRow[];
  return Number(rows[0]?.total_fatalities ?? 0);
}

/** Total crash records (via RPC) */
export async function getTotalCrashes(
  filters?: FatalitiesFilters
): Promise<number> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_totals", toRpcFilters(filters) as never)
    .throwOnError();
  const rows = (data ?? []) as TotalsRow[];
  return Number(rows[0]?.total_crashes ?? 0);
}

/** Fatalities by year for trend chart (via RPC) */
export async function getFatalityTrendByYear(
  filters?: FatalitiesFilters
): Promise<FatalityTrendByYear[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_fatality_trend_by_year", toRpcFilters(filters) as never)
    .throwOnError();
  return ((data ?? []) as TrendRow[]).map((row) => ({
    year: Number(row.year),
    total_fatalities: Number(row.total_fatalities),
    total_crashes: Number(row.total_crashes),
  }));
}

/** Top states by fatalities (via RPC) */
export async function getTopStatesByFatalities(
  limit = 15,
  filters?: FatalitiesFilters
): Promise<FatalitySummaryByState[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_top_states_by_fatalities", {
      result_limit: limit,
      ...toRpcFilters(filters),
    } as never)
    .throwOnError();
  return ((data ?? []) as TopStateRow[]).map((row) => ({
    state: row.state ?? "",
    total_fatalities: Number(row.total_fatalities),
    total_crashes: Number(row.total_crashes),
    drunk_driving_crashes: Number(row.drunk_driving_crashes),
  }));
}

/** Fatalities for a specific state by year */
export async function getStateFatalitiesByYear(
  stateAbbr: string,
  filters?: Omit<FatalitiesFilters, "state">
): Promise<FatalityTrendByYear[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_state_fatality_trend_by_year", {
      state_abbr: stateAbbr,
      ...toRpcFilters({ state: stateAbbr, county: filters?.county ?? null }),
    } as never)
    .throwOnError();
  return ((data ?? []) as StateTrendRow[]).map((row) => ({
    year: Number(row.year),
    total_fatalities: Number(row.total_fatalities),
    total_crashes: Number(row.total_crashes),
  }));
}

/** Recent fatal crashes (most recent first) */
export async function getRecentCrashes(
  limit = 20,
  filters?: FatalitiesFilters
): Promise<FatalityRecord[]> {
  const { data } = await buildRecentCrashQuery(filters)
    .order("crash_date", { ascending: false })
    .limit(limit)
    .throwOnError();

    return ((data ?? []) as FarsFatalityRow[]).map((row) => ({
    id: row.id,
    st_case: row.st_case,
    state: row.state ?? "",
    county_fips: row.county_fips ?? 0,
    county_name: row.county_name,
    crash_date: row.crash_date ?? "",
    fatalities: row.fatalities ?? 0,
    drunk_drivers: row.drunk_drivers ?? 0,
    latitude: row.latitude,
    longitude: row.longitude,
    year: row.year ?? 0,
    persons: row.persons ?? 0,
    vehicles: row.vehicles ?? 0,
  }));
}

/** Drunk driving percentage across all data (via RPC) */
export async function getDrunkDrivingStats(
  filters?: FatalitiesFilters
): Promise<{
  total_crashes: number;
  drunk_crashes: number;
  percentage: number;
}> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_drunk_driving_stats", toRpcFilters(filters) as never)
    .throwOnError();
  const rows = (data ?? []) as DrunkDrivingRow[];
  const row = rows[0];
  return {
    total_crashes: Number(row?.total_crashes ?? 0),
    drunk_crashes: Number(row?.drunk_crashes ?? 0),
    percentage: Number(row?.percentage ?? 0),
  };
}

export async function getDistinctStates(): Promise<FatalityStateOption[]> {
  const supabase = getSupabase();
  const { data } = await supabase.rpc("get_fars_distinct_states").throwOnError();
  return ((data ?? []) as DistinctStateRow[]).map((row) => ({
    state: row.state ?? "",
  }));
}

export async function getCountiesByState(
  stateAbbr: string
): Promise<FatalityCountyOption[]> {
  if (!stateAbbr) {
    return [];
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_counties_by_state", { state_abbr: stateAbbr } as never)
    .throwOnError();
  return ((data ?? []) as CountyRow[]).map((row) => ({
    county_fips: Number(row.county_fips),
    county_name: row.county_name,
  }));
}

export interface UrbanRuralStat {
  classification: string;
  total_fatalities: number;
  total_crashes: number;
}

export async function getUrbanRuralStats(
  filterState?: string,
  filterCounty?: number,
  filterMotorcycle?: boolean,
  filterLargeTruck?: boolean
): Promise<UrbanRuralStat[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_fars_urban_rural_stats', {
      filter_state: filterState ?? null,
      filter_county: filterCounty ?? null,
      filter_motorcycle: filterMotorcycle ?? null,
      filter_large_truck: filterLargeTruck ?? null,
    } as never);
    if (error) throw error;
    return (data ?? []) as UrbanRuralStat[];
  } catch {
    return [];
  }
}

export interface FarsCountyHotspot {
  county_fips: number;
  county_name: string;
  state: string;
  total_crashes: number;
  total_fatalities: number;
  drunk_driving_crashes: number;
  pct_drunk: number;
  avg_fatalities_per_crash: number;
}

export interface MvPoiTarget {
  poi_id: number;
  poi_name: string;
  category: string;
  lat: number;
  lng: number;
  state: string;
  county_name: string | null;
  website: string | null;
  nearby_crashes: number;
  nearby_fatalities: number;
  nearby_drunk: number;
  ad_value_score: number;
}

export interface MvPoiCategory {
  category: string;
  count: number;
}

/** Top counties by crash volume within a state (via RPC) */
export async function getCountyHotspots(
  state: string,
  limit = 20
): Promise<FarsCountyHotspot[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_county_hotspots", {
      p_state: state,
      p_limit: limit,
    } as never)
    .throwOnError();
  return ((data ?? []) as FarsCountyHotspot[]).map((row) => ({
    county_fips: Number(row.county_fips),
    county_name: row.county_name ?? "",
    state: row.state ?? "",
    total_crashes: Number(row.total_crashes),
    total_fatalities: Number(row.total_fatalities),
    drunk_driving_crashes: Number(row.drunk_driving_crashes),
    pct_drunk: Number(row.pct_drunk),
    avg_fatalities_per_crash: Number(row.avg_fatalities_per_crash),
  }));
}

/** Motor-vehicle POI advertising targets (via RPC) */
export async function getMvPoiTargets(
  state?: string,
  category?: string
): Promise<MvPoiTarget[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_mv_poi_targets", {
      p_state: state ?? null,
      p_category: category ?? null,
    } as never)
    .throwOnError();
  return ((data ?? []) as MvPoiTarget[]).map((row) => ({
    poi_id: Number(row.poi_id),
    poi_name: row.poi_name ?? "",
    category: row.category ?? "",
    lat: Number(row.lat),
    lng: Number(row.lng),
    state: row.state ?? "",
    county_name: row.county_name ?? null,
    website: row.website ?? null,
    nearby_crashes: Number(row.nearby_crashes),
    nearby_fatalities: Number(row.nearby_fatalities),
    nearby_drunk: Number(row.nearby_drunk),
    ad_value_score: Number(row.ad_value_score),
  }));
}

/** Motor-vehicle POI categories with counts (via RPC) */
export async function getMvPoiCategories(
  state?: string
): Promise<MvPoiCategory[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_mv_poi_categories", {
      p_state: state ?? null,
    } as never)
    .throwOnError();
  return ((data ?? []) as MvPoiCategory[]).map((row) => ({
    category: row.category ?? "",
    count: Number(row.count),
  }));
}

/**
 * Returns crash heatmap data via a server-side aggregation RPC.
 *
 * WARNING: Do NOT replace this with a client-side pagination loop over
 * fars_fatalities. The table has 221k+ rows; paginating through it in
 * 1000-row chunks saturates the Supabase connection pool and causes 504s
 * on auth endpoints. See PR "fix(perf): FARS pagination storm".
 */
export async function getCrashHeatmapPoints(
  filters?: FatalitiesFilters
): Promise<HeatmapPoint[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_heatmap", {
      filter_state: filters?.state ?? null,
      filter_county: filters?.county ?? null,
    } as never)
    .throwOnError();
  return ((data ?? []) as { latitude: number; longitude: number; intensity: number }[]).map(
    (row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      intensity: Math.max(Number(row.intensity ?? 1), 1),
    })
  );
}
