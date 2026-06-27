-- ============================================================================
-- Strategy Engine v1 — compact per-layer summary RPCs (PR 1 of the build).
-- ----------------------------------------------------------------------------
-- The standalone Strategy Engine assembles a deck server-side and must NOT push
-- raw rows into the LLM. These RPCs return small, pre-aggregated summaries the
-- generator reads per deck layer. Two genuinely-new aggregations land here:
--
--   1. strategy_opportunity_counties  — Layer 1 (Opportunity / "Where to play").
--   2. strategy_whitespace_channels   — Layer 2 (White space, measured channels).
--
-- The competitive FIRM LIST reuses the PR-0 get_pi_competitors_by_dma (sustained
-- presence ranking). Audience FIT reuses web/lib/strategy-engine/audience-fit.ts.
-- Named BUYS reuse the existing media_outlets / broadcast_stations reads (wired
-- in PR 2). No new spend RPC: per-firm modeled spend is unsourceable for local PI
-- (ad_observations_normalized is 85% NY mass-tort advertisers, zero AL/PI), so the
-- competitive field is ranked by presence, not invented dollars (product decision).
--
-- Geo decision: the opportunity layer is COUNTY-level and FIPS-exact (FARS +
-- census joined via county_msa_crosswalk). "DMA" is a market headline label from
-- the interview, not a precise rollup (county_msa_crosswalk is county->CBSA/MSA,
-- not Nielsen DMA — e.g. the Montgomery DMA lumps in the Auburn-Opelika CBSA).
-- ============================================================================

-- 1. Opportunity (Layer 1) ----------------------------------------------------
-- Per-county crash exposure vs reachable demand. p_fips_full NULL = whole state,
-- ranked; a list = just those counties (the interview's geo selection).
-- FARS fatalities are a severity proxy (not total injury crashes) and span
-- multiple years — fars_year_min/max state the window for honest captioning.
DROP FUNCTION IF EXISTS public.strategy_opportunity_counties(TEXT, TEXT[]);

CREATE FUNCTION public.strategy_opportunity_counties(
    p_state TEXT,
    p_fips_full TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    fips_full TEXT,
    county_name TEXT,
    cbsa_title TEXT,
    total_population INTEGER,
    pct_with_internet NUMERIC,
    total_fatalities BIGINT,
    truck_fatalities BIGINT,
    motorcycle_fatalities BIGINT,
    deaths_per_100k NUMERIC,
    fars_year_min INTEGER,
    fars_year_max INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.fips_full,
        c.county_name,
        cw.cbsa_title,
        c.total_population,
        c.pct_with_internet,
        COALESCE(fa.total_fatalities, 0)      AS total_fatalities,
        COALESCE(fa.truck_fatalities, 0)      AS truck_fatalities,
        COALESCE(fa.motorcycle_fatalities, 0) AS motorcycle_fatalities,
        ROUND(
            COALESCE(fa.total_fatalities, 0)::numeric
            / NULLIF(c.total_population, 0) * 100000,
            1
        ) AS deaths_per_100k,
        fa.fars_year_min,
        fa.fars_year_max
    FROM public.census_demographics c
    LEFT JOIN public.county_msa_crosswalk cw ON cw.fips_full = c.fips_full
    LEFT JOIN LATERAL (
        SELECT
            SUM(f.fatalities)                                       AS total_fatalities,
            SUM(f.fatalities) FILTER (WHERE f.has_large_truck)      AS truck_fatalities,
            SUM(f.fatalities) FILTER (WHERE f.has_motorcycle)       AS motorcycle_fatalities,
            MIN(f.year) AS fars_year_min,
            MAX(f.year) AS fars_year_max
        FROM public.fars_fatalities f
        WHERE f.state = p_state
          AND f.county_fips = RIGHT(c.fips_full, 3)::int
    ) fa ON true
    WHERE c.state_abbr = p_state
      AND c.acs_vintage = (SELECT MAX(acs_vintage) FROM public.census_demographics)
      AND (p_fips_full IS NULL OR c.fips_full = ANY(p_fips_full))
    ORDER BY COALESCE(fa.truck_fatalities, 0) DESC,
             COALESCE(fa.total_fatalities, 0) DESC
    LIMIT 60;
$$;

COMMENT ON FUNCTION public.strategy_opportunity_counties(TEXT, TEXT[]) IS
    'Strategy Engine Layer 1 (Opportunity): per-county crash exposure (FARS, '
    'multi-year severity proxy) vs reachable demand (census population + '
    'pct_with_internet), county->CBSA via county_msa_crosswalk. County-level + '
    'FIPS-exact; DMA is a headline label, not a precise rollup.';

GRANT EXECUTE ON FUNCTION public.strategy_opportunity_counties(TEXT, TEXT[])
    TO anon, authenticated, service_role;


-- 2. White space (Layer 2, measured channels) ---------------------------------
-- Per-channel count of distinct in-market PI firms + an open/contested/defended
-- label, for the channels we MEASURE per-geo: paid search (pi_search, per-DMA,
-- rolling 90d, PR-0 consumer denylist) and organic SEO (serp, the state's DMAs,
-- directory denylist). Untracked channels (broadcast / OOH / CTV / connected
-- audio / national YouTube+Meta) are layered in by the engine as MODELED
-- whitespace with the "presence modeled from ad-library volume" caveat — never
-- claimed here as a measured zero.
DROP FUNCTION IF EXISTS public.strategy_whitespace_channels(TEXT, TEXT, TEXT);

CREATE FUNCTION public.strategy_whitespace_channels(
    p_state TEXT,
    p_dma_code TEXT DEFAULT NULL,
    p_tort_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    channel TEXT,
    active_firms BIGINT,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH counts AS (
        -- Paid search: distinct PI advertisers seen in the last 90 days.
        SELECT 'paid_search'::text AS channel, COUNT(DISTINCT o.advertiser_domain) AS n
        FROM public.pi_search_observations o
        JOIN public.pi_metros m ON m.id = o.metro_id
        WHERE m.state_abbr = p_state
          AND (p_dma_code IS NULL OR m.dma_code = p_dma_code)
          AND o.observed_date >= CURRENT_DATE - INTERVAL '90 days'
          AND o.advertiser_domain NOT IN (
              'google.com','youtube.com','facebook.com','instagram.com',
              'maps.google.com','g.co','bing.com'
          )

        UNION ALL

        -- Organic SEO: distinct non-directory domains across the state's DMAs
        -- for the case type (NULL tort => no SEO row, organic needs a tort key).
        SELECT 'seo'::text AS channel, COUNT(DISTINCT s.domain) AS n
        FROM public.serp_results_normalized s
        WHERE p_tort_slug IS NOT NULL
          AND s.tort_slug = p_tort_slug
          AND s.result_type = 'organic'
          AND s.dma_code IN (
              SELECT DISTINCT dma_code FROM public.pi_metros
              WHERE state_abbr = p_state AND dma_code IS NOT NULL
          )
          AND s.domain NOT IN (
              'nolo.com','justia.com','forbes.com','findlaw.com','lawyers.com','avvo.com',
              'wikipedia.org','en.wikipedia.org','superlawyers.com','attorneys.superlawyers.com',
              'expertise.com','martindale.com','yelp.com','google.com','clio.com','lawinfo.com',
              'enjuris.com','thumbtack.com','bbb.org','mapquest.com','facebook.com','youtube.com',
              'reddit.com','quora.com','usnews.com'
          )
    )
    SELECT
        channel,
        n AS active_firms,
        CASE
            WHEN n = 0 THEN 'open'
            WHEN n <= 3 THEN 'contested'
            ELSE 'defended'
        END AS status
    FROM counts
    ORDER BY channel;
$$;

COMMENT ON FUNCTION public.strategy_whitespace_channels(TEXT, TEXT, TEXT) IS
    'Strategy Engine Layer 2 (White space, measured channels): distinct in-market '
    'PI firms per channel (paid_search per-DMA, seo across the state DMAs) + an '
    'open/contested/defended label. Untracked channels (broadcast/OOH/CTV/audio/ '
    'national YouTube+Meta) are modeled by the engine, not asserted here.';

GRANT EXECUTE ON FUNCTION public.strategy_whitespace_channels(TEXT, TEXT, TEXT)
    TO anon, authenticated, service_role;
