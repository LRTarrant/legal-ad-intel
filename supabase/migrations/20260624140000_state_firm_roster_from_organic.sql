-- ============================================================================
-- State firm roster, sourced from observed organic SERP + paid search.
--
-- The competitive-analysis roster scopes the national Meta/YouTube tabs to
-- in-state firms and powers the "Firms tracked" stat. It was built ONLY from
-- paid-search advertisers (useFirmRoster -> get_pi_competitors_by_dma ->
-- pi_search_observations). That misses firms which rank organically but don't
-- buy Google Ads in-state, so the roster ran ~3.5x too small (AL: 23 paid vs
-- 83 organic firm domains) and hid #1-ranking local firms (Hollis Wright, Marsh
-- Rickard & Bryan, Drake) from the SEO/Meta views.
--
-- Fix: rebuild the roster from the broader, already-collected organic SERP
-- signal (serp_results_normalized, metro-scoped via dma_code) UNION the paid
-- advertisers, minus directory/aggregator domains. No new ingestion. A later
-- pass can harden this with Google Maps local-pack (verified physical address).
--
-- Also adds a state-scoped SEO RPC. The competitive section's "All <state>
-- markets" SEO view previously called the NATIONAL get_seo_competitors_by_tort
-- and leaned on the roster filter to drop out-of-state firms. With the SEO
-- roster filter removed (SEO-by-DMA is already metro-scoped, so the filter was
-- redundant), "All markets" needs its own state aggregation to stay in-state.
-- ============================================================================

-- 1. In-state firm roster (organic ∪ paid, minus directories).
CREATE OR REPLACE FUNCTION public.get_state_firm_roster(
    p_state TEXT
)
RETURNS TABLE (
    domain TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH state_dmas AS (
        SELECT DISTINCT dma_code
        FROM public.pi_metros
        WHERE state_abbr = p_state AND dma_code IS NOT NULL
    ),
    organic AS (
        SELECT DISTINCT
            lower(regexp_replace(regexp_replace(n.domain, '^https?://', ''), '^www\.', '')) AS domain
        FROM public.serp_results_normalized n
        WHERE n.result_type = 'organic'
          AND n.dma_code IN (SELECT dma_code FROM state_dmas)
          AND n.domain IS NOT NULL AND n.domain <> ''
    ),
    paid AS (
        SELECT DISTINCT
            lower(regexp_replace(regexp_replace(o.advertiser_domain, '^https?://', ''), '^www\.', '')) AS domain
        FROM public.pi_search_observations o
        JOIN public.pi_metros m ON m.id = o.metro_id
        WHERE m.state_abbr = p_state
          AND o.advertiser_domain IS NOT NULL AND o.advertiser_domain <> ''
    ),
    combined AS (
        SELECT domain FROM organic
        UNION
        SELECT domain FROM paid
    )
    SELECT c.domain
    FROM combined c
    WHERE c.domain <> ''
      -- Directory / aggregator / platform domains are not firms. Keep in sync
      -- (loosely) with DIRECTORY_DOMAINS in competitive-analysis-section.tsx.
      AND c.domain NOT IN (
        'nolo.com','justia.com','forbes.com','findlaw.com','lawyers.com','avvo.com',
        'wikipedia.org','en.wikipedia.org','superlawyers.com','attorneys.superlawyers.com',
        'expertise.com','martindale.com','yelp.com','google.com','clio.com','lawinfo.com',
        'enjuris.com','thumbtack.com','bbb.org','mapquest.com','facebook.com','youtube.com',
        'reddit.com','quora.com','usnews.com'
      )
    ORDER BY c.domain;
$$;

COMMENT ON FUNCTION public.get_state_firm_roster(TEXT) IS
    'In-state PI-firm roster: distinct registrable domains observed in the state''s '
    'organic SERP (serp_results_normalized, metro rows via pi_metros.dma_code) UNION '
    'paid-search advertisers (pi_search_observations), minus directory/aggregator '
    'domains. Scopes the national Meta/YouTube competitive tabs to in-state firms and '
    'feeds the "Firms tracked" stat. Replaces the paid-search-only roster.';

GRANT EXECUTE ON FUNCTION public.get_state_firm_roster(TEXT)
    TO anon, authenticated, service_role;

-- 2. State-scoped SEO competitors — organic appearances aggregated across all of
--    the state's DMAs (so "All <state> markets" stays in-state without a roster
--    filter). Same shape as get_seo_competitors_by_dma.
CREATE OR REPLACE FUNCTION public.get_seo_competitors_by_state(
    p_tort_slug TEXT,
    p_state TEXT,
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
    WITH state_dmas AS (
        SELECT DISTINCT dma_code
        FROM public.pi_metros
        WHERE state_abbr = p_state AND dma_code IS NOT NULL
    )
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
      AND n.dma_code IN (SELECT dma_code FROM state_dmas)
      AND n.tort_slug = p_tort_slug
      AND n.fetched_at >= now() - (p_days || ' days')::interval
    GROUP BY n.domain
    ORDER BY organic_appearances DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_seo_competitors_by_state(TEXT, TEXT, INTEGER) IS
    'Organic-search competitors for a PI case type across all of a state''s Nielsen '
    'DMAs (pi_metros.dma_code) over the last p_days. Powers the "All <state> markets" '
    'SEO view; per-DMA detail uses get_seo_competitors_by_dma.';

GRANT EXECUTE ON FUNCTION public.get_seo_competitors_by_state(TEXT, TEXT, INTEGER)
    TO anon, authenticated, service_role;
