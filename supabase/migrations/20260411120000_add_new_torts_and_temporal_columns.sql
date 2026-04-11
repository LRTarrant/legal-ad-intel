-- Add two new torts: roblox_abuse and social_media_addiction
-- Add earliest_seen / latest_seen temporal columns to ad_observations_normalized

-- ============================================================
-- New torts
-- ============================================================

INSERT INTO public.torts (slug, label, category)
VALUES
  ('roblox_abuse', 'Roblox Child Abuse', 'product_liability'),
  ('social_media_addiction', 'Social Media Addiction', 'product_liability')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Temporal boundary columns on ad_observations_normalized
-- These enable platform persistence scoring: MIN(first_seen)
-- and MAX(last_seen) per aggregation group.
-- active_days should be computed at query time as:
--   COALESCE(latest_seen, CURRENT_DATE) - earliest_seen
-- ============================================================

ALTER TABLE public.ad_observations_normalized
  ADD COLUMN IF NOT EXISTS earliest_seen date,
  ADD COLUMN IF NOT EXISTS latest_seen date;

COMMENT ON COLUMN public.ad_observations_normalized.earliest_seen
  IS 'MIN(first_seen) across raw observations in this aggregation group';
COMMENT ON COLUMN public.ad_observations_normalized.latest_seen
  IS 'MAX(last_seen) across raw observations in this aggregation group — NULL means at least one ad is still active';
