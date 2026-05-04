-- Migration: create_campaign_assets_bucket
-- Purpose: create the Supabase Storage bucket used for campaign-builder
--          generated assets (audio, video, image renders).
--
-- Background:
--   /api/campaigns/generate-pi-radio-spot (Phase 1.6) and
--   /api/campaigns/render-video (Phase 2.1, fixed in this PR) both upload
--   to a bucket named 'campaign-assets'. The bucket was never created in
--   prod, so both routes silently fell through to their base64 data-URL
--   fallback paths. That works for audio (a 30s mp3 is small) but breaks
--   for video at 5+ MB.
--
-- Bucket config:
--   public=true     — assets are served via public URLs from the UI.
--                     File paths still namespace by user id, so guessing
--                     URLs is unfeasible.
--   file_size_limit = 100 MB — generous for video; voiceover audio is
--                              well under this.
--   allowed_mime_types — restrict to the formats we actually upload.
--
-- Path convention:
--   <user_id>/pi-radio-spots/<timestamp>.mp3
--   <user_id>/pi-videos/<timestamp>.mp4
--   <user_id>/pi-images/<timestamp>.<ext>  (future)
--
-- RLS: storage.objects RLS is configured globally for Supabase. We add
-- a policy that lets users read everything in this bucket (public) and
-- write only under their own user id prefix.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  104857600,  -- 100 MB
  ARRAY[
    'audio/mpeg',
    'audio/mp3',
    'video/mp4',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: insert / read policies for storage.objects on this bucket.
-- Users can upload to their own user-id prefix.
-- Anyone (including anon) can read \u2014 the bucket is public so the <video>
-- and <audio> tags can stream without auth headers.

CREATE POLICY "campaign_assets_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "campaign_assets_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "campaign_assets_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "campaign_assets_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'campaign-assets');
