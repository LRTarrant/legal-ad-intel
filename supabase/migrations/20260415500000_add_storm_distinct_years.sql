-- Distinct years (mirrors get_storm_distinct_states / get_storm_distinct_event_types)
CREATE OR REPLACE FUNCTION public.get_storm_distinct_years()
RETURNS TABLE (year integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT DISTINCT se.year FROM public.storm_events se
  WHERE se.year IS NOT NULL
  ORDER BY se.year;
$$;
