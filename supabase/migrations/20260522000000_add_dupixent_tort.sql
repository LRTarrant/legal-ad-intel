-- ============================================================================
-- Dupixent (cutaneous T-cell lymphoma) tort registration
-- ============================================================================
-- Registers the Dupixent CTCL pre-MDL tort surface in:
--   1. public.torts       — pipeline keying table (slug = dupixent)
--   2. public.mass_torts  — UI catalog + advertising-page registry
--
-- This is a PRE-MDL tort. MDL No. 3180 (In re: Dupixent (Dupilumab) Products
-- Liability Litigation) was petitioned with the JPML on 2026-02-13; the
-- consolidation hearing is set for 2026-05-28. No MDL has been formed yet, so
-- no `notes` MDL number is asserted as final.
--
-- Slug is a single word, so the pipeline (underscore) and UI (hyphen)
-- conventions collapse to the same string: "dupixent".
--
-- has_advertising_page = TRUE: the prebuild guard
-- scripts/check-tort-profile-registry.mjs cross-checks the filesystem tort
-- page app/(app)/advertising/dupixent/ against mass_torts rows where
-- has_advertising_page = true. The page is also registered in PRE_MDL_TORTS
-- on the Mass Tort Overview page.
--
-- No tort_cost_benchmarks or tort_recommended_markets seed: there is no
-- litigation-derived CPA and no verified geographic dataset for this tort
-- yet. The page shows an LMI planning estimate only.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Pipeline tort row (used by ad ingestion and SERP pipelines)
-- ---------------------------------------------------------------------------
INSERT INTO public.torts (slug, label, category)
VALUES ('dupixent', 'Dupixent (CTCL)', 'pharmaceutical')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. UI catalog row (mass_torts)
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
  has_advertising_page,
  cost_benchmark_name,
  notes
)
VALUES (
  'Dupixent CTCL',
  'dupixent',
  'pharmaceutical',
  'active',
  'Cutaneous T-cell lymphoma (CTCL)',
  'Dupixent (dupilumab) injection',
  '/advertising/dupixent',
  TRUE,
  TRUE,
  NULL,
  'Pre-MDL. MDL No. 3180 (In re: Dupixent (Dupilumab) Products Liability Litigation) petitioned with the JPML 2026-02-13; consolidation hearing 2026-05-28, N.D. Georgia requested. ~15 cases / 12 federal districts as of May 2026. Defendants: Regeneron, Sanofi. Injury: cutaneous T-cell lymphoma (CTCL), also reaching peripheral T-cell lymphoma (PTCL).'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  disease_or_injury = EXCLUDED.disease_or_injury,
  product_or_exposure = EXCLUDED.product_or_exposure,
  canonical_url = EXCLUDED.canonical_url,
  visible = EXCLUDED.visible,
  has_advertising_page = EXCLUDED.has_advertising_page,
  cost_benchmark_name = EXCLUDED.cost_benchmark_name,
  notes = EXCLUDED.notes;

COMMIT;
