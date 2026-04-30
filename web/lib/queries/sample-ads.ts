import { getSupabase } from "@/lib/supabase";

export type SampleAd = {
  id: string;
  source: string;
  advertiser_raw: string;
  creative_url: string | null;
  creative_text: string | null;
  ad_format: string | null;
  first_seen: string;
  last_seen: string;
};

/**
 * Extract a clean domain from a URL, stripping Google click-tracking wrappers.
 * If the URL contains an `adurl=` parameter, decode it and extract that domain.
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const adurl = parsed.searchParams.get("adurl");
    if (adurl) {
      try {
        const inner = new URL(decodeURIComponent(adurl));
        return inner.hostname.replace(/^www\./, "");
      } catch {
        // fall through to outer URL
      }
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Fetch recent sample ads for a tort, ordered by last_seen DESC.
 * Filters to rows with at least a creative_url or creative_text.
 */
export async function getSampleAds(
  tortSlug: string,
  limit = 12,
): Promise<SampleAd[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;

  // Resolve tort_id from slug (check slug first, then slug_alias for aliased torts)
  let { data: tort, error: tortError } = await sb
    .from("torts")
    .select("id")
    .eq("slug", tortSlug)
    .maybeSingle();

  if (tortError) throw new Error(`Failed to fetch tort: ${tortError.message}`);
  if (!tort) {
    // Try slug_alias for torts like olympus_duodenoscope → olympus_scopes
    const { data: aliased, error: aliasErr } = await sb
      .from("torts")
      .select("id")
      .eq("slug_alias", tortSlug)
      .maybeSingle();
    if (aliasErr) throw new Error(`Failed to fetch tort alias: ${aliasErr.message}`);
    tort = aliased;
  }
  if (!tort) return [];

  const { data, error } = await sb
    .from("ad_observations_raw")
    .select(
      "id, source, advertiser_raw, creative_url, creative_text, ad_format, first_seen, last_seen",
    )
    .eq("tort_id", tort.id)
    .or("creative_url.neq.null,creative_text.neq.null")
    .order("last_seen", { ascending: false })
    .limit(limit);

  if (error)
    throw new Error(`Failed to fetch sample ads: ${error.message}`);
  return (data ?? []) as SampleAd[];
}
