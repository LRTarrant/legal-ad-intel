import { getSupabase, type Tables } from "@/lib/supabase";

export type Market = Tables<"markets">;

export async function getMarkets(limit = 100): Promise<Market[]> {
  const { data, error } = await getSupabase()
    .from("markets")
    .select("*")
    .order("market_name", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch markets: ${error.message}`);
  return data;
}

export async function getMarketById(id: string): Promise<Market> {
  const { data, error } = await getSupabase()
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch market: ${error.message}`);
  return data;
}

export async function getMarketCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("markets")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count markets: ${error.message}`);
  return count ?? 0;
}

async function fetchAllMarkets(): Promise<Market[]> {
  const { data, error } = await getSupabase().from("markets").select("*");
  if (error) throw new Error(`Failed to fetch markets: ${error.message}`);
  return data;
}

async function fetchAdEventsWithMarket(): Promise<Tables<"ad_events">[]> {
  const { data, error } = await getSupabase()
    .from("ad_events")
    .select("*")
    .not("market_id", "is", null);
  if (error) throw new Error(`Failed to fetch ad events: ${error.message}`);
  return data;
}

export async function getTopMarketsByAdSpend(limit = 10): Promise<
  Array<{ market_id: string; market_name: string; total_spend: number; event_count: number }>
> {
  const [events, markets] = await Promise.all([fetchAdEventsWithMarket(), fetchAllMarkets()]);

  const marketMap = new Map(markets.map((m) => [m.id, m.market_name]));

  const grouped = new Map<string, { market_id: string; market_name: string; total_spend: number; event_count: number }>();
  for (const event of events) {
    if (!event.market_id) continue;
    const key = event.market_id;
    const existing = grouped.get(key) ?? {
      market_id: event.market_id,
      market_name: marketMap.get(event.market_id) ?? "Unknown",
      total_spend: 0,
      event_count: 0,
    };
    existing.total_spend += Number(event.spend_estimate ?? 0);
    existing.event_count += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, limit);
}
