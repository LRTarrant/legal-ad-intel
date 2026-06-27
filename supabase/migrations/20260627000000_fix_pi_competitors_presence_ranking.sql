-- ============================================================================
-- Fix: presence_score / total_observations over-ranks short-window, narrow-metro
--      paid-search advertisers in Competitive Analysis.
-- Issue: docs/issues/presence-score-overranking.md
-- ----------------------------------------------------------------------------
-- The Paid Search tab (and the Strategy Engine's white-space layer) read
-- get_pi_competitors_by_dma, which aggregated pi_search_observations live and
-- sorted by raw COUNT(*) DESC. A firm with a recent dense burst in 2 metros
-- (e.g. Cunningham Bounds: 848 obs, 2 metros, first seen 2026-04-18) outranked
-- firms with genuine long-run statewide saturation (Wettermark Keith: 3 metros;
-- Alexander Shunnarah: 4 metros). A local expert can falsify that instantly,
-- which erodes trust in a flagship surface.
--
-- Fix (composite, agreed with product — a per-active-day rate ALONE does not
-- demote a genuinely dense 2-metro firm, so it would not meet the issue's own
-- acceptance criteria):
--   1. Window to a rolling 90 days ("recent presence", not all-time).
--   2. Compute active_days (distinct observed dates) + obs_per_active_day rate.
--   3. Flag low-confidence entrants: < 14 active days OR first seen in the last
--      21 days — these are "new / thin sample", not "dominant".
--   4. Re-sort by a composite that rewards SUSTAINED STATEWIDE presence:
--        low_confidence ASC  (confident firms first)
--        metro breadth DESC  (statewide saturation — the real signal)
--        obs_per_active_day DESC  (then density)
--        total_observations DESC  (stable tiebreak)
--   5. Exclude consumer/aggregator domains (google.com, etc.) — mirrors the
--      denylist the YouTube/Meta competitor RPCs already apply, and removes the
--      bogus "google.com" firm row (an ad whose final URL resolved to google.com).
--
-- The function aggregates observations directly (no dependency on the pipeline's
-- pi_competitor_profiles.presence_score), so this fix is live the moment the
-- migration applies — no pipeline run required.
--
-- Backward-compat: new columns are appended after the existing ones, so callers
-- selecting the prior columns keep working; the typed client picks up the new
-- columns when database.types.ts is regenerated.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_pi_competitors_by_dma(TEXT, TEXT);

CREATE FUNCTION public.get_pi_competitors_by_dma(
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
    last_seen DATE,
    -- New: recent-presence normalization (rolling 90d).
    active_days BIGINT,
    observations_per_active_day NUMERIC,
    low_confidence BOOLEAN
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
        MAX(o.observed_date) AS last_seen,
        COUNT(DISTINCT o.observed_date) AS active_days,
        ROUND(
            COUNT(*)::numeric / GREATEST(COUNT(DISTINCT o.observed_date), 1),
            2
        ) AS observations_per_active_day,
        (
            COUNT(DISTINCT o.observed_date) < 14
            OR MIN(o.observed_date) > CURRENT_DATE - INTERVAL '21 days'
        ) AS low_confidence
    FROM public.pi_search_observations o
    JOIN public.pi_metros m ON m.id = o.metro_id
    WHERE m.state_abbr = p_state
      AND (p_dma_code IS NULL OR m.dma_code = p_dma_code)
      AND o.observed_date >= CURRENT_DATE - INTERVAL '90 days'
      AND o.advertiser_domain NOT IN (
          'google.com', 'youtube.com', 'facebook.com', 'instagram.com',
          'maps.google.com', 'g.co', 'bing.com'
      )
    GROUP BY o.advertiser_domain
    ORDER BY
        low_confidence ASC,
        cardinality(ARRAY_AGG(DISTINCT m.metro_name)) DESC,
        observations_per_active_day DESC,
        total_observations DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_pi_competitors_by_dma(TEXT, TEXT) IS
    'PI-firm paid-search competitors for a state, optionally filtered to one '
    'Nielsen DMA (via pi_metros.dma_code). NULL p_dma_code = all-markets view. '
    'Ranked by RECENT presence (rolling 90d): confident firms first, then '
    'statewide metro breadth, then per-active-day density. Low-confidence flag = '
    'new (< 21d) or thin (< 14 active days). Excludes consumer/aggregator domains. '
    'See docs/issues/presence-score-overranking.md.';

GRANT EXECUTE ON FUNCTION public.get_pi_competitors_by_dma(TEXT, TEXT)
    TO anon, authenticated, service_role;
