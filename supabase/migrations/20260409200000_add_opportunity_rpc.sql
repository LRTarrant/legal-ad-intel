CREATE OR REPLACE FUNCTION public.get_state_opportunity_scores()
RETURNS TABLE (
  state text,
  opportunity_score numeric,
  pi_viability_score numeric,
  total_incidents bigint,
  incident_trend_pct numeric,
  negligence_rule text,
  composite_rank bigint
)
LANGUAGE sql STABLE SET search_path = public
AS $$
WITH
  fatality_totals AS (
    SELECT state, SUM(fatalities)::bigint AS total_fatalities
    FROM public.fars_fatalities
    WHERE year BETWEEN 2019 AND 2023
    GROUP BY state
  ),
  boating_totals AS (
    SELECT state, SUM(deaths)::bigint AS total_deaths
    FROM public.boating_accidents
    WHERE year BETWEEN 2019 AND 2023
    GROUP BY state
  ),
  combined_volume AS (
    SELECT
      COALESCE(f.state, b.state) AS state,
      COALESCE(f.total_fatalities, 0) + COALESCE(b.total_deaths, 0) AS total_incidents
    FROM fatality_totals f
    FULL OUTER JOIN boating_totals b ON f.state = b.state
    WHERE COALESCE(f.total_fatalities, 0) + COALESCE(b.total_deaths, 0) > 0
  ),
  max_vol AS (
    SELECT MAX(total_incidents) AS max_incidents FROM combined_volume
  ),
  trend_data AS (
    SELECT
      state,
      SUM(CASE WHEN year = 2023 THEN fatalities ELSE 0 END)::numeric AS y2023,
      SUM(CASE WHEN year = 2022 THEN fatalities ELSE 0 END)::numeric AS y2022
    FROM public.fars_fatalities
    GROUP BY state
  ),
  volume_scored AS (
    SELECT
      cv.state,
      cv.total_incidents,
      CASE
        WHEN cv.total_incidents > 0 AND mv.max_incidents > 0
        THEN LEAST(100, ROUND((LN(cv.total_incidents + 1.0) / LN(mv.max_incidents + 1.0) * 100)::numeric, 1))
        ELSE 0
      END AS volume_score
    FROM combined_volume cv, max_vol mv
  ),
  trend_scored AS (
    SELECT
      state,
      CASE
        WHEN y2022 > 0 THEN ROUND(((y2023 - y2022) / y2022 * 100)::numeric, 1)
        ELSE 0
      END AS trend_pct,
      CASE
        WHEN y2022 > 0 THEN LEAST(100, GREATEST(0, ROUND((50 + ((y2023 - y2022) / y2022 * 100) * 2.5)::numeric, 1)))
        ELSE 50
      END AS trend_score
    FROM trend_data
  ),
  combined AS (
    SELECT
      vs.state,
      vs.total_incidents,
      vs.volume_score,
      COALESCE(ts.trend_pct, 0) AS trend_pct,
      COALESCE(ts.trend_score, 50) AS trend_score,
      COALESCE(p.composite_score, 50) AS pi_score,
      p.negligence_rule
    FROM volume_scored vs
    LEFT JOIN trend_scored ts ON vs.state = ts.state
    LEFT JOIN public.pi_viability_scores p ON vs.state = p.state
  )
SELECT
  state,
  ROUND((pi_score * 0.40 + volume_score * 0.35 + trend_score * 0.25)::numeric, 1) AS opportunity_score,
  pi_score AS pi_viability_score,
  total_incidents,
  trend_pct AS incident_trend_pct,
  negligence_rule,
  DENSE_RANK() OVER (ORDER BY ROUND((pi_score * 0.40 + volume_score * 0.35 + trend_score * 0.25)::numeric, 1) DESC) AS composite_rank
FROM combined
ORDER BY opportunity_score DESC;
$$;
