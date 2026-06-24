-- ============================================================================
-- #3a-1 — pipeline_configs seed for meta_pages_daily.
-- PipelineRun raises "No pipeline_config found" without a row per pipeline_name.
-- meta_pages_daily deepens Meta coverage by pulling each known firm page's full
-- active ad set (page-id search) and inserting only NEW ads. No schema change —
-- it writes the existing meta_ad_creatives table.
-- ============================================================================

INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('meta_pages_daily', 'ad_intelligence',
   'Deepen Meta coverage: page-id search every known firm page in meta_ad_creatives for its full active ad set, inserting only new ads (case_type classified from copy)',
   '0 15 * * *', 90, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_pages","step_order":1,"description":"For each distinct page_id in meta_ad_creatives, page-id search the Meta Ad Library and insert new ads"},{"step_name":"publish","step_order":2,"description":"Verify final table state and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
