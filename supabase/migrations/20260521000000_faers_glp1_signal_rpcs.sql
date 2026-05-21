-- =============================================================================
-- FAERS GLP-1 signal RPCs
-- =============================================================================
-- WHY THESE EXIST
--   The GLP-1 tort pages need three live signals over the FAERS dataset
--   (drug_adverse_events ~1.58M rows, drug_adverse_event_drugs ~8.16M rows,
--   drug_adverse_event_reactions ~5.57M rows). Every signal requires a
--   GROUP BY across the three-way join. PostgREST cannot express aggregation
--   over joined relations, so the work must run inside the database. These are
--   query helpers, NOT data transformations: they read, aggregate, and return.
--
-- SECURITY
--   Both functions are STABLE SECURITY INVOKER. They execute with the caller's
--   privileges (the `anon` role for these public marketing pages) -- there is
--   no privilege escalation. The three FAERS tables already have SELECT granted
--   to `anon`/`authenticated` and RLS disabled, so an invoker-rights function
--   reads them exactly as a direct PostgREST select would. EXECUTE is granted
--   to `anon`/`authenticated` so the pages can call them via supabase.rpc().
--
-- EXPECTED QUERY PLAN
--   Drug matching uses exact `medicinalproduct = ANY(...)`, which is served by
--   the existing btree index `idx_drug_adverse_event_drugs_medicinalproduct`.
--   Reaction filtering uses exact `reactionmeddrapt = ANY(...)`, served by
--   `idx_drug_adverse_event_reactions_pt`. Substring ILIKE is deliberately
--   avoided -- a full-table ILIKE scan over 8.16M drug rows exceeds the 8s
--   statement timeout. Brand -> medicinalproduct string mapping and the MedDRA
--   preferred-term lists are passed in by the caller (hard-coded constants in
--   web/lib/queries/faers-glp1.ts).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- faers_glp1_drug_breakdown
--   Per brand: total qualifying events, serious-death / serious-hospitalization
--   counts, consumer-report count, latest receivedate, and the top 5 reaction
--   preferred terms by event frequency.
--
--   p_brand_map    jsonb  -- { "Ozempic": ["OZEMPIC"], "Wegovy": ["WEGOVY"], ... }
--   p_reaction_pts text[] -- exact MedDRA preferred terms defining the injury
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faers_glp1_drug_breakdown(
  p_brand_map jsonb,
  p_reaction_pts text[]
)
RETURNS TABLE (
  brand            text,
  total_events     bigint,
  deaths           bigint,
  hospitalizations bigint,
  consumer_reports bigint,
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
         a.max_receivedate,
         COALESCE(t.top_reactions, '[]'::jsonb)
  FROM brands b
  LEFT JOIN agg   a ON a.brand = b.brand
  LEFT JOIN rx_top t ON t.brand = b.brand
  ORDER BY b.brand;
$$;

COMMENT ON FUNCTION public.faers_glp1_drug_breakdown(jsonb, text[]) IS
  'Per-brand FAERS adverse-event breakdown for GLP-1 tort pages: total events, '
  'serious-death / hospitalization counts, consumer-report count, latest '
  'receivedate, top-5 reaction preferred terms. STABLE SECURITY INVOKER read-only '
  'query helper. See migration 20260521000000.';

-- -----------------------------------------------------------------------------
-- faers_glp1_monthly_trend
--   Per brand, per month: count of qualifying events. The month window is
--   derived from whatever data is present (no hard-coded date range).
--
--   p_brand_map    jsonb  -- same shape as faers_glp1_drug_breakdown
--   p_reaction_pts text[] -- exact MedDRA preferred terms defining the injury
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.faers_glp1_monthly_trend(
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

COMMENT ON FUNCTION public.faers_glp1_monthly_trend(jsonb, text[]) IS
  'Per-brand, per-month FAERS qualifying-event counts for GLP-1 tort-page trend '
  'sparklines. Month window derived from the data. STABLE SECURITY INVOKER '
  'read-only query helper. See migration 20260521000000.';

-- -----------------------------------------------------------------------------
-- Grants: the GLP-1 tort pages call these via the public anon key.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.faers_glp1_drug_breakdown(jsonb, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.faers_glp1_monthly_trend(jsonb, text[])  TO anon, authenticated;
