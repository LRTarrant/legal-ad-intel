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

/**
 * Returns motorcycle crash heatmap data via a server-side aggregation RPC.
 *
 * WARNING: Do NOT replace this with a client-side pagination loop over
 * fars_fatalities. See the comment on getCrashHeatmapPoints in fatalities.ts.
 */
export async function getMotorcycleHeatmapPoints(
  filters?: FatalitiesFilters
): Promise<HeatmapPoint[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_fars_motorcycle_heatmap", {
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
