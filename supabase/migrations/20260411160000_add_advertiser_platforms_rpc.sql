-- RPC: get_advertiser_platforms
-- Returns distinct platform sources for each advertiser (by canonical_name).
-- Used by the ad-saturation page to show platform pill badges per advertiser row.

CREATE OR REPLACE FUNCTION public.get_advertiser_platforms(
  p_tort_slug text DEFAULT NULL,
  p_state_abbr text DEFAULT NULL
)
RETURNS TABLE (
  advertiser_name text,
  platforms text[]
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ae.canonical_name AS advertiser_name,
    ARRAY_AGG(DISTINCT r.source ORDER BY r.source) AS platforms
  FROM ad_observations_raw r
  JOIN advertiser_entities ae ON ae.id = r.advertiser_id
  JOIN torts t ON t.id = r.tort_id
  JOIN geo_targets gt ON gt.id = r.geo_target_id
  WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug)
    AND (p_state_abbr IS NULL OR gt.state_abbr = p_state_abbr)
  GROUP BY ae.canonical_name
  ORDER BY ae.canonical_name;
$$;

GRANT EXECUTE ON FUNCTION get_advertiser_platforms(text, text) TO authenticated, anon;
