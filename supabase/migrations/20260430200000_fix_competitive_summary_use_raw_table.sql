-- Fix get_advertiser_competitive_summary to read from ad_observations_raw
-- instead of ad_observations_normalized.
--
-- Root cause: the previous version joined ad_observations_normalized, which is
-- only populated when the ad_intel_daily pipeline normalize step runs.  Newly
-- seeded states (TN, AL, AZ) had data in ad_observations_raw but nothing in
-- the normalized table, so the "Top Advertisers" panel rendered the empty
-- placeholder while the other three panels (Platform Breakdown, Tort
-- Concentration, Sample Ads) — which all read ad_observations_raw — displayed
-- data correctly.
--
-- This rewrite computes the same aggregates on the fly from the raw table,
-- matching the approach used by get_advertiser_platforms and
-- get_ad_saturation_windowed.  The p_source filter now works as well (the
-- previous version accepted but ignored it).

CREATE OR REPLACE FUNCTION public.get_advertiser_competitive_summary(
  p_tort_slug text DEFAULT NULL,
  p_state_abbr text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  advertiser_name text,
  segment text,
  entity_type text,
  total_spend numeric,
  total_creatives bigint,
  total_observations bigint,
  tort_count bigint,
  market_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ae.canonical_name                                       AS advertiser_name,
    COALESCE(ae.segment::text, 'unknown')                   AS segment,
    COALESCE(ae.entity_type::text, 'unknown')               AS entity_type,
    COALESCE(
      SUM(
        (COALESCE(r.estimated_spend_low, 0) + COALESCE(r.estimated_spend_high, 0)) / 2.0
      ), 0
    )::numeric                                              AS total_spend,
    COUNT(DISTINCT r.creative_url)::bigint                  AS total_creatives,
    COUNT(*)::bigint                                        AS total_observations,
    COUNT(DISTINCT r.tort_id)::bigint                       AS tort_count,
    COUNT(DISTINCT r.geo_target_id)::bigint                 AS market_count
  FROM public.ad_observations_raw r
  JOIN public.advertiser_entities ae ON ae.id = r.advertiser_id
  JOIN public.torts t                ON t.id  = r.tort_id
  JOIN public.geo_targets gt         ON gt.id = r.geo_target_id
  WHERE (p_tort_slug  IS NULL OR t.slug        = p_tort_slug)
    AND (p_state_abbr IS NULL OR gt.state_abbr = p_state_abbr)
    AND (p_source     IS NULL OR r.source      = p_source)
  GROUP BY ae.canonical_name, ae.segment, ae.entity_type
  ORDER BY total_spend DESC, total_creatives DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_advertiser_competitive_summary(text, text, text)
  TO authenticated, anon;
