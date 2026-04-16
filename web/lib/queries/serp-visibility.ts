import { getSupabase } from "@/lib/supabase";

export type SerpResult = {
  query: string;
  result_type: string;
  position: number;
  domain: string;
  title: string;
  snippet: string | null;
  link: string | null;
  fetched_at: string;
};

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

export async function getSerpTopResults(
  tortSlug: string,
  limit = 5
): Promise<SerpResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("serp_results_normalized")
    .select(
      "query, result_type, position, domain, title, snippet, link, fetched_at"
    )
    .eq("tort_slug", tortSlug)
    .eq("result_type", "organic")
    .order("position", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Failed to fetch SERP results:", error.message);
    return [];
  }

  // Deduplicate: keep first (best position) per domain
  const seen = new Set<string>();
  const deduped: SerpResult[] = [];
  for (const r of data ?? []) {
    if (!seen.has(r.domain)) {
      seen.add(r.domain);
      deduped.push(r);
    }
    if (deduped.length >= limit) break;
  }
  return deduped;
}
