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
    .map(([id, total]) => ({ name: marketMap.get(id) ?? "Unknown", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
