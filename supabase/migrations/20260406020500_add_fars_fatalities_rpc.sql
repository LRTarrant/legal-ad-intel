-- Server-side aggregations and filter helpers for the high-volume fars_fatalities dataset.

alter table if exists public.fars_fatalities
  add column if not exists county_name text;

create index if not exists idx_fars_fatalities_state_county
  on public.fars_fatalities (state, county_fips);

update public.fars_fatalities target
set county_name = source.county_name
from (
  select
    state,
    county_fips,
    max(nullif(trim(county_name), '')) as county_name
  from public.fars_fatalities
  group by state, county_fips
) source
where target.state = source.state
  and target.county_fips = source.county_fips
  and target.county_name is null
  and source.county_name is not null;

drop function if exists public.get_fars_totals();
drop function if exists public.get_fars_fatality_trend_by_year();
drop function if exists public.get_fars_state_fatality_trend_by_year(text);
drop function if exists public.get_fars_top_states_by_fatalities(integer);
drop function if exists public.get_fars_drunk_driving_stats();

create or replace function public.get_fars_totals(
  filter_state text default null,
  filter_county integer default null
)
returns table (
  total_fatalities bigint,
  total_crashes bigint
)
language sql
stable
set search_path = public
as $$
  with filtered as (
    select fatalities
    from public.fars_fatalities
    where (filter_state is null or state = upper(trim(filter_state)))
      and (filter_county is null or county_fips = filter_county)
  )
  select
    coalesce(sum(fatalities), 0)::bigint as total_fatalities,
    count(*)::bigint as total_crashes
  from filtered;
$$;

create or replace function public.get_fars_fatality_trend_by_year(
  filter_state text default null,
  filter_county integer default null
)
returns table (
  year integer,
  total_fatalities bigint,
  total_crashes bigint
)
language sql
stable
set search_path = public
as $$
  select
    year,
    coalesce(sum(fatalities), 0)::bigint as total_fatalities,
    count(*)::bigint as total_crashes
  from public.fars_fatalities
  where (filter_state is null or state = upper(trim(filter_state)))
    and (filter_county is null or county_fips = filter_county)
  group by year
  order by year;
$$;

create or replace function public.get_fars_state_fatality_trend_by_year(
  state_abbr text,
  filter_state text default null,
  filter_county integer default null
)
returns table (
  year integer,
  total_fatalities bigint,
  total_crashes bigint
)
language sql
stable
set search_path = public
as $$
  select
    year,
    coalesce(sum(fatalities), 0)::bigint as total_fatalities,
    count(*)::bigint as total_crashes
  from public.fars_fatalities
  where state = upper(trim(coalesce(filter_state, state_abbr)))
    and (filter_county is null or county_fips = filter_county)
  group by year
  order by year;
$$;

create or replace function public.get_fars_top_states_by_fatalities(
  result_limit integer default 15,
  filter_state text default null,
  filter_county integer default null
)
returns table (
  state text,
  total_fatalities bigint,
  total_crashes bigint,
  drunk_driving_crashes bigint
)
language sql
stable
set search_path = public
as $$
  select
    state,
    coalesce(sum(fatalities), 0)::bigint as total_fatalities,
    count(*)::bigint as total_crashes,
    count(*) filter (where drunk_drivers > 0)::bigint as drunk_driving_crashes
  from public.fars_fatalities
  where (filter_state is null or state = upper(trim(filter_state)))
    and (filter_county is null or county_fips = filter_county)
  group by state
  order by total_fatalities desc, state asc
  limit greatest(result_limit, 0);
$$;

create or replace function public.get_fars_drunk_driving_stats(
  filter_state text default null,
  filter_county integer default null
)
returns table (
  total_crashes bigint,
  drunk_crashes bigint,
  percentage numeric
)
language sql
stable
set search_path = public
as $$
  with filtered as (
    select drunk_drivers
    from public.fars_fatalities
    where (filter_state is null or state = upper(trim(filter_state)))
      and (filter_county is null or county_fips = filter_county)
  )
  select
    count(*)::bigint as total_crashes,
    count(*) filter (where drunk_drivers > 0)::bigint as drunk_crashes,
    case
      when count(*) = 0 then 0::numeric
      else round(((count(*) filter (where drunk_drivers > 0))::numeric / count(*)::numeric) * 100, 1)
    end as percentage
  from filtered;
$$;

create or replace function public.get_fars_distinct_states()
returns table (
  state text
)
language sql
stable
set search_path = public
as $$
  select distinct state
  from public.fars_fatalities
  where nullif(trim(state), '') is not null
  order by state;
$$;

create or replace function public.get_fars_counties_by_state(state_abbr text)
returns table (
  county_fips integer,
  county_name text
)
language sql
stable
set search_path = public
as $$
  select
    county_fips,
    coalesce(
      max(nullif(trim(county_name), '')),
      'County ' || lpad(county_fips::text, 3, '0')
    ) as county_name
  from public.fars_fatalities
  where state = upper(trim(state_abbr))
    and county_fips is not null
  group by county_fips
  order by county_name, county_fips;
$$;
