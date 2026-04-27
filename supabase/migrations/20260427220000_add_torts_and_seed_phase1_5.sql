-- Phase 1.5: Add AI Suicide + Olympus + Uber to mass_torts catalog
-- and seed tort_recommended_markets for all three.
--
-- Sources:
--   AI Suicide:  ai_suicide_volume_signals_by_state (top 10 by composite_signal_rank ASC)
--   Olympus:     olympus_ercp_volume_by_state (top 10 by rank ASC)
--   Uber:        uber_mdl_filing_concentration (top 10 by estimated_plaintiff_count DESC)

BEGIN;

-- ============================================================================
-- Part A: Add 3 rows to mass_torts (idempotent)
-- ============================================================================

INSERT INTO mass_torts (name, slug, category, status, disease_or_injury, product_or_exposure)
VALUES
  ('AI Suicide / Self-Harm',
   'ai-suicide-self-harm',
   'product_liability',
   'active',
   'Suicide, self-harm, severe psychological injury',
   'AI chatbot platforms (Character.AI, Replika, ChatGPT, etc.)'),

  ('Olympus Duodenoscope',
   'olympus-duodenoscope',
   'medical_device',
   'active',
   'Antibiotic-resistant bacterial infections (CRE, multidrug-resistant)',
   'Olympus TJF-Q180V and similar duodenoscopes used in ERCP procedures'),

  ('Uber Sexual Assault',
   'uber-sexual-assault',
   'product_liability',
   'active',
   'Sexual assault, rape, related psychological injury',
   'Uber rideshare platform (drivers and passengers)')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Part B: Seed tort_recommended_markets (idempotent — delete first)
-- ============================================================================

DELETE FROM tort_recommended_markets
WHERE tort_name IN (
  'AI Suicide / Self-Harm',
  'Olympus Duodenoscope',
  'Uber Sexual Assault'
);

-- --------------------------------------------------------------------------
-- B.1 — AI Suicide / Self-Harm
-- Source: ai_suicide_volume_signals_by_state, top 10 by composite_signal_rank
-- Score: 100 - (rank-1)*5
-- primary_signal: youth_suicide_rate > 10 → 'High Youth Suicide Rate'
--                 ai_chatbot_adoption_index = 'High' → 'High AI Chatbot Adoption'
--                 else → 'Composite Risk'
-- --------------------------------------------------------------------------
INSERT INTO tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES
  ('AI Suicide / Self-Harm', 'CA', 1, 100, 'High AI Chatbot Adoption',
   ARRAY['High AI Chatbot Adoption', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 8.2/100k; AI chatbot adoption: High. Composite signal rank #1.'),

  ('AI Suicide / Self-Harm', 'TX', 2, 95, 'High Youth Suicide Rate',
   ARRAY['High Youth Suicide Rate', 'High AI Chatbot Adoption', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 10.5/100k; AI chatbot adoption: High. Composite signal rank #2.'),

  ('AI Suicide / Self-Harm', 'FL', 3, 90, 'High AI Chatbot Adoption',
   ARRAY['High AI Chatbot Adoption', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 9.8/100k; AI chatbot adoption: High. Composite signal rank #3.'),

  ('AI Suicide / Self-Harm', 'CO', 4, 85, 'High Youth Suicide Rate',
   ARRAY['High Youth Suicide Rate', 'High AI Chatbot Adoption', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 14.1/100k; AI chatbot adoption: High. Composite signal rank #4.'),

  ('AI Suicide / Self-Harm', 'NY', 5, 80, 'High AI Chatbot Adoption',
   ARRAY['High AI Chatbot Adoption', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 5.9/100k; AI chatbot adoption: High. Composite signal rank #5.'),

  ('AI Suicide / Self-Harm', 'KY', 6, 75, 'High Youth Suicide Rate',
   ARRAY['High Youth Suicide Rate', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 12.3/100k; AI chatbot adoption: Medium. Composite signal rank #6.'),

  ('AI Suicide / Self-Harm', 'GA', 7, 70, 'Composite Risk',
   ARRAY['Composite Risk Rank Top 10'],
   'Youth suicide rate 9.4/100k; AI chatbot adoption: Medium. Composite signal rank #7.'),

  ('AI Suicide / Self-Harm', 'OR', 8, 65, 'High Youth Suicide Rate',
   ARRAY['High Youth Suicide Rate', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 12.7/100k; AI chatbot adoption: Medium. Composite signal rank #8.'),

  ('AI Suicide / Self-Harm', 'IL', 9, 60, 'High AI Chatbot Adoption',
   ARRAY['High AI Chatbot Adoption', 'Composite Risk Rank Top 10'],
   'Youth suicide rate 7.6/100k; AI chatbot adoption: High. Composite signal rank #9.'),

  ('AI Suicide / Self-Harm', 'PA', 10, 55, 'Composite Risk',
   ARRAY['Composite Risk Rank Top 10'],
   'Youth suicide rate 8.9/100k; AI chatbot adoption: Medium. Composite signal rank #10.');

-- --------------------------------------------------------------------------
-- B.2 — Olympus Duodenoscope
-- Source: olympus_ercp_volume_by_state, top 10 by rank ASC
-- Score: 100 - (rank-1)*5
-- --------------------------------------------------------------------------
INSERT INTO tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES
  ('Olympus Duodenoscope', 'CA', 1, 100, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 58,000 ERCP procedures annually (rank #1).'),

  ('Olympus Duodenoscope', 'TX', 2, 95, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 41,000 ERCP procedures annually (rank #2).'),

  ('Olympus Duodenoscope', 'FL', 3, 90, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 39,000 ERCP procedures annually (rank #3).'),

  ('Olympus Duodenoscope', 'NY', 4, 85, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 31,000 ERCP procedures annually (rank #4).'),

  ('Olympus Duodenoscope', 'PA', 5, 80, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 24,000 ERCP procedures annually (rank #5).'),

  ('Olympus Duodenoscope', 'IL', 6, 75, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 21,000 ERCP procedures annually (rank #6).'),

  ('Olympus Duodenoscope', 'OH', 7, 70, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 20,500 ERCP procedures annually (rank #7).'),

  ('Olympus Duodenoscope', 'MI', 8, 65, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 17,500 ERCP procedures annually (rank #8).'),

  ('Olympus Duodenoscope', 'NC', 9, 60, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 16,500 ERCP procedures annually (rank #9).'),

  ('Olympus Duodenoscope', 'GA', 10, 55, 'High ERCP Volume',
   ARRAY['High ERCP Volume', 'Large Patient Population'],
   'Estimated 16,000 ERCP procedures annually (rank #10).');

-- --------------------------------------------------------------------------
-- B.3 — Uber Sexual Assault
-- Source: uber_mdl_filing_concentration, top 10 by estimated_plaintiff_count DESC
-- Score: round(pct_of_total * 5) capped at 100, floor 50
-- --------------------------------------------------------------------------
INSERT INTO tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES
  ('Uber Sexual Assault', 'CA', 1, 86, 'Litigation Concentration',
   ARRAY['Litigation Concentration', 'State Court Activity'],
   '580 estimated plaintiffs (17.1% of MDL total) plus 500 state-court cases.'),

  ('Uber Sexual Assault', 'TX', 2, 61, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '410 estimated plaintiffs (12.1% of MDL total).'),

  ('Uber Sexual Assault', 'FL', 3, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '340 estimated plaintiffs (10.0% of MDL total).'),

  ('Uber Sexual Assault', 'NY', 4, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '270 estimated plaintiffs (8.0% of MDL total).'),

  ('Uber Sexual Assault', 'IL', 5, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '205 estimated plaintiffs (6.0% of MDL total).'),

  ('Uber Sexual Assault', 'GA', 6, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '175 estimated plaintiffs (5.2% of MDL total).'),

  ('Uber Sexual Assault', 'AZ', 7, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '160 estimated plaintiffs (4.7% of MDL total).'),

  ('Uber Sexual Assault', 'CO', 8, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '135 estimated plaintiffs (4.0% of MDL total).'),

  ('Uber Sexual Assault', 'NJ', 9, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '120 estimated plaintiffs (3.5% of MDL total).'),

  ('Uber Sexual Assault', 'MA', 10, 50, 'Litigation Concentration',
   ARRAY['Litigation Concentration'],
   '110 estimated plaintiffs (3.2% of MDL total).');

COMMIT;
