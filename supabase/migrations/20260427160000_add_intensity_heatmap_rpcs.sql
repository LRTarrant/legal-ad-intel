-- Preemptive fix for three more while(true) pagination storms — same bug class
-- that brought down auth via FARS fatalities this morning (see PR #241).
--
-- Tables affected:
--   cancer_incidence      — ~3k rows per cancer site × ~30 sites, called 6× in
--                           parallel on /cancer-incidence → 6 concurrent storms
--   pfas_contamination_sites — ~500 rows, modest but still unbounded
--   pesticide_usage       — ~30k+ rows (5 years × ~3k counties × 2 compounds)
--
-- Strategy per table:
--   cancer_incidence  → server-side aggregation RPCs that replace every consumer
--                       of the old fetchCancerRows() pagination loop
--   pfas              → state-level aggregation RPC (page only needs state rollup)
--   pesticide_usage   → state-level and county-level aggregation RPCs

-- ═══════════════════════════════════════════════════════════════════════
-- CANCER INCIDENCE RPCs
-- ═══════════════════════════════════════════════════════════════════════

-- Index on geo columns for heatmap binning (matches FARS pattern)
create index if not exists idx_cancer_incidence_geo
  on public.cancer_incidence (latitude, longitude)
  where latitude is not null and longitude is not null;

-- ── Heatmap: 0.5° grid binning (same pattern as get_fars_heatmap) ───
create or replace function public.get_cancer_heatmap(
  filter_state       text default null,
  filter_cancer_site text default null
)
returns table (
  latitude  double precision,
  longitude double precision,
  intensity bigint
)
language sql
stable
set search_path = public
as $$
  select
    round(c.latitude::numeric * 2, 0)::double precision / 2  as latitude,
    round(c.longitude::numeric * 2, 0)::double precision / 2 as longitude,
    count(*)::bigint                                          as intensity
  from public.cancer_incidence c
  where c.latitude is not null
    and c.longitude is not null
    and c.state ~ '^[A-Z]{2}$'
    and (filter_state       is null or c.state       = upper(trim(filter_state)))
    and (filter_cancer_site is null or c.cancer_site = filter_cancer_site)
  group by 1, 2;
$$;

-- ── Totals: count + avg rate + sum cases ────────────────────────────
create or replace function public.get_cancer_totals(
  filter_state       text   default null,
  filter_cancer_site text   default null,
  filter_cancer_sites text[] default null
)
returns table (
  counties_reporting     bigint,
  average_incidence_rate double precision,
  total_annual_cases     double precision
)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint                                          as counties_reporting,
    avg(c.incidence_rate)::double precision                   as average_incidence_rate,
    sum(coalesce(c.average_annual_count, 0))::double precision as total_annual_cases
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
    and (filter_state        is null or c.state       = upper(trim(filter_state)))
    and (filter_cancer_sites is null or c.cancer_site = any(filter_cancer_sites))
    and (filter_cancer_site  is null or c.cancer_site = filter_cancer_site);
$$;

-- ── By state: grouped summary ───────────────────────────────────────
create or replace function public.get_cancer_by_state(
  filter_state       text   default null,
  filter_cancer_site text   default null,
  filter_cancer_sites text[] default null
)
returns table (
  state                  text,
  average_incidence_rate double precision,
  total_annual_cases     double precision,
  counties_reporting     bigint,
  highest_rate_county    text,
  highest_rate           double precision,
  avg_trend              double precision
)
language sql
stable
set search_path = public
as $$
  select
    c.state,
    avg(c.incidence_rate)::double precision                    as average_incidence_rate,
    sum(coalesce(c.average_annual_count, 0))::double precision as total_annual_cases,
    count(*)::bigint                                           as counties_reporting,
    (array_agg(c.county_name order by c.incidence_rate desc))[1] as highest_rate_county,
    max(c.incidence_rate)::double precision                    as highest_rate,
    avg(c.recent_trend)::double precision                      as avg_trend
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
    and (filter_state        is null or c.state       = upper(trim(filter_state)))
    and (filter_cancer_sites is null or c.cancer_site = any(filter_cancer_sites))
    and (filter_cancer_site  is null or c.cancer_site = filter_cancer_site)
  group by c.state
  order by avg(c.incidence_rate) desc;
$$;

-- ── By cancer site: grouped summary ─────────────────────────────────
create or replace function public.get_cancer_by_site(
  filter_state       text   default null,
  filter_cancer_site text   default null,
  filter_cancer_sites text[] default null
)
returns table (
  cancer_site            text,
  average_incidence_rate double precision,
  total_annual_cases     double precision,
  avg_trend              double precision
)
language sql
stable
set search_path = public
as $$
  select
    c.cancer_site,
    avg(c.incidence_rate)::double precision                    as average_incidence_rate,
    sum(coalesce(c.average_annual_count, 0))::double precision as total_annual_cases,
    avg(c.recent_trend)::double precision                      as avg_trend
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
    and (filter_state        is null or c.state       = upper(trim(filter_state)))
    and (filter_cancer_sites is null or c.cancer_site = any(filter_cancer_sites))
    and (filter_cancer_site  is null or c.cancer_site = filter_cancer_site)
  group by c.cancer_site
  order by sum(coalesce(c.average_annual_count, 0)) desc;
$$;

-- ── Distinct states ─────────────────────────────────────────────────
create or replace function public.get_cancer_distinct_states()
returns table (state text)
language sql
stable
set search_path = public
as $$
  select distinct c.state
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
  order by c.state;
$$;

-- ── Distinct cancer sites ───────────────────────────────────────────
create or replace function public.get_cancer_distinct_sites()
returns table (cancer_site text)
language sql
stable
set search_path = public
as $$
  select distinct c.cancer_site
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
  order by c.cancer_site;
$$;

-- ── Counties by state: filtered detail rows ─────────────────────────
create or replace function public.get_cancer_counties_by_state(
  p_state            text,
  filter_cancer_site text   default null,
  filter_cancer_sites text[] default null
)
returns table (
  fips                 text,
  county_name          text,
  state                text,
  cancer_site          text,
  incidence_rate       double precision,
  average_annual_count double precision,
  recent_trend         double precision,
  trend_direction      text,
  rural_urban          text
)
language sql
stable
set search_path = public
as $$
  select
    c.fips,
    c.county_name,
    c.state,
    c.cancer_site,
    c.incidence_rate::double precision,
    coalesce(c.average_annual_count, 0)::double precision,
    c.recent_trend::double precision,
    c.trend_direction,
    c.rural_urban
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
    and c.state = upper(trim(p_state))
    and (filter_cancer_sites is null or c.cancer_site = any(filter_cancer_sites))
    and (filter_cancer_site  is null or c.cancer_site = filter_cancer_site)
  order by c.incidence_rate desc;
$$;

-- ── Trending sites: grouped by cancer_site, ordered by trend ────────
create or replace function public.get_cancer_trending_sites(
  filter_state       text   default null,
  filter_cancer_site text   default null,
  filter_cancer_sites text[] default null
)
returns table (
  cancer_site            text,
  average_incidence_rate double precision,
  total_annual_cases     double precision,
  avg_trend              double precision
)
language sql
stable
set search_path = public
as $$
  select
    c.cancer_site,
    avg(c.incidence_rate)::double precision                    as average_incidence_rate,
    sum(coalesce(c.average_annual_count, 0))::double precision as total_annual_cases,
    avg(c.recent_trend)::double precision                      as avg_trend
  from public.cancer_incidence c
  where c.state ~ '^[A-Z]{2}$'
    and (filter_state        is null or c.state       = upper(trim(filter_state)))
    and (filter_cancer_sites is null or c.cancer_site = any(filter_cancer_sites))
    and (filter_cancer_site  is null or c.cancer_site = filter_cancer_site)
  group by c.cancer_site
  order by avg(c.recent_trend) desc nulls last;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- PFAS CONTAMINATION SITES RPC
-- ═══════════════════════════════════════════════════════════════════════

-- State-level aggregation — the page only renders state rollups and top-N
-- individual sites, so we return both in one call.

create or replace function public.get_pfas_contamination_summary(
  filter_state text default null
)
returns table (
  id                text,
  state             text,
  installation_name text,
  pfas_ppt          double precision,
  source            text,
  data_year         integer
)
language sql
stable
set search_path = public
as $$
  select
    p.id::text,
    p.state,
    p.installation_name,
    p.pfas_ppt::double precision,
    p.source,
    p.data_year::integer
  from public.pfas_contamination_sites p
  where (filter_state is null or p.state = upper(trim(filter_state)))
  order by p.pfas_ppt desc
  limit 5000;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- PESTICIDE USAGE RPCs
-- ═══════════════════════════════════════════════════════════════════════

-- State-level aggregation: sum epest_high/low by state+compound, averaged
-- across years.  Returns ~100 rows (50 states × 2 compounds) instead of
-- 30k+ raw county-year rows.

create or replace function public.get_pesticide_state_summary(
  filter_state text default null
)
returns table (
  compound       text,
  state_name     text,
  state_fips     text,
  avg_high_lbs   double precision,
  avg_low_lbs    double precision,
  total_high_lbs double precision,
  county_count   bigint,
  year_count     bigint
)
language sql
stable
set search_path = public
as $$
  select
    p.compound,
    p.state_name,
    p.state_fips,
    (sum(coalesce(p.epest_high_kg, 0)) * 2.20462 / count(distinct p.year))::double precision as avg_high_lbs,
    (sum(coalesce(p.epest_low_kg, 0))  * 2.20462 / count(distinct p.year))::double precision as avg_low_lbs,
    (sum(coalesce(p.epest_high_kg, 0)) * 2.20462)::double precision                          as total_high_lbs,
    count(distinct p.fips)::bigint                                                            as county_count,
    count(distinct p.year)::bigint                                                            as year_count
  from public.pesticide_usage p
  where (filter_state is null or p.state_name = filter_state)
  group by p.compound, p.state_name, p.state_fips
  order by p.state_name;
$$;

-- County-level aggregation: sum by county+compound, averaged across years.
-- Returns ~6k rows (3k counties × 2 compounds) instead of 30k+ raw rows.

create or replace function public.get_pesticide_county_summary(
  filter_state text default null
)
returns table (
  compound     text,
  fips         text,
  county_name  text,
  state_name   text,
  avg_high_lbs double precision,
  avg_low_lbs  double precision,
  years_active bigint
)
language sql
stable
set search_path = public
as $$
  select
    p.compound,
    p.fips,
    p.county_name,
    p.state_name,
    (sum(coalesce(p.epest_high_kg, 0)) * 2.20462 / count(distinct p.year))::double precision as avg_high_lbs,
    (sum(coalesce(p.epest_low_kg, 0))  * 2.20462 / count(distinct p.year))::double precision as avg_low_lbs,
    count(distinct p.year)::bigint                                                            as years_active
  from public.pesticide_usage p
  where (filter_state is null or p.state_name = filter_state)
  group by p.compound, p.fips, p.county_name, p.state_name
  order by p.state_name, p.county_name;
$$;

-- Per-year state aggregation for the yearly breakdown tabs

create or replace function public.get_pesticide_state_by_year(
  filter_state text default null
)
returns table (
  compound     text,
  year         integer,
  state_name   text,
  state_fips   text,
  total_high_lbs double precision,
  total_low_lbs  double precision,
  county_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    p.compound,
    p.year::integer,
    p.state_name,
    p.state_fips,
    (sum(coalesce(p.epest_high_kg, 0)) * 2.20462)::double precision as total_high_lbs,
    (sum(coalesce(p.epest_low_kg, 0))  * 2.20462)::double precision as total_low_lbs,
    count(distinct p.fips)::bigint                                   as county_count
  from public.pesticide_usage p
  where (filter_state is null or p.state_name = filter_state)
  group by p.compound, p.year, p.state_name, p.state_fips
  order by p.state_name, p.year;
$$;

-- Per-year county aggregation for the yearly breakdown tabs

create or replace function public.get_pesticide_county_by_year(
  filter_state text default null
)
returns table (
  compound     text,
  year         integer,
  fips         text,
  county_name  text,
  state_name   text,
  high_lbs     double precision,
  low_lbs      double precision
)
language sql
stable
set search_path = public
as $$
  select
    p.compound,
    p.year::integer,
    p.fips,
    p.county_name,
    p.state_name,
    (coalesce(p.epest_high_kg, 0) * 2.20462)::double precision as high_lbs,
    (coalesce(p.epest_low_kg, 0)  * 2.20462)::double precision as low_lbs
  from public.pesticide_usage p
  where (filter_state is null or p.state_name = filter_state)
  order by p.state_name, p.county_name, p.year;
$$;
