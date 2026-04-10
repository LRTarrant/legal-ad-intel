CREATE OR REPLACE FUNCTION public.get_advertiser_competitive_summary(
  p_tort_slug text DEFAULT NULL,
  p_state_abbr text DEFAULT NULL
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
    ae.canonical_name AS advertiser_name,
    COALESCE(ae.segment, 'unknown') AS segment,
    COALESCE(ae.entity_type, 'unknown') AS entity_type,
    COALESCE(SUM(aon.estimated_spend), 0)::numeric AS total_spend,
    COALESCE(SUM(aon.unique_creatives), 0)::bigint AS total_creatives,
    COALESCE(SUM(aon.observation_count), 0)::bigint AS total_observations,
    COUNT(DISTINCT aon.tort_id)::bigint AS tort_count,
    COUNT(DISTINCT aon.geo_target_id)::bigint AS market_count
  FROM public.ad_observations_normalized aon
  JOIN public.advertiser_entities ae ON ae.id = aon.advertiser_id
  JOIN public.torts t ON t.id = aon.tort_id
  JOIN public.geo_targets gt ON gt.id = aon.geo_target_id
  WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug)
    AND (p_state_abbr IS NULL OR gt.state_abbr = p_state_abbr)
  GROUP BY ae.canonical_name, ae.segment, ae.entity_type
  ORDER BY total_spend DESC, total_creatives DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_tort_market_advertisers(
  p_tort_id uuid,
  p_geo_target_id uuid
)
RETURNS TABLE (
  advertiser_id uuid,
  advertiser_name text,
  segment text,
  entity_type text,
  total_spend numeric,
  total_creatives bigint,
  total_observations bigint,
  spend_share_pct numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH advertiser_totals AS (
    SELECT
      aon.advertiser_id,
      ae.canonical_name AS advertiser_name,
      COALESCE(ae.segment, 'unknown') AS segment,
      COALESCE(ae.entity_type, 'unknown') AS entity_type,
      COALESCE(SUM(aon.estimated_spend), 0)::numeric AS total_spend,
      COALESCE(SUM(aon.unique_creatives), 0)::bigint AS total_creatives,
      COALESCE(SUM(aon.observation_count), 0)::bigint AS total_observations
    FROM public.ad_observations_normalized aon
    JOIN public.advertiser_entities ae ON ae.id = aon.advertiser_id
    WHERE aon.tort_id = p_tort_id
      AND aon.geo_target_id = p_geo_target_id
    GROUP BY aon.advertiser_id, ae.canonical_name, ae.segment, ae.entity_type
  ), spend_total AS (
    SELECT COALESCE(SUM(total_spend), 0)::numeric AS total_spend_all
    FROM advertiser_totals
  )
  SELECT
    at.advertiser_id,
    at.advertiser_name,
    at.segment,
    at.entity_type,
    at.total_spend,
    at.total_creatives,
    at.total_observations,
    CASE
      WHEN st.total_spend_all > 0
      THEN ROUND((at.total_spend / st.total_spend_all) * 100, 2)
      ELSE 0
    END AS spend_share_pct
  FROM advertiser_totals at
  CROSS JOIN spend_total st
  ORDER BY at.total_spend DESC, at.total_creatives DESC;
$$;
