-- =============================================================================
-- Seed website + aliases for top mass-tort plaintiff firms (and aggregators)
-- =============================================================================
-- Backfills the data gap behind the 0% Google Ads / TikTok match rate seen
-- 2026-05-03. PR #284 fixed the matcher (DomainMapper now does
-- domain-then-name-fuzzy resolution against advertiser_entities.website +
-- aliases + canonical_name). With no website/aliases populated for the
-- big firms, the matcher had nothing to resolve against.
--
-- This migration:
--   1. Ensures canonical_name has a unique index so ON CONFLICT works.
--   2. UPSERTs ~25 plaintiff firms with their primary website + every
--      consumer-facing landing-page domain we've seen the SearchAPI
--      Google Ads scraper return.
--   3. UPSERTs the major lead-generator / aggregator domains
--      (entity_type='lead_generator') so those rows get classified
--      separately from real law firms.
--
-- Domain → firm mappings are sourced from public firm websites, JPML
-- bellwether counsel lists, MTMP speaker rosters, and the unmatched_domains
-- corpus emitted by google_ads_daily / serp_intel_daily over the past week.
-- See PR description for the full mapping table.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ensure canonical_name has a unique constraint we can target
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_advertiser_entities_canonical_name
  ON public.advertiser_entities (canonical_name);


-- ---------------------------------------------------------------------------
-- 2. Helper: idempotent merge of aliases (preserves existing values, adds
--    new ones, dedupes). Implemented inline in each upsert.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3. Upsert plaintiff firms
-- ---------------------------------------------------------------------------
INSERT INTO public.advertiser_entities
  (canonical_name, entity_type, segment, website, aliases)
VALUES
  -- ── National plaintiff firms ───────────────────────────────────────────
  ('Morgan & Morgan',
   'law_firm', 'national_plaintiff_firm',
   'morganandmorgan.com',
   ARRAY['morganandmorgan.com', 'forthepeople.com',
         'claims.forthepeople.com', 'info.forthepeople.com',
         'go.forthepeople.com', 'try.forthepeople.com']),

  ('Sokolove Law',
   'law_firm', 'national_plaintiff_firm',
   'sokolovelaw.com',
   ARRAY['sokolovelaw.com', 'go.sokolovelaw.com',
         'claims.sokolovelaw.com', 'apply.sokolovelaw.com']),

  ('Levin Papantonio',
   'law_firm', 'national_plaintiff_firm',
   'levinlaw.com',
   ARRAY['levinlaw.com', 'levinpapantonio.com', 'Levin Papantonio Rafferty']),

  ('Seeger Weiss',
   'law_firm', 'national_plaintiff_firm',
   'seegerweiss.com',
   ARRAY['seegerweiss.com']),

  ('Lieff Cabraser Heimann & Bernstein',
   'law_firm', 'national_plaintiff_firm',
   'lieffcabraser.com',
   ARRAY['lieffcabraser.com']),

  ('Beasley Allen',
   'law_firm', 'national_plaintiff_firm',
   'beasleyallen.com',
   ARRAY['beasleyallen.com']),

  ('Ben Crump Law',
   'law_firm', 'national_plaintiff_firm',
   'bencrump.com',
   ARRAY['bencrump.com']),

  ('Simmons Hanly Conroy',
   'law_firm', 'national_plaintiff_firm',
   'simmonsfirm.com',
   ARRAY['simmonsfirm.com', 'simmonslawllc.com']),

  ('Weitz & Luxenberg',
   'law_firm', 'national_plaintiff_firm',
   'weitzlux.com',
   ARRAY['weitzlux.com', 'info.weitzlux.com', 'go.weitzlux.com']),

  ('Napoli Shkolnik',
   'law_firm', 'national_plaintiff_firm',
   'napolilaw.com',
   ARRAY['napolilaw.com']),

  ('Arnold & Itkin',
   'law_firm', 'national_plaintiff_firm',
   'arnolditkin.com',
   ARRAY['arnolditkin.com']),

  ('Kline & Specter',
   'law_firm', 'national_plaintiff_firm',
   'klinespecter.com',
   ARRAY['klinespecter.com']),

  ('Mazie Slater Katz & Freeman',
   'law_firm', 'national_plaintiff_firm',
   'mazieslater.com',
   ARRAY['mazieslater.com']),

  ('Reich & Binstock',
   'law_firm', 'national_plaintiff_firm',
   'reichandbinstock.com',
   ARRAY['reichandbinstock.com']),

  ('Berger Montague',
   'law_firm', 'national_plaintiff_firm',
   'bergermontague.com',
   ARRAY['bergermontague.com']),

  ('Meshbesher & Spence',
   'law_firm', 'regional_plaintiff_firm',
   'meshbesher.com',
   ARRAY['meshbesher.com']),

  ('Aylstock, Witkin, Kreis & Overholtz',
   'law_firm', 'national_plaintiff_firm',
   'awkolaw.com',
   ARRAY['awkolaw.com', 'go.awkolaw.com']),

  ('Johnson Law Group',
   'law_firm', 'national_plaintiff_firm',
   'johnsonlawgroup.com',
   ARRAY['johnsonlawgroup.com', 'claims.johnsonlawgroup.com']),

  ('Karns & Karns',
   'law_firm', 'national_plaintiff_firm',
   'karnsandkarns.com',
   ARRAY['karnsandkarns.com']),

  ('Miller & Zois',
   'law_firm', 'national_plaintiff_firm',
   'millerandzois.com',
   ARRAY['millerandzois.com']),

  ('TorHoerman Law',
   'law_firm', 'national_plaintiff_firm',
   'torhoerman.com',
   ARRAY['torhoerman.com']),

  ('Anapol Weiss',
   'law_firm', 'national_plaintiff_firm',
   'anapolweiss.com',
   ARRAY['anapolweiss.com']),

  ('Ciresi Conlin',
   'law_firm', 'regional_plaintiff_firm',
   'ciresiconlin.com',
   ARRAY['ciresiconlin.com']),

  ('Pintas & Mullins',
   'law_firm', 'national_plaintiff_firm',
   'pintas.com',
   ARRAY['pintas.com']),

  ('Robert King Law',
   'law_firm', 'national_plaintiff_firm',
   'robertkinglawfirm.com',
   ARRAY['robertkinglawfirm.com']),

  ('Langdon & Emison',
   'law_firm', 'national_plaintiff_firm',
   'lelaw.com',
   ARRAY['lelaw.com', 'langdonemison.com']),

  ('Ethen Ostroff',
   'law_firm', 'national_plaintiff_firm',
   'ethenostrofflaw.com',
   ARRAY['ethenostrofflaw.com']),

  ('Shezad Malik Law',
   'law_firm', 'national_plaintiff_firm',
   'shezadmalik.com',
   ARRAY['shezadmalik.com']),

  -- ── Lead generators / aggregators (NOT law firms) ─────────────────────
  ('Lawsuit Legal',
   'lead_generator', 'aggregator',
   'lawsuitlegal.com',
   ARRAY['lawsuitlegal.com', 'lawsuit-legal.com', 'lawsuitlegalnews.com']),

  ('Class Action.org',
   'lead_generator', 'aggregator',
   'classaction.org',
   ARRAY['classaction.org']),

  ('Select Justice',
   'lead_generator', 'aggregator',
   'selectjustice.com',
   ARRAY['selectjustice.com']),

  ('Drugwatch',
   'lead_generator', 'aggregator',
   'drugwatch.com',
   ARRAY['drugwatch.com']),

  ('Consumer Notice',
   'lead_generator', 'aggregator',
   'consumernotice.org',
   ARRAY['consumernotice.org']),

  ('ConsumerShield',
   'lead_generator', 'aggregator',
   'consumershield.com',
   ARRAY['consumershield.com']),

  ('Top Class Actions',
   'lead_generator', 'aggregator',
   'topclassactions.com',
   ARRAY['topclassactions.com']),

  ('Lawsuit Information Center',
   'lead_generator', 'aggregator',
   'lawsuit-information-center.com',
   ARRAY['lawsuit-information-center.com']),

  ('MDL Update',
   'lead_generator', 'aggregator',
   'mdlupdate.com',
   ARRAY['mdlupdate.com']),

  ('Legal Case Advisor',
   'lead_generator', 'aggregator',
   'legalcaseadvisor.org',
   ARRAY['legalcaseadvisor.org']),

  ('The Legal Leads',
   'lead_generator', 'aggregator',
   'thelegalleads.com',
   ARRAY['thelegalleads.com'])

ON CONFLICT (canonical_name) DO UPDATE SET
  -- Only set website if it's currently null; never overwrite an existing one.
  website = COALESCE(public.advertiser_entities.website, EXCLUDED.website),
  -- Merge aliases: union with existing (case-insensitive de-dup).
  aliases = (
    SELECT ARRAY(
      SELECT DISTINCT lower(a)
      FROM unnest(
        COALESCE(public.advertiser_entities.aliases, ARRAY[]::text[])
        || COALESCE(EXCLUDED.aliases, ARRAY[]::text[])
      ) AS t(a)
      WHERE a IS NOT NULL AND a <> ''
    )
  ),
  -- Backfill segment + entity_type only if currently null.
  entity_type = COALESCE(public.advertiser_entities.entity_type, EXCLUDED.entity_type),
  segment     = COALESCE(public.advertiser_entities.segment,     EXCLUDED.segment),
  updated_at  = now();


-- ---------------------------------------------------------------------------
-- 4. Sanity checks (no-op assertions; raise if mid-migration drift)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  firm_count      int;
  with_website    int;
  with_aliases    int;
BEGIN
  SELECT count(*) INTO firm_count
  FROM public.advertiser_entities
  WHERE canonical_name IN (
    'Morgan & Morgan', 'Sokolove Law', 'Levin Papantonio',
    'Seeger Weiss', 'Lieff Cabraser Heimann & Bernstein',
    'Beasley Allen', 'Ben Crump Law', 'Simmons Hanly Conroy',
    'Weitz & Luxenberg', 'Meshbesher & Spence'
  );
  IF firm_count < 10 THEN
    RAISE WARNING 'Expected 10+ named firms after upsert, got %', firm_count;
  END IF;

  SELECT count(*) INTO with_website
  FROM public.advertiser_entities
  WHERE entity_type = 'law_firm' AND website IS NOT NULL;

  SELECT count(*) INTO with_aliases
  FROM public.advertiser_entities
  WHERE entity_type = 'law_firm' AND coalesce(array_length(aliases, 1), 0) > 0;

  RAISE NOTICE 'advertiser_entities: % law firms with website, % with aliases',
    with_website, with_aliases;
END $$;

COMMIT;
