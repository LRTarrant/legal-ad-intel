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

export async function getAdEventCount(filters?: DashboardFilters) {
  const base = supabase
    .from("ad_events")
    .select("*", { count: "exact", head: true });
  const { count, error } = await applyFilters(base, filters);
  if (error) throw error;
  return count ?? 0;
}

export async function getTotalSpend(filters?: DashboardFilters) {
  const base = supabase.from("ad_events").select("spend_estimate");
  const { data, error } = await applyFilters(base, filters);
  if (error) throw error;
  return (data ?? []).reduce(
    (sum: number, row: { spend_estimate: number | null }) =>
      sum + (Number(row.spend_estimate) || 0),
    0
  );
}

export async function getRecentAdEvents(
  limit = 20,
  filters?: DashboardFilters
) {
  let base = supabase.from("ad_events").select("*");
  base = applyFilters(base, filters);
  const { data, error } = await base
    .order("event_date", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  const firmIds = [
    ...new Set(rows.map((r: { firm_id: string | null }) => r.firm_id).filter(Boolean)),
  ] as string[];
  const marketIds = [
    ...new Set(rows.map((r: { market_id: string | null }) => r.market_id).filter(Boolean)),
  ] as string[];
  const tortIds = [
    ...new Set(rows.map((r: { mass_tort_id: string | null }) => r.mass_tort_id).filter(Boolean)),
  ] as string[];

  const [firmsRes, marketsRes, tortsRes] = await Promise.all([
    firmIds.length > 0
      ? supabase.from("firms").select("*").in("id", firmIds)
      : { data: [], error: null },
    marketIds.length > 0
      ? supabase.from("markets").select("*").in("id", marketIds)
      : { data: [], error: null },
    tortIds.length > 0
      ? supabase.from("mass_torts").select("*").in("id", tortIds)
      : { data: [], error: null },
  ]);

  const firmMap = new Map((firmsRes.data ?? []).map((f) => [f.id, f.name]));
  const marketMap = new Map(
    (marketsRes.data ?? []).map((m) => [m.id, m.market_name])
  );
  const tortMap = new Map((tortsRes.data ?? []).map((t) => [t.id, t.name]));

  return rows.map((row) => ({
    id: row.id,
    event_date: row.event_date,
    channel: row.channel,
    spend_estimate: row.spend_estimate,
    campaign_name: row.campaign_name,
    firm_name: (row.firm_id && firmMap.get(row.firm_id)) ?? "Unknown",
    market_name: (row.market_id && marketMap.get(row.market_id)) ?? "Unknown",
    mass_tort_name: (row.mass_tort_id && tortMap.get(row.mass_tort_id)) ?? null,
  }));
}

export async function getSpendByChannel(filters?: DashboardFilters) {
  const base = supabase.from("ad_events").select("*");
  const { data, error } = await applyFilters(base, filters);
  if (error) throw error;

  const channelSpend = new Map<string, number>();
  for (const row of data ?? []) {
    const ch = row.channel ?? "unknown";
    channelSpend.set(
      ch,
      (channelSpend.get(ch) ?? 0) + (Number(row.spend_estimate) || 0)
    );
  }

  return Array.from(channelSpend.entries())
    .map(([channel, total]) => ({ channel, total }))
    .sort((a, b) => b.total - a.total);
}

export async function getDistinctChannels() {
  const { data, error } = await supabase
    .from("ad_events")
    .select("channel");
  if (error) throw error;
  const channels = new Set<string>();
  for (const row of data ?? []) {
    if (row.channel) channels.add(row.channel);
  }
  return Array.from(channels).sort();
}
