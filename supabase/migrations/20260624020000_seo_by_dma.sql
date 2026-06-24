-- ============================================================================
-- #3b — per-metro (DMA) SEO.
--
-- serp_results_normalized was national (no geo). This adds a dma_code dimension
-- so organic competition can be cut by DMA, fed by a dedicated per-metro SERP
-- pipeline (serp_metro_daily) keyed by the 6 SEO case-type torts (clean
-- taxonomy — NOT the pi_search clusters, which don't all map to torts.slug).
--
-- Rows with dma_code IS NULL are the existing national results; rows with a
-- dma_code are metro-scoped. The national RPC is updated to exclude metro rows
-- so they don't double-count; a new by-DMA RPC reads only metro rows.
-- ============================================================================

-- 1. Geo dimension. NULL = national (all existing rows); non-null = metro-scoped.
ALTER TABLE public.serp_results_normalized
  ADD COLUMN IF NOT EXISTS dma_code text;

CREATE INDEX IF NOT EXISTS idx_serp_normalized_tort_dma
  ON public.serp_results_normalized (tort_slug, dma_code, fetched_at)
  WHERE result_type = 'organic';

-- 2. Ensure the 6 SEO case-type torts exist (FK target for the metro rows).
INSERT INTO public.torts (slug, label, category)
VALUES
    ('motor_vehicle',  'Motor Vehicle Accident', 'personal_injury'),
    ('truck_accident', 'Truck Accident',         'personal_injury'),
    ('motorcycle',     'Motorcycle Accident',    'personal_injury'),
    ('boating',        'Boating Accident',       'personal_injury'),
    ('nursing_home',   'Nursing Home Abuse',     'personal_injury'),
    ('workers_comp',   'Workers Compensation',   'personal_injury')
ON CONFLICT (slug) DO NOTHING;

-- 3. National RPC — now national-only (dma_code IS NULL) so the metro rows this
--    migration enables don't inflate the national view.
CREATE OR REPLACE FUNCTION public.get_seo_competitors_by_tort(
    p_tort_slug TEXT,
    p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    domain TEXT,
    advertiser_name TEXT,
    organic_appearances BIGINT,
    avg_position NUMERIC,
    best_position INTEGER,
    top_3_count BIGINT,
    top_10_count BIGINT,
    keywords_tracked BIGINT,
    first_seen DATE,
    last_seen DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        n.domain,
        MAX(ae.canonical_name) AS advertiser_name,
        COUNT(*) AS organic_appearances,
        ROUND(AVG(n.position)::numeric, 1) AS avg_position,
        MIN(n.position) AS best_position,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 3) AS top_3_count,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 10) AS top_10_count,
        COUNT(DISTINCT n.query) AS keywords_tracked,
        MIN(n.fetched_at)::date AS first_seen,
        MAX(n.fetched_at)::date AS last_seen
    FROM public.serp_results_normalized n
    LEFT JOIN public.advertiser_entities ae ON ae.id = n.advertiser_entity_id
    WHERE n.result_type = 'organic'
      AND n.dma_code IS NULL
      AND n.tort_slug = p_tort_slug
      AND n.fetched_at >= now() - (p_days || ' days')::interval
    GROUP BY n.domain
    ORDER BY organic_appearances DESC
    LIMIT 50;
$$;

-- 4. By-DMA RPC — organic competitors for a case type within one DMA.
CREATE OR REPLACE FUNCTION public.get_seo_competitors_by_dma(
    p_tort_slug TEXT,
    p_dma_code TEXT,
    p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    domain TEXT,
    advertiser_name TEXT,
    organic_appearances BIGINT,
    avg_position NUMERIC,
    best_position INTEGER,
    top_3_count BIGINT,
    top_10_count BIGINT,
    keywords_tracked BIGINT,
    first_seen DATE,
    last_seen DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        n.domain,
        MAX(ae.canonical_name) AS advertiser_name,
        COUNT(*) AS organic_appearances,
        ROUND(AVG(n.position)::numeric, 1) AS avg_position,
        MIN(n.position) AS best_position,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 3) AS top_3_count,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 10) AS top_10_count,
        COUNT(DISTINCT n.query) AS keywords_tracked,
        MIN(n.fetched_at)::date AS first_seen,
        MAX(n.fetched_at)::date AS last_seen
    FROM public.serp_results_normalized n
    LEFT JOIN public.advertiser_entities ae ON ae.id = n.advertiser_entity_id
    WHERE n.result_type = 'organic'
      AND n.dma_code = p_dma_code
      AND n.tort_slug = p_tort_slug
      AND n.fetched_at >= now() - (p_days || ' days')::interval
    GROUP BY n.domain
    ORDER BY organic_appearances DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_seo_competitors_by_dma(TEXT, TEXT, INTEGER) IS
    'Organic-search competitors for a PI case type within one Nielsen DMA over '
    'the last p_days, from serp_results_normalized (result_type=organic, metro '
    'rows where dma_code = p_dma_code). Fed by serp_metro_daily.';

GRANT EXECUTE ON FUNCTION public.get_seo_competitors_by_dma(TEXT, TEXT, INTEGER)
    TO anon, authenticated, service_role;

-- 5. pipeline_configs seed for the per-metro SERP pipeline.
INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('serp_metro_daily', 'ad_intelligence',
   'Per-metro organic SERP for the 6 SEO case types; writes metro-scoped (dma_code) rows to serp_results_normalized for the SEO-by-DMA competitive cut',
   '30 12 * * *', 240, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_organic","step_order":1,"description":"For each pi_metro x SEO case type, run a geo-targeted Google SERP and upsert organic results with dma_code"},{"step_name":"publish","step_order":2,"description":"Verify metro organic coverage and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
