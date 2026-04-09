-- Add rural/urban classification to fars_fatalities
-- FARS RUR_URB: 1 = Rural, 2 = Urban, 9 = Unknown
ALTER TABLE public.fars_fatalities
  ADD COLUMN IF NOT EXISTS rur_urb smallint;
CREATE INDEX IF NOT EXISTS idx_fars_fatalities_rur_urb
  ON public.fars_fatalities (rur_urb);
-- RPC: get urban/rural breakdown
CREATE OR REPLACE FUNCTION public.get_fars_urban_rural_stats(
  filter_state text DEFAULT NULL,
  filter_county integer DEFAULT NULL,
  filter_motorcycle boolean DEFAULT NULL,
  filter_large_truck boolean DEFAULT NULL
)
RETURNS TABLE (
  classification text,
  total_fatalities bigint,
  total_crashes bigint
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    CASE rur_urb WHEN 1 THEN 'Rural' WHEN 2 THEN 'Urban' ELSE 'Unknown' END AS classification,
    COALESCE(SUM(fatalities), 0)::bigint,
    COUNT(*)::bigint
  FROM public.fars_fatalities
  WHERE (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
    AND (filter_county IS NULL OR county_fips = filter_county)
    AND (filter_motorcycle IS NULL OR has_motorcycle = filter_motorcycle)
    AND (filter_large_truck IS NULL OR has_large_truck = filter_large_truck)
  GROUP BY rur_urb
  ORDER BY total_fatalities DESC;
$$;

-- PI Viability scores table
CREATE TABLE IF NOT EXISTS public.pi_viability_scores (
  id bigint generated always as identity primary key,
  state text NOT NULL UNIQUE,
  negligence_rule text,
  negligence_score integer,
  non_economic_cap text,
  non_economic_score integer,
  punitive_cap text,
  punitive_score integer,
  med_mal_cap text,
  med_mal_score integer,
  statute_of_limitations text,
  sol_score integer,
  avg_jury_verdict text,
  verdict_score integer,
  composite_score numeric,
  updated_at timestamptz DEFAULT now()
);
-- RPC: get all scores
CREATE OR REPLACE FUNCTION public.get_pi_viability_scores(
  filter_state text DEFAULT NULL
)
RETURNS SETOF public.pi_viability_scores
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT * FROM public.pi_viability_scores
  WHERE (filter_state IS NULL OR state = UPPER(TRIM(filter_state)))
  ORDER BY composite_score DESC;
$$;
-- RLS
ALTER TABLE public.pi_viability_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.pi_viability_scores FOR SELECT TO anon USING (true);
