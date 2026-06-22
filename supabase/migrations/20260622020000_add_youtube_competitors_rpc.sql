-- ============================================================================
-- Competitive Analysis Phase 4b: get_youtube_competitors RPC.
-- Firm-level, national ranking of PI firms by YouTube/video advertising,
-- aggregated from youtube_ad_creatives (Phase 4a). No DMA / case-type filter —
-- Transparency video creatives carry no geo or keyword tag.
--
-- Junk filter: google.com / youtube.com snuck into the pi_search seed and
-- return Google's own ads (google.com ranked #1 with 100 creatives) — they are
-- not PI competitors. The list is small and extensible.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_youtube_competitors(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    advertiser_domain TEXT,
    advertiser_name TEXT,
    advertiser_ar_id TEXT,
    active_creatives BIGINT,
    longest_running_days INTEGER,
    first_shown DATE,
    last_shown DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        y.advertiser_domain,
        mode() WITHIN GROUP (ORDER BY y.advertiser_name) AS advertiser_name,
        mode() WITHIN GROUP (ORDER BY y.advertiser_ar_id) AS advertiser_ar_id,
        COUNT(*) AS active_creatives,
        MAX(y.total_days_shown) AS longest_running_days,
        MIN(y.first_shown) AS first_shown,
        MAX(y.last_shown) AS last_shown
    FROM public.youtube_ad_creatives y
    WHERE y.advertiser_domain NOT IN ('google.com', 'youtube.com')
    GROUP BY y.advertiser_domain
    ORDER BY active_creatives DESC, longest_running_days DESC NULLS LAST
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_youtube_competitors(INTEGER) IS
    'Firm-level national ranking of PI firms by YouTube/video advertising '
    '(active creatives + longevity), from youtube_ad_creatives. Excludes '
    'google.com/youtube.com seed junk.';

GRANT EXECUTE ON FUNCTION public.get_youtube_competitors(INTEGER)
    TO anon, authenticated, service_role;
