-- ============================================================================
-- TORT COST BENCHMARKS
-- Stores CPL, CPA, conversion rates, and settlement data per tort.
-- Supports multiple "tiers" per tort (broad vs narrow criteria) and
-- time-series snapshots so we can track how pricing evolves.
-- ============================================================================

-- ── Benchmark table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tort_cost_benchmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to mass_torts; nullable for torts not yet in the main table
  mass_tort_id    uuid REFERENCES public.mass_torts(id) ON DELETE SET NULL,

  -- Human-readable tort name (always populated even if FK is null)
  tort_name       text NOT NULL,

  -- ── Criteria tier ──────────────────────────────────────────────────────
  -- "broad"  = minimal qualification (e.g. product used, diagnosis present)
  -- "narrow" = strict qualification (specific injury + timeframe + geography)
  -- "vendor_avg" = third-party vendor quoted price (blended criteria)
  criteria_tier   text NOT NULL DEFAULT 'vendor_avg'
                  CHECK (criteria_tier IN ('broad', 'narrow', 'vendor_avg')),

  -- ── Cost metrics ───────────────────────────────────────────────────────
  cpl_low         numeric(10,2),  -- cost per lead, low end
  cpl_high        numeric(10,2),  -- cost per lead, high end
  cpa_low         numeric(10,2),  -- cost per signed retainer, low end
  cpa_high        numeric(10,2),  -- cost per signed retainer, high end
  cpk_low         numeric(10,2),  -- cost per kept case (post-attrition), low end
  cpk_high        numeric(10,2),  -- cost per kept case (post-attrition), high end

  -- ── Conversion & attrition ─────────────────────────────────────────────
  lead_to_retainer_pct  numeric(5,2), -- e.g. 50.00 = 50%
  attrition_pct         numeric(5,2), -- e.g. 30.00 = 30% of signed cases drop

  -- ── Settlement context (for ROI modeling) ──────────────────────────────
  settlement_low        numeric(12,2),
  settlement_high       numeric(12,2),
  settlement_avg        numeric(12,2),

  -- ── Lifecycle phase at time of measurement ─────────────────────────────
  lifecycle_phase text CHECK (lifecycle_phase IN (
    'emerging', 'buzzy', 'mdl_stage', 'late', 'closed'
  )),

  -- ── Temporal tracking ──────────────────────────────────────────────────
  -- When was this pricing observed? Enables time-series of cost evolution.
  observed_date   date NOT NULL DEFAULT CURRENT_DATE,

  -- ── Source attribution ─────────────────────────────────────────────────
  source_name     text,           -- e.g. 'Whitehardt', 'Blue Sky Legal', 'LIC'
  source_url      text,
  source_notes    text,

  -- ── Housekeeping ───────────────────────────────────────────────────────
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Prevent exact duplicate entries
  UNIQUE (tort_name, criteria_tier, observed_date, source_name)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tcb_mass_tort_id ON public.tort_cost_benchmarks (mass_tort_id);
CREATE INDEX IF NOT EXISTS idx_tcb_tort_name ON public.tort_cost_benchmarks (tort_name);
CREATE INDEX IF NOT EXISTS idx_tcb_observed_date ON public.tort_cost_benchmarks (observed_date DESC);
CREATE INDEX IF NOT EXISTS idx_tcb_lifecycle ON public.tort_cost_benchmarks (lifecycle_phase);
CREATE INDEX IF NOT EXISTS idx_tcb_criteria ON public.tort_cost_benchmarks (criteria_tier);

COMMENT ON TABLE public.tort_cost_benchmarks
  IS 'Industry benchmark CPL/CPA/CPK data per tort, with criteria tier and temporal tracking for cost modeling';

-- ── Lifecycle phase reference (for the channel planner CPA estimator) ────

CREATE TABLE IF NOT EXISTS public.tort_lifecycle_cpa_ranges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lifecycle_phase text NOT NULL UNIQUE
                  CHECK (lifecycle_phase IN ('emerging', 'buzzy', 'mdl_stage', 'late', 'closed')),
  label           text NOT NULL,
  description     text,
  cpa_low         numeric(10,2) NOT NULL,
  cpa_high        numeric(10,2) NOT NULL,
  source_name     text,
  source_url      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tort_lifecycle_cpa_ranges
  IS 'Reference table mapping tort lifecycle phases to expected CPA ranges (Blue Sky Legal framework)';

-- Seed lifecycle CPA ranges (Blue Sky Legal, May 2025)
INSERT INTO public.tort_lifecycle_cpa_ranges (lifecycle_phase, label, description, cpa_low, cpa_high, source_name, source_url) VALUES
  ('emerging',  'Emerging',  'Pre-MDL, low awareness, low competition',                     300,  1800, 'Blue Sky Legal', 'https://blueskylegal.com/how-to-estimate-cpa-in-mass-tort-population-filters-competition-and-channel-strategy/'),
  ('buzzy',     'Buzzy',     'Media spike, rising interest, more firms entering',           2000,  4000, 'Blue Sky Legal', 'https://blueskylegal.com/how-to-estimate-cpa-in-mass-tort-population-filters-competition-and-channel-strategy/'),
  ('mdl_stage', 'MDL Stage', 'Established science, filters tighten, firms competing hard',  3500,  5500, 'Blue Sky Legal', 'https://blueskylegal.com/how-to-estimate-cpa-in-mass-tort-population-filters-competition-and-channel-strategy/'),
  ('late',      'Late',      'Claim saturation, statute nearing, limited signing window',   5500,  6500, 'Blue Sky Legal', 'https://blueskylegal.com/how-to-estimate-cpa-in-mass-tort-population-filters-competition-and-channel-strategy/'),
  ('closed',    'Closed',    'Litigation concluded or settlements finalized',                  0,     0, NULL, NULL)
ON CONFLICT (lifecycle_phase) DO NOTHING;


-- ── Seed initial benchmark data ──────────────────────────────────────────

-- Whitehardt (March 2026) - vendor_avg tier
INSERT INTO public.tort_cost_benchmarks (tort_name, criteria_tier, cpl_low, cpl_high, cpa_low, cpa_high, cpk_low, cpk_high, lead_to_retainer_pct, lifecycle_phase, observed_date, source_name, source_url) VALUES
  ('Roundup',                'vendor_avg', 743,  743,  1238, 1238, 1513, 1513, 60.00, 'late',      '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Talcum Powder',          'vendor_avg', 470,  470,  940,  940,  1215, 1215, 50.00, 'late',      '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('AFFF',                   'vendor_avg', 1750, 1750, 3500, 3500, 3775, 3775, 50.00, 'mdl_stage', '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Hair Relaxers',          'vendor_avg', 430,  430,  717,  717,  992,  992,  60.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Bard PowerPort',         'vendor_avg', 500,  500,  1000, 1000, 1275, 1275, 50.00, 'mdl_stage', '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Ozempic / GLP-1',        'vendor_avg', 68,   347,  91,   463,  366,  738,  75.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Depo-Provera',           'vendor_avg', 3050, 3050, 5169, 5169, 5444, 5444, 59.00, 'buzzy',    '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Paraquat',               'vendor_avg', 320,  320,  711,  711,  986,  986,  45.00, 'late',      '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Acetaminophen',          'vendor_avg', 87,   87,   174,  174,  449,  449,  50.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Social Media Harm',      'vendor_avg', 389,  389,  778,  778,  1053, 1053, 50.00, 'mdl_stage', '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Suboxone',               'vendor_avg', 11,   11,   22,   22,   297,  297,  50.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Ultra Processed Foods',  'vendor_avg', 1100, 1100, 2200, 2200, 2475, 2475, 50.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('PFAS',                   'vendor_avg', 1285, 1285, 2856, 2856, 3131, 3131, 45.00, 'mdl_stage', '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Cartiva',                'vendor_avg', 367,  367,  734,  734,  1009, 1009, 50.00, 'mdl_stage', '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Oxbryta',                'vendor_avg', 599,  599,  1198, 1198, 1473, 1473, 50.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('BioZorb',                'vendor_avg', 997,  997,  1994, 1994, 2269, 2269, 50.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/'),
  ('Gaming',                 'vendor_avg', 169,  169,  376,  376,  651,  651,  45.00, 'emerging',  '2026-03-18', 'Whitehardt', 'https://whitehardt.com/national/')
ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;

-- LIC (May 2024) - vendor_avg tier (has both CPL and CPA)
INSERT INTO public.tort_cost_benchmarks (tort_name, criteria_tier, cpl_low, cpl_high, cpa_low, cpa_high, lifecycle_phase, observed_date, source_name, source_url) VALUES
  ('Roundup',                'vendor_avg', 265,  375,  2650, 3300, 'late',      '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Talcum Powder',          'vendor_avg', 360,  440,  2600, 3400, 'late',      '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('AFFF',                   'vendor_avg', 260,  340,  1900, 2400, 'mdl_stage', '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Hair Relaxers',          'vendor_avg', 225,  325,  1600, 2400, 'emerging',  '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Baby Formula NEC',       'vendor_avg', 550,  650,  4800, 5400, 'mdl_stage', '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Hernia Mesh',            'vendor_avg', 190,  220,  1350, 1650, 'late',      '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Bard PowerPort',         'vendor_avg', 115,  135,  750,  1000, 'mdl_stage', '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Ozempic / GLP-1',        'vendor_avg', 35,   65,   350,  750,  'emerging',  '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('CPAP',                   'vendor_avg', 125,  175,  1000, 1200, 'late',      '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html'),
  ('Zantac',                 'vendor_avg', 150,  250,  900,  1300, 'late',      '2024-05-01', 'Lawsuit Information Center', 'https://www.lawsuit-information-center.com/mass-tort-leads.html')
ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;

-- Taqtics (Feb 2026) - vendor_avg with attrition and settlement data
INSERT INTO public.tort_cost_benchmarks (tort_name, criteria_tier, cpa_low, cpa_high, attrition_pct, settlement_low, settlement_high, lifecycle_phase, observed_date, source_name, source_url) VALUES
  ('Hair Relaxers',      'vendor_avg', 4500, 4500, 30.00, 75000,  125000, 'emerging',  '2026-02-01', 'Taqtics', 'https://taqtics.com/answers/mass-tort-advertising/emerging-mass-torts/'),
  ('AFFF',               'vendor_avg', 3000, 3000, 25.00, 75000,  175000, 'mdl_stage', '2026-02-01', 'Taqtics', 'https://taqtics.com/answers/mass-tort-advertising/emerging-mass-torts/'),
  ('Baby Formula NEC',   'vendor_avg', 4000, 4000, 30.00, 100000, 300000, 'mdl_stage', '2026-02-01', 'Taqtics', 'https://taqtics.com/answers/mass-tort-advertising/emerging-mass-torts/'),
  ('Acetaminophen',      'vendor_avg', 2550, 2550, 30.00, 60000,  90000,  'emerging',  '2026-02-01', 'Taqtics', 'https://taqtics.com/answers/mass-tort-advertising/emerging-mass-torts/'),
  ('Paraquat',           'vendor_avg', 9950, 9950, 30.00, 105000, 250000, 'late',      '2026-02-01', 'Taqtics', 'https://taqtics.com/answers/mass-tort-advertising/emerging-mass-torts/')
ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;


-- ── RPC: Get latest benchmarks per tort ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_tort_cost_benchmarks(
  p_tort_name text DEFAULT NULL,
  p_criteria_tier text DEFAULT NULL
)
RETURNS TABLE (
  tort_name         text,
  criteria_tier     text,
  cpl_low           numeric,
  cpl_high          numeric,
  cpa_low           numeric,
  cpa_high          numeric,
  cpk_low           numeric,
  cpk_high          numeric,
  lead_to_retainer_pct numeric,
  attrition_pct     numeric,
  settlement_low    numeric,
  settlement_high   numeric,
  settlement_avg    numeric,
  lifecycle_phase   text,
  observed_date     date,
  source_name       text,
  source_url        text
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (b.tort_name, b.criteria_tier)
    b.tort_name,
    b.criteria_tier,
    b.cpl_low,
    b.cpl_high,
    b.cpa_low,
    b.cpa_high,
    b.cpk_low,
    b.cpk_high,
    b.lead_to_retainer_pct,
    b.attrition_pct,
    b.settlement_low,
    b.settlement_high,
    b.settlement_avg,
    b.lifecycle_phase,
    b.observed_date,
    b.source_name,
    b.source_url
  FROM public.tort_cost_benchmarks b
  WHERE (p_tort_name IS NULL OR b.tort_name ILIKE '%' || p_tort_name || '%')
    AND (p_criteria_tier IS NULL OR b.criteria_tier = p_criteria_tier)
  ORDER BY b.tort_name, b.criteria_tier, b.observed_date DESC
$$;

COMMENT ON FUNCTION public.get_tort_cost_benchmarks
  IS 'Returns the latest benchmark row per tort+criteria_tier combo. Optionally filter by tort name and criteria tier.';


-- ── RPC: Estimate CPA for a tort with criteria adjustments ───────────────

CREATE OR REPLACE FUNCTION public.estimate_tort_cpa(
  p_tort_name text,
  p_lifecycle_phase text DEFAULT NULL,
  p_criteria_breadth text DEFAULT 'medium',  -- 'broad', 'medium', 'narrow'
  p_geo_scope text DEFAULT 'national'         -- 'national', 'regional', 'state_limited'
)
RETURNS TABLE (
  tort_name           text,
  base_cpa_low        numeric,
  base_cpa_high       numeric,
  criteria_multiplier numeric,
  geo_multiplier      numeric,
  estimated_cpa_low   numeric,
  estimated_cpa_high  numeric,
  lifecycle_phase     text,
  confidence          text
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_cpa_low   numeric;
  v_cpa_high  numeric;
  v_phase     text;
  v_criteria_mult numeric;
  v_geo_mult  numeric;
  v_confidence text := 'medium';
BEGIN
  -- Step 1: Get base CPA from tort-specific benchmarks (latest)
  SELECT b.cpa_low, b.cpa_high, COALESCE(p_lifecycle_phase, b.lifecycle_phase)
  INTO v_cpa_low, v_cpa_high, v_phase
  FROM public.tort_cost_benchmarks b
  WHERE b.tort_name ILIKE '%' || p_tort_name || '%'
    AND b.cpa_low IS NOT NULL
  ORDER BY b.observed_date DESC
  LIMIT 1;

  -- Step 2: If no tort-specific data, fall back to lifecycle phase ranges
  IF v_cpa_low IS NULL AND p_lifecycle_phase IS NOT NULL THEN
    SELECT lc.cpa_low, lc.cpa_high, lc.lifecycle_phase
    INTO v_cpa_low, v_cpa_high, v_phase
    FROM public.tort_lifecycle_cpa_ranges lc
    WHERE lc.lifecycle_phase = p_lifecycle_phase;
    v_confidence := 'low';
  END IF;

  -- Step 3: If still nothing, return generic range
  IF v_cpa_low IS NULL THEN
    v_cpa_low := 500;
    v_cpa_high := 3000;
    v_phase := 'unknown';
    v_confidence := 'very_low';
  END IF;

  -- Step 4: Apply criteria breadth multiplier
  v_criteria_mult := CASE p_criteria_breadth
    WHEN 'broad'  THEN 0.70   -- broad criteria = ~30% cheaper
    WHEN 'medium' THEN 1.00
    WHEN 'narrow' THEN 1.80   -- narrow criteria = ~80% more expensive
    ELSE 1.00
  END;

  -- Step 5: Apply geographic scope multiplier
  v_geo_mult := CASE p_geo_scope
    WHEN 'national'      THEN 1.00
    WHEN 'regional'      THEN 1.30  -- regional targeting adds ~30%
    WHEN 'state_limited' THEN 2.00  -- 4-state or fewer can double CPA
    ELSE 1.00
  END;

  RETURN QUERY SELECT
    p_tort_name,
    v_cpa_low,
    v_cpa_high,
    v_criteria_mult,
    v_geo_mult,
    ROUND(v_cpa_low * v_criteria_mult * v_geo_mult, 2),
    ROUND(v_cpa_high * v_criteria_mult * v_geo_mult, 2),
    v_phase,
    v_confidence;
END;
$$;

COMMENT ON FUNCTION public.estimate_tort_cpa
  IS 'Estimates CPA range for a tort adjusted by criteria breadth and geographic scope. Uses benchmark data with lifecycle phase fallback.';
