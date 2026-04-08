import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type RpcFunctions = Database["public"]["Functions"];
type BoatingTotalsRow = RpcFunctions["get_boating_totals"]["Returns"][number];
type BoatingTrendRow = RpcFunctions["get_boating_trend_by_year"]["Returns"][number];
type BoatingStateRow = RpcFunctions["get_boating_distinct_states"]["Returns"][number];
type BoatingCountyRow = RpcFunctions["get_boating_counties_by_state"]["Returns"][number];

export interface BoatingFilters {
  state?: string | null;
  county?: number | null;
}

export interface BoatingTrendByYear {
  year: number;
  total_deaths: number;
  total_injuries: number;
  total_accidents: number;
}

export interface BoatingStateOption {
  state: string;
}

export interface BoatingCountyOption {
  county_fips: number;
  county_name: string;
}

export interface BoatingHeatmapPoint {
  latitude: number;
  longitude: number;
}

function toRpcFilters(filters?: BoatingFilters) {
  return {
    filter_state: filters?.state ?? null,
    filter_county: filters?.county ?? null,
  };
}

export async function getBoatingTotals(
  filters?: BoatingFilters
): Promise<{ total_deaths: number; total_injuries: number; total_accidents: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_totals",
    toRpcFilters(filters) as never
  );
  if (error) throw error;
  const row = ((data ?? []) as BoatingTotalsRow[])[0];
  return {
    total_deaths: Number(row?.total_deaths ?? 0),
    total_injuries: Number(row?.total_injuries ?? 0),
    total_accidents: Number(row?.total_accidents ?? 0),
  };
}

export async function getBoatingTrendByYear(
  filters?: BoatingFilters
): Promise<BoatingTrendByYear[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_trend_by_year",
    toRpcFilters(filters) as never
  );
  if (error) throw error;
  return ((data ?? []) as BoatingTrendRow[]).map((row) => ({
    year: Number(row.year),
    total_deaths: Number(row.total_deaths),
    total_injuries: Number(row.total_injuries),
    total_accidents: Number(row.total_accidents),
  }));
}

export async function getBoatingDistinctStates(): Promise<BoatingStateOption[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_boating_distinct_states");
  if (error) throw error;
  return ((data ?? []) as BoatingStateRow[]).map((row) => ({
    state: row.state,
  }));
}

export async function getBoatingCountiesByState(
  stateAbbr: string
): Promise<BoatingCountyOption[]> {
  if (!stateAbbr) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_counties_by_state",
    { state_abbr: stateAbbr } as never
  );
  if (error) throw error;
  return ((data ?? []) as BoatingCountyRow[]).map((row) => ({
    county_fips: Number(row.county_fips),
    county_name: row.county_name,
  }));
}

export async function getBoatingHeatmapPoints(
  filters?: BoatingFilters
): Promise<{ latitude: number; longitude: number; intensity: number }[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("boating_accidents")
    .select("latitude,longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (filters?.state) {
    query = query.eq("state", filters.state.toUpperCase());
  }

  if (filters?.county != null) {
    query = query.eq("county_fips", filters.county);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as { latitude: number; longitude: number }[]).map((row) => ({
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    intensity: 1,
  }));
}
