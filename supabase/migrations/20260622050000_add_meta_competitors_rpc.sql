-- ============================================================================
-- Competitive Analysis Phase 5b: get_meta_competitors RPC.
-- Page-level, national ranking of PI firms by Meta (Facebook/Instagram)
-- advertising, aggregated from meta_ad_creatives (Phase 5a). Case-type-keyed
-- (SEO model) — Meta ads carry a case_type keyword tag but no DMA, so the 5b
-- panel filters by case type (or "all"), not by market.
--
-- Identity is the Meta page (page_id / page_name), since the Ad Library
-- attributes every ad to a Facebook/Instagram page.
--
-- Junk filter: the keyword-broad Meta Ad Library pulls non-PI noise alongside
-- real firms (Phase 5a finding). Two classes observed and removed here:
--   1. Short-drama / web-novel streaming apps that blanket-target keywords
--      (DotDrama, DramaBox, Dreame Novel, NovelTime, ReelShort) — matched by
--      app-name token as a substring; no real PI firm carries these tokens.
--   2. News outlets (e.g. "Connecticut Post") — matched by word-bounded
--      newspaper tokens so "Postman Law" and similar real firms are preserved.
-- On the live 5a data this drops exactly 7 noise pages (268 -> 261) and keeps
-- every plaintiff firm. The lists are small and extensible.
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
      -- short-drama / web-novel streaming apps (substring token match)
      AND m.page_name !~* '(drama|dreame|noveltime|reelshort|dramabox)'
      -- news outlets (word-bounded so real firms like "Postman Law" survive)
      AND m.page_name !~* '(\mpost\M|\mtimes\M|\mtribune\M|\mgazette\M|\mherald\M|\mnews\M|\mdaily\M|\mjournal\M)'
    GROUP BY m.page_id
    ORDER BY active_ads DESC, last_seen DESC NULLS LAST
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_meta_competitors(TEXT, INTEGER) IS
    'Page-level national ranking of PI firms by Meta (Facebook/Instagram) '
    'advertising, from meta_ad_creatives. Filterable by case_type (NULL = all). '
    'Excludes short-drama-app and news-outlet keyword noise.';

GRANT EXECUTE ON FUNCTION public.get_meta_competitors(TEXT, INTEGER)
    TO anon, authenticated, service_role;
