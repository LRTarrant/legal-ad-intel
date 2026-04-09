create table if not exists public.cancer_incidence (
  id uuid primary key default gen_random_uuid(),
  fips text not null,
  county_name text not null,
  state text not null,
  cancer_site text not null,
  rural_urban text,
  incidence_rate numeric(10, 2) not null,
  lower_ci numeric(10, 2),
  upper_ci numeric(10, 2),
  average_annual_count numeric(12, 2),
  recent_trend numeric(10, 2),
  trend_lower_ci numeric(10, 2),
  trend_upper_ci numeric(10, 2),
  trend_direction text not null default 'Stable',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cancer_incidence_fips_site_unique unique (fips, cancer_site)
);

create index if not exists idx_cancer_incidence_state
  on public.cancer_incidence (state);

create index if not exists idx_cancer_incidence_site
  on public.cancer_incidence (cancer_site);

create index if not exists idx_cancer_incidence_state_site
  on public.cancer_incidence (state, cancer_site);

create index if not exists idx_cancer_incidence_rate
  on public.cancer_incidence (incidence_rate desc);

create index if not exists idx_cancer_incidence_trend
  on public.cancer_incidence (recent_trend desc);

alter table public.cancer_incidence enable row level security;

drop policy if exists "Cancer incidence is readable" on public.cancer_incidence;

create policy "Cancer incidence is readable"
  on public.cancer_incidence
  for select
  using (true);
