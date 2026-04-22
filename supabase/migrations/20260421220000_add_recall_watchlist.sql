-- ============================================================================
-- Recall Watchlist v1 (devices)
-- Adds core tables for tracking FDA device recalls + linked litigation signals.
-- Scoring model: Five-Stage Thermometer (cold/warming/warm/hot/boiling).
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- recall_manufacturers
-- Normalized manufacturer/brand records so we can dedupe openFDA variants
-- (e.g. "Olympus Medical Systems Corp.", "Olympus Corp of the Americas").
-- ----------------------------------------------------------------------------
create table if not exists public.recall_manufacturers (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  slug text unique,
  parent_name text,                       -- ultimate parent org, if known
  country text default 'US',
  domicile_state text,
  website text,
  aliases text[] default '{}',            -- list of known openFDA name variants
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_recall_manufacturers_slug on public.recall_manufacturers (slug);
create index if not exists idx_recall_manufacturers_name on public.recall_manufacturers (canonical_name);
create index if not exists idx_recall_manufacturers_aliases on public.recall_manufacturers using gin (aliases);

-- ----------------------------------------------------------------------------
-- recall_device_families
-- Groups related recalls for a single device "family" so we can bucket
-- multiple Z-numbers that describe the same product line
-- (e.g. all Olympus TJF-Q180V variants).
-- ----------------------------------------------------------------------------
create table if not exists public.recall_device_families (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references public.recall_manufacturers(id) on delete set null,
  family_name text not null,
  slug text unique,
  product_category text,                  -- e.g. "duodenoscope", "hip_implant"
  product_codes text[] default '{}',      -- FDA three-letter product codes
  description text,
  tort_id uuid references public.torts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_device_families_manufacturer on public.recall_device_families (manufacturer_id);
create index if not exists idx_device_families_tort on public.recall_device_families (tort_id);
create index if not exists idx_device_families_slug on public.recall_device_families (slug);

-- ----------------------------------------------------------------------------
-- recalls
-- One row per distinct FDA recall event (openFDA /device/recall endpoint).
-- Recall "class" is FDA severity: Class I (most serious) ... III (least).
-- ----------------------------------------------------------------------------
create table if not exists public.recalls (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'openfda_device', -- openfda_device / openfda_drug / manual
  external_id text not null,              -- FDA recall_number or event_id
  manufacturer_id uuid references public.recall_manufacturers(id) on delete set null,
  device_family_id uuid references public.recall_device_families(id) on delete set null,

  product_description text,
  product_code text,                      -- 3-letter FDA product code
  recall_class text check (recall_class in ('Class I', 'Class II', 'Class III', 'Unclassified')),
  reason_for_recall text,
  event_date_initiated date,
  event_date_posted date,
  event_date_terminated date,
  status text,                            -- Open, Terminated, Completed, etc.
  distribution_pattern text,
  k_numbers text[] default '{}',          -- 510(k) clearance numbers
  root_cause_description text,

  -- Five-Stage Thermometer scoring (denormalized for fast UI reads).
  -- Recomputed by the litigation-signal pipeline daily.
  stage integer not null default 1 check (stage between 1 and 5),
  stage_label text default 'cold',        -- cold / warming / warm / hot / boiling
  case_count integer not null default 0,
  state_count integer not null default 0,
  specialty_firm_count integer not null default 0,
  mdl_petition_filed boolean not null default false,
  mdl_formed boolean not null default false,
  first_case_filed_at date,
  last_case_filed_at date,
  last_scored_at timestamptz,

  -- Raw payload for debugging / future reparse.
  raw_payload jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, external_id)
);
create index if not exists idx_recalls_manufacturer on public.recalls (manufacturer_id);
create index if not exists idx_recalls_family on public.recalls (device_family_id);
create index if not exists idx_recalls_class on public.recalls (recall_class);
create index if not exists idx_recalls_stage on public.recalls (stage);
create index if not exists idx_recalls_event_date on public.recalls (event_date_initiated desc);
create index if not exists idx_recalls_status on public.recalls (status);

-- ----------------------------------------------------------------------------
-- recall_cases
-- Individual lawsuits linked back to a recall / device_family.
-- Feeds Stage 2+ scoring once a case is detected via CourtListener.
-- ----------------------------------------------------------------------------
create table if not exists public.recall_cases (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid references public.recalls(id) on delete cascade,
  device_family_id uuid references public.recall_device_families(id) on delete set null,
  source text not null default 'courtlistener', -- courtlistener / trellis / manual
  external_id text not null,              -- CL docket id or trellis case id
  case_name text,
  court_id text,                          -- CL court slug, e.g. 'pae'
  court_name text,
  state_code text,
  case_filed_date date,
  defendants text[] default '{}',
  plaintiff_firm_name text,
  is_specialty_firm boolean not null default false,
  docket_url text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
create index if not exists idx_recall_cases_recall on public.recall_cases (recall_id);
create index if not exists idx_recall_cases_family on public.recall_cases (device_family_id);
create index if not exists idx_recall_cases_filed on public.recall_cases (case_filed_date desc);
create index if not exists idx_recall_cases_state on public.recall_cases (state_code);

-- ----------------------------------------------------------------------------
-- recall_stage_history
-- Append-only log of stage transitions for a recall (for charts + alerts).
-- ----------------------------------------------------------------------------
create table if not exists public.recall_stage_history (
  id uuid primary key default gen_random_uuid(),
  recall_id uuid not null references public.recalls(id) on delete cascade,
  from_stage integer,
  to_stage integer not null,
  from_label text,
  to_label text not null,
  case_count_at_transition integer,
  trigger_reason text,                    -- 'new_case', 'specialty_firm', 'jpml_petition', 'mdl_formed', 'recompute'
  notes text,
  transitioned_at timestamptz not null default now()
);
create index if not exists idx_stage_history_recall on public.recall_stage_history (recall_id, transitioned_at desc);

-- ----------------------------------------------------------------------------
-- updated_at triggers (follow existing pattern in this schema)
-- ----------------------------------------------------------------------------
create or replace function public._set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_recall_manufacturers_updated') then
    create trigger trg_recall_manufacturers_updated
      before update on public.recall_manufacturers
      for each row execute function public._set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_recall_device_families_updated') then
    create trigger trg_recall_device_families_updated
      before update on public.recall_device_families
      for each row execute function public._set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_recalls_updated') then
    create trigger trg_recalls_updated
      before update on public.recalls
      for each row execute function public._set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_recall_cases_updated') then
    create trigger trg_recall_cases_updated
      before update on public.recall_cases
      for each row execute function public._set_updated_at();
  end if;
end$$;

-- ============================================================================
-- Seed: Olympus duodenoscope family (to ground the Olympus Scopes tort page
-- and give the watchlist a known Stage 3 / Warm example on launch).
-- ============================================================================
insert into public.recall_manufacturers (canonical_name, slug, parent_name, country, aliases, notes)
values (
  'Olympus Corporation',
  'olympus-corporation',
  'Olympus Corporation',
  'JP',
  array[
    'Olympus Medical Systems Corp',
    'Olympus Medical Systems Corp.',
    'Olympus America Inc.',
    'Olympus Corporation of the Americas'
  ],
  'Seeded with Olympus Scopes tort launch.'
)
on conflict (slug) do nothing;

insert into public.recall_device_families (manufacturer_id, family_name, slug, product_category, product_codes, description, tort_id)
select
  m.id,
  'Olympus Duodenoscopes (TJF/JF series)',
  'olympus-duodenoscopes',
  'duodenoscope',
  array['FDT', 'FDS'],
  'Olympus reusable duodenoscopes linked to ERCP infection outbreaks and MDL 3083.',
  (select id from public.torts where slug = 'olympus_scopes' limit 1)
from public.recall_manufacturers m
where m.slug = 'olympus-corporation'
on conflict (slug) do nothing;
