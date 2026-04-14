import { getSupabase } from "@/lib/supabase";

export type Tort = {
  id: string;
  slug: string;
  label: string;
  category: string | null;
};

export type AdSaturationRow = {
  id: string;
  tort_id?: string;
  geo_target_id?: string;
  tort_slug: string;
  tort_label: string;
  tort_category: string | null;
  geo_type: string;
  geo_code: string;
  geo_name: string;
  state_abbr: string | null;
  geo_population: number | null;
  period_start: string;
  period_end: string;
  total_advertisers: number;
  total_creatives: number;
  total_observations: number;
  estimated_spend: number | null;
  estimated_impressions: number | null;
  saturation_score: number | null;
  spend_rank: number | null;
  format_breakdown: Record<string, number> | null;
  top_advertisers: Array<{ name: string; spend: number; creatives: number }> | null;
  computed_at: string;
};

export async function getTorts(): Promise<Tort[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("torts")
    .select("id, slug, label, category")
    .order("label");
  if (error) throw new Error(`Failed to fetch torts: ${error.message}`);
  return (data ?? []) as Tort[];
}

export async function getTortBySlug(slug: string): Promise<Tort | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("torts")
    .select("id, slug, label, category")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch tort: ${error.message}`);
  return data as Tort | null;
}

export async function getAdSaturationSummary(opts?: {
  tortSlug?: string;
  geoType?: string;
  limit?: number;
}): Promise<AdSaturationRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  let query = sb
    .from("ad_saturation_summary")
    .select("*")
    .order("saturation_score", { ascending: false, nullsFirst: false });
  if (opts?.tortSlug) query = query.eq("tort_slug", opts.tortSlug);
  if (opts?.geoType) query = query.eq("geo_type", opts.geoType);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch ad saturation: ${error.message}`);
  return (data ?? []) as AdSaturationRow[];
}

export async function getAdSaturationKpis(): Promise<{
  totalTorts: number;
  totalGeos: number;
  totalObservations: number;
  avgScore: number | null;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_ad_saturation_kpis").single();
  if (error) {
    return { totalTorts: 0, totalGeos: 0, totalObservations: 0, avgScore: null };
  }
  return data;
}

// --- Advertiser Segmentation ---

export type SegmentSummary = {
  segment: string;
  advertiser_count: number;
  total_spend: number;
  total_creatives: number;
  avg_spend_per_advertiser: number;
};

export type TopAdvertiserBySegment = {
  advertiser_id?: string | null;
  advertiser_name: string;
  segment: string;
  entity_type: string;
  total_spend: number;
  total_creatives: number;
  market_count: number;
};

export type AdvertiserCompetitiveSummary = {
  advertiser_id?: string | null;
  advertiser_name: string;
  segment: string;
  entity_type: string;
  total_spend: number;
  total_creatives: number;
  total_observations: number;
  tort_count: number;
  market_count: number;
};

export type AdvertiserPlatforms = {
  advertiser_id: string | null;
  advertiser_name: string | null;
  platforms: string[];
};

export type AdSaturationWindowedRow = {
  tort_slug: string;
  tort_label: string;
  tort_category: string;
  geo_name: string;
  state_abbr: string | null;
  geo_code: string;
  geo_type: string;
  geo_population: number | null;
  total_advertisers: number;
  total_creatives: number;
  total_observations: number;
  estimated_spend: number;
  saturation_score: number | null;
  tort_id: string;
  geo_target_id: string;
};

export type TortMarketAdvertiser = {
  advertiser_id: string;
  advertiser_name: string;
  segment: string;
  entity_type: string;
  total_spend: number;
  total_creatives: number;
  total_observations: number;
  spend_share_pct: number;
};

export async function getSegmentSummary(
  tortSlug?: string,
  source?: string
): Promise<SegmentSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_segment_summary", {
    p_tort_slug: tortSlug ?? null,
    p_source: source ?? null,
  });
  if (error) {
    console.error("Failed to fetch segment summary:", error.message);
    return [];
  }
  return (data ?? []) as SegmentSummary[];
}

export async function getTopAdvertisersBySegment(
  tortSlug?: string,
  limit = 20,
  source?: string
): Promise<TopAdvertiserBySegment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_top_advertisers_by_segment", {
    p_tort_slug: tortSlug ?? null,
    p_limit: limit,
    p_source: source ?? null,
  });
  if (error) {
    console.error("Failed to fetch top advertisers:", error.message);
    return [];
  }
  return (data ?? []) as TopAdvertiserBySegment[];
}

export async function getAdvertiserCompetitiveSummary(
  tortSlug?: string,
  stateAbbr?: string,
  source?: string
): Promise<AdvertiserCompetitiveSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_advertiser_competitive_summary", {
    p_tort_slug: tortSlug ?? null,
    p_state_abbr: stateAbbr ?? null,
    p_source: source ?? null,
  });
  if (error) {
    console.error("Failed to fetch advertiser competitive summary:", error.message);
    return [];
  }
  return (data ?? []) as AdvertiserCompetitiveSummary[];
}

export async function getAdvertiserPlatforms(
  tortSlug?: string,
  stateAbbr?: string,
  source?: string
): Promise<AdvertiserPlatforms[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_advertiser_platforms", {
    p_tort_slug: tortSlug ?? null,
    p_state_abbr: stateAbbr ?? null,
    p_source: source ?? null,
  });
  if (error) {
    console.error("Failed to fetch advertiser platforms:", error.message);
    return [];
  }
  return (data ?? []) as AdvertiserPlatforms[];
}

export async function getTortMarketAdvertisers(
  tortId: string,
  geoTargetId: string
): Promise<TortMarketAdvertiser[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_tort_market_advertisers", {
    p_tort_id: tortId,
    p_geo_target_id: geoTargetId,
  });
  if (error) {
    console.error("Failed to fetch tort/market advertisers:", error.message);
    return [];
  }
  return (data ?? []) as TortMarketAdvertiser[];
}

export async function getAdvertiserPlatforms(
  tortSlug?: string,
  stateAbbr?: string
): Promise<Record<string, string[]>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_advertiser_platforms", {
    p_tort_slug: tortSlug ?? null,
    p_state_abbr: stateAbbr ?? null,
  });
  if (error) {
    console.error("Failed to fetch advertiser platforms:", error.message);
    return {};
  }
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    map[row.advertiser_name] = row.platforms ?? [];
  }
  return map;
}

export async function getDistinctAdSources(): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("ad_observations_raw")
    .select("source")
    .limit(1000);
  if (error) {
    console.error("Failed to fetch ad sources:", error.message);
    return [];
  }
  const sources = new Set<string>();
  for (const row of data ?? []) {
    if (row.source) sources.add(row.source);
  }
  return Array.from(sources).sort();
}

export async function getAdSaturationWindowed(
  windowStart: string,
  windowEnd: string,
  tortSlug?: string,
  state?: string,
  source?: string
): Promise<AdSaturationWindowedRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_ad_saturation_windowed", {
    p_window_start: windowStart,
    p_window_end: windowEnd,
    p_tort_slug: tortSlug ?? null,
    p_state: state ?? null,
    p_source: source ?? null,
  });
  if (error) {
    console.error("Failed to fetch windowed saturation:", error.message);
    return [];
  }
  return (data ?? []) as AdSaturationWindowedRow[];
}
