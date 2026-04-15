import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type RpcFunctions = Database["public"]["Functions"];
type StormTotalsRow = RpcFunctions["get_storm_event_totals"]["Returns"][number];
type StormByStateRow = RpcFunctions["get_storm_events_by_state"]["Returns"][number];
type StormByTypeRow = RpcFunctions["get_storm_events_by_type"]["Returns"][number];
type StormTrendRow = RpcFunctions["get_storm_event_trend_by_year"]["Returns"][number];
type StormCountyRow = RpcFunctions["get_storm_counties_by_state"]["Returns"][number];
type StormStateRow = RpcFunctions["get_storm_distinct_states"]["Returns"][number];
type StormEventTypeRow = RpcFunctions["get_storm_distinct_event_types"]["Returns"][number];
type StormHeatmapRow = RpcFunctions["get_storm_heatmap_points"]["Returns"][number];

export interface StormFilters {
  state?: string | null;
  year?: number | null;
  eventType?: string | null;
}

export interface StormEventTotals {
  total_events: number;
  total_property_damage: number;
  total_injuries: number;
  total_deaths: number;
}

export interface StormEventByState {
  state: string;
  total_events: number;
  total_property_damage: number;
  total_crop_damage: number;
  total_injuries: number;
  total_deaths: number;
}

export interface StormEventByType {
  event_type: string;
  total_events: number;
  total_property_damage: number;
}

export interface StormEventTrendByYear {
  year: number;
  total_events: number;
  total_property_damage: number;
}

export interface StormCounty {
  county_name: string;
  county_fips: number;
  total_events: number;
  total_property_damage: number;
}

function toRpcFilters(filters?: StormFilters) {
  return {
    filter_state: filters?.state ?? undefined,
    filter_year: filters?.year ?? undefined,
    filter_event_type: filters?.eventType ?? undefined,
  };
}

export async function getStormEventTotals(
  filters?: StormFilters
): Promise<StormEventTotals> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc(
      "get_storm_event_totals",
      toRpcFilters(filters)
    );
    if (error) throw error;
    const row = ((data ?? []) as StormTotalsRow[])[0];
    return {
      total_events: Number(row?.total_events ?? 0),
      total_property_damage: Number(row?.total_property_damage ?? 0),
      total_injuries: Number(row?.total_injuries ?? 0),
      total_deaths: Number(row?.total_deaths ?? 0),
    };
  } catch (err) {
    console.error('[storm-events] getStormEventTotals failed:', err);
    return { total_events: 0, total_property_damage: 0, total_injuries: 0, total_deaths: 0 };
  }
}

export async function getStormEventsByState(
  filters?: StormFilters
): Promise<StormEventByState[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc(
      "get_storm_events_by_state",
      toRpcFilters(filters)
    );
    if (error) throw error;
    return ((data ?? []) as StormByStateRow[]).map((row) => ({
      state: row.state,
      total_events: Number(row.total_events),
      total_property_damage: Number(row.total_property_damage),
      total_crop_damage: Number(row.total_crop_damage),
      total_injuries: Number(row.total_injuries),
      total_deaths: Number(row.total_deaths),
    }));
  } catch (err) {
    console.error('[storm-events] getStormEventsByState failed:', err);
    return [];
  }
}

export async function getStormEventsByType(
  filters?: StormFilters
): Promise<StormEventByType[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc(
      "get_storm_events_by_type",
      { filter_state: filters?.state ?? undefined, filter_year: filters?.year ?? undefined }
    );
    if (error) throw error;
    return ((data ?? []) as StormByTypeRow[]).map((row) => ({
      event_type: row.event_type,
      total_events: Number(row.total_events),
      total_property_damage: Number(row.total_property_damage),
    }));
  } catch (err) {
    console.error('[storm-events] getStormEventsByType failed:', err);
    return [];
  }
}

export async function getStormEventTrendByYear(
  filters?: StormFilters
): Promise<StormEventTrendByYear[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc(
      "get_storm_event_trend_by_year",
      { filter_state: filters?.state ?? undefined, filter_event_type: filters?.eventType ?? undefined }
    );
    if (error) throw error;
    return ((data ?? []) as StormTrendRow[]).map((row) => ({
      year: Number(row.year),
      total_events: Number(row.total_events),
      total_property_damage: Number(row.total_property_damage),
    }));
  } catch (err) {
    console.error('[storm-events] getStormEventTrendByYear failed:', err);
    return [];
  }
}

export async function getStormCountiesByState(
  state: string,
  filters?: StormFilters
): Promise<StormCounty[]> {
  try {
    if (!state) return [];
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc(
      "get_storm_counties_by_state",
      {
        filter_state: state,
        filter_year: filters?.year ?? undefined,
        filter_event_type: filters?.eventType ?? undefined,
      }
    );
    if (error) throw error;
    return ((data ?? []) as StormCountyRow[]).map((row) => ({
      county_name: row.county_name,
      county_fips: Number(row.county_fips),
      total_events: Number(row.total_events),
      total_property_damage: Number(row.total_property_damage),
    }));
  } catch (err) {
    console.error('[storm-events] getStormCountiesByState failed:', err);
    return [];
  }
}

export async function getStormDistinctStates(): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("get_storm_distinct_states");
    if (error) throw error;
    return ((data ?? []) as StormStateRow[]).map((row) => row.state);
  } catch (err) {
    console.error('[storm-events] getStormDistinctStates failed:', err);
    return [];
  }
}

export async function getStormDistinctEventTypes(): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("get_storm_distinct_event_types");
    if (error) throw error;
    return ((data ?? []) as StormEventTypeRow[]).map((row) => row.event_type);
  } catch (err) {
    console.error('[storm-events] getStormDistinctEventTypes failed:', err);
    return [];
  }
}

export async function getStormDistinctYears(): Promise<number[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("storm_events")
      .select("year")
      .order("year");
    if (error) throw error;
    const unique = [...new Set((data ?? []).map((row: { year: number }) => row.year))];
    return unique;
  } catch (err) {
    console.error('[storm-events] getStormDistinctYears failed:', err);
    return [];
  }
}

export async function getStormHeatmapPoints(
  filters?: StormFilters
): Promise<{ latitude: number; longitude: number }[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc(
      "get_storm_heatmap_points",
      toRpcFilters(filters)
    );
    if (error) throw error;
    return ((data ?? []) as StormHeatmapRow[]).map((row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }));
  } catch (err) {
    console.error('[storm-events] getStormHeatmapPoints failed:', err);
    return [];
  }
}
