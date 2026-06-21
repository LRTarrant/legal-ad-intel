-- ============================================================================
-- Phase 1 (Competitive Analysis): PI metro → DMA crosswalk + per-DMA RPC
-- ----------------------------------------------------------------------------
-- The v2 State Intelligence "Competitive Analysis" surface filters PI-firm
-- paid-search competition by Nielsen DMA. PI ad observations are keyed to
-- pi_metros (curated principal-city geo targets); this adds a metro → DMA
-- crosswalk so the existing pi_search_observations can be rolled up per DMA,
-- and a read RPC the Paid Search tab calls.
--
-- Backfill maps a pi_metro to a DMA by principal-city name match against the
-- (currently partial) dma_markets seed. Metros without a matching dma_markets
-- row stay NULL — they still surface under the "All DMA markets" default view.
-- Widening dma_markets to the full 210-DMA Nielsen list + a richer city→DMA
-- crosswalk is a documented follow-up (see plan).
-- ============================================================================

-- 1. Crosswalk column ---------------------------------------------------------
ALTER TABLE public.pi_metros
    ADD COLUMN IF NOT EXISTS dma_code TEXT;

COMMENT ON COLUMN public.pi_metros.dma_code IS
    'Nielsen DMA code (→ dma_markets.dma_code). NULL when the metro has no '
    'matching dma_markets row yet; such metros still appear under the '
    'all-markets state view. No hard FK — dma_markets is intentionally partial.';

CREATE INDEX IF NOT EXISTS idx_pi_metros_dma_code
    ON public.pi_metros (dma_code) WHERE dma_code IS NOT NULL;

-- 2. (Crosswalk backfill lives in the companion seed migration
--    20260620010000, which adds the full Nielsen dma_markets list and sets
--    pi_metros.dma_code explicitly per city — incl. secondary cities that
--    don't name-match a DMA, e.g. Aurora → Denver.)

-- 3. Per-DMA competitor RPC (aggregates existing observations) ----------------
-- p_dma_code NULL  → all metros in the state (primary "All DMA markets" view).
-- p_dma_code set   → only metros mapped to that DMA.
CREATE OR REPLACE FUNCTION public.get_pi_competitors_by_dma(
    p_state TEXT,
    p_dma_code TEXT DEFAULT NULL
)
RETURNS TABLE (
    advertiser_domain TEXT,
    advertiser_name TEXT,
    website TEXT,
    total_observations BIGINT,
    avg_ad_position NUMERIC,
    metros_active TEXT[],
    case_types_active TEXT[],
    first_seen DATE,
    last_seen DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        o.advertiser_domain,
        COALESCE(
            mode() WITHIN GROUP (ORDER BY o.advertiser_name),
            o.advertiser_domain
        ) AS advertiser_name,
        'https://' || o.advertiser_domain AS website,
        COUNT(*) AS total_observations,
        ROUND(AVG(o.ad_position)::numeric, 1) AS avg_ad_position,
        ARRAY_AGG(DISTINCT m.metro_name ORDER BY m.metro_name) AS metros_active,
        ARRAY_AGG(DISTINCT o.case_type ORDER BY o.case_type) AS case_types_active,
        MIN(o.observed_date) AS first_seen,
        MAX(o.observed_date) AS last_seen
    FROM public.pi_search_observations o
    JOIN public.pi_metros m ON m.id = o.metro_id
    WHERE m.state_abbr = p_state
      AND (p_dma_code IS NULL OR m.dma_code = p_dma_code)
    GROUP BY o.advertiser_domain
    ORDER BY total_observations DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_pi_competitors_by_dma(TEXT, TEXT) IS
    'PI-firm paid-search competitors for a state, optionally filtered to one '
    'Nielsen DMA (via pi_metros.dma_code). NULL p_dma_code = all-markets view. '
    'Aggregated from pi_search_observations ⋈ pi_metros.';

GRANT EXECUTE ON FUNCTION public.get_pi_competitors_by_dma(TEXT, TEXT)
    TO anon, authenticated, service_role;
