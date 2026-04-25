-- Polish get_tort_advertising_heatmap RPC: return full state names instead of abbreviations.
-- The state branch previously returned geo_name = state_abbr (e.g. 'FL').
-- Now it returns geo_name = full state name (e.g. 'Florida') via a CTE mapping.
-- DMA branch is unchanged — it already returns proper geo_name from geo_targets.

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
    WITH state_names(abbr, full_name) AS (VALUES
      ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),
      ('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),
      ('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),
      ('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),
      ('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),
      ('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),
      ('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),
      ('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),
      ('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),
      ('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),
      ('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),
      ('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),
      ('WI','Wisconsin'),('WY','Wyoming'),('DC','District of Columbia')
    )
    SELECT
      g.state_abbr AS geo_code,
      COALESCE(sn.full_name, g.state_abbr) AS geo_name,
      COUNT(DISTINCT r.advertiser_id)::int AS advertiser_count,
      COUNT(*)::bigint AS observation_count
    FROM ad_observations_raw r
    JOIN torts t ON t.id = r.tort_id
    JOIN geo_targets g ON g.id = r.geo_target_id
    LEFT JOIN state_names sn ON sn.abbr = g.state_abbr
    WHERE t.slug = p_tort_slug
      AND g.state_abbr IS NOT NULL
      AND r.first_seen <= CURRENT_DATE
      AND (r.last_seen IS NULL OR r.last_seen >= v_window_start)
    GROUP BY g.state_abbr, sn.full_name
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
