-- ============================================================================
-- FAERS normalization — Phase 3 of the CPSC -> FAERS -> MAUDE arc.
-- Adds the drugs dimension, manufacturer alias lookup, drug_id FK on
-- drug_adverse_event_drugs, and registers the faers_weekly pipeline config.
--
-- Builds on 20260514000001_add_faers_schema.sql (the base FAERS schema
-- landed in PR-2 / #381). Schema lives in this PR alongside the pipeline
-- code that depends on it (matches the cpsc_recalls precedent in #376).
--
-- Reference: docs/data-sources/faers.md (full scoping report) — §3 covers
-- the drug -> manufacturer normalization plan in detail.
--
-- Design notes:
--
--   * SOURCE SCOPE: this pipeline ingests `serious:1` reports only. faers.md
--     §4 sizes the serious subset at ~50% of FAERS volume (~800K/year), and
--     §8 budgets year-1 storage at ~1.9 GB *for the serious-only path*.
--     Non-serious reports are NOT in the DB. A future operator who wants
--     research-grade disproportionality computation (ROR/PRR needs a
--     non-suspect denominator) would have to drop the serious=true filter
--     in pipelines/faers_weekly.py — see the docstring there. Tort signal
--     is severity-driven, so this is the right default for LMI.
--
--   * NDC-first match chain (faers.md §3 — "NDC labeler segments are
--     deterministic"): drugs.unique_match_key carries the strongest key
--     used at row creation, in priority order ndc -> unii -> rxcui ->
--     appno -> name. The text prefix makes the match path greppable in
--     the warehouse without an extra column. A drug is created exactly
--     once per unique_match_key; analysts later merge duplicates by
--     UPDATE-ing the alias table (or a future curated merge tool). The
--     pipeline never auto-reconciles across keys — that's a judgment call
--     deferred to humans (faers.md §3 "do not auto-merge above 0.85").
--
--   * NO drug_manufacturers dim in this PR. faers.md §3 / §8 recommend a
--     curated manufacturer_aliases lookup; the watchlist work in PR-5
--     decides whether to promote that to a full dim with industry/parent-
--     corp metadata. Lightweight today, expandable later — same shape
--     used for CPSC.
--
--   * Lawyer-flood (primarysource_qualification = 4) is ENFORCED IN
--     QUERIES, not at ingest. The PR-2 base schema preserves the column;
--     this PR's pipeline preserves the value; PR-4/PR-5 surfaces apply
--     `WHERE primarysource_qualification != 4` for the non-lawyer view.
--     No pre-aggregated rollup tables here — deferred to PR-5 if and
--     when the watchlist needs sub-second query latency.
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- drugs (dimension)
-- One row per distinct drug observed in FAERS. Rows are created lazily by
-- the pipeline using the NDC-first match-fallback chain (faers.md §3):
--
--   1. openfda.product_ndc[0]       -> unique_match_key = 'ndc:<value>'
--   2. openfda.unii[0]              -> unique_match_key = 'unii:<value>'
--   3. openfda.rxcui[0]             -> unique_match_key = 'rxcui:<value>'
--   4. openfda.application_number[0]-> unique_match_key = 'appno:<value>'
--   5. medicinalproduct (lowercased)-> unique_match_key = 'name:<value>'
--
-- The brand_names / generic_names / substance_names arrays accumulate
-- aliases observed across reports for a single drug_id; PR-3 only UNIONs
-- new values on the first match and does NOT clobber curator edits.
-- ----------------------------------------------------------------------------
create table if not exists public.drugs (
  id uuid primary key default gen_random_uuid(),

  -- Strongest available key at row creation, prefixed by source key type
  -- (ndc:/unii:/rxcui:/appno:/name:) so analysts can grep match-path mix.
  unique_match_key text not null unique,

  -- Canonical names. canonical_name is lowercased (matches _canonicalize_name);
  -- display_name preserves a human-readable form for UI.
  canonical_name text not null,
  display_name text,

  primary_brand_name text,
  primary_generic_name text,
  primary_unii text,
  primary_rxcui text,
  primary_application_number text,

  -- Observed aliases — sets, deduped by the pipeline on union.
  brand_names text[] not null default '{}',
  generic_names text[] not null default '{}',
  substance_names text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_drugs_canonical_name
  on public.drugs (canonical_name);
create index if not exists idx_drugs_primary_unii
  on public.drugs (primary_unii)
  where primary_unii is not null;
create index if not exists idx_drugs_primary_rxcui
  on public.drugs (primary_rxcui)
  where primary_rxcui is not null;
create index if not exists idx_drugs_brand_names_gin
  on public.drugs using gin (brand_names);
create index if not exists idx_drugs_generic_names_gin
  on public.drugs using gin (generic_names);

-- ----------------------------------------------------------------------------
-- drug_manufacturer_aliases (alias -> canonical)
-- Mirrors cpsc_manufacturer_aliases shape (same operational pattern — both
-- are pipeline lookups for free-text manufacturer name normalization) but
-- separate table because the source rules differ: openFDA SPL labeler
-- names vs CPSC company strings. faers.md §3 lists the Eli Lilly /
-- Novo Nordisk variance explicitly.
--
-- alias_text MUST be in the canonical form produced by
-- lib.pipeline._canonicalize_name (lowercase, trimmed, single-spaced).
-- The CHECK constraint enforces this so a bad curator edit fails at
-- INSERT, not at lookup time.
-- ----------------------------------------------------------------------------
create table if not exists public.drug_manufacturer_aliases (
  id uuid primary key default gen_random_uuid(),
  alias_text text not null unique
    check (alias_text = lower(trim(alias_text))
           and alias_text !~ '\s{2,}'),
  canonical_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_drug_manufacturer_aliases_canonical
  on public.drug_manufacturer_aliases (canonical_name);

-- ----------------------------------------------------------------------------
-- drug_adverse_event_drugs.drug_id (FK to drugs)
-- Nullable: backfill rows ingested before this column landed remain
-- unenriched, and reports with no `medicinalproduct` and no openfda
-- enrichment have nothing to match against. The pipeline's match-fallback
-- chain (NDC -> UNII -> RxCUI -> appno -> name) populates this column for
-- every newly-ingested drug element with a non-empty medicinalproduct.
-- ----------------------------------------------------------------------------
alter table public.drug_adverse_event_drugs
  add column if not exists drug_id uuid
    references public.drugs(id) on delete set null;
create index if not exists idx_drug_adverse_event_drugs_drug_id
  on public.drug_adverse_event_drugs (drug_id)
  where drug_id is not null;

-- ----------------------------------------------------------------------------
-- updated_at triggers (reuse existing public._set_updated_at function)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_drugs_updated') then
    create trigger trg_drugs_updated
      before update on public.drugs
      for each row execute function public._set_updated_at();
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_drug_manufacturer_aliases_updated'
  ) then
    create trigger trg_drug_manufacturer_aliases_updated
      before update on public.drug_manufacturer_aliases
      for each row execute function public._set_updated_at();
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- Register faers_weekly in public.pipeline_configs so
-- PipelineRun(pipeline_name='faers_weekly') resolves its step layout.
-- Shares source_domain='faers' with no siblings today (MAUDE is deferred);
-- a future drug_enforcement sibling can join the same domain.
--
-- The CHECK constraint on pipeline_configs.source_domain is an enum-by-list,
-- last extended in 20260422150000_recall_pipeline_configs.sql to add
-- 'recall_watchlist'. Same drop-and-re-add pattern as the prior extensions
-- in 20260411140000 (serp_intelligence) and 20260417120000 (pi_advertising):
-- the constraint is a CHECK, not a real ENUM type, so a plain DROP+ADD is
-- the established convention. Adding 'faers' here unblocks the INSERT below.
-- ----------------------------------------------------------------------------
alter table public.pipeline_configs
  drop constraint if exists pipeline_configs_source_domain_check;

alter table public.pipeline_configs
  add constraint pipeline_configs_source_domain_check
  check (source_domain = any (array[
    'ad_intelligence',
    'ad_events_legacy',
    'litigation_mdl',
    'mva_fars',
    'boating',
    'weather_storms',
    'reference_geo',
    'serp_intelligence',
    'pi_advertising',
    'recall_watchlist',
    'faers'
  ]));

insert into public.pipeline_configs (pipeline_name, source_domain, step_definitions)
values
  (
    'faers_weekly',
    'faers',
    jsonb '[
      {"step_name":"fetch_raw","step_order":1,"description":"Fetch FAERS reports from openFDA /drug/event.json (serious=1 filter, search_after cursor)"},
      {"step_name":"normalize","step_order":2,"description":"Project to fact + drugs/reactions children; match drug_id via NDC->UNII->RxCUI->appno->name; canonicalize manufacturer names via drug_manufacturer_aliases"},
      {"step_name":"publish","step_order":3,"description":"Upsert drug_adverse_events; refresh drug_adverse_event_drugs and drug_adverse_event_reactions; upsert meddra_terms and drugs"}
    ]'
  )
on conflict (pipeline_name) do nothing;

comment on table public.drugs is
  'Drug dimension for FAERS normalization. One row per unique_match_key; the prefix (ndc:/unii:/rxcui:/appno:/name:) records the match-fallback path used at creation. See pipelines/faers_weekly.py and docs/data-sources/faers.md §3.';
comment on column public.drugs.unique_match_key is
  'Strongest available key when this drug row was created, in priority order NDC > UNII > RxCUI > application_number > lowercased medicinalproduct. Prefixed by source type for grep audit.';
comment on table public.drug_manufacturer_aliases is
  'Hand-curated alias->canonical map for FAERS openfda.manufacturer_name[] values. alias_text must be in canonical form (lower/trim/single-space) — CHECK enforces it. Separate from cpsc_manufacturer_aliases because the source data shape differs.';
comment on column public.drug_adverse_event_drugs.drug_id is
  'FK to public.drugs, populated by pipelines/faers_weekly.py via NDC-first match-fallback chain. NULL when no enrichment match was possible (older / foreign / OTC reports per faers.md §3).';
