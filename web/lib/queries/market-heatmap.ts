import { getSupabase } from "@/lib/supabase";

export type MarketAdEvent = {
  id: string;
  channel: string;
  spend_estimate: number;
  impressions_estimate: number;
  estimated_reach: number;
  event_date: string;
  firm_name: string;
  tort_name: string;
  market_name: string;
  state_code: string;
  region: string;
};

export type MarketFilters = {
  torts: string[];
  channels: string[];
  advertisers: string[];
};

/**
 * Returns all ad_events rows joined with markets, firms, and mass_torts.
 * Client-side code groups by market and aggregates.
 */
export async function getMarketHeatmapData(): Promise<MarketAdEvent[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const { data, error } = await sb
    .from("ad_events")
    .select(`
      id,
      channel,
      spend_estimate,
      impressions_estimate,
      estimated_reach,
      event_date,
      advertiser_firms!inner ( name ),
      mass_torts!inner ( name ),
      markets!inner ( market_name, state_code, region )
    `)
    .order("spend_estimate", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch market heatmap data: ${error.message}`);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    channel: row.channel as string,
    spend_estimate: Number(row.spend_estimate) || 0,
    impressions_estimate: Number(row.impressions_estimate) || 0,
    estimated_reach: Number(row.estimated_reach) || 0,
    event_date: row.event_date as string,
    firm_name: (row.advertiser_firms as Record<string, unknown>)?.name as string ?? "",
    tort_name: (row.mass_torts as Record<string, unknown>)?.name as string ?? "",
    market_name: (row.markets as Record<string, unknown>)?.market_name as string ?? "",
    state_code: (row.markets as Record<string, unknown>)?.state_code as string ?? "",
    region: (row.markets as Record<string, unknown>)?.region as string ?? "",
  }));
}

/**
 * Returns distinct filter values for the market heatmap dropdowns.
 */
export async function getMarketFilters(): Promise<MarketFilters> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const [eventsRes, firmsRes, tortsRes] = await Promise.all([
    sb.from("ad_events").select("channel"),
    sb.from("advertiser_firms").select("name").order("name"),
    sb.from("mass_torts").select("name").order("name"),
  ]);

  if (eventsRes.error) throw new Error(`Failed to fetch channels: ${eventsRes.error.message}`);
  if (firmsRes.error) throw new Error(`Failed to fetch firms: ${firmsRes.error.message}`);
  if (tortsRes.error) throw new Error(`Failed to fetch torts: ${tortsRes.error.message}`);

  const channelSet = new Set<string>();
  for (const row of eventsRes.data ?? []) {
    if (row.channel) channelSet.add(row.channel as string);
  }

  const firmSet = new Set<string>();
  for (const row of firmsRes.data ?? []) {
    if (row.name) firmSet.add(row.name as string);
  }

  const tortSet = new Set<string>();
  for (const row of tortsRes.data ?? []) {
    if (row.name) tortSet.add(row.name as string);
  }

  return {
    torts: Array.from(tortSet).sort(),
    channels: Array.from(channelSet).sort(),
    advertisers: Array.from(firmSet).sort(),
  };
}
