-- ============================================================================
-- Google Maps local-pack roster source (phase 2 of the firm-roster hardening).
--
-- PR #455 rebuilt get_state_firm_roster from observed organic SERP ∪ paid search
-- (AL: 23 -> 99 firms). That fixed the "organic firms invisible" bug but is an
-- observed-COMPETITION signal, not a verified-LOCALITY signal: it can't tell a
-- firm with a physical in-state office from an out-of-state firm that merely
-- ranks/advertises into the market.
--
-- Google Maps local-pack carries a verified physical address per business. This
-- migration adds:
--   1. lat/lng on pi_metros (to drive the google_maps `ll` geo param — the text
--      `location` param does NOT geo-target maps; see google_maps_local_daily.py).
--   2. pi_local_businesses (place_id-keyed local-pack results with parsed state).
--   3. get_state_firm_roster v2: pi_local_businesses (in-state) becomes a THIRD
--      union source, and the verified address is used to EXCLUDE firms Maps has
--      placed only out-of-state.
--
-- Fed by the google_maps_local_daily pipeline. See issue #456.
-- ============================================================================

-- 1. Metro centroids for the google_maps `ll` param. NULL until geocoded
--    (the pipeline self-heals: geocodes any metro missing coords via Nominatim).
ALTER TABLE public.pi_metros
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2. Local-pack businesses. One row per place_id (stable Google key); upserted
--    so re-runs refresh rating/reviews/last_seen in place.
CREATE TABLE IF NOT EXISTS public.pi_local_businesses (
    place_id    text PRIMARY KEY,
    title       text,
    website     text,
    domain      text,            -- normalized registrable domain (NULL if no site)
    address     text,
    state       text,            -- 2-letter, parsed from the address
    metro_id    uuid REFERENCES public.pi_metros(id) ON DELETE SET NULL,
    dma_code    text,
    rating      numeric,
    reviews     integer,
    latitude    double precision,
    longitude   double precision,
    query       text,
    first_seen  timestamptz NOT NULL DEFAULT now(),
    last_seen   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_local_businesses_state_domain
  ON public.pi_local_businesses (state, domain);
CREATE INDEX IF NOT EXISTS idx_pi_local_businesses_dma
  ON public.pi_local_businesses (dma_code);

-- RLS mirrors serp_results_normalized: public read, service_role writes.
ALTER TABLE public.pi_local_businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pi_local_businesses_anon_read ON public.pi_local_businesses;
CREATE POLICY pi_local_businesses_anon_read
  ON public.pi_local_businesses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS pi_local_businesses_service_role ON public.pi_local_businesses;
CREATE POLICY pi_local_businesses_service_role
  ON public.pi_local_businesses FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Roster v2 — add maps in-state as a third source, exclude maps-only-
--    out-of-state firms. Exclusion fires ONLY when Maps positively placed a
--    domain out-of-state AND never in-state, so domains Maps hasn't seen yet are
--    unaffected (organic/paid coverage is never reduced before Maps accumulates).
CREATE OR REPLACE FUNCTION public.get_state_firm_roster(
    p_state TEXT
)
RETURNS TABLE (
    domain TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH state_dmas AS (
        SELECT DISTINCT dma_code
        FROM public.pi_metros
        WHERE state_abbr = p_state AND dma_code IS NOT NULL
    ),
    organic AS (
        SELECT DISTINCT
            lower(regexp_replace(regexp_replace(n.domain, '^https?://', ''), '^www\.', '')) AS domain
        FROM public.serp_results_normalized n
        WHERE n.result_type = 'organic'
          AND n.dma_code IN (SELECT dma_code FROM state_dmas)
          AND n.domain IS NOT NULL AND n.domain <> ''
    ),
    paid AS (
        SELECT DISTINCT
            lower(regexp_replace(regexp_replace(o.advertiser_domain, '^https?://', ''), '^www\.', '')) AS domain
        FROM public.pi_search_observations o
        JOIN public.pi_metros m ON m.id = o.metro_id
        WHERE m.state_abbr = p_state
          AND o.advertiser_domain IS NOT NULL AND o.advertiser_domain <> ''
    ),
    maps_in_state AS (
        SELECT DISTINCT lower(domain) AS domain
        FROM public.pi_local_businesses
        WHERE state = p_state AND domain IS NOT NULL AND domain <> ''
    ),
    maps_out_state AS (
        SELECT DISTINCT lower(domain) AS domain
        FROM public.pi_local_businesses
        WHERE state IS NOT NULL AND state <> p_state
          AND domain IS NOT NULL AND domain <> ''
    ),
    combined AS (
        SELECT domain FROM organic
        UNION
        SELECT domain FROM paid
        UNION
        SELECT domain FROM maps_in_state
    )
    SELECT c.domain
    FROM combined c
    WHERE c.domain <> ''
      -- Directory / aggregator / platform domains are not firms.
      AND c.domain NOT IN (
        'nolo.com','justia.com','forbes.com','findlaw.com','lawyers.com','avvo.com',
        'wikipedia.org','en.wikipedia.org','superlawyers.com','attorneys.superlawyers.com',
        'expertise.com','martindale.com','yelp.com','google.com','clio.com','lawinfo.com',
        'enjuris.com','thumbtack.com','bbb.org','mapquest.com','facebook.com','youtube.com',
        'reddit.com','quora.com','usnews.com'
      )
      -- Drop firms Maps placed ONLY out-of-state (ranked/advertised in, no office here).
      AND NOT (
        c.domain IN (SELECT domain FROM maps_out_state)
        AND c.domain NOT IN (SELECT domain FROM maps_in_state)
      )
    ORDER BY c.domain;
$$;

COMMENT ON FUNCTION public.get_state_firm_roster(TEXT) IS
    'In-state PI-firm roster: distinct domains from organic SERP ∪ paid search ∪ '
    'Google Maps in-state local-pack (pi_local_businesses), minus directories, minus '
    'firms Maps placed only out-of-state. Scopes the national Meta/YouTube competitive '
    'tabs and feeds the "Firms tracked" stat.';

GRANT EXECUTE ON FUNCTION public.get_state_firm_roster(TEXT)
    TO anon, authenticated, service_role;

-- 4. pipeline_configs seed (PipelineRun requires a config row per pipeline_name).
INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('google_maps_local_daily', 'ad_intelligence',
   'Google Maps local-pack PI-firm roster source: per-metro ll-geo-targeted maps pull into pi_local_businesses, giving get_state_firm_roster a verified physical-address signal to drop out-of-state firms',
   '0 6 * * 2', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"geocode","step_order":1,"description":"Backfill lat/lng for metros missing coordinates via Nominatim"},{"step_name":"fetch_local","step_order":2,"description":"Per-metro google_maps local-pack pull (ll-geo-targeted) upserted to pi_local_businesses"},{"step_name":"publish","step_order":3,"description":"Verify local-business coverage and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
