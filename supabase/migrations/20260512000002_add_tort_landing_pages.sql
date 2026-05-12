-- Migration: add_tort_landing_pages
-- Purpose: schema for daily detection of new law-firm landing pages per
--          mass tort, geo-segmented by DMA, with a 7-day rolling surface.
--          See PR description for the full feature spec.
--
-- Scope of this file:
--   1. mass_torts: add has_advertising_page + advertising_page_slug columns,
--      backfill from the 15 /advertising/<slug>/ filesystem surfaces (incl.
--      2 slug aliases), insert 2 new rows (bard-powerport, pfas-contamination),
--      and correct hair-relaxer status to 'active'.
--   2. tort_synonyms: per-tort synonym list driving slug-match dedup and
--      title/H1 matching. Primary synonym is the canonical key used by
--      slugified_path_tort_match.
--   3. domain_classifications: per-registered-domain law-firm verdict cache.
--      TTL differs by classifier source (heuristic 30d, openai/allow_list 90d,
--      deny_list 365d) to keep heuristic false-positives self-correcting.
--   4. tort_landing_pages: main fact table. Dedup key
--      (tort_id, registered_domain, slugified_path_tort_match, dma_code).
--   5. tort_landing_page_velocity: materialized view (weekly counts,
--      4-week trailing avg, z-score) with unique index for CONCURRENTLY refresh.
--   6. tort-landing-snapshots storage bucket: private (super_admin read only).
--
-- RLS posture matches serp_* / mass_torts: market-intel reference data,
-- authenticated read for all signed-in users, super_admin full read,
-- service-role writes only.

-- ---------------------------------------------------------------------------
-- 1. mass_torts: surface coverage flag + slug alias
-- ---------------------------------------------------------------------------

ALTER TABLE public.mass_torts
  ADD COLUMN IF NOT EXISTS has_advertising_page boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advertising_page_slug text;

COMMENT ON COLUMN public.mass_torts.has_advertising_page IS
  'True when /advertising/<slug>/page.tsx exists in web/. Source of truth for "should the tort landing-pages card render on this tort." Decoupled from status so emerging torts still get the surface.';
COMMENT ON COLUMN public.mass_torts.advertising_page_slug IS
  'Filesystem slug under /advertising/ when it differs from mass_torts.slug. NULL means same as slug. Used by the pipeline to join SERP rows (keyed on filesystem slug) to mass_torts (keyed on canonical slug).';

-- Data correction: hair-relaxer MDL is active (3247 confirmed pending).
UPDATE public.mass_torts SET status = 'active'
  WHERE slug = 'hair-relaxer' AND status = 'emerging';

-- Insert the 2 missing rows that have advertising pages but no mass_torts entry.
INSERT INTO public.mass_torts (slug, name, status, visible, category, has_advertising_page)
VALUES
  ('bard-powerport', 'Bard PowerPort', 'active', true, 'Medical Device', true),
  ('pfas-contamination', 'PFAS / Forever Chemicals', 'active', true, 'Environmental', true)
ON CONFLICT (slug) DO UPDATE SET has_advertising_page = true;

-- Backfill the flag for the 13 already-existing rows.
-- 11 direct slug matches:
UPDATE public.mass_torts
SET has_advertising_page = true
WHERE slug IN (
  'afff-firefighting-foam', 'bair-hugger', 'depo-provera',
  'glp1-gastroparesis', 'glp1-vision-loss', 'hair-relaxer',
  'paraquat', 'roblox-abuse', 'roundup', 'social-media-addiction',
  'talcum-powder'
);

-- 2 slug aliases (db slug → filesystem slug):
UPDATE public.mass_torts SET has_advertising_page = true, advertising_page_slug = 'ai-suicide'
  WHERE slug = 'ai-suicide-self-harm';
UPDATE public.mass_torts SET has_advertising_page = true, advertising_page_slug = 'olympus-scopes'
  WHERE slug = 'olympus-duodenoscope';

CREATE INDEX IF NOT EXISTS idx_mass_torts_has_advertising_page
  ON public.mass_torts (has_advertising_page) WHERE has_advertising_page = true;

-- ---------------------------------------------------------------------------
-- 1b. dma_markets: canonical Searchapi.io location string per DMA
-- ---------------------------------------------------------------------------
-- Searchapi.io's `location` param takes a canonical Google Ads geotarget name.
-- Hand-curated for the top 25 by Nielsen rank. dma_markets.display_name is
-- colloquial and not safe for the API call (see column comment in
-- 20260504000001_create_dma_markets.sql).

ALTER TABLE public.dma_markets
  ADD COLUMN IF NOT EXISTS searchapi_location text;

COMMENT ON COLUMN public.dma_markets.searchapi_location IS
  'Canonical Google Ads geotarget name passed to Searchapi.io as the location param. NULL = no DMA-level scan for this market. Updated via SQL; do not derive from display_name.';

-- Seed top 25 by Nielsen rank (verified against dma_markets.rank at migration time).
UPDATE public.dma_markets SET searchapi_location = v.loc FROM (VALUES
  ('501', 'New York,New York,United States'),
  ('803', 'Los Angeles,California,United States'),
  ('602', 'Chicago,Illinois,United States'),
  ('504', 'Philadelphia,Pennsylvania,United States'),
  ('623', 'Dallas,Texas,United States'),
  ('807', 'San Francisco,California,United States'),
  ('511', 'Washington,District of Columbia,United States'),
  ('618', 'Houston,Texas,United States'),
  ('506', 'Boston,Massachusetts,United States'),
  ('524', 'Atlanta,Georgia,United States'),
  ('753', 'Phoenix,Arizona,United States'),
  ('528', 'Miami,Florida,United States'),
  ('819', 'Seattle,Washington,United States'),
  ('505', 'Detroit,Michigan,United States'),
  ('534', 'Orlando,Florida,United States'),
  ('613', 'Minneapolis,Minnesota,United States'),
  ('539', 'Tampa,Florida,United States'),
  ('560', 'Raleigh,North Carolina,United States'),
  ('510', 'Cleveland,Ohio,United States'),
  ('862', 'Sacramento,California,United States'),
  ('533', 'Hartford,Connecticut,United States'),
  ('517', 'Charlotte,North Carolina,United States'),
  ('751', 'Denver,Colorado,United States'),
  ('527', 'Indianapolis,Indiana,United States'),
  ('825', 'San Diego,California,United States')
) AS v(dma_code, loc)
WHERE dma_markets.dma_code = v.dma_code;

-- ---------------------------------------------------------------------------
-- 2. tort_synonyms
-- ---------------------------------------------------------------------------

CREATE TABLE public.tort_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tort_id uuid NOT NULL REFERENCES public.mass_torts(id) ON DELETE CASCADE,
  synonym text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Synonyms are matched as substrings against URL path segments and titles.
-- Store normalized form: lowercase, hyphenated.
CREATE UNIQUE INDEX idx_tort_synonyms_tort_synonym ON public.tort_synonyms (tort_id, synonym);
CREATE INDEX idx_tort_synonyms_synonym ON public.tort_synonyms (synonym);
-- Exactly one primary per tort.
CREATE UNIQUE INDEX idx_tort_synonyms_one_primary ON public.tort_synonyms (tort_id) WHERE is_primary = true;

ALTER TABLE public.tort_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tort_synonyms_read ON public.tort_synonyms
  FOR SELECT USING (true);
CREATE POLICY tort_synonyms_service_role ON public.tort_synonyms
  FOR ALL USING (auth.role() = 'service_role');

-- Seed primary synonym + aliases per tort. Refinements happen later via admin UI.
WITH tort_seed (slug, primary_syn, aliases) AS (
  VALUES
    ('afff-firefighting-foam', 'afff', ARRAY['firefighting-foam','firefighter-foam','pfas-foam','aqueous-film-forming-foam']),
    ('ai-suicide-self-harm', 'ai-suicide', ARRAY['character-ai','ai-chatbot','chatbot-suicide','ai-self-harm','replika','companion-ai']),
    ('bair-hugger', 'bair-hugger', ARRAY['forced-air-warming','bair','3m-bair-hugger','warming-blanket']),
    ('bard-powerport', 'bard-powerport', ARRAY['powerport','port-catheter','port-a-cath','bard-port','implanted-port']),
    ('depo-provera', 'depo-provera', ARRAY['depo','depoprovera','provera','meningioma','medroxyprogesterone']),
    ('glp1-gastroparesis', 'ozempic', ARRAY['glp-1','glp1','mounjaro','wegovy','stomach-paralysis','gastroparesis','semaglutide','tirzepatide']),
    ('glp1-vision-loss', 'naion', ARRAY['ozempic-vision','glp-1-vision','ozempic-blindness','vision-loss','optic-neuropathy']),
    ('hair-relaxer', 'hair-relaxer', ARRAY['hair-straightener','chemical-relaxer','relaxer','perm','uterine-cancer-relaxer']),
    ('olympus-duodenoscope', 'olympus-scope', ARRAY['duodenoscope','bronchoscope','scope-infection','olympus-duodenoscope','tjf-q180v','cre-infection']),
    ('paraquat', 'paraquat', ARRAY['parkinsons','gramoxone','syngenta','weedkiller-parkinsons']),
    ('pfas-contamination', 'pfas', ARRAY['forever-chemicals','pfoa','pfos','gen-x','water-contamination','pfas-water']),
    ('roblox-abuse', 'roblox', ARRAY['roblox-predator','roblox-grooming','roblox-child-abuse','roblox-exploitation']),
    ('roundup', 'roundup', ARRAY['glyphosate','monsanto','weedkiller','ranger-pro','bayer-roundup']),
    ('social-media-addiction', 'social-media', ARRAY['tiktok','instagram','meta-addiction','snapchat','social-media-harm','teen-mental-health']),
    ('talcum-powder', 'talcum-powder', ARRAY['talc','baby-powder','johnson-talc','jj-baby-powder','ovarian-cancer-talc','shower-to-shower'])
)
INSERT INTO public.tort_synonyms (tort_id, synonym, is_primary)
SELECT mt.id, ts.primary_syn, true
FROM tort_seed ts
JOIN public.mass_torts mt ON mt.slug = ts.slug
UNION ALL
SELECT mt.id, unnest(ts.aliases), false
FROM tort_seed ts
JOIN public.mass_torts mt ON mt.slug = ts.slug;

-- ---------------------------------------------------------------------------
-- 3. domain_classifications
-- ---------------------------------------------------------------------------

CREATE TYPE landing_page_classifier_source AS ENUM (
  'allow_list',
  'deny_list',
  'heuristic',
  'openai'
);

CREATE TYPE landing_page_classifier_confidence AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TABLE public.domain_classifications (
  registered_domain text PRIMARY KEY,
  is_law_firm boolean NOT NULL,
  classifier_source landing_page_classifier_source NOT NULL,
  confidence landing_page_classifier_confidence NOT NULL,
  signal_score integer,
  matched_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  classified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_error text
);

CREATE INDEX idx_domain_classifications_expires ON public.domain_classifications (expires_at);
CREATE INDEX idx_domain_classifications_is_law_firm ON public.domain_classifications (is_law_firm) WHERE is_law_firm = true;

ALTER TABLE public.domain_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY domain_classifications_read ON public.domain_classifications
  FOR SELECT USING (true);
CREATE POLICY domain_classifications_service_role ON public.domain_classifications
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.domain_classifications IS
  'Cache of per-domain law-firm verdicts. TTL differs by source: allow_list/openai 90d, heuristic 30d, deny_list 365d. Pipeline upserts on conflict.';
COMMENT ON COLUMN public.domain_classifications.matched_signals IS
  'Array of signal names that fired during heuristic classification (e.g., ["attorney_advertising_disclaimer", "free_consultation_cta"]). For audit and threshold tuning.';

-- ---------------------------------------------------------------------------
-- 4. tort_landing_pages
-- ---------------------------------------------------------------------------

CREATE TYPE landing_page_confidence AS ENUM ('candidate', 'confirmed');

CREATE TYPE landing_page_serp_feature AS ENUM ('organic', 'local_pack', 'ads');

CREATE TYPE landing_page_classification_status AS ENUM (
  'confirmed',  -- 3+ heuristic signals or allow_list / openai = true
  'candidate',  -- 2 heuristic signals, OpenAI not yet adjudicated
  'denied',     -- 0-1 heuristic signals, or deny_list / openai = false
  'pending',    -- HTML fetch / OpenAI in flight; retry on next run
  'error'       -- 3 consecutive classification attempts failed
);

CREATE TABLE public.tort_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tort_id uuid NOT NULL REFERENCES public.mass_torts(id) ON DELETE CASCADE,
  url text NOT NULL,
  registered_domain text NOT NULL,
  slugified_path_tort_match text NOT NULL DEFAULT '',
  dma_code text REFERENCES public.dma_markets(dma_code),
  rank integer,
  serp_feature landing_page_serp_feature NOT NULL,
  title text,
  h1 text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_law_firm boolean NOT NULL DEFAULT false,
  confidence landing_page_confidence,
  classification_status landing_page_classification_status NOT NULL DEFAULT 'pending',
  classification_attempts integer NOT NULL DEFAULT 0,
  last_classification_error text,
  html_hash text,
  snapshot_path text,
  raw_serp jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Dedup key: a firm's coverage of a tort in one geo collapses to one row.
-- Two URLs that share (tort, registered_domain, slugified_path_tort_match)
-- in the same dma_code update last_seen_at + rank in place. National rows
-- have dma_code IS NULL, deduped via the partial unique indexes below.
CREATE UNIQUE INDEX idx_tort_landing_pages_dedup_dma
  ON public.tort_landing_pages (tort_id, registered_domain, slugified_path_tort_match, dma_code)
  WHERE dma_code IS NOT NULL;

CREATE UNIQUE INDEX idx_tort_landing_pages_dedup_national
  ON public.tort_landing_pages (tort_id, registered_domain, slugified_path_tort_match)
  WHERE dma_code IS NULL;

CREATE INDEX idx_tort_landing_pages_tort_first_seen
  ON public.tort_landing_pages (tort_id, first_seen_at DESC);

CREATE INDEX idx_tort_landing_pages_status
  ON public.tort_landing_pages (classification_status);

CREATE INDEX idx_tort_landing_pages_domain
  ON public.tort_landing_pages (registered_domain);

ALTER TABLE public.tort_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tort_landing_pages_read ON public.tort_landing_pages
  FOR SELECT USING (true);
CREATE POLICY tort_landing_pages_service_role ON public.tort_landing_pages
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON COLUMN public.tort_landing_pages.slugified_path_tort_match IS
  'Canonical key derived from URL path: primary synonym of the matched tort segment with boilerplate (lawsuit, claim, form, etc.) stripped. Empty string means "general firm page, no tort-keyword segment matched". See pipeline/lib/slug_normalizer.py for the algorithm and unit tests.';
COMMENT ON COLUMN public.tort_landing_pages.classification_status IS
  'Lifecycle state. Frontend filters to IN (confirmed, candidate). pending/error are pipeline-internal and never user-facing.';

-- ---------------------------------------------------------------------------
-- 5. tort_landing_page_velocity (materialized view)
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW public.tort_landing_page_velocity AS
WITH weekly AS (
  SELECT
    tort_id,
    COALESCE(dma_code, '__national__') AS dma_code_key,
    date_trunc('week', first_seen_at)::date AS week_start,
    COUNT(*) AS new_pages_count
  FROM public.tort_landing_pages
  WHERE classification_status IN ('confirmed', 'candidate')
  GROUP BY 1, 2, 3
),
with_trailing AS (
  SELECT
    tort_id,
    dma_code_key,
    week_start,
    new_pages_count,
    AVG(new_pages_count) OVER (
      PARTITION BY tort_id, dma_code_key
      ORDER BY week_start
      ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING
    ) AS trailing_4w_avg,
    STDDEV_SAMP(new_pages_count) OVER (
      PARTITION BY tort_id, dma_code_key
      ORDER BY week_start
      ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING
    ) AS trailing_4w_stddev
  FROM weekly
)
SELECT
  tort_id,
  dma_code_key,
  week_start,
  new_pages_count,
  ROUND(trailing_4w_avg::numeric, 2) AS trailing_4w_avg,
  CASE
    WHEN trailing_4w_stddev IS NULL OR trailing_4w_stddev = 0 THEN NULL
    ELSE ROUND(((new_pages_count - trailing_4w_avg) / trailing_4w_stddev)::numeric, 2)
  END AS z_score
FROM with_trailing;

-- CONCURRENTLY refresh requires a unique index.
CREATE UNIQUE INDEX idx_tort_landing_page_velocity_pk
  ON public.tort_landing_page_velocity (tort_id, dma_code_key, week_start);

CREATE INDEX idx_tort_landing_page_velocity_tort_week
  ON public.tort_landing_page_velocity (tort_id, week_start DESC);

COMMENT ON MATERIALIZED VIEW public.tort_landing_page_velocity IS
  'Weekly new-landing-page counts per tort × geo (DMA or national). Trailing 4-week avg and z-score for spike detection. Refreshed CONCURRENTLY at the end of each pipeline run. Excludes pending/error rows.';

-- ---------------------------------------------------------------------------
-- 6. refresh_tort_landing_page_velocity RPC
-- ---------------------------------------------------------------------------
-- PostgREST can't call REFRESH MATERIALIZED VIEW directly. Pipelines call
-- this SECURITY DEFINER function instead. CONCURRENTLY needs a unique index
-- (created above as idx_tort_landing_page_velocity_pk).

CREATE OR REPLACE FUNCTION public.refresh_tort_landing_page_velocity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.tort_landing_page_velocity;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_tort_landing_page_velocity() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_tort_landing_page_velocity() TO service_role;

-- ---------------------------------------------------------------------------
-- 7. tort-landing-snapshots storage bucket
-- ---------------------------------------------------------------------------
-- Private bucket: super_admin read only. Stores first 50 KB of HTML on
-- first-seen, keyed by <registered_domain>/<html_hash>.html so reclassification
-- after classifier improvements doesn't re-hit the firm's site.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tort-landing-snapshots',
  'tort-landing-snapshots',
  false,
  524288,  -- 512 KB headroom; pipeline truncates to 50 KB before upload
  ARRAY['text/html', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY tort_landing_snapshots_super_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tort-landing-snapshots'
    AND public.is_super_admin()
  );

-- Service role bypasses RLS so the pipeline can write directly.
