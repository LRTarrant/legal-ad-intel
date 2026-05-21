-- ============================================================================
-- CPSC Recalls — Phase 1 of the CPSC -> FAERS -> MAUDE arc.
-- Adds tables for the CPSC SaferProducts.gov Recalls API, plus a manufacturer
-- alias table that joins CPSC's free-text manufacturer names to the existing
-- public.recall_manufacturers dimension.
--
-- Design notes (per docs/data-sources/cpsc.md §5/§8 and #374 plan):
--   * No RLS — matches the existing public.recalls / public.recall_manufacturers
--     precedent. Service role bypasses RLS; reads happen via the same path
--     today, so leaving these tables RLS-disabled keeps CPSC symmetric with
--     its FDA siblings. Intentional choice.
--   * Parent key is uuid id; CPSC's integer RecallID is preserved as a
--     separate UNIQUE column (cpsc_recall_id) so upserts have a stable
--     natural key and we still match the watchlist's id-style.
--   * Child tables FK to cpsc_recalls.id with ON DELETE CASCADE so the
--     pipeline's delete-then-insert refresh on re-announcement is trivial.
--   * cpsc_manufacturer_aliases.alias_text IS the natural key, stored in
--     pre-normalized form. CHECK constraint enforces canonical-form storage
--     (lowercase, single-spaced, trimmed) so the pipeline can probe with
--     equality lookups and curators get an error if they paste a raw
--     non-normalized string.
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- cpsc_recalls (fact)
-- One row per distinct CPSC RecallID. Re-announcements (e.g. Fisher-Price
-- Rock 'n Play 2023 re-announcement of the 2019 recall) keep the same
-- cpsc_recall_id but advance last_publish_date; the pipeline detects the
-- delta and refreshes child rows.
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recalls (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'cpsc_recall',
  cpsc_recall_id integer not null unique,        -- CPSC's RecallID
  recall_number text not null,                   -- "16143" or "17-001"
  recall_date date not null,
  last_publish_date date,
  title text not null,
  description text,
  consumer_contact text,
  cpsc_url text,

  -- Severity proxy computed at ingest. Unlike FDA Class I/II/III this is
  -- derived from hazard taxonomy + death-language detection + unit count.
  -- See pipelines/cpsc_recalls.compute_severity_tier for the rules.
  severity_tier char(1) check (severity_tier in ('A','B','C','D')),
  death_count integer,
  injury_count integer,

  -- NumberOfUnits is free text ("About 8.2 million"). Preserve raw +
  -- best-effort integer parse.
  units_recalled_text text,
  units_recalled_int bigint,

  -- Reserved for future CPSC Urgent Warnings ingest (cpsc.md §3/§6:
  -- manufacturers that refuse recall negotiations get warned at
  -- cpsc.gov/Warnings/ rather than recalled). Phase 1 ingests recalls
  -- only; this flag stays false until a separate Warnings ingest lands.
  is_warning_only boolean not null default false,

  raw_json jsonb not null,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cpsc_recalls_recall_date
  on public.cpsc_recalls (recall_date desc);
create index if not exists idx_cpsc_recalls_severity
  on public.cpsc_recalls (severity_tier, recall_date desc);
create index if not exists idx_cpsc_recalls_last_publish
  on public.cpsc_recalls (last_publish_date desc);

-- ----------------------------------------------------------------------------
-- cpsc_recall_products
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recall_products (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.cpsc_recalls(id) on delete cascade,
  category_id integer,
  name text,
  type text,
  model text,
  description text,
  units_text text
);
create index if not exists idx_cpsc_recall_products_recall
  on public.cpsc_recall_products (recall_id);

-- ----------------------------------------------------------------------------
-- cpsc_recall_manufacturers
-- Joins CPSC's free-text manufacturer/importer/distributor/retailer names to
-- the existing public.recall_manufacturers dimension. manufacturer_id is
-- nullable — unmatched rows preserve raw_name so a human can curate later
-- (see cpsc_manufacturer_aliases below). The pipeline NEVER auto-creates
-- recall_manufacturers rows.
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recall_manufacturers (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.cpsc_recalls(id) on delete cascade,
  manufacturer_id uuid references public.recall_manufacturers(id) on delete set null,
  raw_name text not null,
  country text,
  role text not null check (role in ('manufacturer','importer','distributor','retailer'))
);
create index if not exists idx_cpsc_recall_manufacturers_recall
  on public.cpsc_recall_manufacturers (recall_id);
create index if not exists idx_cpsc_recall_manufacturers_manufacturer
  on public.cpsc_recall_manufacturers (manufacturer_id);
create index if not exists idx_cpsc_recall_manufacturers_role
  on public.cpsc_recall_manufacturers (role);

-- ----------------------------------------------------------------------------
-- cpsc_recall_hazards
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recall_hazards (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.cpsc_recalls(id) on delete cascade,
  hazard_type_id integer,
  name text not null
);
create index if not exists idx_cpsc_recall_hazards_recall
  on public.cpsc_recall_hazards (recall_id);
create index if not exists idx_cpsc_recall_hazards_name
  on public.cpsc_recall_hazards (name);

-- ----------------------------------------------------------------------------
-- cpsc_recall_retailers
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recall_retailers (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.cpsc_recalls(id) on delete cascade,
  raw_name text not null,
  raw_company_id text
);
create index if not exists idx_cpsc_recall_retailers_recall
  on public.cpsc_recall_retailers (recall_id);

-- ----------------------------------------------------------------------------
-- cpsc_recall_remedies
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recall_remedies (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.cpsc_recalls(id) on delete cascade,
  name text not null
);
create index if not exists idx_cpsc_recall_remedies_recall
  on public.cpsc_recall_remedies (recall_id);

-- ----------------------------------------------------------------------------
-- cpsc_recall_images
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_recall_images (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.cpsc_recalls(id) on delete cascade,
  url text not null
);
create index if not exists idx_cpsc_recall_images_recall
  on public.cpsc_recall_images (recall_id);

-- ----------------------------------------------------------------------------
-- cpsc_manufacturer_aliases
-- Hand-curated map from CPSC's normalized free-text manufacturer names to
-- the canonical public.recall_manufacturers id. alias_text is the natural
-- key: must be the normalized form (lowercase, single-spaced, trimmed).
-- The CHECK constraint refuses raw / non-canonical strings so curation
-- is unambiguous.
--
-- Populated incrementally by curators from pipeline run logs; the ingest
-- never auto-inserts.
-- ----------------------------------------------------------------------------
create table if not exists public.cpsc_manufacturer_aliases (
  alias_text text primary key
    check (alias_text = lower(regexp_replace(btrim(alias_text), '\s+', ' ', 'g'))),
  manufacturer_id uuid not null references public.recall_manufacturers(id) on delete cascade,
  role text not null default 'manufacturer'
    check (role in ('manufacturer','importer','distributor','retailer')),
  created_at timestamptz not null default now(),
  notes text
);
create index if not exists idx_cpsc_manufacturer_aliases_manufacturer
  on public.cpsc_manufacturer_aliases (manufacturer_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_cpsc_recalls_updated') then
    create trigger trg_cpsc_recalls_updated
      before update on public.cpsc_recalls
      for each row execute function public._set_updated_at();
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- Register the cpsc_recalls pipeline in public.pipeline_configs so
-- PipelineRun(..., pipeline_name='cpsc_recalls') can locate its step layout.
-- Lives in the same source_domain ('recall_watchlist') as the FDA recall
-- pipelines so admin dashboards group them together.
-- ----------------------------------------------------------------------------
insert into public.pipeline_configs (pipeline_name, source_domain, step_definitions)
values
  (
    'cpsc_recalls',
    'recall_watchlist',
    jsonb '[
      {"step_name":"fetch_raw","step_order":1,"description":"Fetch recalls from CPSC SaferProducts.gov Recalls API"},
      {"step_name":"normalize","step_order":2,"description":"Compute severity tier, parse units, normalize manufacturer names"},
      {"step_name":"publish","step_order":3,"description":"Upsert cpsc_recalls; refresh child rows for re-announced recalls"}
    ]'
  )
on conflict (pipeline_name) do nothing;

comment on table public.cpsc_recalls is
  'CPSC SaferProducts.gov recalls. Phase 1 of CPSC->FAERS->MAUDE arc. See docs/data-sources/cpsc.md.';
comment on table public.cpsc_manufacturer_aliases is
  'Hand-curated alias->canonical map for CPSC free-text manufacturer names. alias_text must be canonical (lowercase, single-spaced, trimmed).';
