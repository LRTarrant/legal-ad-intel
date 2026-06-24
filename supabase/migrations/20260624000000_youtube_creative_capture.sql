-- ============================================================================
-- PR (#2 follow-up) — YouTube ad creative, no headless browser.
--
-- youtube_ad_creatives stores only a transparency details_link today. But the
-- creative's details_script_link (a googleusercontent preview content.js) embeds
-- the YouTube thumbnail URL (i.ytimg.com/vi/<VIDEO_ID>/...), which yields the
-- video id. From the id we render a permanent thumbnail (i.ytimg.com never
-- expires) + the real watch/embed URL in the in-app creative modal — so no
-- Playwright / Storage needed (unlike Meta, whose fbcdn URLs expire).
--
-- This migration adds the columns the youtube_creative_capture pipeline writes
-- and seeds its pipeline_configs row.
-- ============================================================================

ALTER TABLE public.youtube_ad_creatives
  ADD COLUMN IF NOT EXISTS video_id text,
  ADD COLUMN IF NOT EXISTS creative_captured_at timestamptz;

-- Lets the capture pipeline cheaply find creatives still missing a video id.
CREATE INDEX IF NOT EXISTS idx_youtube_ad_creatives_needs_capture
  ON public.youtube_ad_creatives (first_ingested_at)
  WHERE video_id IS NULL AND creative_captured_at IS NULL;

-- pipeline_configs seed (PipelineRun raises "No pipeline_config found" without
-- a row per pipeline_name). source_domain 'ad_intelligence' is allowed by
-- pipeline_configs_source_domain_check.
INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('youtube_creative_capture', 'ad_intelligence',
   'Resolve each YouTube ad creative to its YouTube video id (via the transparency details_script_link) for durable in-app display',
   '30 13 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"capture","step_order":1,"description":"For each uncaptured creative, fetch details_script_link and extract the YouTube video id from the embedded i.ytimg.com thumbnail URL"},{"step_name":"publish","step_order":2,"description":"Verify capture coverage and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
