import { getSupabase } from "@/lib/supabase";

export type SerpVisibilityRow = {
  domain: string;
  advertiser_entity_id: string | null;
  advertiser_name: string | null;
  tort_slug: string;
  total_appearances: number;
  avg_position: number | null;
  organic_appearances: number;
  paid_appearances: number;
  featured_snippet_count: number;
  local_pack_count: number;
  top_3_count: number;
  top_10_count: number;
  visibility_score: number;
  queries_tracked: number;
};

export async function getSerpVisibilityWindowed(
  startDate: string,
  endDate: string,
  tortSlug?: string
): Promise<SerpVisibilityRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.rpc("get_serp_visibility_windowed", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_tort_slug: tortSlug ?? null,
  });

  if (error) {
    console.error("Failed to fetch SERP visibility:", error.message);
    return [];
  }

  return (data ?? []) as SerpVisibilityRow[];
}
