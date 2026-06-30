-- ============================================================================
-- PI AD ECONOMICS (Strategy Engine economics layer, v1)
-- Per (case_type x market_tier) advertising-funnel benchmarks for the PI flow:
-- CPC range, click-to-lead + lead-to-signed conversion presets, case value, and
-- contingency, each carrying per-metric provenance (source + confidence).
--
-- Mirrors the SHAPE of public.tort_cost_benchmarks (range columns + provenance +
-- a read RPC), but the FUNNEL MATH lives in TypeScript (lib/strategy-engine/
-- economics.ts), not in this RPC: the Strategy deck recomputes the funnel live
-- as the user moves the two intake levers, and a later target-CPA/gap feature
-- needs the individual stages. So this table/RPC only supply the inputs.
--
-- Unlike tort_cost_benchmarks (which has no RLS), this table ENABLES RLS with a
-- read-only public policy: it is non-sensitive reference data, but a no-RLS
-- table trips the Supabase advisor and the repo migration-reviewer.
--
-- Seed = sourced research pass, 2026-06-30. tier_2 CPC = ~0.7x tier_1,
-- small = ~0.45x tier_1 (≈3-4x spread tier_1 vs small). Conversion presets are
-- firm-intake-quality (universal across case types); lead-to-signed is the
-- softest input (only MyCase 17.6% is a real dataset) and carries the lowest
-- confidence + an intake-dependent caveat.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pi_ad_economics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Grain ──────────────────────────────────────────────────────────────
  case_type     text NOT NULL
                CHECK (case_type IN ('auto', 'trucking', 'motorcycle')),
  market_tier   text NOT NULL
                CHECK (market_tier IN ('tier_1', 'tier_2', 'small')),

  -- ── CPC (keyword-level litigation CPC, NOT the ~$9 category median) ──────
  cpc_low       numeric(10,2) NOT NULL,
  cpc_typical   numeric(10,2) NOT NULL,
  cpc_high      numeric(10,2) NOT NULL,

  -- ── Conversion presets (firm intake quality; the two v1 levers) ─────────
  -- Stored as the 3 toggle positions; the funnel module picks one per lever.
  click_to_lead_weak       numeric(5,2) NOT NULL,  -- e.g. 5.00 = 5%
  click_to_lead_competent  numeric(5,2) NOT NULL,  -- default (typical)
  click_to_lead_strong     numeric(5,2) NOT NULL,
  lead_to_signed_poor      numeric(5,2) NOT NULL,
  lead_to_signed_average   numeric(5,2) NOT NULL,  -- default (typical)
  lead_to_signed_elite     numeric(5,2) NOT NULL,

  -- ── Case value + fee (for the fee-per-case ROI context) ─────────────────
  case_value_median        numeric(12,2),
  case_value_tail          numeric(12,2),          -- catastrophic tail, NOT the average
  case_value_tail_note     text,
  contingency_presuit_pct  numeric(5,2) NOT NULL DEFAULT 33.00,
  contingency_litigated_pct numeric(5,2) NOT NULL DEFAULT 40.00,

  -- ── Per-metric provenance (so the UI can source every number) ───────────
  cpc_source               text,
  cpc_confidence           text CHECK (cpc_confidence IN ('high','medium','low','very_low')),
  conversion_source        text,
  click_to_lead_confidence text CHECK (click_to_lead_confidence IN ('high','medium','low','very_low')),
  lead_to_signed_confidence text CHECK (lead_to_signed_confidence IN ('high','medium','low','very_low')),
  case_value_source        text,
  case_value_confidence    text CHECK (case_value_confidence IN ('high','medium','low','very_low')),
  reported_vs_estimate     text CHECK (reported_vs_estimate IN ('reported','estimate','blended')),
  source_notes             text,

  observed_date timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (case_type, market_tier, observed_date)
);

CREATE INDEX IF NOT EXISTS idx_pi_econ_case_tier
  ON public.pi_ad_economics (case_type, market_tier);
CREATE INDEX IF NOT EXISTS idx_pi_econ_observed
  ON public.pi_ad_economics (observed_date DESC);

COMMENT ON TABLE public.pi_ad_economics
  IS 'PI advertising funnel benchmarks per case_type x market_tier (CPC, conversion presets, case value) with per-metric provenance. Funnel math lives in lib/strategy-engine/economics.ts, not in SQL.';

-- ── RLS: read-only public reference data ─────────────────────────────────
ALTER TABLE public.pi_ad_economics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pi_ad_economics read" ON public.pi_ad_economics;
CREATE POLICY "pi_ad_economics read"
  ON public.pi_ad_economics
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.pi_ad_economics TO anon, authenticated;

-- ── Seed (sourced research pass, 2026-06-30) ─────────────────────────────
-- CPC: tier_2 ≈ 0.7x tier_1, small ≈ 0.45x tier_1.
-- Conversion presets universal: click-to-lead 5/8/25, lead-to-signed 4/10/20.
INSERT INTO public.pi_ad_economics (
  case_type, market_tier,
  cpc_low, cpc_typical, cpc_high,
  click_to_lead_weak, click_to_lead_competent, click_to_lead_strong,
  lead_to_signed_poor, lead_to_signed_average, lead_to_signed_elite,
  case_value_median, case_value_tail, case_value_tail_note,
  contingency_presuit_pct, contingency_litigated_pct,
  cpc_source, cpc_confidence,
  conversion_source, click_to_lead_confidence, lead_to_signed_confidence,
  case_value_source, case_value_confidence, reported_vs_estimate,
  source_notes, observed_date
) VALUES
  -- ── AUTO (motor vehicle) — median case value $8,200, fee ~$2,700 ────────
  ('auto', 'tier_1',  75, 150, 300,  5,8,25, 4,10,20,
   8200, NULL, NULL, 33, 40,
   'Keyword-level PPC benchmarks, litigation auto-accident terms', 'medium',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed 17.6% real dataset)', 'medium', 'low',
   'Industry auto-accident case-value reporting', 'medium', 'blended',
   'CPC is keyword-level, not the ~$9 category median. Lead-to-signed is intake-dependent.', '2026-06-30'),
  ('auto', 'tier_2',  53, 105, 210,  5,8,25, 4,10,20,
   8200, NULL, NULL, 33, 40,
   'tier_1 CPC x ~0.7 (tier_2 market)', 'low',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Industry auto-accident case-value reporting', 'medium', 'blended',
   'tier_2 CPC estimated from tier_1. Lead-to-signed is intake-dependent.', '2026-06-30'),
  ('auto', 'small',   34,  68, 135,  5,8,25, 4,10,20,
   8200, NULL, NULL, 33, 40,
   'tier_1 CPC x ~0.45 (small market)', 'low',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Industry auto-accident case-value reporting', 'medium', 'blended',
   'small-market CPC estimated from tier_1. Lead-to-signed is intake-dependent.', '2026-06-30'),

  -- ── TRUCKING — high case value; catastrophic tail labeled, NOT average ──
  ('trucking', 'tier_1', 100, 200, 660,  5,8,25, 4,10,20,
   100000, 10000000, 'verdicts ≥$10M only — NOT the average case', 33, 40,
   'Keyword-level PPC benchmarks, semi/18-wheeler terms (high end = semi keywords)', 'medium',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Estimated trucking settlement median', 'low', 'estimate',
   'no clean public trucking median; estimated above auto floor and below catastrophic tail. Lead-to-signed is intake-dependent.', '2026-06-30'),
  ('trucking', 'tier_2',  70, 140, 462,  5,8,25, 4,10,20,
   100000, 10000000, 'verdicts ≥$10M only — NOT the average case', 33, 40,
   'tier_1 CPC x ~0.7 (tier_2 market)', 'low',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Estimated trucking settlement median', 'low', 'estimate',
   'no clean public trucking median; estimated above auto floor and below catastrophic tail. tier_2 CPC estimated from tier_1.', '2026-06-30'),
  ('trucking', 'small',   45,  90, 297,  5,8,25, 4,10,20,
   100000, 10000000, 'verdicts ≥$10M only — NOT the average case', 33, 40,
   'tier_1 CPC x ~0.45 (small market)', 'low',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Estimated trucking settlement median', 'low', 'estimate',
   'no clean public trucking median; estimated above auto floor and below catastrophic tail. small-market CPC estimated from tier_1.', '2026-06-30'),

  -- ── MOTORCYCLE — median ~$73,700 (verdict), settlements ~$66-99k ─────────
  ('motorcycle', 'tier_1', 250, 325, 400,  5,8,25, 4,10,20,
   73700, NULL, NULL, 33, 40,
   'Keyword-level PPC benchmarks, motorcycle-accident terms', 'medium',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Motorcycle verdict median ~$73,700; settlements ~$66-99k', 'medium', 'blended',
   'Lead-to-signed is intake-dependent.', '2026-06-30'),
  ('motorcycle', 'tier_2', 175, 228, 280,  5,8,25, 4,10,20,
   73700, NULL, NULL, 33, 40,
   'tier_1 CPC x ~0.7 (tier_2 market)', 'low',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Motorcycle verdict median ~$73,700; settlements ~$66-99k', 'medium', 'blended',
   'tier_2 CPC estimated from tier_1. Lead-to-signed is intake-dependent.', '2026-06-30'),
  ('motorcycle', 'small',  113, 146, 180,  5,8,25, 4,10,20,
   73700, NULL, NULL, 33, 40,
   'tier_1 CPC x ~0.45 (small market)', 'low',
   'Vendor-cited funnel benchmarks; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Motorcycle verdict median ~$73,700; settlements ~$66-99k', 'medium', 'blended',
   'small-market CPC estimated from tier_1. Lead-to-signed is intake-dependent.', '2026-06-30')
ON CONFLICT (case_type, market_tier, observed_date) DO NOTHING;

-- ── Read RPC (mirrors get_tort_cost_benchmarks): latest row per pair ─────
CREATE OR REPLACE FUNCTION public.get_pi_ad_economics(
  p_case_type text,
  p_market_tier text
)
RETURNS SETOF public.pi_ad_economics
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM public.pi_ad_economics
  WHERE case_type = p_case_type
    AND market_tier = p_market_tier
  ORDER BY observed_date DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_pi_ad_economics
  IS 'Returns the latest PI ad-economics benchmark row for a case_type x market_tier pair. Funnel math is applied in TypeScript, not here.';

GRANT EXECUTE ON FUNCTION public.get_pi_ad_economics(text, text) TO anon, authenticated, service_role;
