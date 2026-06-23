/* ------------------------------------------------------------------ */
/*  Alabama Competitive Analysis — shared types.                        */
/*                                                                      */
/*  Forked from the v2 shared competitive-analysis component, adapted   */
/*  for a STATE page: channels are firm-scoped to the Alabama roster    */
/*  and "View ads" opens an in-app creative modal instead of linking    */
/*  out to the ad library.                                              */
/* ------------------------------------------------------------------ */

export type ChannelKey =
  | "paid_search"
  | "seo"
  | "meta"
  | "youtube"
  | "tiktok"
  | "traditional";

export interface DmaOption {
  dma_code: string;
  display_name: string;
}

export interface PiCompetitor {
  advertiser_domain: string;
  advertiser_name: string | null;
  website: string | null;
  total_observations: number;
  avg_ad_position: number | null;
  metros_active: string[] | null;
  case_types_active: string[] | null;
  first_seen: string | null;
  last_seen: string | null;
}

export interface SeoCompetitor {
  domain: string;
  advertiser_name: string | null;
  organic_appearances: number;
  avg_position: number | null;
  best_position: number | null;
  top_3_count: number;
  top_10_count: number;
  keywords_tracked: number;
  first_seen: string | null;
  last_seen: string | null;
}

export interface YouTubeCompetitor {
  advertiser_domain: string;
  advertiser_name: string | null;
  advertiser_ar_id: string | null;
  active_creatives: number;
  longest_running_days: number | null;
  first_shown: string | null;
  last_shown: string | null;
}

export interface MetaCompetitor {
  page_id: string;
  page_name: string | null;
  active_ads: number;
  case_types_active: string[] | null;
  first_seen: string | null;
  last_seen: string | null;
}

/** What the in-app creative modal is asked to show. */
export type ModalTarget =
  | { channel: "paid_search"; domain: string; label: string }
  | { channel: "seo"; domain: string; label: string }
  | { channel: "meta"; pageId: string; label: string }
  | { channel: "youtube"; domain: string; arId: string | null; label: string };

/** Minimal untyped Supabase surface — generated types don't cover the
 *  read-only RPCs / anon table selects we use here (house convention). */
export interface RpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}
