-- =============================================================================
-- Daily advertiser re-matcher
-- =============================================================================
-- When advertiser_entities is updated (new aliases, new firms, new entries),
-- historical ad_observations_raw rows with advertiser_id IS NULL are NOT
-- retroactively matched. They stay unmatched forever unless a backfill is
-- run. This migration provides:
--
--   1. A pipeline_configs row for the new `advertiser_rematch_daily` pipeline
--      so the standard PipelineRun lifecycle works.
--   2. An RPC `public.advertiser_rematch_by_domain(p_limit, p_dry_run)` that
--      does the domain-match backfill server-side in a single transaction.
--      Returns counts so the pipeline can emit them as run metadata.
--
-- The pipeline itself (pipeline/pipelines/advertiser_rematch_daily.py) calls
-- this RPC for the domain step, then runs a name-match fallback in Python
-- using DomainMapper.match_name for any rows whose creative_url is null.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. pipeline_configs row
-- ---------------------------------------------------------------------------
INSERT INTO public.pipeline_configs
  (pipeline_name, source_domain, description, expected_cron,
   max_runtime_minutes, retry_limit, owner, enabled, step_definitions)
VALUES
  ('advertiser_rematch_daily',
   'ad_intelligence',
   'Daily backfill of advertiser_id on ad_observations_raw rows where the live pipeline missed because the advertiser was added to advertiser_entities after the row was ingested.',
   '0 16 * * *',
   30,
   2,
   'lancetarrant@gmail.com',
   true,
   '[
     {"step_name":"domain_match","step_order":1,"description":"Domain-match unmatched rows against advertiser_entities.website + aliases via SQL"},
     {"step_name":"name_match",  "step_order":2,"description":"Fuzzy-match remaining unmatched rows against canonical_name + aliases via DomainMapper.match_name"},
     {"step_name":"report",      "step_order":3,"description":"Emit pre/post counts by source as run metadata"}
   ]'::jsonb)
ON CONFLICT (pipeline_name) DO UPDATE SET
  description     = EXCLUDED.description,
  expected_cron   = EXCLUDED.expected_cron,
  step_definitions = EXCLUDED.step_definitions,
  enabled         = EXCLUDED.enabled;


-- ---------------------------------------------------------------------------
-- 2. RPC: advertiser_rematch_by_domain
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advertiser_rematch_by_domain(
  p_limit   int     DEFAULT 50000,
  p_dry_run boolean DEFAULT false
)
RETURNS TABLE (
  matched_count   int,
  scanned_count   int,
  eligible_count  int,
  by_source       jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligible_count int;
  v_matched_count  int;
  v_scanned_count  int;
  v_by_source      jsonb;
BEGIN
  SELECT COUNT(*)::int INTO v_eligible_count
  FROM public.ad_observations_raw r
  WHERE r.advertiser_id IS NULL
    AND r.source IN ('google_ads','tiktok_ads','meta_ad_library')
    AND r.creative_url IS NOT NULL
    AND r.creative_url <> '';

  WITH lookup AS (
    SELECT lower(d) AS domain, ae.id AS ent_id
    FROM public.advertiser_entities ae,
         unnest(
           COALESCE(ae.aliases, ARRAY[]::text[])
           || CASE WHEN ae.website IS NOT NULL
                   THEN ARRAY[ae.website]
                   ELSE ARRAY[]::text[]
              END
         ) AS d
    WHERE d IS NOT NULL AND d <> '' AND d !~ '\s'
  ),
  targets AS (
    SELECT r.id AS raw_id,
           r.source,
           lower(regexp_replace(
             split_part(coalesce(r.creative_url,''), ',', 1),
             '^https?://(www\.)?([^/?]+).*$', '\2'
           )) AS host
    FROM public.ad_observations_raw r
    WHERE r.advertiser_id IS NULL
      AND r.source IN ('google_ads','tiktok_ads','meta_ad_library')
      AND r.creative_url IS NOT NULL
      AND r.creative_url <> ''
    ORDER BY r.ingested_at NULLS LAST
    LIMIT GREATEST(p_limit, 1)
  ),
  matched AS (
    SELECT t.raw_id, t.source, l.ent_id
    FROM targets t
    JOIN lookup l ON l.domain = t.host
    WHERE t.host <> ''
      AND t.host !~ '^[0-9.]+$'
  ),
  do_update AS (
    UPDATE public.ad_observations_raw r
    SET advertiser_id = m.ent_id
    FROM matched m
    WHERE r.id = m.raw_id
      AND r.advertiser_id IS NULL
      AND NOT p_dry_run
    RETURNING r.id, r.source
  ),
  result AS (
    SELECT m.source, COUNT(*)::int AS n
    FROM matched m
    GROUP BY m.source
  )
  SELECT
    (SELECT COUNT(*)::int FROM matched),
    (SELECT COUNT(*)::int FROM targets),
    COALESCE(jsonb_object_agg(result.source, result.n), '{}'::jsonb)
  INTO v_matched_count, v_scanned_count, v_by_source
  FROM result;

  RETURN QUERY SELECT
    COALESCE(v_matched_count, 0)  AS matched_count,
    COALESCE(v_scanned_count, 0)  AS scanned_count,
    v_eligible_count              AS eligible_count,
    COALESCE(v_by_source, '{}'::jsonb) AS by_source;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advertiser_rematch_by_domain(int, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.advertiser_rematch_by_domain(int, boolean) IS
  'Daily re-matcher: backfills advertiser_id on ad_observations_raw rows whose creative_url domain matches an advertiser_entities.website or aliases entry. Only touches rows where advertiser_id IS NULL. Bounded by p_limit (default 50000) to keep the transaction fast.';

COMMIT;
