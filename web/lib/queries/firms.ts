import { supabase } from "../supabase";
import type { DashboardFilters } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters?: DashboardFilters) {
  if (!filters) return query;
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.marketId) query = query.eq("market_id", filters.marketId);
  if (filters.massTortId) query = query.eq("mass_tort_id", filters.massTortId);
  if (filters.dateFrom) query = query.gte("event_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("event_date", filters.dateTo);
  return query;
}

export async function getFirms() {
  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getActiveFirmCount(filters?: DashboardFilters) {
  const base = supabase.from("ad_events").select("firm_id");
  const { data, error } = await applyFilters(base, filters);
  if (error) throw error;
  const ids = new Set(
    (data ?? [])
      .map((r: { firm_id: string | null }) => r.firm_id)
      .filter(Boolean)
  );
  return ids.size;
}

export async function getTopFirmsBySpend(
  limit = 10,
  filters?: DashboardFilters
) {
  const base = supabase.from("ad_events").select("*");
  const { data, error } = await applyFilters(base, filters);
  if (error) throw error;

  const firmSpend = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.firm_id || !row.spend_estimate) continue;
    firmSpend.set(
      row.firm_id,
      (firmSpend.get(row.firm_id) ?? 0) + Number(row.spend_estimate)
    );
  }

  const firmIds = [...firmSpend.keys()];
  if (firmIds.length === 0) return [];

  const { data: firms } = await supabase
    .from("firms")
    .select("*")
    .in("id", firmIds);

  const firmMap = new Map((firms ?? []).map((f) => [f.id, f.name]));

  return Array.from(firmSpend.entries())
    .map(([id, total]) => ({ name: firmMap.get(id) ?? "Unknown", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
