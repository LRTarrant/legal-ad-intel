-- ============================================================================
-- Competitive Analysis Phase 5a: pipeline_configs seed for meta_ads_daily.
-- PipelineRun hard-requires a pipeline_configs row per pipeline_name (raises
-- "No pipeline_config found" otherwise). source_domain 'ad_intelligence' is an
-- allowed value in pipeline_configs_source_domain_check.
-- ============================================================================

INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('meta_ads_daily', 'ad_intelligence',
   'Daily PI-firm Meta (Facebook/Instagram) ads via SearchApi Meta Ad Library',
   '0 14 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Search the Meta Ad Library per PI case-type keyword and upsert ads into meta_ad_creatives"},{"step_name":"publish","step_order":2,"description":"Verify final table state and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
