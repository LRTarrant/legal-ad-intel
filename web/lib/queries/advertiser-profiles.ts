import { getSupabase } from "@/lib/supabase";

export type AdvertiserProfile = {
  id: string;
  canonical_name: string;
  entity_type: string;
  segment: string;
  website: string | null;
  format_count: number;
  tort_count: number;
  market_count: number;
  total_observations: number;
  total_creatives: number;
  total_spend: number;
  channels: string[];
  tort_ids: string[];
};

export type AdvertiserFilters = {
  channels: string[];
  torts: string[];
  tortIdToSlug: Record<string, string>;
};

/**
 * Returns aggregated advertiser profiles with observation stats.
 * Joins advertiser_entities with ad_observations_normalized to compute
 * format_count, tort_count, market_count, total_observations, total_creatives, total_spend.
 */
export async function getAdvertiserProfiles(): Promise<AdvertiserProfile[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  // Use raw SQL via rpc since we need GROUP BY aggregation.
  // Supabase JS client doesn't support aggregate functions natively,
  // so we query the two tables separately and aggregate in JS.
  const { data: advertisers, error: aeError } = await sb
    .from("advertiser_entities")
    .select("id, canonical_name, entity_type, segment, website");

  if (aeError) throw new Error(`Failed to fetch advertisers: ${aeError.message}`);

  const { data: observations, error: aonError } = await sb
    .from("ad_observations_normalized")
    .select("advertiser_id, ad_format, tort_id, geo_target_id, observation_count, unique_creatives, estimated_spend");

  if (aonError) throw new Error(`Failed to fetch observations: ${aonError.message}`);

  // Group observations by advertiser_id
  const obsMap = new Map<string, typeof observations>();
  for (const obs of observations ?? []) {
    const id = obs.advertiser_id as string;
    if (!obsMap.has(id)) obsMap.set(id, []);
    obsMap.get(id)!.push(obs);
  }

  const profiles: AdvertiserProfile[] = ((advertisers ?? []) as Array<{
    id: string;
    canonical_name: string;
    entity_type: string;
    segment: string;
    website: string | null;
  }>).map((ae) => {
    const rows = obsMap.get(ae.id) ?? [];
    const formats = new Set<string>();
    const torts = new Set<string>();
    const geos = new Set<string>();
    let totalObs = 0;
    let totalCreatives = 0;
    let totalSpend = 0;

    for (const r of rows) {
      if (r.ad_format) formats.add(r.ad_format as string);
      if (r.tort_id) torts.add(r.tort_id as string);
      if (r.geo_target_id) geos.add(r.geo_target_id as string);
      totalObs += Number(r.observation_count) || 0;
      totalCreatives += Number(r.unique_creatives) || 0;
      totalSpend += Number(r.estimated_spend) || 0;
    }

    return {
      id: ae.id,
      canonical_name: ae.canonical_name,
      entity_type: ae.entity_type,
      segment: ae.segment,
      website: ae.website,
      format_count: formats.size,
      tort_count: torts.size,
      market_count: geos.size,
      total_observations: totalObs,
      total_creatives: totalCreatives,
      total_spend: totalSpend,
      channels: Array.from(formats),
      tort_ids: Array.from(torts),
    };
  });

  // Sort by spend descending
  profiles.sort((a, b) => b.total_spend - a.total_spend);

  return profiles;
}

/**
 * Returns distinct channels (ad_format) and torts for filter dropdowns.
 */
export async function getAdvertiserFilters(): Promise<AdvertiserFilters> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const [channelRes, tortRes] = await Promise.all([
    sb
      .from("ad_observations_normalized")
      .select("ad_format")
      .order("ad_format"),
    sb
      .from("torts")
      .select("id, slug")
      .order("slug"),
  ]);

  if (channelRes.error) throw new Error(`Failed to fetch channels: ${channelRes.error.message}`);
  if (tortRes.error) throw new Error(`Failed to fetch torts: ${tortRes.error.message}`);

  // Deduplicate channels
  const channelSet = new Set<string>();
  for (const row of channelRes.data ?? []) {
    if (row.ad_format) channelSet.add(row.ad_format as string);
  }

  // Build tort id→slug map and slugs list
  const tortSet = new Set<string>();
  const tortIdToSlug: Record<string, string> = {};
  for (const row of tortRes.data ?? []) {
    if (row.slug) {
      tortSet.add(row.slug as string);
      tortIdToSlug[row.id as string] = row.slug as string;
    }
  }

  return {
    channels: Array.from(channelSet).sort(),
    torts: Array.from(tortSet).sort(),
    tortIdToSlug,
  };
}
