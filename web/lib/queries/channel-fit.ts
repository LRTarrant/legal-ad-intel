import { getSupabase } from "@/lib/supabase";

export interface ChannelFitScore {
  tort_id: string;
  market_id: string;
  profile_name: string;
  channel: string;
  raw_score: number;
  normalized_score: number;
  role: 'lead_gen' | 'brand' | 'hybrid';
  cost_pressure: 'low' | 'medium' | 'high';
  performance_orientation: 'direct_response' | 'mixed' | 'brand_heavy';
  mass_tort_priority: 'core' | 'secondary' | 'situational';
}

export interface CompetitionScore {
  market_id: string;
  channel: string;
  competition_score: number;
}

/**
 * Calls the Supabase SQL function `get_channel_fit_scores` which computes
 * a weighted dot-product of tort audience age-band weights against
 * per-market media-usage indices, returning one score per channel.
 */
export async function getChannelFitScores(
  tortId: string,
  profileName = "default",
  marketId = "US_TEST"
): Promise<ChannelFitScore[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = getSupabase();

  const { data, error } = await supabase.rpc("get_channel_fit_scores", {
    p_tort_id: tortId,
    p_profile_name: profileName,
    p_market_id: marketId,
  });

  if (error) {
    throw new Error(`channel-fit scoring failed: ${error.message}`);
  }

  // Supabase returns numeric as string; coerce to number
  return (data ?? []).map((row: Record<string, unknown>) => ({
    tort_id: row.tort_id as string,
    market_id: row.market_id as string,
    profile_name: row.profile_name as string,
    channel: row.channel as string,
    raw_score: Number(row.raw_score),
    normalized_score: Number(row.normalized_score),
    role: (row.role as string) || 'hybrid',
    cost_pressure: (row.cost_pressure as string) || 'medium',
    performance_orientation: (row.performance_orientation as string) || 'mixed',
    mass_tort_priority: (row.mass_tort_priority as string) || 'secondary',
  }));
}

/**
 * Fetches competition/saturation scores for every channel in a market.
 * Falls back gracefully to an empty map if the table has no data.
 * Prefers tort-specific rows when available, else market-wide defaults.
 */
export async function getCompetitionScores(
  marketId: string,
  tortId?: string
): Promise<Map<string, number>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = getSupabase();

  // Fetch market-wide defaults + any tort-specific overrides in one query
  const { data, error } = await supabase
    .from("channel_competition_scores")
    .select("channel, competition_score, tort_id")
    .eq("market_id", marketId)
    .or(tortId ? `tort_id.is.null,tort_id.eq.${tortId}` : "tort_id.is.null");

  if (error) {
    console.error("competition scores fetch failed:", error.message);
    return new Map();
  }

  // Build map: tort-specific rows override market defaults
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const ch = row.channel as string;
    const score = Number(row.competition_score);
    const isTortSpecific = row.tort_id != null;
    if (!map.has(ch) || isTortSpecific) {
      map.set(ch, score);
    }
  }

  return map;
}

export interface MarketRecommendation {
  market_id: string;
  market_label: string;
  opportunity_score: number;
  avg_fit: number;
  avg_competition: number;
  top_channel_1: string;
  top_channel_1_fit: number;
  top_channel_1_comp: number;
  top_channel_2: string;
  top_channel_2_fit: number;
  top_channel_2_comp: number;
  top_channel_1_role: 'lead_gen' | 'brand' | 'hybrid';
  top_channel_2_role: 'lead_gen' | 'brand' | 'hybrid';
  top_channel_1_cost_pressure: 'low' | 'medium' | 'high';
  top_channel_1_perf: 'direct_response' | 'mixed' | 'brand_heavy';
  top_channel_1_tort_priority: 'core' | 'secondary' | 'situational';
  top_channel_2_cost_pressure: 'low' | 'medium' | 'high';
  top_channel_2_perf: 'direct_response' | 'mixed' | 'brand_heavy';
  top_channel_2_tort_priority: 'core' | 'secondary' | 'situational';
  rationale: string;
}

export async function getMarketRecommendations(
  tortId: string,
  profileName = "default"
): Promise<MarketRecommendation[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = getSupabase();
  const { data, error } = await supabase.rpc("get_market_recommendations", {
    p_tort_id: tortId,
    p_profile_name: profileName,
  });
  if (error) throw new Error(`market recommendations failed: ${error.message}`);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    market_id: row.market_id as string,
    market_label: row.market_label as string,
    opportunity_score: Number(row.opportunity_score),
    avg_fit: Number(row.avg_fit),
    avg_competition: Number(row.avg_competition),
    top_channel_1: row.top_channel_1 as string,
    top_channel_1_fit: Number(row.top_channel_1_fit),
    top_channel_1_comp: Number(row.top_channel_1_comp),
    top_channel_2: row.top_channel_2 as string,
    top_channel_2_fit: Number(row.top_channel_2_fit),
    top_channel_2_comp: Number(row.top_channel_2_comp),
    top_channel_1_role: (row.top_channel_1_role as string) || 'hybrid',
    top_channel_2_role: (row.top_channel_2_role as string) || 'hybrid',
    top_channel_1_cost_pressure: (row.top_channel_1_cost_pressure as string) || 'medium',
    top_channel_1_perf: (row.top_channel_1_perf as string) || 'mixed',
    top_channel_1_tort_priority: (row.top_channel_1_tort_priority as string) || 'secondary',
    top_channel_2_cost_pressure: (row.top_channel_2_cost_pressure as string) || 'medium',
    top_channel_2_perf: (row.top_channel_2_perf as string) || 'mixed',
    top_channel_2_tort_priority: (row.top_channel_2_tort_priority as string) || 'secondary',
    rationale: row.rationale as string,
  }));
}
