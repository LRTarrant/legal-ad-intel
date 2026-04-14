import { getSupabase } from "@/lib/supabase";

export interface ChannelFitScore {
  tort_id: string;
  market_id: string;
  profile_name: string;
  channel: string;
  raw_score: number;
  normalized_score: number;
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
