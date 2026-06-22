-- ============================================================================
-- Competitive Analysis Phase 4a: pipeline_configs seed for youtube_ads_daily.
-- PipelineRun (pipeline/lib/pipeline.py) hard-requires a pipeline_configs row
-- per pipeline_name (raises "No pipeline_config found" otherwise), so the
-- youtube_ads_daily pipeline cannot run until this row exists. Mirrors the
-- google_ads_daily / serp_intel_daily seeds; source_domain 'ad_intelligence'
-- (an allowed value in pipeline_configs_source_domain_check).
-- ============================================================================

INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('youtube_ads_daily', 'ad_intelligence',
   'Daily PI-firm YouTube/video ad creatives via SearchApi Google Ads Transparency Center',
   '0 13 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Fetch video ad creatives per PI-firm domain from Google Ads Transparency Center and upsert into youtube_ad_creatives"},{"step_name":"publish","step_order":2,"description":"Verify final table state and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
