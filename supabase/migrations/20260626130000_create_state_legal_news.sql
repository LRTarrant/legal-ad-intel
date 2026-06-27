-- ============================================================================
-- State Legal News — per-state single-incident PI news feed.
--
-- Powers the "Recent Legal Activity" carousel on State Intelligence pages
-- (Alabama first, then all 50 states + DC via the shared component).
--
-- SCOPE GUARDRAIL (single-incident PI only): motor vehicle, trucking,
-- motorcycle, construction/OSHA, sexual abuse, TBI, explosions. NO mass torts
-- (those live in `legal_news` / `mdl_developments`).
--
-- REPUBLISH WALL: rows here come ONLY from legally displayable sources —
-- government data (OSHA/FARS/CourtListener), Google News headline+source+
-- date+link (aggregator-style, never full article text), and our own AI
-- summaries written from public facts. No paid verdict DB (AJVR/VerdictSearch/
-- Law360) is ever stored or republished here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.state_legal_news (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_abbr    text NOT NULL,                       -- 2-char state code, e.g. 'AL'
  title         text NOT NULL,
  summary       text,                                -- snippet or our own AI one-liner
  source_name   text,                                -- e.g. 'AL.com', 'OSHA', 'Google News'
  source_url    text NOT NULL,                       -- canonical link-out
  published_at  timestamptz,                         -- when the event/article was published
  category      text,                                -- verdict | settlement | filing | regulatory | crash | osha | general
  stream        text NOT NULL DEFAULT 'incident'     -- two-stream model (see brief)
                  CHECK (stream IN ('outcome', 'incident')),
  amount_usd    numeric,                             -- verdict/settlement $ figure (powers the big-number card); NULL for incidents
  location      text,                                -- city / county when known
  practice_area text,                                -- mva | trucking | motorcycle | construction | sexual_abuse | tbi | explosion
  query_bucket  text,                                -- which crawl produced it (e.g. 'searchapi_google_news')
  query_term    text,                                -- the exact query that surfaced it
  raw           jsonb,                               -- full upstream record for re-processing
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_abbr, source_url)                    -- per-state dedup; resends UPDATE in place
);

CREATE INDEX IF NOT EXISTS idx_state_legal_news_state
  ON public.state_legal_news (state_abbr);
CREATE INDEX IF NOT EXISTS idx_state_legal_news_state_published
  ON public.state_legal_news (state_abbr, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_legal_news_published
  ON public.state_legal_news (published_at DESC);

ALTER TABLE public.state_legal_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_state_legal_news" ON public.state_legal_news;
CREATE POLICY "anon_select_state_legal_news"
  ON public.state_legal_news FOR SELECT
  TO anon
  USING (true);

COMMENT ON TABLE public.state_legal_news IS
  'Single-incident PI legal news per state (verdicts, settlements, crashes, OSHA fatalities, filings). Republishable sources only — see migration header. NO mass torts.';

-- ----------------------------------------------------------------------------
-- pipeline_configs: extend the source_domain CHECK and seed the pipeline row.
-- PipelineRun hard-requires a pipeline_configs row per pipeline_name (raises
-- "No pipeline_config found" otherwise).
-- ----------------------------------------------------------------------------

-- NOTE: this list is the FULL current set of allowed source_domains as of the
-- live DB (read via pg_get_constraintdef) plus 'legal_news'. The constraint has
-- drifted ahead of earlier migration files (faers / landing_pages /
-- recall_watchlist were added after the last file that re-declared it), so
-- reconstruct from the live definition, never from an older migration's list —
-- a narrower list fails `supabase db push` against existing rows.
ALTER TABLE public.pipeline_configs
  DROP CONSTRAINT IF EXISTS pipeline_configs_source_domain_check;
ALTER TABLE public.pipeline_configs
  ADD CONSTRAINT pipeline_configs_source_domain_check
  CHECK (source_domain IN (
    'ad_intelligence', 'ad_events_legacy', 'litigation_mdl',
    'mva_fars', 'boating', 'weather_storms', 'reference_geo',
    'serp_intelligence', 'pi_advertising', 'recall_watchlist',
    'faers', 'landing_pages', 'legal_news'
  ));

INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('state_legal_news_daily', 'legal_news',
   'Daily per-state single-incident PI news (verdicts/settlements/incidents) via SearchApi Google News',
   '0 13 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Query Google News per state x practice area, classify, and upsert into state_legal_news"},{"step_name":"publish","step_order":2,"description":"Verify final table state and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
