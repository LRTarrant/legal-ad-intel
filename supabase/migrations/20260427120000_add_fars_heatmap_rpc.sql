-- Replaces client-side pagination storm that was pulling 221k rows in 1000-row
-- chunks through PostgREST, saturating the connection pool and causing 504s on
-- auth endpoints.
--
-- This RPC bins crash locations into a 0.5-degree lat/lng grid (~55 km cells)
-- and returns aggregated points.  For a national view that is ~2000 cells max;
-- for a single state, typically 20-80 cells.
--
-- Three variants: all crashes, motorcycle-only, large-truck-only.

-- Indexes to speed up the filtered queries
create index if not exists idx_fars_fatalities_geo
  on public.fars_fatalities (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists idx_fars_fatalities_motorcycle
  on public.fars_fatalities (has_motorcycle)
  where has_motorcycle = true;

-- ── All crashes heatmap ─────────────────────────────────────────────
create or replace function public.get_fars_heatmap(
  filter_state  text    default null,
  filter_county integer default null
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
    round(f.latitude::numeric * 2, 0)::double precision / 2  as latitude,
    round(f.longitude::numeric * 2, 0)::double precision / 2 as longitude,
    coalesce(sum(f.fatalities), count(*))::bigint             as intensity
  from public.fars_fatalities f
  where f.latitude is not null
    and f.longitude is not null
    and (filter_state  is null or f.state      = upper(trim(filter_state)))
    and (filter_county is null or f.county_fips = filter_county)
  group by 1, 2;
$$;

-- ── Motorcycle crashes heatmap ──────────────────────────────────────
create or replace function public.get_fars_motorcycle_heatmap(
  filter_state  text    default null,
  filter_county integer default null
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
    round(f.latitude::numeric * 2, 0)::double precision / 2  as latitude,
    round(f.longitude::numeric * 2, 0)::double precision / 2 as longitude,
    coalesce(sum(f.fatalities), count(*))::bigint             as intensity
  from public.fars_fatalities f
  where f.latitude is not null
    and f.longitude is not null
    and f.has_motorcycle = true
    and (filter_state  is null or f.state      = upper(trim(filter_state)))
    and (filter_county is null or f.county_fips = filter_county)
  group by 1, 2;
$$;

-- ── Large truck crashes heatmap ─────────────────────────────────────
create or replace function public.get_fars_large_truck_heatmap(
  filter_state  text    default null,
  filter_county integer default null
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
    round(f.latitude::numeric * 2, 0)::double precision / 2  as latitude,
    round(f.longitude::numeric * 2, 0)::double precision / 2 as longitude,
    coalesce(sum(f.fatalities), count(*))::bigint             as intensity
  from public.fars_fatalities f
  where f.latitude is not null
    and f.longitude is not null
    and f.has_large_truck = true
    and (filter_state  is null or f.state      = upper(trim(filter_state)))
    and (filter_county is null or f.county_fips = filter_county)
  group by 1, 2;
$$;
