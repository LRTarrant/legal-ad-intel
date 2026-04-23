-- RPC: get_tort_advertising_heatmap
-- Returns distinct advertiser counts by geography for a given tort.
-- Supports state-level (aggregated by state_abbr) and DMA-level views.
-- Used by the tort advertising heatmap component on tort detail pages.

CREATE OR REPLACE FUNCTION get_tort_advertising_heatmap(
  p_tort_slug text,
  p_geo_level text DEFAULT 'state',
  p_window_days int DEFAULT 90
)
RETURNS TABLE (
  geo_code text,
  geo_name text,
  advertiser_count int,
  observation_count bigint
) AS $$
DECLARE
  v_window_start date := CURRENT_DATE - p_window_days;
BEGIN
  IF p_geo_level = 'state' THEN
    RETURN QUERY
    SELECT
      g.state_abbr AS geo_code,
      g.state_abbr AS geo_name,
      COUNT(DISTINCT r.advertiser_id)::int AS advertiser_count,
      COUNT(*)::bigint AS observation_count
    FROM ad_observations_raw r
    JOIN torts t ON t.id = r.tort_id
    JOIN geo_targets g ON g.id = r.geo_target_id
    WHERE t.slug = p_tort_slug
      AND g.state_abbr IS NOT NULL
      AND r.first_seen <= CURRENT_DATE
      AND (r.last_seen IS NULL OR r.last_seen >= v_window_start)
    GROUP BY g.state_abbr
    ORDER BY advertiser_count DESC;
  ELSE
    -- DMA-level: return individual geo_targets (DMA markets)
    RETURN QUERY
    SELECT
      g.geo_code AS geo_code,
      g.geo_name AS geo_name,
      COUNT(DISTINCT r.advertiser_id)::int AS advertiser_count,
      COUNT(*)::bigint AS observation_count
    FROM ad_observations_raw r
    JOIN torts t ON t.id = r.tort_id
    JOIN geo_targets g ON g.id = r.geo_target_id
    WHERE t.slug = p_tort_slug
      AND r.first_seen <= CURRENT_DATE
      AND (r.last_seen IS NULL OR r.last_seen >= v_window_start)
    GROUP BY g.geo_code, g.geo_name
    ORDER BY advertiser_count DESC;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
