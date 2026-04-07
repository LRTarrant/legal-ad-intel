-- JPML monthly report snapshot tables.
-- Stores per-MDL and per-type summaries from the JPML "Pending MDL Dockets
-- By MDL Type" PDF reports.

-- ============================================================================
-- jpml_snapshots — per-MDL row from each monthly JPML report
-- ============================================================================
create table if not exists public.jpml_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  mdl_number integer not null,
  case_name text not null,
  jpml_type text not null,
  transferee_judge text,
  district text,
  master_docket text,
  date_filed date,
  date_transferred date,
  date_closed date,
  created_at timestamptz not null default now(),
  unique (report_date, mdl_number)
);

create index if not exists idx_jpml_snapshots_jpml_type on public.jpml_snapshots (jpml_type);
create index if not exists idx_jpml_snapshots_mdl_number on public.jpml_snapshots (mdl_number);
create index if not exists idx_jpml_snapshots_report_date on public.jpml_snapshots (report_date);

-- ============================================================================
-- jpml_type_summaries — per-type summary row from each monthly JPML report
-- ============================================================================
create table if not exists public.jpml_type_summaries (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  mdl_type text not null,
  mdl_count integer not null,
  pct_of_total numeric(5,2),
  total_active_mdls integer not null,
  created_at timestamptz not null default now(),
  unique (report_date, mdl_type)
);

-- ============================================================================
-- RLS — enable with permissive SELECT for the anon role
-- ============================================================================
alter table public.jpml_snapshots enable row level security;
alter table public.jpml_type_summaries enable row level security;

create policy "Allow anonymous read access on jpml_snapshots"
  on public.jpml_snapshots for select
  to anon
  using (true);

create policy "Allow anonymous read access on jpml_type_summaries"
  on public.jpml_type_summaries for select
  to anon
  using (true);
