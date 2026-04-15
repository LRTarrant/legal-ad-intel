import { getSupabase } from "@/lib/supabase";

export type SaturationScore = {
  id: string;
  tort_id: string;
  tort_label: string;
  geo_target_id: string;
  geo_name: string;
  period_start: string;
  period_end: string;
  total_advertisers: number;
  total_creatives: number;
  total_observations: number;
  estimated_spend: number;
  estimated_impressions: number;
  saturation_score: number;
  spend_rank: number;
  top_advertisers: string[];
  computed_at: string;
};

export type SaturationFilters = {
  torts: { id: string; label: string }[];
  markets: { id: string; geo_name: string }[];
};

export type AdvertiserEntity = {
  id: string;
  canonical_name: string;
};

export type ChannelMixRow = {
  ad_format: string;
  total_spend: number;
  total_impressions: number;
  total_observations: number;
  total_creatives: number;
};

/**
 * Fetches all rows from ad_saturation_scores with joined tort labels and geo names.
 */
export async function getSaturationScores(): Promise<SaturationScore[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const { data, error } = await sb
    .from("ad_saturation_scores")
    .select(
      "id, tort_id, geo_target_id, period_start, period_end, total_advertisers, total_creatives, total_observations, estimated_spend, estimated_impressions, saturation_score, spend_rank, top_advertisers, computed_at, torts(label), geo_targets(geo_name)"
    )
    .order("saturation_score", { ascending: false, nullsFirst: false });

  if (error)
    throw new Error(`Failed to fetch saturation scores: ${error.message}`);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    tort_id: row.tort_id as string,
    tort_label: ((row.torts as Record<string, unknown>)?.label as string) ?? "",
    geo_target_id: row.geo_target_id as string,
    geo_name:
      ((row.geo_targets as Record<string, unknown>)?.geo_name as string) ?? "",
    period_start: row.period_start as string,
    period_end: row.period_end as string,
    total_advertisers: Number(row.total_advertisers) || 0,
    total_creatives: Number(row.total_creatives) || 0,
    total_observations: Number(row.total_observations) || 0,
    estimated_spend: Number(row.estimated_spend) || 0,
    estimated_impressions: Number(row.estimated_impressions) || 0,
    saturation_score: Number(row.saturation_score) || 0,
    spend_rank: Number(row.spend_rank) || 0,
    top_advertisers: Array.isArray(row.top_advertisers)
      ? (row.top_advertisers as string[])
      : [],
    computed_at: row.computed_at as string,
  }));
}

/**
 * Returns distinct tort and market options for filter dropdowns.
 */
export async function getSaturationFilters(): Promise<SaturationFilters> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const [tortRes, geoRes] = await Promise.all([
    sb.from("torts").select("id, label").order("label"),
    sb.from("geo_targets").select("id, geo_name").order("geo_name"),
  ]);

  if (tortRes.error)
    throw new Error(`Failed to fetch torts: ${tortRes.error.message}`);
  if (geoRes.error)
    throw new Error(`Failed to fetch geo targets: ${geoRes.error.message}`);

  return {
    torts: ((tortRes.data ?? []) as Array<{ id: string; label: string }>),
    markets: ((geoRes.data ?? []) as Array<{ id: string; geo_name: string }>),
  };
}

/**
 * Fetches all advertiser entities for resolving top_advertisers UUIDs to names.
 */
export async function getAdvertiserEntities(): Promise<AdvertiserEntity[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const { data, error } = await sb
    .from("advertiser_entities")
    .select("id, canonical_name")
    .order("canonical_name");

  if (error)
    throw new Error(
      `Failed to fetch advertiser entities: ${error.message}`
    );

  return (data ?? []) as AdvertiserEntity[];
}

/**
 * Fetches channel mix data for a specific tort + market combination.
 * Aggregates ad_observations_normalized by ad_format.
 */
export async function getChannelMix(
  tortId: string,
  geoTargetId: string
): Promise<ChannelMixRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  const { data, error } = await sb
    .from("ad_observations_normalized")
    .select(
      "ad_format, estimated_spend, impressions, observation_count, unique_creatives"
    )
    .eq("tort_id", tortId)
    .eq("geo_target_id", geoTargetId);

  if (error)
    throw new Error(`Failed to fetch channel mix: ${error.message}`);

  // Aggregate by ad_format in JS
  const byFormat = new Map<
    string,
    { spend: number; impressions: number; observations: number; creatives: number }
  >();

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const format = (row.ad_format as string) || "unknown";
    const existing = byFormat.get(format) ?? {
      spend: 0,
      impressions: 0,
      observations: 0,
      creatives: 0,
    };
    existing.spend += Number(row.estimated_spend) || 0;
    existing.impressions += Number(row.impressions) || 0;
    existing.observations += Number(row.observation_count) || 0;
    existing.creatives += Number(row.unique_creatives) || 0;
    byFormat.set(format, existing);
  }

  return Array.from(byFormat.entries())
    .map(([format, agg]) => ({
      ad_format: format,
      total_spend: agg.spend,
      total_impressions: agg.impressions,
      total_observations: agg.observations,
      total_creatives: agg.creatives,
    }))
    .sort((a, b) => b.total_spend - a.total_spend);
}
