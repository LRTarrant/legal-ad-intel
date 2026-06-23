-- ============================================================================
-- Competitive Analysis Phase 5b follow-up: extend get_meta_competitors noise
-- filter. Prod browser-verify of the Meta tab caught two short-video / viral-
-- content app pages that slipped the original drama/novel token list:
-- "VibeShort-Hot" (2 ads) and "Viral Story Picks" (1 ad). A probe with the
-- broad tokens (short|story|vibe|tv|reel|stream|series|movie...) matched ONLY
-- these two across the whole table — no real firm carries them — so adding the
-- specific app tokens is false-positive-free. Tokens stay tight (vibeshort /
-- viral story) rather than bare short/story to keep firm surnames safe.
-- Everything else in the function is unchanged from 20260622050000.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_meta_competitors(
    p_case_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    page_id TEXT,
    page_name TEXT,
    active_ads BIGINT,
    case_types_active TEXT[],
    first_seen DATE,
    last_seen DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.page_id,
        mode() WITHIN GROUP (ORDER BY m.page_name) AS page_name,
        COUNT(*) AS active_ads,
        array_agg(DISTINCT m.case_type ORDER BY m.case_type) AS case_types_active,
        MIN(m.start_date) AS first_seen,
        MAX(m.end_date) AS last_seen
    FROM public.meta_ad_creatives m
    WHERE m.page_id IS NOT NULL
      AND (p_case_type IS NULL OR m.case_type = p_case_type)
      -- short-drama / web-novel / short-video / viral-content apps (substring tokens)
      AND m.page_name !~* '(drama|dreame|noveltime|reelshort|dramabox|vibeshort|viral story)'
      -- news outlets (word-bounded so real firms like "Postman Law" survive)
      AND m.page_name !~* '(\mpost\M|\mtimes\M|\mtribune\M|\mgazette\M|\mherald\M|\mnews\M|\mdaily\M|\mjournal\M)'
    GROUP BY m.page_id
    ORDER BY active_ads DESC, last_seen DESC NULLS LAST
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_meta_competitors(TEXT, INTEGER) IS
    'Page-level national ranking of PI firms by Meta (Facebook/Instagram) '
    'advertising, from meta_ad_creatives. Filterable by case_type (NULL = all). '
    'Excludes short-drama/short-video-app and news-outlet keyword noise.';

GRANT EXECUTE ON FUNCTION public.get_meta_competitors(TEXT, INTEGER)
    TO anon, authenticated, service_role;
