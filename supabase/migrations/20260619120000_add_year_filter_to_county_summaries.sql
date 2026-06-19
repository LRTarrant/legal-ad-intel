-- Add an optional p_year filter to the per-county accident + boating summary RPCs
-- that drive the County Intelligence map on State Intelligence pages.
--
-- Both functions previously aggregated ALL years together (FARS 2019-2024,
-- USCG boating 2019-2023) with no way to scope to a single year. This adds
-- `p_year integer DEFAULT NULL` to each: NULL preserves the existing all-years
-- behavior (and every existing caller that passes only p_state keeps working),
-- a year value adds `AND year = p_year`.
--
-- Adding a parameter creates a NEW overload that would be ambiguous with the
-- old single-arg signature when called with one argument, so we DROP the old
-- function first, then CREATE the widened one. Both bodies are otherwise
-- reproduced verbatim from the live definitions.

DROP FUNCTION IF EXISTS public.get_state_accident_summary(text);

CREATE OR REPLACE FUNCTION public.get_state_accident_summary(p_state text, p_year integer DEFAULT NULL)
  RETURNS TABLE(county text, total_population bigint, fatal_crashes bigint, total_deaths bigint, truck_deaths bigint, moto_deaths bigint, drunk_driver_crashes bigint, deaths_per_100k numeric, rural_pct numeric, judicial_profile text)
  LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    INITCAP(SPLIT_PART(f.county_name, ' (', 1))::TEXT AS county,
    c.total_population::BIGINT,
    COUNT(*)::BIGINT AS fatal_crashes,
    SUM(f.fatalities)::BIGINT AS total_deaths,
    SUM(CASE WHEN f.has_large_truck THEN f.fatalities ELSE 0 END)::BIGINT AS truck_deaths,
    SUM(CASE WHEN f.has_motorcycle THEN f.fatalities ELSE 0 END)::BIGINT AS moto_deaths,
    SUM(CASE WHEN f.drunk_drivers > 0 THEN 1 ELSE 0 END)::BIGINT AS drunk_driver_crashes,
    ROUND(SUM(f.fatalities)::NUMERIC / NULLIF(c.total_population, 0) * 100000, 1) AS deaths_per_100k,
    ROUND(SUM(CASE WHEN f.rur_urb = 2 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS rural_pct,
    j.judicial_profile::TEXT
  FROM fars_fatalities f
  LEFT JOIN census_demographics c
    ON c.state_abbr = p_state
    AND UPPER(REPLACE(REPLACE(c.county_name, '.', ''), ' ', '')) = UPPER(REPLACE(REPLACE(SPLIT_PART(f.county_name, ' (', 1), '.', ''), ' ', ''))
  LEFT JOIN judicial_profiles j
    ON j.state = p_state
    AND UPPER(REPLACE(REPLACE(REPLACE(j.county_name, ' County', ''), '.', ''), ' ', '')) = UPPER(REPLACE(REPLACE(SPLIT_PART(f.county_name, ' (', 1), '.', ''), ' ', ''))
  WHERE f.state = p_state
    AND (p_year IS NULL OR f.year = p_year)
  GROUP BY INITCAP(SPLIT_PART(f.county_name, ' (', 1)), c.total_population, j.judicial_profile
  ORDER BY deaths_per_100k DESC NULLS LAST;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_state_boating_summary(text);

CREATE OR REPLACE FUNCTION public.get_state_boating_summary(p_state text, p_year integer DEFAULT NULL)
  RETURNS TABLE(county text, accident_count bigint, total_deaths bigint, total_injuries bigint, top_causes text)
  LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.county_name::TEXT AS county,
    COUNT(*)::BIGINT AS accident_count,
    SUM(b.deaths)::BIGINT AS total_deaths,
    SUM(b.injuries)::BIGINT AS total_injuries,
    STRING_AGG(DISTINCT b.cause_of_accident, ', ')::TEXT AS top_causes
  FROM boating_accidents b
  WHERE b.state = p_state
    AND (p_year IS NULL OR b.year = p_year)
  GROUP BY b.county_name
  ORDER BY accident_count DESC
  LIMIT 20;
END;
$function$;
