import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type RpcFunctions = Database["public"]["Functions"];
type BoatingTotalsRow = RpcFunctions["get_boating_totals"]["Returns"][number];
type BoatingTrendRow = RpcFunctions["get_boating_trend_by_year"]["Returns"][number];
type BoatingStateRow = RpcFunctions["get_boating_distinct_states"]["Returns"][number];
type BoatingCountyRow = RpcFunctions["get_boating_counties_by_state"]["Returns"][number];
type BoatingCountyNameRow = RpcFunctions["get_boating_counties_by_state_name"]["Returns"][number];
type BoatingHotspotRow = RpcFunctions["get_boating_hotspot_counties"]["Returns"][number];
type BoatingSeverityRow = RpcFunctions["get_boating_severity_stats"]["Returns"][number];
type BoatingCountyTrendRow = RpcFunctions["get_boating_county_trend"]["Returns"][number];

export interface BoatingFilters {
  state?: string | null;
  county?: string | null; // county_name text, NOT county_fips
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

export interface BoatingCountyNameOption {
  county_name: string;
  total_accidents: number;
}

export interface BoatingHeatmapPoint {
  latitude: number;
  longitude: number;
}

export interface BoatingHotspotCounty {
  state: string;
  county_name: string;
  total_accidents: number;
  total_deaths: number;
  total_injuries: number;
  avg_lat: number;
  avg_lng: number;
}

export interface BoatingSeverityStats {
  total_accidents: number;
  total_deaths: number;
  total_injuries: number;
  fatality_rate: number;
  avg_deaths_per_accident: number;
  avg_injuries_per_accident: number;
  pct_fatal: number;
}

function toRpcFilters(filters?: BoatingFilters) {
  return {
    filter_state: filters?.state ?? null,
    filter_county: filters?.county ? undefined : null,
  };
}

export async function getBoatingTotals(
  filters?: BoatingFilters
): Promise<{ total_deaths: number; total_injuries: number; total_accidents: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_totals",
    {
      filter_state: filters?.state ?? null,
    } as never
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
    {
      filter_state: filters?.state ?? null,
    } as never
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

export async function getBoatingCountiesByStateName(
  stateAbbr: string
): Promise<BoatingCountyNameOption[]> {
  if (!stateAbbr) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_counties_by_state_name",
    { state_abbr: stateAbbr } as never
  );
  if (error) throw error;
  return ((data ?? []) as BoatingCountyNameRow[]).map((row) => ({
    county_name: row.county_name,
    total_accidents: Number(row.total_accidents),
  }));
}

export async function getBoatingHotspotCounties(
  state?: string | null
): Promise<BoatingHotspotCounty[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_hotspot_counties",
    {
      filter_state: state ?? null,
      top_n: 20,
    } as never
  );
  if (error) throw error;
  return ((data ?? []) as BoatingHotspotRow[]).map((row) => ({
    state: row.state,
    county_name: row.county_name,
    total_accidents: Number(row.total_accidents),
    total_deaths: Number(row.total_deaths),
    total_injuries: Number(row.total_injuries),
    avg_lat: Number(row.avg_lat),
    avg_lng: Number(row.avg_lng),
  }));
}

export async function getBoatingSeverityStats(
  state?: string | null,
  countyName?: string | null
): Promise<BoatingSeverityStats> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_severity_stats",
    {
      filter_state: state ?? null,
      filter_county_name: countyName ?? null,
    } as never
  );
  if (error) throw error;
  const row = ((data ?? []) as BoatingSeverityRow[])[0];
  return {
    total_accidents: Number(row?.total_accidents ?? 0),
    total_deaths: Number(row?.total_deaths ?? 0),
    total_injuries: Number(row?.total_injuries ?? 0),
    fatality_rate: Number(row?.fatality_rate ?? 0),
    avg_deaths_per_accident: Number(row?.avg_deaths_per_accident ?? 0),
    avg_injuries_per_accident: Number(row?.avg_injuries_per_accident ?? 0),
    pct_fatal: Number(row?.pct_fatal ?? 0),
  };
}

export async function getBoatingCountyTrend(
  state: string,
  countyName: string
): Promise<BoatingTrendByYear[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_boating_county_trend",
    {
      filter_state: state,
      filter_county_name: countyName,
    } as never
  );
  if (error) throw error;
  return ((data ?? []) as BoatingCountyTrendRow[]).map((row) => ({
    year: Number(row.year),
    total_deaths: Number(row.total_deaths),
    total_injuries: Number(row.total_injuries),
    total_accidents: Number(row.total_accidents),
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

  if (filters?.county) {
    query = query.eq("county_name", filters.county);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as { latitude: number; longitude: number }[]).map((row) => ({
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    intensity: 1,
  }));
}
