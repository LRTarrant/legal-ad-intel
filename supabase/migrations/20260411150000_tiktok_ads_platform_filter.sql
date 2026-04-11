-- Add optional p_source filter to get_ad_saturation_windowed
-- Allows filtering ad saturation data by platform (e.g., 'google_ads', 'tiktok_ads')

CREATE OR REPLACE FUNCTION get_ad_saturation_windowed(
  p_window_start date,
  p_window_end date,
  p_tort_slug text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  tort_slug text,
  tort_label text,
  tort_category text,
  geo_name text,
  state_abbr text,
  geo_code text,
  geo_type text,
  geo_population bigint,
  total_advertisers int,
  total_creatives int,
  total_observations bigint,
  estimated_spend numeric,
  saturation_score numeric,
  tort_id uuid,
  geo_target_id uuid
) AS $$
WITH raw_groups AS (
  SELECT
    t.id AS t_id,
    t.slug AS t_slug,
    t.label AS t_label,
    COALESCE(t.category, '') AS t_category,
    g.id AS g_id,
    g.geo_name AS g_geo_name,
    g.state_abbr AS g_state_abbr,
    g.geo_code AS g_geo_code,
    g.geo_type AS g_geo_type,
    g.population AS g_population,
    COUNT(DISTINCT r.advertiser_id)::int AS adv_count,
    COUNT(DISTINCT r.creative_text)::int AS cre_count,
    COUNT(*)::bigint AS obs_count,
    COALESCE(SUM(COALESCE(r.estimated_spend_low, 0)), 0) AS spend_total
  FROM ad_observations_raw r
  JOIN torts t ON t.id = r.tort_id
  JOIN geo_targets g ON g.id = r.geo_target_id
  WHERE r.first_seen <= p_window_end
    AND (r.last_seen IS NULL OR r.last_seen >= p_window_start)
    AND (p_tort_slug IS NULL OR t.slug = p_tort_slug)
    AND (p_state IS NULL OR g.state_abbr = p_state)
    AND (p_source IS NULL OR r.source = p_source)
  GROUP BY t.id, t.slug, t.label, t.category, g.id, g.geo_name, g.state_abbr, g.geo_code, g.geo_type, g.population
),
maxima AS (
  SELECT
    GREATEST(MAX(adv_count), 1) AS max_adv,
    GREATEST(MAX(spend_total), 1) AS max_spend,
    GREATEST(MAX(cre_count), 1) AS max_cre
  FROM raw_groups
)
SELECT
  rg.t_slug,
  rg.t_label,
  rg.t_category,
  rg.g_geo_name,
  rg.g_state_abbr,
  rg.g_geo_code,
  rg.g_geo_type,
  rg.g_population,
  rg.adv_count,
  rg.cre_count,
  rg.obs_count,
  rg.spend_total,
  ROUND(
    (
      (rg.adv_count::numeric / m.max_adv) * 0.4 +
      (rg.spend_total / m.max_spend) * 0.35 +
      (rg.cre_count::numeric / m.max_cre) * 0.25
    ) * 100,
    1
  ) AS saturation_score,
  rg.t_id,
  rg.g_id
FROM raw_groups rg
CROSS JOIN maxima m
ORDER BY saturation_score DESC NULLS LAST;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_ad_saturation_windowed(date, date, text, text, text) TO authenticated, anon;

-- Add p_source parameter to get_top_advertisers_by_segment
-- (accepts but does not filter by source since ad_saturation_scores has no source column)
CREATE OR REPLACE FUNCTION get_top_advertisers_by_segment(
  p_tort_slug text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  advertiser_name text,
  segment text,
  entity_type text,
  total_spend numeric,
  total_creatives int,
  market_count bigint
) AS $$
SELECT
  COALESCE(ae.canonical_name, adv->>'name') as advertiser_name,
  COALESCE(ae.segment::text, 'unclassified') as segment,
  COALESCE(ae.entity_type, 'unknown') as entity_type,
  SUM((adv->>'spend')::numeric) as total_spend,
  SUM((adv->>'creatives')::int) as total_creatives,
  COUNT(DISTINCT gt.id) as market_count
FROM ad_saturation_scores s
JOIN torts t ON t.id = s.tort_id
JOIN geo_targets gt ON gt.id = s.geo_target_id,
jsonb_array_elements(s.top_advertisers) as adv
LEFT JOIN advertiser_entities ae
  ON ae.canonical_name = adv->>'name'
  OR (adv->>'name') = ANY(ae.aliases)
WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug)
GROUP BY COALESCE(ae.canonical_name, adv->>'name'), ae.segment, ae.entity_type
ORDER BY total_spend DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_top_advertisers_by_segment(text, integer, text) TO authenticated, anon;

-- Add p_source parameter to get_advertiser_competitive_summary
-- (accepts but does not filter by source since ad_observations_normalized has no source column)
CREATE OR REPLACE FUNCTION get_advertiser_competitive_summary(
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
) AS $$
SELECT
  ae.canonical_name AS advertiser_name,
  COALESCE(ae.segment::text, 'unknown') AS segment,
  COALESCE(ae.entity_type::text, 'unknown') AS entity_type,
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
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_advertiser_competitive_summary(text, text, text) TO authenticated, anon;
