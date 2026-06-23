-- ============================================================================
-- PR 2 — durable Meta ad creative.
--
-- The Meta Ad Library snapshot stored on meta_ad_creatives.snapshot contains
-- direct fbcdn URLs to the ad image / video poster, but those URLs expire and
-- CORS-block over time, so the in-app creative modal can't rely on them. This
-- migration adds (1) a public Storage bucket for captured creative images and
-- (2) columns on meta_ad_creatives to hold the durable stored image, plus (3)
-- the pipeline_configs row the meta_creative_capture pipeline needs to run.
--
-- The pipeline (pipelines/meta_creative_capture.py) downloads each ad's image
-- bytes once and uploads them here; the modal then prefers creative_image_url.
-- No headless browser involved (YouTube creative capture, which needs one, is a
-- separate follow-up).
-- ============================================================================

-- 1. Public bucket for captured ad-creative images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-creatives',
  'ad-creatives',
  true,
  26214400, -- 25 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (the modal embeds these); writes are service-role only, which
-- bypasses RLS, so no INSERT policy is needed for the pipeline.
DROP POLICY IF EXISTS "ad_creatives_public_read" ON storage.objects;
CREATE POLICY "ad_creatives_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ad-creatives');

-- 2. Durable-image columns on meta_ad_creatives.
ALTER TABLE public.meta_ad_creatives
  ADD COLUMN IF NOT EXISTS creative_image_url text,
  ADD COLUMN IF NOT EXISTS creative_image_path text,
  ADD COLUMN IF NOT EXISTS creative_captured_at timestamptz;

-- Lets the capture pipeline cheaply find rows still missing a stored image.
CREATE INDEX IF NOT EXISTS idx_meta_ad_creatives_needs_capture
  ON public.meta_ad_creatives (first_ingested_at)
  WHERE creative_image_url IS NULL;

-- 3. pipeline_configs seed (PipelineRun raises "No pipeline_config found"
--    without a row per pipeline_name). source_domain 'ad_intelligence' is an
--    allowed value in pipeline_configs_source_domain_check.
INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('meta_creative_capture', 'ad_intelligence',
   'Download Meta ad-creative images from meta_ad_creatives.snapshot CDN URLs into the ad-creatives Storage bucket for durable in-app display',
   '30 14 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"capture","step_order":1,"description":"Download each uncaptured ad image from its snapshot CDN URL, upload to the ad-creatives bucket, and store the public URL on the row"},{"step_name":"publish","step_order":2,"description":"Verify capture coverage and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
