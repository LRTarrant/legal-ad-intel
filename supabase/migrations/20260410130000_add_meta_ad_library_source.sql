-- Add 'meta_ad_library' to the source CHECK constraint on ad_observations_raw.
-- The existing constraint allows: google_ads_transparency, mediaradar, vivvix, ispot, manual.
-- This migration drops that constraint and recreates it with meta_ad_library included.

ALTER TABLE public.ad_observations_raw
  DROP CONSTRAINT IF EXISTS ad_observations_raw_source_check;

ALTER TABLE public.ad_observations_raw
  ADD CONSTRAINT ad_observations_raw_source_check
  CHECK (source IN (
    'google_ads_transparency',
    'meta_ad_library',
    'mediaradar',
    'vivvix',
    'ispot',
    'manual'
  ));
