-- ============================================================================
-- Competitive Analysis Phase 2 (SEO tab): organic-only competitor RPC + the two
-- PI torts (motorcycle, boating) the SEO surface needs but the SERP pipeline
-- did not yet track.
--
-- SEO data (serp_results_normalized) is NATIONAL — no geo dimension — so this
-- RPC is keyed on tort_slug, NOT DMA. Organic-only on purpose:
-- get_serp_visibility_windowed blends paid + organic and is unsuitable here.
-- ============================================================================

-- 1. PI torts the SERP pipeline will start tracking (keyed by ad pipeline; these
--    are NOT mass_torts advertising pages, so no tort-page registration needed).
INSERT INTO public.torts (slug, label, category)
VALUES
    ('motorcycle', 'Motorcycle Accident', 'personal_injury'),
    ('boating',    'Boating Accident',    'personal_injury')
ON CONFLICT (slug) DO NOTHING;

-- 2. Organic SEO competitors for a case type, national, last p_days window.
CREATE OR REPLACE FUNCTION public.get_seo_competitors_by_tort(
    p_tort_slug TEXT,
    p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    domain TEXT,
    advertiser_name TEXT,
    organic_appearances BIGINT,
    avg_position NUMERIC,
    best_position INTEGER,
    top_3_count BIGINT,
    top_10_count BIGINT,
    keywords_tracked BIGINT,
    first_seen DATE,
    last_seen DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        n.domain,
        MAX(ae.canonical_name) AS advertiser_name,
        COUNT(*) AS organic_appearances,
        ROUND(AVG(n.position)::numeric, 1) AS avg_position,
        MIN(n.position) AS best_position,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 3) AS top_3_count,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 10) AS top_10_count,
        COUNT(DISTINCT n.query) AS keywords_tracked,
        MIN(n.fetched_at)::date AS first_seen,
        MAX(n.fetched_at)::date AS last_seen
    FROM public.serp_results_normalized n
    LEFT JOIN public.advertiser_entities ae ON ae.id = n.advertiser_entity_id
    WHERE n.result_type = 'organic'
      AND n.tort_slug = p_tort_slug
      AND n.fetched_at >= now() - (p_days || ' days')::interval
    GROUP BY n.domain
    ORDER BY organic_appearances DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_seo_competitors_by_tort(TEXT, INTEGER) IS
    'Organic-search competitors (all domains, not just firms) for a PI case '
    'type over the last p_days. NATIONAL — serp_results_normalized has no geo '
    'dimension. Aggregated from serp_results_normalized (result_type=organic).';

GRANT EXECUTE ON FUNCTION public.get_seo_competitors_by_tort(TEXT, INTEGER)
    TO anon, authenticated, service_role;
