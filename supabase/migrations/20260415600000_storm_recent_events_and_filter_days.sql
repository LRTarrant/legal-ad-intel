-- Add filter_days parameter to existing storm RPCs and create get_recent_storm_events RPC
-- filter_days: optional integer, filters to events within the last N days via begin_date_time

-- Add index on begin_date_time for efficient date range filtering
CREATE INDEX IF NOT EXISTS idx_storm_events_begin_date_time
  ON public.storm_events (begin_date_time DESC);

-- 1. Recreate get_storm_event_totals with filter_days
CREATE OR REPLACE FUNCTION public.get_storm_event_totals(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL,
  filter_days integer DEFAULT NULL
)
RETURNS TABLE (
  total_events bigint,
  total_property_damage numeric,
  total_injuries bigint,
  total_deaths bigint
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(se.damage_property + se.damage_crops), 0),
    COALESCE(SUM(se.injuries_direct + se.injuries_indirect), 0)::bigint,
    COALESCE(SUM(se.deaths_direct + se.deaths_indirect), 0)::bigint
  FROM public.storm_events se
  WHERE (filter_state IS NULL OR se.state = filter_state)
    AND (filter_year IS NULL OR se.year = filter_year)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
    AND (filter_days IS NULL OR se.begin_date_time >= (NOW() - (filter_days || ' days')::interval));
$$;

-- 2. Recreate get_storm_events_by_state with filter_days
CREATE OR REPLACE FUNCTION public.get_storm_events_by_state(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL,
  filter_days integer DEFAULT NULL
)
RETURNS TABLE (
  state text,
  total_events bigint,
  total_property_damage numeric,
  total_crop_damage numeric,
  total_injuries bigint,
  total_deaths bigint
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    se.state,
    COUNT(*)::bigint,
    COALESCE(SUM(se.damage_property), 0),
    COALESCE(SUM(se.damage_crops), 0),
    COALESCE(SUM(se.injuries_direct + se.injuries_indirect), 0)::bigint,
    COALESCE(SUM(se.deaths_direct + se.deaths_indirect), 0)::bigint
  FROM public.storm_events se
  WHERE (filter_state IS NULL OR se.state = filter_state)
    AND (filter_year IS NULL OR se.year = filter_year)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
    AND (filter_days IS NULL OR se.begin_date_time >= (NOW() - (filter_days || ' days')::interval))
  GROUP BY se.state
  ORDER BY COALESCE(SUM(se.damage_property), 0) DESC;
$$;

-- 3. Recreate get_storm_events_by_type with filter_days
CREATE OR REPLACE FUNCTION public.get_storm_events_by_type(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_days integer DEFAULT NULL
)
RETURNS TABLE (
  event_type text,
  total_events bigint,
  total_property_damage numeric
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    se.event_type,
    COUNT(*)::bigint,
    COALESCE(SUM(se.damage_property), 0)
  FROM public.storm_events se
  WHERE (filter_state IS NULL OR se.state = filter_state)
    AND (filter_year IS NULL OR se.year = filter_year)
    AND (filter_days IS NULL OR se.begin_date_time >= (NOW() - (filter_days || ' days')::interval))
  GROUP BY se.event_type
  ORDER BY COUNT(*) DESC
  LIMIT 15;
$$;

-- 4. Recreate get_storm_heatmap_points with filter_days
CREATE OR REPLACE FUNCTION public.get_storm_heatmap_points(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL,
  filter_days integer DEFAULT NULL
)
RETURNS TABLE (latitude double precision, longitude double precision)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT se.begin_lat AS latitude, se.begin_lon AS longitude
  FROM public.storm_events se
  WHERE se.begin_lat IS NOT NULL AND se.begin_lon IS NOT NULL
    AND (filter_state IS NULL OR se.state = filter_state)
    AND (filter_year IS NULL OR se.year = filter_year)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
    AND (filter_days IS NULL OR se.begin_date_time >= (NOW() - (filter_days || ' days')::interval))
  LIMIT 5000;
$$;

-- 5. Recreate get_storm_counties_by_state with filter_days
CREATE OR REPLACE FUNCTION public.get_storm_counties_by_state(
  filter_state text,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL,
  filter_days integer DEFAULT NULL
)
RETURNS TABLE (
  county_name text,
  county_fips integer,
  total_events bigint,
  total_property_damage numeric
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    se.county_name,
    se.county_fips,
    COUNT(*)::bigint,
    COALESCE(SUM(se.damage_property), 0)
  FROM public.storm_events se
  WHERE se.state = filter_state
    AND (filter_year IS NULL OR se.year = filter_year)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
    AND (filter_days IS NULL OR se.begin_date_time >= (NOW() - (filter_days || ' days')::interval))
    AND se.county_name IS NOT NULL
  GROUP BY se.county_name, se.county_fips
  ORDER BY COUNT(*) DESC;
$$;

-- 6. New RPC: get_recent_storm_events
CREATE OR REPLACE FUNCTION public.get_recent_storm_events(
  filter_state text DEFAULT NULL,
  filter_event_type text DEFAULT NULL,
  filter_days integer DEFAULT NULL,
  result_limit integer DEFAULT 25
)
RETURNS TABLE (
  begin_date_time timestamptz,
  state text,
  county_name text,
  event_type text,
  damage_property numeric,
  total_injuries bigint,
  total_deaths bigint,
  begin_lat double precision,
  begin_lon double precision,
  tor_f_scale text
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    se.begin_date_time,
    se.state,
    se.county_name,
    se.event_type,
    COALESCE(se.damage_property, 0),
    (COALESCE(se.injuries_direct, 0) + COALESCE(se.injuries_indirect, 0))::bigint,
    (COALESCE(se.deaths_direct, 0) + COALESCE(se.deaths_indirect, 0))::bigint,
    se.begin_lat,
    se.begin_lon,
    se.tor_f_scale
  FROM public.storm_events se
  WHERE (filter_state IS NULL OR se.state = filter_state)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
    AND (filter_days IS NULL OR se.begin_date_time >= (NOW() - (filter_days || ' days')::interval))
  ORDER BY se.begin_date_time DESC, se.damage_property DESC
  LIMIT result_limit;
$$;
