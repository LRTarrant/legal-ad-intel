-- =============================================================================
-- Generalize the FAERS signal RPCs (tort-agnostic)
-- =============================================================================
-- WHY THIS EXISTS
--   Migration 20260521000000 shipped two FAERS signal RPCs named for the
--   GLP-1 tort pages (faers_glp1_drug_breakdown / faers_glp1_monthly_trend).
--   Their parameters were already general (p_brand_map jsonb, p_reaction_pts
--   text[]) -- nothing about them is GLP-1-specific. PR-5 adds a Depo-Provera
--   tort page that needs the same two signals, so the functions are renamed
--   to make their reusability explicit:
--
--     faers_glp1_drug_breakdown -> faers_drug_breakdown_by_reactions
--     faers_glp1_monthly_trend  -> faers_monthly_trend_by_reactions
--
--   New torts call these directly with their own brand map + MedDRA term
--   list. No per-tort RPC duplication.
--
-- ONE BEHAVIOURAL CHANGE
--   faers_drug_breakdown_by_reactions returns an additional column,
--   lawyer_reports = COUNT FILTER (primarysource_qualification = 4), alongside
--   the existing consumer_reports (= 5). The "consumer-report concentration"
--   signal is a lawyer-flood proxy that works for pre-MDL torts (claimant
--   intake routes through manufacturers, stays tagged consumer). For a mature
--   MDL such as Depo-Provera meningioma (MDL 3140), plaintiff firms file FAERS
--   reports DIRECTLY as qualification = 4 (lawyer): 95% lawyer-sourced vs a
--   0.73% dataset baseline. The breakdown therefore returns both counts so the
--   caller can surface whichever qualification is the litigation signal for
--   its tort. See web/lib/queries/faers-shared.ts (ConcentrationMode).
--
-- SECURITY / QUERY PLAN
--   Unchanged from 20260521000000: STABLE SECURITY INVOKER, executes with the
--   caller's privileges; exact medicinalproduct / reactionmeddrapt matching
--   served by the existing btree indexes; substring ILIKE deliberately avoided.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- faers_drug_breakdown_by_reactions
--   Per brand: total qualifying events, serious-death / serious-hospitalization
--   counts, consumer-report (qual 5) count, lawyer-report (qual 4) count,
--   latest receivedate, and the top 5 reaction preferred terms by frequency.
--
--   p_brand_map    jsonb  -- { "Depo-Provera": ["DEPO-PROVERA"], ... }
--   p_reaction_pts text[] -- exact MedDRA preferred terms defining the injury
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faers_drug_breakdown_by_reactions(
  p_brand_map jsonb,
  p_reaction_pts text[]
)
RETURNS TABLE (
  brand            text,
  total_events     bigint,
  deaths           bigint,
  hospitalizations bigint,
  consumer_reports bigint,
  lawyer_reports   bigint,
  max_receivedate  date,
  top_reactions    jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH brands AS (
    SELECT key AS brand,
           ARRAY(SELECT jsonb_array_elements_text(value)) AS products
    FROM jsonb_each(p_brand_map)
  ),
  -- Events that carry at least one qualifying injury reaction.
  react_events AS (
    SELECT DISTINCT report_id AS event_id
    FROM drug_adverse_event_reactions
    WHERE reactionmeddrapt = ANY(p_reaction_pts)
  ),
  -- (brand, event) pairs: event names the brand AND carries the injury.
  brand_events AS (
    SELECT DISTINCT b.brand, d.report_id AS event_id
    FROM brands b
    JOIN drug_adverse_event_drugs d
      ON d.medicinalproduct = ANY(b.products)
    JOIN react_events re
      ON re.event_id = d.report_id
  ),
  agg AS (
    SELECT be.brand,
           COUNT(*)                                                     AS total_events,
           COUNT(*) FILTER (WHERE e.seriousness_death)                   AS deaths,
           COUNT(*) FILTER (WHERE e.seriousness_hospitalization)         AS hospitalizations,
           COUNT(*) FILTER (WHERE e.primarysource_qualification = 5)     AS consumer_reports,
           COUNT(*) FILTER (WHERE e.primarysource_qualification = 4)     AS lawyer_reports,
           MAX(e.receivedate)                                           AS max_receivedate
    FROM brand_events be
    JOIN drug_adverse_events e ON e.id = be.event_id
    GROUP BY be.brand
  ),
  rx AS (
    SELECT be.brand,
           r.reactionmeddrapt                AS pt,
           COUNT(DISTINCT r.report_id)       AS cnt
    FROM brand_events be
    JOIN drug_adverse_event_reactions r ON r.report_id = be.event_id
    WHERE r.reactionmeddrapt = ANY(p_reaction_pts)
    GROUP BY be.brand, r.reactionmeddrapt
  ),
  rx_ranked AS (
    SELECT brand, pt, cnt,
           ROW_NUMBER() OVER (PARTITION BY brand ORDER BY cnt DESC, pt) AS rn
    FROM rx
  ),
  rx_top AS (
    SELECT brand,
           jsonb_agg(
             jsonb_build_object('pt', pt, 'count', cnt)
             ORDER BY cnt DESC, pt
           ) AS top_reactions
    FROM rx_ranked
    WHERE rn <= 5
    GROUP BY brand
  )
  SELECT b.brand,
         COALESCE(a.total_events, 0)::bigint,
         COALESCE(a.deaths, 0)::bigint,
         COALESCE(a.hospitalizations, 0)::bigint,
         COALESCE(a.consumer_reports, 0)::bigint,
         COALESCE(a.lawyer_reports, 0)::bigint,
         a.max_receivedate,
         COALESCE(t.top_reactions, '[]'::jsonb)
  FROM brands b
  LEFT JOIN agg   a ON a.brand = b.brand
  LEFT JOIN rx_top t ON t.brand = b.brand
  ORDER BY b.brand;
$$;

COMMENT ON FUNCTION public.faers_drug_breakdown_by_reactions(jsonb, text[]) IS
  'Per-brand FAERS adverse-event breakdown for tort pages: total events, '
  'serious-death / hospitalization counts, consumer-report (qual 5) and '
  'lawyer-report (qual 4) counts, latest receivedate, top-5 reaction preferred '
  'terms. STABLE SECURITY INVOKER read-only query helper. Tort-agnostic '
  'successor to faers_glp1_drug_breakdown. See migration 20260521120000.';

-- -----------------------------------------------------------------------------
-- faers_monthly_trend_by_reactions
--   Per brand, per month: count of qualifying events. The month window is
--   derived from whatever data is present (no hard-coded date range).
--
--   p_brand_map    jsonb  -- same shape as faers_drug_breakdown_by_reactions
--   p_reaction_pts text[] -- exact MedDRA preferred terms defining the injury
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faers_monthly_trend_by_reactions(
  p_brand_map jsonb,
  p_reaction_pts text[]
)
RETURNS TABLE (
  brand       text,
  month       date,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH brands AS (
    SELECT key AS brand,
           ARRAY(SELECT jsonb_array_elements_text(value)) AS products
    FROM jsonb_each(p_brand_map)
  ),
  react_events AS (
    SELECT DISTINCT report_id AS event_id
    FROM drug_adverse_event_reactions
    WHERE reactionmeddrapt = ANY(p_reaction_pts)
  ),
  brand_events AS (
    SELECT DISTINCT b.brand, d.report_id AS event_id
    FROM brands b
    JOIN drug_adverse_event_drugs d
      ON d.medicinalproduct = ANY(b.products)
    JOIN react_events re
      ON re.event_id = d.report_id
  )
  SELECT be.brand,
         date_trunc('month', e.receivedate)::date AS month,
         COUNT(*)::bigint                         AS event_count
  FROM brand_events be
  JOIN drug_adverse_events e ON e.id = be.event_id
  WHERE e.receivedate IS NOT NULL
  GROUP BY be.brand, date_trunc('month', e.receivedate)
  ORDER BY be.brand, month;
$$;

COMMENT ON FUNCTION public.faers_monthly_trend_by_reactions(jsonb, text[]) IS
  'Per-brand, per-month FAERS qualifying-event counts for tort-page trend '
  'sparklines. Month window derived from the data. STABLE SECURITY INVOKER '
  'read-only query helper. Tort-agnostic successor to faers_glp1_monthly_trend. '
  'See migration 20260521120000.';

-- -----------------------------------------------------------------------------
-- Grants: the tort pages call these via the public anon key.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.faers_drug_breakdown_by_reactions(jsonb, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.faers_monthly_trend_by_reactions(jsonb, text[])  TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Drop the GLP-1-named predecessors (20260521000000). The web code in this PR
-- calls the renamed functions; getFaers*Signals degrades gracefully if a brief
-- deploy-skew window leaves the old names referenced.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.faers_glp1_drug_breakdown(jsonb, text[]);
DROP FUNCTION IF EXISTS public.faers_glp1_monthly_trend(jsonb, text[]);
