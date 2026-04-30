-- =============================================================================
-- Fix 8 tort pages with missing advertising panels
-- =============================================================================
--
-- Bug A: slug mismatch — mass_torts.slug (hyphenated) → toDbSlug() (underscore)
--   does not always match torts.slug for RPCs that filter on t.slug.
--   Five torts are affected:
--     roblox-abuse        → page passes "roblox_abuse"       torts.slug = "roblox_abuse"       ✓ matches
--     glp1-gastroparesis  → page passes "glp1_gastroparesis" torts.slug = "glp1_gastroparesis" ✓ matches
--     glp1-vision-loss    → page passes "glp1_vision_loss"   torts.slug = "glp1_vision_loss"   ✓ matches
--     olympus-duodenoscope→ page passes "olympus_duodenoscope" torts.slug = "olympus_scopes"   ✗ MISMATCH
--     ai-suicide-self-harm→ page passes "ai_suicide_self_harm" torts.slug = "ai_suicide"       ✗ MISMATCH
--
--   Fix: add slug_alias column to torts, populate for the 2 mismatched torts,
--   and update all RPCs to check both t.slug and t.slug_alias.
--
-- Bug B: get_top_advertisers_by_segment and get_segment_summary read from
--   ad_saturation_scores / ad_observations_normalized (stale/unpopulated tables).
--   Fix: rewrite both to read from ad_observations_raw, matching the pattern
--   used by get_advertiser_competitive_summary (PR #269).
--
-- Bug C: cost benchmark lookup — page matches tort.label against
--   tort_cost_benchmarks.tort_name using fuzzy matching. For 5 torts (roblox,
--   glp1-gastro, glp1-vision, olympus, ai-suicide) the match fails or no row
--   exists. Fix: add cost_benchmark_name to mass_torts for explicit mapping,
--   and insert starter rows for the 3 torts with no benchmark data.
--
-- Bug D: organic search panel — SERP tables key on torts.slug, same slug
--   mismatch as Bug A for olympus/ai-suicide. Fixed by the slug_alias approach.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG A: Add slug_alias column to torts and populate for mismatched slugs
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.torts ADD COLUMN IF NOT EXISTS slug_alias text;

-- olympus_scopes can also be found via "olympus_duodenoscope"
UPDATE public.torts SET slug_alias = 'olympus_duodenoscope' WHERE slug = 'olympus_scopes';

-- ai_suicide can also be found via "ai_suicide_self_harm"
UPDATE public.torts SET slug_alias = 'ai_suicide_self_harm' WHERE slug = 'ai_suicide';

CREATE INDEX IF NOT EXISTS idx_torts_slug_alias ON public.torts(slug_alias) WHERE slug_alias IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG A: Update get_advertiser_competitive_summary to honor slug_alias
-- ─────────────────────────────────────────────────────────────────────────────

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
  WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
    AND (p_state_abbr IS NULL OR gt.state_abbr = p_state_abbr)
    AND (p_source     IS NULL OR r.source      = p_source)
  GROUP BY ae.canonical_name, ae.segment, ae.entity_type
  ORDER BY total_spend DESC, total_creatives DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_advertiser_competitive_summary(text, text, text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG A: Update get_advertiser_platforms to honor slug_alias
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_advertiser_platforms(
  p_tort_slug text DEFAULT NULL,
  p_state_abbr text DEFAULT NULL,
  p_source text DEFAULT NULL
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
  FROM public.ad_observations_raw r
  JOIN public.advertiser_entities ae ON ae.id = r.advertiser_id
  JOIN public.torts t                ON t.id  = r.tort_id
  JOIN public.geo_targets gt         ON gt.id = r.geo_target_id
  WHERE (p_tort_slug  IS NULL OR t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
    AND (p_state_abbr IS NULL OR gt.state_abbr = p_state_abbr)
    AND (p_source     IS NULL OR r.source      = p_source)
  GROUP BY ae.canonical_name
  ORDER BY ae.canonical_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_advertiser_platforms(text, text, text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG A: Update get_ad_saturation_windowed to honor slug_alias
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ad_saturation_windowed(
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
    AND (p_tort_slug IS NULL OR t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
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

GRANT EXECUTE ON FUNCTION public.get_ad_saturation_windowed(date, date, text, text, text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG A: Update get_tort_advertising_heatmap to honor slug_alias
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_tort_advertising_heatmap(
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
    WHERE (t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
      AND g.state_abbr IS NOT NULL
      AND r.first_seen <= CURRENT_DATE
      AND (r.last_seen IS NULL OR r.last_seen >= v_window_start)
    GROUP BY g.state_abbr
    ORDER BY advertiser_count DESC;
  ELSE
    RETURN QUERY
    SELECT
      g.geo_code AS geo_code,
      g.geo_name AS geo_name,
      COUNT(DISTINCT r.advertiser_id)::int AS advertiser_count,
      COUNT(*)::bigint AS observation_count
    FROM ad_observations_raw r
    JOIN torts t ON t.id = r.tort_id
    JOIN geo_targets g ON g.id = r.geo_target_id
    WHERE (t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
      AND r.first_seen <= CURRENT_DATE
      AND (r.last_seen IS NULL OR r.last_seen >= v_window_start)
    GROUP BY g.geo_code, g.geo_name
    ORDER BY advertiser_count DESC;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_tort_advertising_heatmap(text, text, int)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG B + A: Rewrite get_top_advertisers_by_segment to use ad_observations_raw
-- (was reading from ad_saturation_scores which is stale/unpopulated)
-- Also adds slug_alias support.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_top_advertisers_by_segment(
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
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ae.canonical_name                                     AS advertiser_name,
    COALESCE(ae.segment::text, 'unclassified')            AS segment,
    COALESCE(ae.entity_type, 'unknown')                   AS entity_type,
    COALESCE(
      SUM(
        (COALESCE(r.estimated_spend_low, 0) + COALESCE(r.estimated_spend_high, 0)) / 2.0
      ), 0
    )::numeric                                            AS total_spend,
    COUNT(DISTINCT r.creative_url)::int                   AS total_creatives,
    COUNT(DISTINCT r.geo_target_id)::bigint               AS market_count
  FROM public.ad_observations_raw r
  JOIN public.advertiser_entities ae ON ae.id = r.advertiser_id
  JOIN public.torts t                ON t.id  = r.tort_id
  WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
    AND (p_source    IS NULL OR r.source = p_source)
  GROUP BY ae.canonical_name, ae.segment, ae.entity_type
  ORDER BY total_spend DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_advertisers_by_segment(text, integer, text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG B + A: Rewrite get_segment_summary to use ad_observations_raw
-- (was reading from ad_saturation_scores or ad_observations_normalized)
-- Also adds slug_alias support.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_segment_summary(
  p_tort_slug text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  segment text,
  advertiser_count bigint,
  total_spend numeric,
  total_creatives bigint,
  avg_spend_per_advertiser numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH per_advertiser AS (
    SELECT
      COALESCE(ae.segment::text, 'unknown') AS seg,
      ae.canonical_name,
      COALESCE(
        SUM(
          (COALESCE(r.estimated_spend_low, 0) + COALESCE(r.estimated_spend_high, 0)) / 2.0
        ), 0
      )::numeric AS adv_spend,
      COUNT(DISTINCT r.creative_url) AS adv_creatives
    FROM public.ad_observations_raw r
    JOIN public.advertiser_entities ae ON ae.id = r.advertiser_id
    JOIN public.torts t                ON t.id  = r.tort_id
    WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
      AND (p_source    IS NULL OR r.source = p_source)
    GROUP BY ae.segment, ae.canonical_name
  )
  SELECT
    pa.seg                                         AS segment,
    COUNT(DISTINCT pa.canonical_name)::bigint      AS advertiser_count,
    SUM(pa.adv_spend)::numeric                     AS total_spend,
    SUM(pa.adv_creatives)::bigint                  AS total_creatives,
    CASE
      WHEN COUNT(DISTINCT pa.canonical_name) > 0
      THEN ROUND(SUM(pa.adv_spend) / COUNT(DISTINCT pa.canonical_name), 2)
      ELSE 0
    END::numeric                                   AS avg_spend_per_advertiser
  FROM per_advertiser pa
  GROUP BY pa.seg
  ORDER BY total_spend DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_segment_summary(text, text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG B + A: Rewrite get_advertiser_segments to use ad_observations_raw
-- (was reading from ad_observations_normalized; currently unused in the UI
--  but exists in the DB and should be fixed for consistency)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_advertiser_segments(
  p_tort_slug text DEFAULT NULL
)
RETURNS TABLE (
  advertiser_name text,
  segment text,
  entity_type text,
  total_spend numeric,
  total_creatives bigint,
  tort_slug text,
  geo_name text,
  market_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ae.canonical_name                                     AS advertiser_name,
    COALESCE(ae.segment::text, 'unknown')                 AS segment,
    COALESCE(ae.entity_type, 'unknown')                   AS entity_type,
    COALESCE(
      SUM(
        (COALESCE(r.estimated_spend_low, 0) + COALESCE(r.estimated_spend_high, 0)) / 2.0
      ), 0
    )::numeric                                            AS total_spend,
    COUNT(DISTINCT r.creative_url)::bigint                AS total_creatives,
    t.slug                                                AS tort_slug,
    ''::text                                              AS geo_name,
    COUNT(DISTINCT r.geo_target_id)::bigint               AS market_count
  FROM public.ad_observations_raw r
  JOIN public.advertiser_entities ae ON ae.id = r.advertiser_id
  JOIN public.torts t                ON t.id  = r.tort_id
  WHERE (p_tort_slug IS NULL OR t.slug = p_tort_slug OR t.slug_alias = p_tort_slug)
  GROUP BY ae.canonical_name, ae.segment, ae.entity_type, t.slug
  ORDER BY total_spend DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_advertiser_segments(text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG D + A: Update get_serp_visibility_windowed to honor slug_alias
-- SERP tables reference torts.slug directly in their tort_slug column.
-- We need to resolve the alias to the actual torts.slug used in SERP tables.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_serp_visibility_windowed(
  p_start_date date,
  p_end_date date,
  p_tort_slug text DEFAULT NULL
)
RETURNS TABLE (
  domain text,
  advertiser_entity_id uuid,
  advertiser_name text,
  tort_slug text,
  total_appearances bigint,
  avg_position numeric,
  organic_appearances bigint,
  paid_appearances bigint,
  featured_snippet_count bigint,
  local_pack_count bigint,
  top_3_count bigint,
  top_10_count bigint,
  visibility_score numeric,
  queries_tracked bigint
) AS $$
WITH resolved_slug AS (
  -- Resolve slug alias to the canonical torts.slug used in SERP tables
  SELECT t.slug AS canonical_slug
  FROM public.torts t
  WHERE t.slug = p_tort_slug OR t.slug_alias = p_tort_slug
  LIMIT 1
),
agg AS (
  SELECT
    n.domain,
    n.advertiser_entity_id,
    n.tort_slug AS t_slug,
    COUNT(*) AS total_apps,
    AVG(n.position)::numeric(5,2) AS avg_pos,
    COUNT(*) FILTER (WHERE n.result_type = 'organic') AS organic_apps,
    COUNT(*) FILTER (WHERE n.result_type = 'paid') AS paid_apps,
    COUNT(*) FILTER (WHERE n.result_type = 'featured_snippet') AS fs_count,
    COUNT(*) FILTER (WHERE n.result_type = 'local_pack') AS lp_count,
    COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 3) AS t3_count,
    COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 10) AS t10_count,
    COUNT(DISTINCT n.query) AS q_tracked
  FROM public.serp_results_normalized n
  WHERE n.fetched_at >= p_start_date
    AND n.fetched_at < (p_end_date + interval '1 day')
    AND (p_tort_slug IS NULL OR n.tort_slug = (SELECT canonical_slug FROM resolved_slug))
  GROUP BY n.domain, n.advertiser_entity_id, n.tort_slug
)
SELECT
  a.domain,
  a.advertiser_entity_id,
  ae.canonical_name,
  a.t_slug,
  a.total_apps,
  a.avg_pos,
  a.organic_apps,
  a.paid_apps,
  a.fs_count,
  a.lp_count,
  a.t3_count,
  a.t10_count,
  ROUND(
    CASE WHEN a.q_tracked > 0 THEN
      (a.t3_count * 3.0 + a.t10_count * 1.5 +
       a.fs_count * 5.0 +
       a.organic_apps * 1.0 +
       a.paid_apps * 0.5) / a.q_tracked
    ELSE 0 END,
    2
  ) AS visibility_score,
  a.q_tracked
FROM agg a
LEFT JOIN public.advertiser_entities ae ON ae.id = a.advertiser_entity_id
ORDER BY visibility_score DESC NULLS LAST;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_serp_visibility_windowed(date, date, text)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG C: Add cost_benchmark_name to mass_torts for explicit benchmark mapping
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.mass_torts ADD COLUMN IF NOT EXISTS cost_benchmark_name text;

-- Populate cost_benchmark_name for torts where the fuzzy matching fails.
-- For torts where the existing fuzzy match works (e.g., bard-powerport → "Bard PowerPort"),
-- we set it explicitly anyway for reliability.
UPDATE public.mass_torts SET cost_benchmark_name = 'Social Media Harm'     WHERE slug = 'roblox-abuse';
UPDATE public.mass_torts SET cost_benchmark_name = 'Ozempic / GLP-1'      WHERE slug = 'glp1-gastroparesis';
UPDATE public.mass_torts SET cost_benchmark_name = 'Ozempic / GLP-1'      WHERE slug = 'glp1-vision-loss';
UPDATE public.mass_torts SET cost_benchmark_name = 'Bard PowerPort'       WHERE slug = 'bard-powerport';
UPDATE public.mass_torts SET cost_benchmark_name = 'Uber Sexual Assault'  WHERE slug = 'uber-sexual-assault';
UPDATE public.mass_torts SET cost_benchmark_name = 'Lyft Sexual Assault'  WHERE slug = 'lyft-sexual-assault';
UPDATE public.mass_torts SET cost_benchmark_name = 'Hernia Mesh'          WHERE slug = 'olympus-duodenoscope';
UPDATE public.mass_torts SET cost_benchmark_name = 'Social Media Harm'    WHERE slug = 'ai-suicide-self-harm';


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG C: Insert starter cost benchmark rows for torts with no data.
-- Using comparable category benchmarks. Marked with source_name =
-- 'estimated_from_comparable' for transparency.
-- ─────────────────────────────────────────────────────────────────────────────

-- Roblox Abuse — based on Social Media Harm benchmarks
INSERT INTO public.tort_cost_benchmarks (
  tort_name, criteria_tier,
  cpl_low, cpl_high, cpa_low, cpa_high,
  lead_to_retainer_pct, attrition_pct,
  settlement_low, settlement_high,
  lifecycle_phase, observed_date,
  source_name, source_notes
) VALUES (
  'Roblox Abuse', 'vendor_avg',
  150, 350, 2000, 5000,
  25.00, 35.00,
  50000, 150000,
  'emerging', '2026-04-30',
  'estimated_from_comparable', 'Estimated from Social Media Harm benchmarks. Roblox child safety litigation is early-stage with limited advertiser pricing data.'
) ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;

-- AI Suicide / Self-Harm — based on Social Media Harm benchmarks
INSERT INTO public.tort_cost_benchmarks (
  tort_name, criteria_tier,
  cpl_low, cpl_high, cpa_low, cpa_high,
  lead_to_retainer_pct, attrition_pct,
  settlement_low, settlement_high,
  lifecycle_phase, observed_date,
  source_name, source_notes
) VALUES (
  'AI Suicide & Self-Harm', 'vendor_avg',
  150, 350, 2000, 5000,
  25.00, 35.00,
  50000, 200000,
  'emerging', '2026-04-30',
  'estimated_from_comparable', 'Estimated from Social Media Harm benchmarks. AI-related harm litigation is nascent with no established cost benchmarks.'
) ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;

-- Olympus Duodenoscope — based on medical device (Hernia Mesh / BioZorb) benchmarks
INSERT INTO public.tort_cost_benchmarks (
  tort_name, criteria_tier,
  cpl_low, cpl_high, cpa_low, cpa_high,
  lead_to_retainer_pct, attrition_pct,
  settlement_low, settlement_high,
  lifecycle_phase, observed_date,
  source_name, source_notes
) VALUES (
  'Olympus Duodenoscope', 'vendor_avg',
  100, 250, 1500, 4000,
  30.00, 25.00,
  75000, 250000,
  'late', '2026-04-30',
  'estimated_from_comparable', 'Estimated from Hernia Mesh / BioZorb medical device benchmarks. Olympus scope litigation is in late stage with established case inventory.'
) ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- BUG D: Fix getSerpTopResults — the TS code queries serp_results_normalized
-- by tort_slug directly, so we also need to handle the alias there.
-- We add a helper view or adjust the query in TS.
-- Since serp_results_normalized.tort_slug references torts(slug), the alias
-- resolution needs to happen in the TS code. We'll handle that in the
-- TypeScript changes (getSerpTopResults will resolve alias before querying).
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries (run these after applying the migration to confirm fixes)
-- ─────────────────────────────────────────────────────────────────────────────

-- Bug A verification: olympus and ai-suicide should now resolve via alias
-- SELECT slug, slug_alias FROM torts WHERE slug_alias IS NOT NULL;
--
-- Bug B verification: top advertisers should return rows for all 8 torts
-- SELECT * FROM get_top_advertisers_by_segment('roblox_abuse', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('glp1_gastroparesis', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('glp1_vision_loss', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('bard_powerport', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('uber_sexual_assault', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('lyft_sexual_assault', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('olympus_duodenoscope', 5, NULL);
-- SELECT * FROM get_top_advertisers_by_segment('ai_suicide_self_harm', 5, NULL);
--
-- Bug B verification: segment summary should return rows
-- SELECT * FROM get_segment_summary('roblox_abuse');
-- SELECT * FROM get_segment_summary('olympus_duodenoscope');
-- SELECT * FROM get_segment_summary('ai_suicide_self_harm');
--
-- Bug C verification: cost benchmarks should have rows for all affected torts
-- SELECT tort_name, source_name FROM tort_cost_benchmarks
-- WHERE tort_name IN ('Roblox Abuse', 'AI Suicide & Self-Harm', 'Olympus Duodenoscope');
--
-- Bug C verification: mass_torts cost_benchmark_name populated
-- SELECT slug, cost_benchmark_name FROM mass_torts
-- WHERE cost_benchmark_name IS NOT NULL ORDER BY slug;
--
-- Bug D verification: SERP visibility for aliased slugs
-- SELECT * FROM get_serp_visibility_windowed(
--   CURRENT_DATE - 90, CURRENT_DATE, 'olympus_duodenoscope'
-- ) LIMIT 5;
-- SELECT * FROM get_serp_visibility_windowed(
--   CURRENT_DATE - 90, CURRENT_DATE, 'ai_suicide_self_harm'
-- ) LIMIT 5;
