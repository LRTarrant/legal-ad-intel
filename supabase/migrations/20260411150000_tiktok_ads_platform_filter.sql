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
