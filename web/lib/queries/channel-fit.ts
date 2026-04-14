import { getSupabase } from "@/lib/supabase";

export interface ChannelFitScore {
  tort_id: string;
  market_id: string;
  profile_name: string;
  channel: string;
  raw_score: number;
  normalized_score: number;
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
