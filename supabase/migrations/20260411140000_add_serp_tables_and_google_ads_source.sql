-- ============================================================
-- SERP Visibility tables, Google Ads source, windowed RPC,
-- and pipeline configs for google_ads_daily + serp_intel_daily
-- ============================================================

-- 1. Add 'google_ads' to ad_observations_raw source CHECK constraint
ALTER TABLE public.ad_observations_raw
  DROP CONSTRAINT IF EXISTS ad_observations_raw_source_check;

ALTER TABLE public.ad_observations_raw
  ADD CONSTRAINT ad_observations_raw_source_check
  CHECK (source IN (
    'google_ads_transparency',
    'google_ads',
    'meta_ad_library',
    'mediaradar',
    'vivvix',
    'ispot',
    'manual'
  ));

-- 2. Add 'serp_intelligence' to pipeline_configs source_domain CHECK
ALTER TABLE public.pipeline_configs
  DROP CONSTRAINT IF EXISTS pipeline_configs_source_domain_check;

ALTER TABLE public.pipeline_configs
  ADD CONSTRAINT pipeline_configs_source_domain_check
  CHECK (source_domain IN (
    'ad_intelligence', 'ad_events_legacy', 'litigation_mdl',
    'mva_fars', 'boating', 'weather_storms', 'reference_geo',
    'serp_intelligence'
  ));

-- 3. SERP results raw table
CREATE TABLE public.serp_results_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  tort_slug text REFERENCES public.torts(slug),
  result_type text NOT NULL CHECK (result_type IN (
    'organic', 'paid', 'local_pack', 'featured_snippet',
    'people_also_ask', 'knowledge_panel'
  )),
  position integer,
  page integer DEFAULT 1,
  title text,
  link text,
  displayed_link text,
  domain text,
  snippet text,
  sitelinks jsonb,
  rich_attributes jsonb,
  source text NOT NULL DEFAULT 'searchapi_google',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_serp_raw_tort ON public.serp_results_raw(tort_slug);
CREATE INDEX idx_serp_raw_domain ON public.serp_results_raw(domain);
CREATE INDEX idx_serp_raw_fetched ON public.serp_results_raw(fetched_at);
CREATE INDEX idx_serp_raw_type ON public.serp_results_raw(result_type);

-- 4. SERP results normalized table
CREATE TABLE public.serp_results_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_id uuid REFERENCES public.serp_results_raw(id),
  query text NOT NULL,
  tort_slug text REFERENCES public.torts(slug),
  result_type text NOT NULL,
  position integer,
  page integer DEFAULT 1,
  domain text NOT NULL,
  advertiser_entity_id uuid REFERENCES public.advertiser_entities(id),
  title text,
  snippet text,
  link text,
  fetched_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_serp_norm_tort ON public.serp_results_normalized(tort_slug);
CREATE INDEX idx_serp_norm_domain ON public.serp_results_normalized(domain);
CREATE INDEX idx_serp_norm_entity ON public.serp_results_normalized(advertiser_entity_id);
CREATE INDEX idx_serp_norm_fetched ON public.serp_results_normalized(fetched_at);
CREATE INDEX idx_serp_norm_type ON public.serp_results_normalized(result_type);

-- 5. SERP visibility scores table
CREATE TABLE public.serp_visibility_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_entity_id uuid REFERENCES public.advertiser_entities(id),
  domain text NOT NULL,
  tort_slug text REFERENCES public.torts(slug),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_appearances integer DEFAULT 0,
  avg_position numeric(5,2),
  organic_appearances integer DEFAULT 0,
  paid_appearances integer DEFAULT 0,
  featured_snippet_count integer DEFAULT 0,
  local_pack_count integer DEFAULT 0,
  top_3_count integer DEFAULT 0,
  top_10_count integer DEFAULT 0,
  visibility_score numeric(6,2),
  queries_tracked integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain, tort_slug, period_start, period_end)
);

CREATE INDEX idx_serp_scores_entity ON public.serp_visibility_scores(advertiser_entity_id);
CREATE INDEX idx_serp_scores_tort ON public.serp_visibility_scores(tort_slug);
CREATE INDEX idx_serp_scores_period ON public.serp_visibility_scores(period_start, period_end);
CREATE INDEX idx_serp_scores_score ON public.serp_visibility_scores(visibility_score DESC);

-- 6. RLS for SERP tables (service_role full access, anon read-only)
ALTER TABLE public.serp_results_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serp_results_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serp_visibility_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY serp_raw_service_role ON public.serp_results_raw
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY serp_raw_anon_read ON public.serp_results_raw
    FOR SELECT USING (true);

CREATE POLICY serp_norm_service_role ON public.serp_results_normalized
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY serp_norm_anon_read ON public.serp_results_normalized
    FOR SELECT USING (true);

CREATE POLICY serp_scores_service_role ON public.serp_visibility_scores
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY serp_scores_anon_read ON public.serp_visibility_scores
    FOR SELECT USING (true);

-- 7. updated_at triggers for SERP scores
CREATE TRIGGER trg_serp_visibility_scores_updated_at
    BEFORE UPDATE ON public.serp_visibility_scores
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. RPC: get_serp_visibility_windowed
CREATE OR REPLACE FUNCTION get_serp_visibility_windowed(
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
WITH agg AS (
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
  FROM serp_results_normalized n
  WHERE n.fetched_at >= p_start_date
    AND n.fetched_at < (p_end_date + interval '1 day')
    AND (p_tort_slug IS NULL OR n.tort_slug = p_tort_slug)
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
LEFT JOIN advertiser_entities ae ON ae.id = a.advertiser_entity_id
ORDER BY visibility_score DESC NULLS LAST;
$$ LANGUAGE sql STABLE;

-- 9. Seed pipeline configs for google_ads_daily and serp_intel_daily
INSERT INTO public.pipeline_configs (pipeline_name, source_domain, description, expected_cron, max_runtime_minutes, retry_limit, owner, enabled, step_definitions)
VALUES
  ('google_ads_daily', 'ad_intelligence', 'Daily Google paid ad observations via Searchapi.io', '0 11 * * *', 45, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Search Google via Searchapi.io and extract paid ad results"},{"step_name":"normalize","step_order":2,"description":"Map domains to advertiser entities and store in ad_observations_normalized"},{"step_name":"score","step_order":3,"description":"Feed into existing ad_saturation_scores pipeline"},{"step_name":"publish","step_order":4,"description":"Verify final table state and mark run complete"}]'::jsonb),
  ('serp_intel_daily', 'serp_intelligence', 'Daily SERP visibility intelligence via Searchapi.io', '0 12 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Search Google via Searchapi.io and store all result types in serp_results_raw"},{"step_name":"normalize","step_order":2,"description":"Extract domains and map to advertiser entities in serp_results_normalized"},{"step_name":"score","step_order":3,"description":"Compute visibility scores per domain/tort"},{"step_name":"publish","step_order":4,"description":"Verify counts and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
