-- Storm Events table and RPCs for NOAA Storm Events data
CREATE TABLE IF NOT EXISTS public.storm_events (
  id bigint generated always as identity primary key,
  event_id bigint NOT NULL UNIQUE,
  state text,
  state_fips integer,
  county_name text,
  county_fips integer,
  event_type text,
  begin_date_time timestamptz,
  end_date_time timestamptz,
  year integer,
  month_name text,
  injuries_direct integer DEFAULT 0,
  injuries_indirect integer DEFAULT 0,
  deaths_direct integer DEFAULT 0,
  deaths_indirect integer DEFAULT 0,
  damage_property numeric DEFAULT 0,
  damage_crops numeric DEFAULT 0,
  source text,
  flood_cause text,
  tor_f_scale text,
  begin_lat double precision,
  begin_lon double precision,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_storm_events_state ON public.storm_events (state);
CREATE INDEX IF NOT EXISTS idx_storm_events_year ON public.storm_events (year);
CREATE INDEX IF NOT EXISTS idx_storm_events_event_type ON public.storm_events (event_type);
CREATE INDEX IF NOT EXISTS idx_storm_events_state_year ON public.storm_events (state, year);
CREATE INDEX IF NOT EXISTS idx_storm_events_latlon ON public.storm_events (begin_lat, begin_lon)
  WHERE begin_lat IS NOT NULL AND begin_lon IS NOT NULL;
ALTER TABLE public.storm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.storm_events FOR SELECT TO anon USING (true);

-- Totals
CREATE OR REPLACE FUNCTION public.get_storm_event_totals(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL
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
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type);
$$;

-- By state
CREATE OR REPLACE FUNCTION public.get_storm_events_by_state(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL
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
  GROUP BY se.state
  ORDER BY COALESCE(SUM(se.damage_property), 0) DESC;
$$;

-- By event type
CREATE OR REPLACE FUNCTION public.get_storm_events_by_type(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL
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
  GROUP BY se.event_type
  ORDER BY COUNT(*) DESC
  LIMIT 15;
$$;

-- Trend by year
CREATE OR REPLACE FUNCTION public.get_storm_event_trend_by_year(
  filter_state text DEFAULT NULL,
  filter_event_type text DEFAULT NULL
)
RETURNS TABLE (
  year integer,
  total_events bigint,
  total_property_damage numeric
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    se.year,
    COUNT(*)::bigint,
    COALESCE(SUM(se.damage_property), 0)
  FROM public.storm_events se
  WHERE (filter_state IS NULL OR se.state = filter_state)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
  GROUP BY se.year
  ORDER BY se.year;
$$;

-- Counties by state
CREATE OR REPLACE FUNCTION public.get_storm_counties_by_state(
  filter_state text,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL
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
    AND se.county_name IS NOT NULL
  GROUP BY se.county_name, se.county_fips
  ORDER BY COUNT(*) DESC;
$$;

-- Distinct states
CREATE OR REPLACE FUNCTION public.get_storm_distinct_states()
RETURNS TABLE (state text)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT DISTINCT se.state FROM public.storm_events se
  WHERE NULLIF(TRIM(se.state), '') IS NOT NULL
  ORDER BY se.state;
$$;

-- Distinct event types
CREATE OR REPLACE FUNCTION public.get_storm_distinct_event_types()
RETURNS TABLE (event_type text)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT DISTINCT se.event_type FROM public.storm_events se
  WHERE NULLIF(TRIM(se.event_type), '') IS NOT NULL
  ORDER BY se.event_type;
$$;

-- Heatmap points
CREATE OR REPLACE FUNCTION public.get_storm_heatmap_points(
  filter_state text DEFAULT NULL,
  filter_year integer DEFAULT NULL,
  filter_event_type text DEFAULT NULL
)
RETURNS TABLE (latitude double precision, longitude double precision)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT se.begin_lat AS latitude, se.begin_lon AS longitude
  FROM public.storm_events se
  WHERE se.begin_lat IS NOT NULL AND se.begin_lon IS NOT NULL
    AND (filter_state IS NULL OR se.state = filter_state)
    AND (filter_year IS NULL OR se.year = filter_year)
    AND (filter_event_type IS NULL OR se.event_type = filter_event_type)
  LIMIT 5000;
$$;
