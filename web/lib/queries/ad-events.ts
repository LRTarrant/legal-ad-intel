import { getSupabase, type Tables } from "@/lib/supabase";

export type AdEvent = Tables<"ad_events">;

export interface AdEventFilters {
  firmId?: string;
  marketId?: string;
  massTortId?: string;
  channel?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
}

export interface SpendByChannel {
  channel: string | null;
  total_spend: number;
  total_impressions: number;
  event_count: number;
}

async function fetchAdEvents(): Promise<AdEvent[]> {
  const { data, error } = await getSupabase()
    .from("ad_events")
    .select("*");

  if (error) throw new Error(`Failed to fetch ad events: ${error.message}`);
  return data;
}

export async function getRecentAdEvents(limit = 20): Promise<AdEvent[]> {
  const { data, error } = await getSupabase()
    .from("ad_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch recent ad events: ${error.message}`);
  return data;
}

export async function getAdEvents(filters: AdEventFilters = {}, limit = 50): Promise<AdEvent[]> {
  let query = getSupabase()
    .from("ad_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (filters.firmId) query = query.eq("firm_id", filters.firmId);
  if (filters.marketId) query = query.eq("market_id", filters.marketId);
  if (filters.massTortId) query = query.eq("mass_tort_id", filters.massTortId);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.startDate) query = query.gte("event_date", filters.startDate);
  if (filters.endDate) query = query.lte("event_date", filters.endDate);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch ad events: ${error.message}`);
  return data;
}

export async function getAdEventCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("ad_events")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count ad events: ${error.message}`);
  return count ?? 0;
}

export async function getSpendByChannel(): Promise<SpendByChannel[]> {
  const events = await fetchAdEvents();

  const grouped = new Map<string | null, SpendByChannel>();
  for (const event of events) {
    const key = event.channel;
    const existing = grouped.get(key) ?? {
      channel: key,
      total_spend: 0,
      total_impressions: 0,
      event_count: 0,
    };
    existing.total_spend += Number(event.spend_estimate ?? 0);
    existing.total_impressions += Number(event.impressions_estimate ?? 0);
    existing.event_count += 1;
    grouped.set(key, existing);
  }
  return Array.from(grouped.values());
}

export async function getTotalSpend(): Promise<number> {
  const events = await fetchAdEvents();
  return events.reduce((sum, row) => sum + Number(row.spend_estimate ?? 0), 0);
}
