-- Recommended once per database if not already enabled
create extension if not exists pgcrypto;

-- ============================================================================
-- firms
-- ============================================================================
create table if not exists public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  firm_type text, -- plaintiff_firm, agency, advertiser, unknown
  website text,
  headquarters_city text,
  headquarters_state text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firms_name on public.firms (name);

-- ============================================================================
-- markets
-- ============================================================================
create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  market_code text not null unique, -- e.g. DMA code or internal market key
  market_name text not null,
  state_code text,
  region text,
  country_code text not null default 'US',
  timezone_name text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_markets_name on public.markets (market_name);
create index if not exists idx_markets_state on public.markets (state_code);

-- ============================================================================
-- mass_torts
-- ============================================================================
create table if not exists public.mass_torts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  category text, -- pharma, product_liability, environmental, wildfire, etc.
  status text, -- active, emerging, winding_down, closed
  disease_or_injury text,
  product_or_exposure text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mass_torts_name on public.mass_torts (name);
create index if not exists idx_mass_torts_status on public.mass_torts (status);

-- ============================================================================
-- mdls
-- ============================================================================
create table if not exists public.mdls (
  id uuid primary key default gen_random_uuid(),
  mass_tort_id uuid references public.mass_torts(id) on delete set null,
  mdl_number integer not null unique,
  title text not null,
  court text,
  district text,
  judge_name text,
  status text, -- active, closed, remanded, etc.
  filed_date date,
  closed_date date,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mdls_mass_tort_id on public.mdls (mass_tort_id);
create index if not exists idx_mdls_status on public.mdls (status);
create index if not exists idx_mdls_filed_date on public.mdls (filed_date);

-- ============================================================================
-- mdl_stats_monthly
-- ============================================================================
create table if not exists public.mdl_stats_monthly (
  id uuid primary key default gen_random_uuid(),
  mdl_id uuid not null references public.mdls(id) on delete cascade,
  stats_month date not null, -- use first day of month
  pending_actions integer,
  pending_actions_change integer,
  source_url text,
  source_published_at timestamptz,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (mdl_id, stats_month)
);

create index if not exists idx_mdl_stats_monthly_mdl_id on public.mdl_stats_monthly (mdl_id);
create index if not exists idx_mdl_stats_monthly_stats_month on public.mdl_stats_monthly (stats_month);
create index if not exists idx_mdl_stats_monthly_mdl_month on public.mdl_stats_monthly (mdl_id, stats_month desc);

-- ============================================================================
-- ad_events
-- core fact table
-- ============================================================================
create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),

  firm_id uuid references public.firms(id) on delete set null,
  market_id uuid references public.markets(id) on delete set null,
  mass_tort_id uuid references public.mass_torts(id) on delete set null,
  mdl_id uuid references public.mdls(id) on delete set null,

  source text not null, -- meta, google, tv, ctv, radio, other
  source_event_id text, -- upstream record id if available
  event_date date not null,
  aired_at timestamptz,
  ingested_at timestamptz not null default now(),

  channel text, -- tv, ctv, radio, digital, search, social
  platform text, -- meta, google, ispot, mediaradar, etc.
  advertiser_name_raw text,
  campaign_name text,
  creative_id text,
  creative_name text,

  spend_estimate numeric(14,2),
  impressions_estimate bigint,
  airings_count integer,
  estimated_reach integer,

  state_code text,
  dma_code text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (source, source_event_id)
);

create index if not exists idx_ad_events_firm_id on public.ad_events (firm_id);
create index if not exists idx_ad_events_market_id on public.ad_events (market_id);
create index if not exists idx_ad_events_mass_tort_id on public.ad_events (mass_tort_id);
create index if not exists idx_ad_events_mdl_id on public.ad_events (mdl_id);

create index if not exists idx_ad_events_event_date on public.ad_events (event_date desc);
create index if not exists idx_ad_events_aired_at on public.ad_events (aired_at desc);

create index if not exists idx_ad_events_firm_date on public.ad_events (firm_id, event_date desc);
create index if not exists idx_ad_events_market_date on public.ad_events (market_id, event_date desc);
create index if not exists idx_ad_events_tort_date on public.ad_events (mass_tort_id, event_date desc);

create index if not exists idx_ad_events_dma_code on public.ad_events (dma_code);
create index if not exists idx_ad_events_state_code on public.ad_events (state_code);
create index if not exists idx_ad_events_channel on public.ad_events (channel);
create index if not exists idx_ad_events_source on public.ad_events (source);

create index if not exists idx_ad_events_metadata_gin
  on public.ad_events using gin (metadata);

-- ============================================================================
-- fatalities
-- ============================================================================
create table if not exists public.fatalities (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references public.markets(id) on delete set null,
  incident_date date not null,
  year integer not null,
  state_code text,
  county_name text,
  city_name text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  fatality_count integer not null default 1,
  source text not null, -- fars, state source, etc.
  source_record_id text,
  attributes jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, source_record_id)
);

create index if not exists idx_fatalities_market_id on public.fatalities (market_id);
create index if not exists idx_fatalities_incident_date on public.fatalities (incident_date desc);
create index if not exists idx_fatalities_year on public.fatalities (year);
create index if not exists idx_fatalities_state_code on public.fatalities (state_code);

-- ============================================================================
-- storms
-- ============================================================================
create table if not exists public.storms (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references public.markets(id) on delete set null,
  event_type text not null, -- tornado, hail, hurricane, flood, etc.
  episode_id text,
  event_id text,
  begin_date timestamptz,
  end_date timestamptz,
  event_date date generated always as ((begin_date at time zone 'UTC')::date) stored,
  state_code text,
  county_name text,
  cz_name text,
  magnitude numeric(10,2),
  injuries_direct integer,
  injuries_indirect integer,
  deaths_direct integer,
  deaths_indirect integer,
  damage_property_usd numeric(14,2),
  damage_crops_usd numeric(14,2),
  source text not null default 'noaa',
  source_url text,
  attributes jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, event_id)
);

create index if not exists idx_storms_market_id on public.storms (market_id);
create index if not exists idx_storms_event_date on public.storms (event_date desc);
create index if not exists idx_storms_begin_date on public.storms (begin_date desc);
create index if not exists idx_storms_state_code on public.storms (state_code);
create index if not exists idx_storms_event_type on public.storms (event_type);

-- ============================================================================
-- dockets
-- ============================================================================
create table if not exists public.dockets (
  id uuid primary key default gen_random_uuid(),
  mdl_id uuid references public.mdls(id) on delete set null,
  mass_tort_id uuid references public.mass_torts(id) on delete set null,

  source text not null default 'courtlistener',
  source_docket_id text,
  court text,
  jurisdiction text,
  case_name text not null,
  docket_number text,
  judge_name text,

  filed_date date,
  terminated_date date,
  status text, -- open, closed, stayed, remanded, etc.

  plaintiffs_count integer,
  defendants_count integer,

  source_url text,
  metadata jsonb not null default '{}'::jsonb,

  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, source_docket_id)
);

create index if not exists idx_dockets_mdl_id on public.dockets (mdl_id);
create index if not exists idx_dockets_mass_tort_id on public.dockets (mass_tort_id);
create index if not exists idx_dockets_filed_date on public.dockets (filed_date desc);
create index if not exists idx_dockets_status on public.dockets (status);
create index if not exists idx_dockets_docket_number on public.dockets (docket_number);

-- ============================================================================
-- docket_events
-- ============================================================================
create table if not exists public.docket_events (
  id uuid primary key default gen_random_uuid(),
  docket_id uuid not null references public.dockets(id) on delete cascade,

  source text not null default 'courtlistener',
  source_event_id text,
  event_date timestamptz not null,
  event_type text, -- complaint, transfer_order, minute_entry, motion, order, etc.
  event_title text,
  event_description text,
  document_number text,
  source_url text,

  metadata jsonb not null default '{}'::jsonb,

  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (source, source_event_id)
);

create index if not exists idx_docket_events_docket_id on public.docket_events (docket_id);
create index if not exists idx_docket_events_event_date on public.docket_events (event_date desc);
create index if not exists idx_docket_events_docket_date on public.docket_events (docket_id, event_date desc);
create index if not exists idx_docket_events_event_type on public.docket_events (event_type);