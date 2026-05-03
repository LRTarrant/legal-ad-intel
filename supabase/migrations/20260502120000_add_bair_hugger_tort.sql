-- ============================================================================
-- Bair Hugger (MDL 2666) tort registration
-- ============================================================================
-- Adds the Bair Hugger forced-air warming MDL to:
--   1. public.torts          — pipeline keying table (slug = bair_hugger)
--   2. public.mass_torts     — UI catalog (slug = bair-hugger, hyphenated)
--   3. tort_cost_benchmarks  — mid-stage CPL/CPA/CPK/L→R benchmarks
--   4. tort_recommended_markets — Joint Replacement Belt seed
--
-- Slug convention follows the same split used for Olympus Scopes:
--   - torts.slug          = "bair_hugger"   (underscore — pipeline TORT_SEARCH_TERMS keys)
--   - mass_torts.slug     = "bair-hugger"   (hyphen — UI canonical URL slug)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Pipeline tort row (used by ad ingestion and SERP pipelines)
-- ---------------------------------------------------------------------------
INSERT INTO public.torts (slug, label, category)
VALUES ('bair_hugger', 'Bair Hugger (MDL 2666)', 'medical_device')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. UI catalog row (mass_torts)
-- Matches the Depo-Provera column set: name, slug, category, status,
-- disease_or_injury, product_or_exposure, canonical_url, visible,
-- cost_benchmark_name. notes carries the MDL number for explicit reference.
-- ---------------------------------------------------------------------------
INSERT INTO public.mass_torts (
  name,
  slug,
  category,
  status,
  disease_or_injury,
  product_or_exposure,
  canonical_url,
  visible,
  cost_benchmark_name,
  notes
)
VALUES (
  'Bair Hugger',
  'bair-hugger',
  'medical_device',
  'active',
  'Periprosthetic Joint Infection (PJI)',
  '3M Bair Hugger forced-air warming system used during hip/knee arthroplasty',
  '/advertising/bair-hugger',
  TRUE,
  'Bair Hugger',
  'MDL 2666 — In re: Bair Hugger Forced Air Warming Devices Products Liability Litigation, D. Minnesota, Judge Joan N. Ericksen. 8,550+ pending (April 2026); 5th-largest active MDL. Hilke v. 3M (Jan 2026) on appeal. Solventum indemnifies 3M for uninsured Bair Hugger liabilities.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  disease_or_injury = EXCLUDED.disease_or_injury,
  product_or_exposure = EXCLUDED.product_or_exposure,
  canonical_url = EXCLUDED.canonical_url,
  visible = EXCLUDED.visible,
  cost_benchmark_name = EXCLUDED.cost_benchmark_name,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- 3. Cost benchmark seed
-- Mid-stage MDL with narrow injury class. Estimates from the brief:
--   CPL $300–$500
--   CPA / CPR $3,500–$6,500
--   CPKC $4,500–$8,500
--   Lead → Retainer 15–25%
--   Attrition 25–35% (OR-records review fallout)
-- ---------------------------------------------------------------------------
INSERT INTO public.tort_cost_benchmarks (
  tort_name, criteria_tier,
  cpl_low, cpl_high,
  cpa_low, cpa_high,
  cpk_low, cpk_high,
  lead_to_retainer_pct, attrition_pct,
  settlement_low, settlement_high,
  lifecycle_phase, observed_date,
  source_name, source_notes
) VALUES (
  'Bair Hugger', 'vendor_avg',
  300, 500,
  3500, 6500,
  4500, 8500,
  20.00, 30.00,
  30000, 250000,
  'mdl_stage', '2026-05-02',
  'estimated_from_comparable',
  'Mid-stage MDL with narrow injury class. CPA elevated by OR-records verification fallout (~25-35% attrition once Bair Hugger non-use confirmed). Settlement range reflects four-tier projection: severe (multiple revisions/sepsis/amputation) up to $250K+, minimal/weak documentation as low as $10K-$30K.'
) ON CONFLICT (tort_name, criteria_tier, observed_date, source_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Recommended markets — Joint Replacement Belt seed
-- Source: Thirukumaran et al. 2020 (PMC8190867) Medicare HRR-level data.
-- Score: 100 - (rank-1)*5
-- ---------------------------------------------------------------------------
DELETE FROM public.tort_recommended_markets WHERE tort_name = 'Bair Hugger';

INSERT INTO public.tort_recommended_markets (tort_name, state, state_name, rank, score, primary_signal, signals, rationale)
VALUES
  ('Bair Hugger', 'UT', 'Utah',          1, 100, 'Highest TKA Rate',
   ARRAY['Highest TKA Rate', 'Mountain West', 'Joint Replacement Belt'],
   'Highest TKA rate in nation: 16/1000 Medicare beneficiaries. Salt Lake City, Ogden DMAs.'),
  ('Bair Hugger', 'MI', 'Michigan',      2, 95, 'Highest THA Rate',
   ARRAY['Highest THA Rate', 'Joint Replacement Belt'],
   'Highest THA rate (Traverse City HRR: 7.55/1000). Detroit, Grand Rapids DMAs.'),
  ('Bair Hugger', 'IA', 'Iowa',          3, 90, 'High Joint Replacement Volume',
   ARRAY['Joint Replacement Belt', 'Upper Midwest'],
   'High TKA density in Des Moines, Cedar Rapids DMAs.'),
  ('Bair Hugger', 'NE', 'Nebraska',      4, 85, 'High Joint Replacement Volume',
   ARRAY['Joint Replacement Belt', 'Upper Midwest'],
   'Omaha, Lincoln DMAs — JR Belt.'),
  ('Bair Hugger', 'SD', 'South Dakota',  5, 80, 'High Joint Replacement Volume',
   ARRAY['Joint Replacement Belt', 'Upper Midwest'],
   'Sioux Falls, Rapid City DMAs — JR Belt.'),
  ('Bair Hugger', 'WI', 'Wisconsin',     6, 75, 'High Joint Replacement Volume',
   ARRAY['Joint Replacement Belt', 'Upper Midwest'],
   'Milwaukee, Madison, Green Bay DMAs.'),
  ('Bair Hugger', 'MN', 'Minnesota',     7, 70, 'MDL Home',
   ARRAY['MDL Home', 'Joint Replacement Belt', 'Local Counsel'],
   'MDL 2666 home jurisdiction. Meshbesher & Spence is the local heavyweight. Minneapolis-St. Paul, Rochester DMAs.'),
  ('Bair Hugger', 'ID', 'Idaho',         8, 65, 'High Joint Replacement Volume',
   ARRAY['Joint Replacement Belt', 'Mountain West'],
   'Boise DMA — Mountain West JR Belt.'),
  ('Bair Hugger', 'ND', 'North Dakota',  9, 60, 'High Joint Replacement Volume',
   ARRAY['Joint Replacement Belt', 'Upper Midwest'],
   'Fargo, Bismarck DMAs — JR Belt.'),
  ('Bair Hugger', 'FL', 'Florida',      10, 55, 'Retirement Corridor',
   ARRAY['Retirement Corridor', '65+ Medicare-Heavy'],
   'Tampa, Orlando, Miami DMAs — retirement-corridor skew with high Medicare population. 4-yr SOL is most favorable in nation.');

COMMIT;
