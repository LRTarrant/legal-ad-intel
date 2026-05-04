import { getSupabase } from "@/lib/supabase";

export type CreativeObservation = {
  id: string;
  channel: string;
  platform: string;
  campaign_name: string;
  spend_estimate: number;
  impressions_estimate: number;
  airings_count: number | null;
  estimated_reach: number;
  event_date: string;
  firm_name: string;
  tort_name: string;
  market_name: string;
};

export type CreativeFilters = {
  firms: string[];
  channels: string[];
  torts: string[];
  markets: string[];
};

/**
 * Returns all ad_events joined with firms, mass_torts, and markets.
 * Sorted by spend descending.
 */
export async function getCreativeObservations(): Promise<CreativeObservation[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const { data, error } = await sb
    .from("ad_events")
    .select(`
      id,
      channel,
      platform,
      campaign_name,
      spend_estimate,
      impressions_estimate,
      airings_count,
      estimated_reach,
      event_date,
      advertiser_firms!inner ( name ),
      mass_torts!inner ( name ),
      markets!inner ( market_name )
    `)
    .order("spend_estimate", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch creative observations: ${error.message}`);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    channel: row.channel as string,
    platform: row.platform as string,
    campaign_name: row.campaign_name as string,
    spend_estimate: Number(row.spend_estimate) || 0,
    impressions_estimate: Number(row.impressions_estimate) || 0,
    airings_count: row.airings_count != null ? Number(row.airings_count) : null,
    estimated_reach: Number(row.estimated_reach) || 0,
    event_date: row.event_date as string,
    firm_name: (row.advertiser_firms as Record<string, unknown>)?.name as string ?? "",
    tort_name: (row.mass_torts as Record<string, unknown>)?.name as string ?? "",
    market_name: (row.markets as Record<string, unknown>)?.market_name as string ?? "",
  }));
}

/**
 * Returns distinct filter values for the creative gallery dropdowns.
 */
export async function getCreativeFilters(): Promise<CreativeFilters> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const [eventsRes, firmsRes, tortsRes, marketsRes] = await Promise.all([
    sb.from("ad_events").select("channel"),
    sb.from("advertiser_firms").select("name").order("name"),
    sb.from("mass_torts").select("name").order("name"),
    sb.from("markets").select("market_name").order("market_name"),
  ]);

  if (eventsRes.error) throw new Error(`Failed to fetch channels: ${eventsRes.error.message}`);
  if (firmsRes.error) throw new Error(`Failed to fetch firms: ${firmsRes.error.message}`);
  if (tortsRes.error) throw new Error(`Failed to fetch torts: ${tortsRes.error.message}`);
  if (marketsRes.error) throw new Error(`Failed to fetch markets: ${marketsRes.error.message}`);

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

  const marketSet = new Set<string>();
  for (const row of marketsRes.data ?? []) {
    if (row.market_name) marketSet.add(row.market_name as string);
  }

  return {
    firms: Array.from(firmSet).sort(),
    channels: Array.from(channelSet).sort(),
    torts: Array.from(tortSet).sort(),
    markets: Array.from(marketSet).sort(),
  };
}
