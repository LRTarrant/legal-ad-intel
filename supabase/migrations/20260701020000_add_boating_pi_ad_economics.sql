-- ============================================================================
-- BOATING PI AD ECONOMICS (fills the one missing case type in pi_ad_economics)
-- Adds 'boating' to the pi_ad_economics case_type CHECK and seeds the three
-- market-tier rows. Seeded verbatim from boating-ad-economics-benchmark-
-- 2026-07-01.md — recreational-boat numbers are the DEFAULT for the single
-- 'boating' key.
--
-- SINGLE-KEY DECISION (deviates from the research file's SQL, which also seeds a
-- separate 'maritime' key): only 'boating' is seeded and only 'boating' is added
-- to the CHECK, to keep criteria/economics key parity (pi_qualification_criteria
-- is keyed to the same 'auto'|'trucking'|'motorcycle'|'boating' union) and avoid
-- an orphaned economics key with no intake mapping. The materially higher Jones
-- Act / maritime economics are flagged in each row's source_notes; maritime as
-- its own case_type key is a documented deferred follow-up.
--
-- CHECK ordering (per CLAUDE.md db-migration rules): DROP the CHECK constraint
-- BEFORE the INSERT, then re-ADD the widened CHECK AFTER. The existing
-- auto/trucking/motorcycle rows all satisfy the widened list, so the re-add
-- cannot fail on existing data.
--
-- Modeling decisions baked into the numbers (flagged, not fabricated):
--  - CPC tier_1 = live Google Keyword Planner pull (Lance's Google Ads account,
--    US, 12-mo Jun'25-May'26): boat accident lawyer $120.62 low / attorney
--    $200.00 low / >=$1,000 capped high. tier_2 = x0.7, small = x0.45 — same
--    multipliers the existing seed uses. cpc_high=1000 is the KP DISPLAY CEILING
--    ("capped, >=$1,000"), NOT a literal auction price — noted in source_notes.
--  - Case value median 150000 = band midpoint ($50k-$300k; only the $300k
--    anchor is verified — illustrative). Catastrophic tail labeled separately,
--    NOT blended into the median (same convention as trucking's >=$10M tail).
--  - Conversion presets are the universal PI values (5/8/25 click-to-lead,
--    4/10/20 lead-to-signed); boating is not documented to differ from general
--    PI. lead-to-signed stays low confidence / soft, matching every other row.
-- ============================================================================

-- ── Widen the case_type CHECK: DROP first, then INSERT, then re-ADD ────────
ALTER TABLE public.pi_ad_economics
  DROP CONSTRAINT IF EXISTS pi_ad_economics_case_type_check;

-- ── Seed the three boating (recreational) tier rows ───────────────────────
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
  -- ── BOATING (recreational) — KP first-party CPC; median $150k band midpoint ──
  ('boating', 'tier_1', 120, 200, 1000, 5,8,25, 4,10,20,
   150000, 15000000, 'recreational catastrophic (propeller/drowning/product-defect); $15M-$200M range — a single design-defect verdict distorts any mean; NOT the average',
   33, 40,
   'Google Keyword Planner, Lance''s Google Ads account, US, 12-mo Jun25-May26, pulled Jul 1 2026 — top-of-page bid ranges (boat accident lawyer $120.62 / attorney $200.00 low; high >=$1,000 = KP display ceiling, capped)', 'medium',
   'PI proxy — Unbounce legal (click-to-lead); MyCase 2024 (lead-to-signed 17.6% real dataset); no boating-specific conversion data', 'medium', 'low',
   'Recreational-boat firm marketing pages (Sobo & Sobo $300k anchor VERIFIED as anecdote; Martin Law / John Foy for the band); no verdict-database median exists', 'low', 'blended',
   'CPC REPORTED first-party (top-of-page bid ranges, not realized median); cpc_high 1000 is the KP display ceiling, not literal. Case value + lead-to-signed are the soft inputs, same as every row. Jones Act / maritime cases carry materially higher, uncapped economics — see boating criteria (Jones Act branch); maritime as its own key is a deferred follow-up.', '2026-07-01'),
  ('boating', 'tier_2', 84, 140, 700, 5,8,25, 4,10,20,
   150000, 15000000, 'recreational catastrophic; $15M-$200M range; NOT the average',
   33, 40,
   'tier_1 KP pull x ~0.7 (tier_2 market)', 'low',
   'PI proxy — Unbounce legal; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Recreational-boat firm marketing pages; no verdict-database median', 'low', 'blended',
   'tier_2 CPC estimated from tier_1 KP pull. Case value + lead-to-signed are soft. Jones Act / maritime cases carry materially higher, uncapped economics — see boating criteria (Jones Act branch); maritime as its own key is a deferred follow-up.', '2026-07-01'),
  ('boating', 'small', 54, 90, 450, 5,8,25, 4,10,20,
   150000, 15000000, 'recreational catastrophic; $15M-$200M range; NOT the average',
   33, 40,
   'tier_1 KP pull x ~0.45 (small market)', 'low',
   'PI proxy — Unbounce legal; MyCase 2024 (lead-to-signed)', 'medium', 'low',
   'Recreational-boat firm marketing pages; no verdict-database median', 'low', 'blended',
   'small-market CPC estimated from tier_1 KP pull. Case value + lead-to-signed are soft. Jones Act / maritime cases carry materially higher, uncapped economics — see boating criteria (Jones Act branch); maritime as its own key is a deferred follow-up.', '2026-07-01')
ON CONFLICT (case_type, market_tier, observed_date) DO NOTHING;

-- ── Re-ADD the widened CHECK (now includes 'boating') ─────────────────────
ALTER TABLE public.pi_ad_economics
  ADD CONSTRAINT pi_ad_economics_case_type_check
  CHECK (case_type IN ('auto', 'trucking', 'motorcycle', 'boating'));
