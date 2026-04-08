-- Add vehicle type flags to fars_fatalities
ALTER TABLE public.fars_fatalities
  ADD COLUMN IF NOT EXISTS has_motorcycle boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_large_truck boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fars_fatalities_motorcycle
  ON public.fars_fatalities (has_motorcycle) WHERE has_motorcycle = true;

CREATE INDEX IF NOT EXISTS idx_fars_fatalities_large_truck
  ON public.fars_fatalities (has_large_truck) WHERE has_large_truck = true;

-- Boating accidents table (USCG data)
CREATE TABLE IF NOT EXISTS public.boating_accidents (
  id bigint generated always as identity primary key,
  year integer NOT NULL,
  state text,
  state_fips integer,
  county_name text,
  county_fips integer,
  accident_date date,
  deaths integer DEFAULT 0,
  injuries integer DEFAULT 0,
  damage_amount numeric,
  vessel_type text,
  cause_of_accident text,
  body_of_water text,
  latitude double precision,
  longitude double precision,
  numbering_id text,
  UNIQUE (numbering_id, year)
);

CREATE INDEX IF NOT EXISTS idx_boating_state ON public.boating_accidents (state);
CREATE INDEX IF NOT EXISTS idx_boating_state_county ON public.boating_accidents (state, county_fips);

-- RPC: get boating totals
CREATE OR REPLACE FUNCTION public.get_boating_totals(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL
)
RETURNS TABLE (
  total_deaths bigint,
  total_injuries bigint,
  total_accidents bigint
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(deaths), 0)::bigint AS total_deaths,
    COALESCE(SUM(injuries), 0)::bigint AS total_injuries,
    COUNT(*)::bigint AS total_accidents
  FROM public.boating_accidents
  WHERE (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county);
$$;

-- RPC: get motorcycle fatality totals
CREATE OR REPLACE FUNCTION public.get_fars_motorcycle_totals(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL
)
RETURNS TABLE (
  total_fatalities bigint,
  total_crashes bigint
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(fatalities), 0)::bigint,
    COUNT(*)::bigint
  FROM public.fars_fatalities
  WHERE has_motorcycle = true
    AND (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county);
$$;

-- RPC: get large truck fatality totals
CREATE OR REPLACE FUNCTION public.get_fars_large_truck_totals(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL
)
RETURNS TABLE (
  total_fatalities bigint,
  total_crashes bigint
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(fatalities), 0)::bigint,
    COUNT(*)::bigint
  FROM public.fars_fatalities
  WHERE has_large_truck = true
    AND (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county);
$$;

-- RPC: motorcycle trend by year
CREATE OR REPLACE FUNCTION public.get_fars_motorcycle_trend_by_year(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL
)
RETURNS TABLE (year integer, total_fatalities bigint, total_crashes bigint)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT year, COALESCE(SUM(fatalities), 0)::bigint, COUNT(*)::bigint
  FROM public.fars_fatalities
  WHERE has_motorcycle = true
    AND (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county)
  GROUP BY year ORDER BY year;
$$;

-- RPC: large truck trend by year
CREATE OR REPLACE FUNCTION public.get_fars_large_truck_trend_by_year(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL
)
RETURNS TABLE (year integer, total_fatalities bigint, total_crashes bigint)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT year, COALESCE(SUM(fatalities), 0)::bigint, COUNT(*)::bigint
  FROM public.fars_fatalities
  WHERE has_large_truck = true
    AND (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county)
  GROUP BY year ORDER BY year;
$$;

-- RPC: boating trend by year
CREATE OR REPLACE FUNCTION public.get_boating_trend_by_year(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL
)
RETURNS TABLE (year integer, total_deaths bigint, total_injuries bigint, total_accidents bigint)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT year, COALESCE(SUM(deaths), 0)::bigint, COALESCE(SUM(injuries), 0)::bigint, COUNT(*)::bigint
  FROM public.boating_accidents
  WHERE (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county)
  GROUP BY year ORDER BY year;
$$;

-- RPC: boating distinct states
CREATE OR REPLACE FUNCTION public.get_boating_distinct_states()
RETURNS TABLE (state text)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT DISTINCT state FROM public.boating_accidents
  WHERE NULLIF(TRIM(state), '') IS NOT NULL ORDER BY state;
$$;

-- RPC: boating counties by state
CREATE OR REPLACE FUNCTION public.get_boating_counties_by_state(state_abbr text)
RETURNS TABLE (county_fips integer, county_name text)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT county_fips, COALESCE(MAX(NULLIF(TRIM(county_name), '')), 'County ' || LPAD(county_fips::text, 3, '0')) AS county_name
  FROM public.boating_accidents
  WHERE state = UPPER(TRIM(state_abbr)) AND county_fips IS NOT NULL
  GROUP BY county_fips ORDER BY county_name, county_fips;
$$;
