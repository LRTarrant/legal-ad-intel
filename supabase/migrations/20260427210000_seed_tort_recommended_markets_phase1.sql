-- Seed tort_recommended_markets for torts with existing geo signal data.
-- Phase 1: Social Media Addiction, Social Media Youth Harm, Roblox Child Sexual Exploitation
-- Source tables: social_media_state_regulatory, roblox_state_enforcement
--
-- Skipped torts (see PR description for rationale):
--   - AI Suicide / Self-Harm: not yet in mass_torts table
--   - AFFF Firefighting Foam: waterbody_state_map is a generic waterbody count, not a contamination signal
--   - Camp Lejeune: same — no primary contamination data available
--   - Construction: no matching tort in mass_torts

BEGIN;

-- Idempotent: clear any existing rows for the torts we're seeding
DELETE FROM tort_recommended_markets
WHERE tort_name IN (
  'Social Media Addiction',
  'Social Media Youth Harm',
  'Roblox Child Sexual Exploitation'
);

-- ============================================================================
-- Social Media Addiction — top 10 from social_media_state_regulatory
-- Ranking: ORDER BY regulatory_score DESC, has_law_enacted DESC, has_ag_action DESC, state
-- Score normalized: round(100 * regulatory_score / 5)
-- ============================================================================
INSERT INTO tort_recommended_markets (id, tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES
  -- Score 5: has_law_enacted=true, has_ag_action=true
  (gen_random_uuid(), 'Social Media Addiction', 'CA', 1, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted SB 976 / AB 2273 (partially enforceable); part of multi-state TikTok suit (Oct 2024). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'FL', 2, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB 3 (partly enforceable); AG sued Snapchat (Apr 2025). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'MD', 3, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB603 Kids Code (in effect); part of 33-state AG coalition (Oct 2023). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'MS', 4, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB 1126 (in effect); part of 33-state AG coalition (Oct 2023). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'NY', 5, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted SAFE for Kids Act (awaiting rulemaking); part of multi-state TikTok suit (Oct 2024). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'TX', 6, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB 18 (enjoined pending appeal); AG sued TikTok (Jan + Oct 2025). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'VA', 7, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted SB 854 (AG enforcing); AG actively enforcing (Feb 2026). Regulatory score: 5/5'),

  -- Score 4: has_law_enacted=true, has_ag_action=true
  (gen_random_uuid(), 'Social Media Addiction', 'CT', 8, 80, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action'],
   'Enacted SB 3 (in effect); part of 33-state AG coalition (Oct 2023). Regulatory score: 4/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'MA', 9, 80, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action'],
   'Passed House Bill (Apr 2026); part of 33-state AG coalition (Oct 2023). Regulatory score: 4/5'),

  (gen_random_uuid(), 'Social Media Addiction', 'NE', 10, 80, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action'],
   'Enacted LB 383 (eff Jul 2026); part of 33-state AG coalition (Oct 2023). Regulatory score: 4/5');

-- ============================================================================
-- Social Media Youth Harm — same top 10 states (same source table)
-- ============================================================================
INSERT INTO tort_recommended_markets (id, tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES
  (gen_random_uuid(), 'Social Media Youth Harm', 'CA', 1, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted SB 976 / AB 2273 (partially enforceable); part of multi-state TikTok suit (Oct 2024). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'FL', 2, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB 3 (partly enforceable); AG sued Snapchat (Apr 2025). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'MD', 3, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB603 Kids Code (in effect); part of 33-state AG coalition (Oct 2023). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'MS', 4, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB 1126 (in effect); part of 33-state AG coalition (Oct 2023). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'NY', 5, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted SAFE for Kids Act (awaiting rulemaking); part of multi-state TikTok suit (Oct 2024). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'TX', 6, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted HB 18 (enjoined pending appeal); AG sued TikTok (Jan + Oct 2025). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'VA', 7, 100, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action','High Regulatory Score'],
   'Enacted SB 854 (AG enforcing); AG actively enforcing (Feb 2026). Regulatory score: 5/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'CT', 8, 80, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action'],
   'Enacted SB 3 (in effect); part of 33-state AG coalition (Oct 2023). Regulatory score: 4/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'MA', 9, 80, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action'],
   'Passed House Bill (Apr 2026); part of 33-state AG coalition (Oct 2023). Regulatory score: 4/5'),

  (gen_random_uuid(), 'Social Media Youth Harm', 'NE', 10, 80, 'Strong Regulatory Action',
   ARRAY['State Law Enacted','AG Enforcement Action'],
   'Enacted LB 383 (eff Jul 2026); part of 33-state AG coalition (Oct 2023). Regulatory score: 4/5');

-- ============================================================================
-- Roblox Child Sexual Exploitation — top 10 from roblox_state_enforcement
-- Ranking: ORDER BY enforcement_score DESC, has_ag_action DESC, has_criminal_cases DESC, state
-- Score normalized: round(100 * enforcement_score / 5)
-- ============================================================================
INSERT INTO tort_recommended_markets (id, tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES
  -- enforcement_score 5: has_ag_action=true, has_criminal_cases=true
  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'CA', 1, 100, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'LA County sued Roblox (Feb 2026) — first CA government entity; multiple criminal cases, 8+ civil lawsuits. Enforcement score: 5/5'),

  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'FL', 2, 100, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG issued criminal subpoena to Roblox (Oct 2025); multiple criminal arrests from platform-originated grooming. Enforcement score: 5/5'),

  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'LA', 3, 100, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG Murrill sued Roblox (Aug 2025); alleged enabling CSAM distribution; criminal cases cited. Enforcement score: 5/5'),

  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'TX', 4, 100, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG Paxton sued Roblox (Nov 2025); deceptive trade practices claim survived dismissal (Mar 2026). Enforcement score: 5/5'),

  -- enforcement_score 4: has_ag_action=true, has_criminal_cases=true
  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'GA', 5, 80, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG Chris Carr announced action against Roblox (Mar 2026); DeKalb County case — 10yo groomed. Enforcement score: 4/5'),

  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'IA', 6, 80, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG filed lawsuit against Roblox; Polk County case — 13yo groomed and kidnapped. Enforcement score: 4/5'),

  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'KY', 7, 80, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG filed lawsuit accusing Roblox of allowing predators; Boone County case — 13yo suicide after exploitation. Enforcement score: 4/5'),

  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'TN', 8, 80, 'AG + Criminal Action',
   ARRAY['AG Enforcement','Criminal Cases'],
   'AG filed lawsuit against Roblox; MDL complaint filed (Jan 2026). Enforcement score: 4/5'),

  -- enforcement_score 3: has_ag_action=true, has_criminal_cases=false
  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'NE', 9, 60, 'AG Enforcement',
   ARRAY['AG Enforcement'],
   'AG filed lawsuit against Roblox. Enforcement score: 3/5'),

  -- enforcement_score 2: has_ag_action=false, has_criminal_cases=true (alphabetical: AL first)
  (gen_random_uuid(), 'Roblox Child Sexual Exploitation', 'AL', 10, 40, 'Criminal Cases',
   ARRAY['Criminal Cases'],
   'Dale County case — 12yo girl groomed via Roblox/Discord; Covington County case. Enforcement score: 2/5');

COMMIT;
