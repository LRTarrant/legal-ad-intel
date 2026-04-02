import { supabase } from "../supabase";

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
  return (data ?? []).reduce(
    (sum, row) => sum + (Number(row.spend_estimate) || 0),
    0
  );
}

export async function getRecentAdEvents(limit = 20) {
  const { data, error } = await supabase
    .from("ad_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  const firmIds = [...new Set(rows.map((r) => r.firm_id).filter(Boolean))] as string[];
  const marketIds = [...new Set(rows.map((r) => r.market_id).filter(Boolean))] as string[];
  const tortIds = [...new Set(rows.map((r) => r.mass_tort_id).filter(Boolean))] as string[];

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
  const marketMap = new Map((marketsRes.data ?? []).map((m) => [m.id, m.market_name]));
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

export async function getSpendByChannel() {
  const { data, error } = await supabase.from("ad_events").select("*");
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
