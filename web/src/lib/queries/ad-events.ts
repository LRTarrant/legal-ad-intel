import { supabase } from "../supabase";
import type { Database } from "../database.types";

type AdEvent = Database["public"]["Tables"]["ad_events"]["Row"];

export async function getAdEventCount() {
  const { count, error } = await supabase
    .from("ad_events")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getTotalSpend() {
  const { data, error } = await supabase.from("ad_events").select("*");

  if (error) throw error;
  return ((data ?? []) as AdEvent[]).reduce(
    (sum, row) => sum + (row.spend_estimate ?? 0),
    0,
  );
}

export async function getRecentAdEvents(limit = 20) {
  const { data, error } = await supabase
    .from("ad_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AdEvent[];
}

export async function getTopFirmsBySpend(limit = 10) {
  const { data, error } = await supabase.from("ad_events").select("*");

  if (error) throw error;

  const spendByFirm = new Map<string, number>();
  for (const row of ((data ?? []) as AdEvent[])) {
    if (!row.firm_id) continue;
    spendByFirm.set(
      row.firm_id,
      (spendByFirm.get(row.firm_id) ?? 0) + (row.spend_estimate ?? 0),
    );
  }

  return Array.from(spendByFirm.entries())
    .map(([firmId, totalSpend]) => ({ firmId, totalSpend }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

export async function getTopMarketsBySpend(limit = 10) {
  const { data, error } = await supabase.from("ad_events").select("*");

  if (error) throw error;

  const spendByMarket = new Map<string, number>();
  for (const row of ((data ?? []) as AdEvent[])) {
    if (!row.market_id) continue;
    spendByMarket.set(
      row.market_id,
      (spendByMarket.get(row.market_id) ?? 0) + (row.spend_estimate ?? 0),
    );
  }

  return Array.from(spendByMarket.entries())
    .map(([marketId, totalSpend]) => ({ marketId, totalSpend }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

export async function getSpendByChannel() {
  const { data, error } = await supabase.from("ad_events").select("*");

  if (error) throw error;

  const spendByChannel = new Map<string, number>();
  for (const row of ((data ?? []) as AdEvent[])) {
    const ch = row.channel ?? "Unknown";
    spendByChannel.set(
      ch,
      (spendByChannel.get(ch) ?? 0) + (row.spend_estimate ?? 0),
    );
  }

  return Array.from(spendByChannel.entries())
    .map(([channel, totalSpend]) => ({ channel, totalSpend }))
    .sort((a, b) => b.totalSpend - a.totalSpend);
}
