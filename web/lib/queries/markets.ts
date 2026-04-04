import { supabase } from "../supabase";

export async function getMarkets() {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("market_name");
  if (error) throw error;
  return data;
}

export async function getMarketCount() {
  const { count, error } = await supabase
    .from("markets")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getMarketById(id: string) {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data;
}

export async function getMarketAdEvents(marketId: string, limit = 20) {
  const { data, error } = await supabase
    .from("ad_events")
    .select("*")
    .eq("market_id", marketId)
    .order("event_date", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  const firmIds = [
    ...new Set(rows.map((r) => r.firm_id).filter(Boolean)),
  ] as string[];
  const tortIds = [
    ...new Set(rows.map((r) => r.mass_tort_id).filter(Boolean)),
  ] as string[];

  const [firmsRes, tortsRes] = await Promise.all([
    firmIds.length > 0
      ? supabase.from("firms").select("*").in("id", firmIds)
      : { data: [], error: null },
    tortIds.length > 0
      ? supabase.from("mass_torts").select("*").in("id", tortIds)
      : { data: [], error: null },
  ]);

  const firmMap = new Map((firmsRes.data ?? []).map((f) => [f.id, f.name]));
  const tortMap = new Map((tortsRes.data ?? []).map((t) => [t.id, t.name]));

  return rows.map((row) => ({
    id: row.id,
    event_date: row.event_date,
    channel: row.channel,
    spend_estimate: row.spend_estimate,
    firm_name: (row.firm_id && firmMap.get(row.firm_id)) ?? "Unknown",
    mass_tort_name: (row.mass_tort_id && tortMap.get(row.mass_tort_id)) ?? null,
  }));
}

export async function getMarketSpendByChannel(marketId: string) {
  const { data, error } = await supabase
    .from("ad_events")
    .select("*")
    .eq("market_id", marketId);
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

export async function getMarketTopFirms(marketId: string, limit = 10) {
  const { data, error } = await supabase
    .from("ad_events")
    .select("*")
    .eq("market_id", marketId);
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

export async function getMarketStats(marketId: string) {
  const { data, error } = await supabase
    .from("ad_events")
    .select("*")
    .eq("market_id", marketId);
  if (error) throw error;

  const rows = data ?? [];
  const totalEvents = rows.length;
  const totalSpend = rows.reduce(
    (sum, row) => sum + (Number(row.spend_estimate) || 0),
    0
  );
  const activeFirms = new Set(rows.map((r) => r.firm_id).filter(Boolean)).size;

  return { totalEvents, totalSpend, activeFirms };
}

export async function getTopMarketsBySpend(limit = 10) {
  const { data, error } = await supabase.from("ad_events").select("*");
  if (error) throw error;

  const marketSpend = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.market_id || !row.spend_estimate) continue;
    marketSpend.set(
      row.market_id,
      (marketSpend.get(row.market_id) ?? 0) + Number(row.spend_estimate)
    );
  }

  const marketIds = [...marketSpend.keys()];
  if (marketIds.length === 0) return [];

  const { data: markets } = await supabase
    .from("markets")
    .select("*")
    .in("id", marketIds);

  const marketMap = new Map(
    (markets ?? []).map((m) => [m.id, m.market_name])
  );

  return Array.from(marketSpend.entries())
    .map(([id, total]) => ({
      id,
      name: marketMap.get(id) ?? "Unknown",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
