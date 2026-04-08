import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import type { FatalitiesFilters, HeatmapPoint } from "./fatalities";

type RpcFunctions = Database["public"]["Functions"];
type MotorcycleTotalsRow = RpcFunctions["get_fars_motorcycle_totals"]["Returns"][number];
type MotorcycleTrendRow = RpcFunctions["get_fars_motorcycle_trend_by_year"]["Returns"][number];

export interface MotorcycleTrendByYear {
  year: number;
  total_fatalities: number;
  total_crashes: number;
}

function toRpcFilters(filters?: FatalitiesFilters) {
  return {
    filter_state: filters?.state ?? null,
    filter_county: filters?.county ?? null,
  };
}

export async function getMotorcycleTotals(
  filters?: FatalitiesFilters
): Promise<{ total_fatalities: number; total_crashes: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_fars_motorcycle_totals",
    toRpcFilters(filters) as never
  );
  if (error) throw error;
  const row = ((data ?? []) as MotorcycleTotalsRow[])[0];
  return {
    total_fatalities: Number(row?.total_fatalities ?? 0),
    total_crashes: Number(row?.total_crashes ?? 0),
  };
}

export async function getMotorcycleTrendByYear(
  filters?: FatalitiesFilters
): Promise<MotorcycleTrendByYear[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_fars_motorcycle_trend_by_year",
    toRpcFilters(filters) as never
  );
  if (error) throw error;
  return ((data ?? []) as MotorcycleTrendRow[]).map((row) => ({
    year: Number(row.year),
    total_fatalities: Number(row.total_fatalities),
    total_crashes: Number(row.total_crashes),
  }));
}

export async function getMotorcycleHeatmapPoints(
  filters?: FatalitiesFilters
): Promise<HeatmapPoint[]> {
  const pageSize = 1000;
  const rows: HeatmapPoint[] = [];
  let from = 0;

  while (true) {
    let query = getSupabase()
      .from("fars_fatalities")
      .select("latitude, longitude, fatalities")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .eq("has_motorcycle", true)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (filters?.state) {
      query = query.eq("state", filters.state);
    }

    if (filters?.county != null) {
      query = query.eq("county_fips", filters.county);
    }

    const { data, error } = await query;
    if (error) throw error;
    const batch = ((data ?? []) as { latitude: number; longitude: number; fatalities: number }[]).map((row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      intensity: Math.max(Number(row.fatalities ?? 1), 1),
    }));

    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}
