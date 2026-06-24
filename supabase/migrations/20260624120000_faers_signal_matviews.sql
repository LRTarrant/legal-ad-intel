-- =============================================================================
-- FAERS signal materialized views — stop the live 8M-row scans on tort pages
-- =============================================================================
-- WHY THIS EXISTS
--   The live FAERS signal blocks on the Depo-Provera / GLP-1 / Dupixent tort
--   pages call faers_drug_breakdown_by_reactions / faers_monthly_trend_by_reactions
--   (migration 20260521120000) at request time. Each call scans the 8.16M-row
--   drug_adverse_event_drugs + 5.57M-row drug_adverse_event_reactions tables and
--   takes 10–27s. The web layer wraps them in unstable_cache, but when a scan
--   slows past the role statement_timeout it THROWS, and unstable_cache never
--   stores a thrown result — so the page re-scans on every request. Under any
--   concurrency this becomes a death spiral that saturates the connection pool
--   and 504s every other DB-dependent page (observed in prod 2026-06-24, root
--   cause confirmed in the Postgres logs).
--
-- THE FIX
--   Precompute the two aggregates into materialized views, keyed by a small
--   config table (one row per tort signal). The existing STABLE functions are
--   reused unchanged as the aggregation engine via LATERAL — no SQL rewrite.
--   Tort pages now read tiny, indexed read-RPCs (faers_cached_breakdown /
--   faers_cached_trend) that do a sub-millisecond keyed lookup instead of an
--   8M-row scan. The heavy functions are REVOKEd from anon/authenticated so the
--   request-path scan can never be reintroduced by accident.
--
-- REFRESH
--   pg_cron refreshes both views weekly (Mon 04:15 UTC), ~1h after the FAERS
--   ingest (faers-weekly.yml, Mon 03:00 UTC). REFRESH runs in-database, so it is
--   not bound by the PostgREST/gateway timeout; the refresh function also clears
--   statement_timeout for the heavy rebuild. The views are created WITH DATA, so
--   the cache is warm the moment this migration applies (no cold-start gap).
--
-- CONFIG SOURCE OF TRUTH
--   faers_signal_configs.{brand_map, reaction_pts} mirror the per-tort constants
--   in web/lib/queries/faers-{glp1,depo-provera,dupixent}.ts. Those TS files
--   remain the source of truth for render order + editorial copy and now read
--   their data via cache_key; when a brand map or reaction-PT list changes there,
--   update the matching row here in a follow-up migration and the next refresh
--   picks it up.
-- =============================================================================

-- Heavy one-time build below (the WITH DATA scans). The migration runs over the
-- CLI's direct connection, but clear the timeout defensively.
SET statement_timeout = 0;

-- -----------------------------------------------------------------------------
-- 1. Config table — one row per tort signal block.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faers_signal_configs (
  cache_key    text PRIMARY KEY,
  brand_map    jsonb   NOT NULL,
  reaction_pts text[]  NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.faers_signal_configs IS
  'Per-tort FAERS signal parameters (brand map + MedDRA preferred terms) driving '
  'the faers_signal_*_mv materialized views. Mirrors web/lib/queries/faers-*.ts; '
  'change there and here together, then the weekly refresh picks it up.';

INSERT INTO public.faers_signal_configs (cache_key, brand_map, reaction_pts) VALUES
  ('glp1-gastroparesis',
   '{"Ozempic":["OZEMPIC"],"Wegovy":["WEGOVY"],"Rybelsus":["RYBELSUS"],"Mounjaro":["MOUNJARO"],"Zepbound":["ZEPBOUND"]}'::jsonb,
   ARRAY[
     'Impaired gastric emptying','Intestinal obstruction','Ileus',
     'Small intestinal obstruction','Ileus paralytic','Large intestinal obstruction',
     'Gastrointestinal obstruction','Diabetic gastroparesis',
     'Distal intestinal obstruction syndrome'
   ]),
  ('glp1-vision-loss',
   '{"Ozempic":["OZEMPIC"],"Wegovy":["WEGOVY"],"Rybelsus":["RYBELSUS"],"Mounjaro":["MOUNJARO"],"Zepbound":["ZEPBOUND"]}'::jsonb,
   ARRAY[
     'Optic ischaemic neuropathy','Visual impairment','Vision blurred','Blindness',
     'Blindness unilateral','Optic neuritis','Blindness transient','Visual field defect',
     'Papilloedema','Visual acuity reduced','Optic nerve disorder','Optic neuropathy',
     'Ocular stroke','Optic atrophy','Optic nerve injury','Optic disc oedema',
     'Amaurosis fugax','Tunnel vision','Eye infarction','Optic disc haemorrhage'
   ]),
  ('depo-provera',
   '{"Depo-Provera":["DEPO-PROVERA"]}'::jsonb,
   ARRAY[
     'Meningioma','Meningioma benign','Meningioma malignant',
     'Intracranial meningioma malignant','Olfactory groove meningioma',
     'Intraosseous meningioma','Spinal meningioma benign',
     'Optic nerve sheath meningioma'
   ]),
  ('dupixent',
   '{"Dupixent":["DUPIXENT","DUPILUMAB"]}'::jsonb,
   ARRAY[
     'Cutaneous T-cell lymphoma','Cutaneous T-cell lymphoma stage I',
     'Cutaneous T-cell lymphoma stage II','Cutaneous T-cell lymphoma stage III',
     'Cutaneous T-cell lymphoma stage IV','T-cell lymphoma','T-cell lymphoma stage IV',
     'T-cell lymphoma recurrent','Cutaneous lymphoma','Lymphomatoid papulosis'
   ])
ON CONFLICT (cache_key) DO UPDATE
  SET brand_map = EXCLUDED.brand_map,
      reaction_pts = EXCLUDED.reaction_pts,
      updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Materialized views — config CROSS JOIN LATERAL the existing aggregators.
--    Reuses faers_drug_breakdown_by_reactions / faers_monthly_trend_by_reactions
--    unchanged; the heavy scan runs here (build + weekly refresh), never on the
--    request path.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.faers_signal_breakdown_mv AS
  SELECT c.cache_key, b.*
  FROM public.faers_signal_configs c
  CROSS JOIN LATERAL public.faers_drug_breakdown_by_reactions(c.brand_map, c.reaction_pts) AS b
  WITH DATA;

-- Unique index is required for REFRESH ... CONCURRENTLY. (cache_key, brand) is
-- unique: the breakdown returns exactly one row per brand in the map.
CREATE UNIQUE INDEX faers_signal_breakdown_mv_key
  ON public.faers_signal_breakdown_mv (cache_key, brand);

COMMENT ON MATERIALIZED VIEW public.faers_signal_breakdown_mv IS
  'Precomputed per-brand FAERS breakdown per tort signal (faers_signal_configs). '
  'Refreshed weekly by faers_refresh_signal_caches(). Read via faers_cached_breakdown().';

CREATE MATERIALIZED VIEW public.faers_signal_trend_mv AS
  SELECT c.cache_key, t.*
  FROM public.faers_signal_configs c
  CROSS JOIN LATERAL public.faers_monthly_trend_by_reactions(c.brand_map, c.reaction_pts) AS t
  WITH DATA;

CREATE UNIQUE INDEX faers_signal_trend_mv_key
  ON public.faers_signal_trend_mv (cache_key, brand, month);

COMMENT ON MATERIALIZED VIEW public.faers_signal_trend_mv IS
  'Precomputed per-brand monthly FAERS event counts per tort signal. Refreshed '
  'weekly by faers_refresh_signal_caches(). Read via faers_cached_trend().';

-- -----------------------------------------------------------------------------
-- 3. Refresh function — weekly, in-database, statement_timeout cleared.
--    REFRESH ... CONCURRENTLY keeps the views readable during the rebuild.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faers_refresh_signal_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = 0
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.faers_signal_breakdown_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.faers_signal_trend_mv;
END;
$$;

COMMENT ON FUNCTION public.faers_refresh_signal_caches() IS
  'Rebuilds the FAERS signal materialized views. Runs the heavy 8M-row scans '
  'in-database (no PostgREST timeout), CONCURRENTLY so reads never block. '
  'Scheduled weekly via pg_cron; also safe to call manually after a backfill.';

-- -----------------------------------------------------------------------------
-- 4. Read RPCs — tiny keyed lookups the tort pages call at request time.
--    SECURITY DEFINER so the matviews need no direct anon grant; they expose
--    only the aggregated rows for one cache_key.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faers_cached_breakdown(p_cache_key text)
RETURNS TABLE (
  brand            text,
  total_events     bigint,
  deaths           bigint,
  hospitalizations bigint,
  consumer_reports bigint,
  lawyer_reports   bigint,
  max_receivedate  date,
  top_reactions    jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brand, total_events, deaths, hospitalizations,
         consumer_reports, lawyer_reports, max_receivedate, top_reactions
  FROM public.faers_signal_breakdown_mv
  WHERE cache_key = p_cache_key
  ORDER BY brand;
$$;

COMMENT ON FUNCTION public.faers_cached_breakdown(text) IS
  'Request-path read of the precomputed FAERS breakdown for one tort signal '
  '(faers_signal_breakdown_mv). Replaces the live 8M-row scan via '
  'faers_drug_breakdown_by_reactions. See migration 20260624120000.';

CREATE OR REPLACE FUNCTION public.faers_cached_trend(p_cache_key text)
RETURNS TABLE (
  brand       text,
  month       date,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brand, month, event_count
  FROM public.faers_signal_trend_mv
  WHERE cache_key = p_cache_key
  ORDER BY brand, month;
$$;

COMMENT ON FUNCTION public.faers_cached_trend(text) IS
  'Request-path read of the precomputed FAERS monthly trend for one tort signal '
  '(faers_signal_trend_mv). Replaces the live scan via '
  'faers_monthly_trend_by_reactions. See migration 20260624120000.';

-- -----------------------------------------------------------------------------
-- 5. Grants. Pages call the cached reads via the public anon key; the heavy
--    aggregators are removed from the request path entirely.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.faers_cached_breakdown(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.faers_cached_trend(text)     TO anon, authenticated;

-- Defense in depth: nothing should call the 8M-row aggregators at request time
-- again. They survive only as the matview build engine (run as owner).
REVOKE EXECUTE ON FUNCTION public.faers_drug_breakdown_by_reactions(jsonb, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.faers_monthly_trend_by_reactions(jsonb, text[])  FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Weekly refresh via pg_cron (Mon 04:15 UTC, ~1h after the FAERS ingest).
--    cron.schedule by name is idempotent — re-applying updates the job in place.
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
  'faers-refresh-signal-caches',
  '15 4 * * 1',
  $cron$SELECT public.faers_refresh_signal_caches();$cron$
);
