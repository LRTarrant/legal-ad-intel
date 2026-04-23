-- Bump ad_intel_daily max_runtime_minutes from 60 to 90.
--
-- The fetch_raw step makes external Apify API calls for ~25 torts × ~2 terms
-- each. Even with the new async parallelization (APIFY_MAX_CONCURRENT=10),
-- a burst of slow actor runs can push wall-clock time past 30 minutes.
-- 90 minutes gives comfortable headroom while the parallel fetch brings
-- typical runs well under 15 minutes.

UPDATE public.pipeline_configs
SET max_runtime_minutes = 90
WHERE pipeline_name = 'ad_intel_daily';
