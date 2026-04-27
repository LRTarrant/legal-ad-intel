BEGIN;

DELETE FROM tort_recommended_markets
WHERE tort_name IN (
  'Paraquat',
  'Talcum Powder',
  'Ozempic / Mounjaro',
  'Tylenol / Acetaminophen',
  'Zantac',
  'NEC Baby Formula',
  'CPAP',
  '3M Earplugs',
  'Hernia Mesh',
  'AFFF Firefighting Foam',
  'Camp Lejeune'
);

INSERT INTO tort_recommended_markets (id, tort_name, state, rank, score, primary_signal, signals, rationale)
VALUES

-- ============================================================
-- PARAQUAT (10 states)
-- Sources: CDC NCHS Parkinson's mortality 2023; USDA NASS paraquat use
-- ============================================================
  (gen_random_uuid(), 'Paraquat', 'TX', 1, 95, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'TX top paraquat-use state (cotton/sorghum/soy); Parkinson mortality 10.8/100k 2023 (CDC NCHS); 1.4M veterans (VA 2024)'),

  (gen_random_uuid(), 'Paraquat', 'IL', 2, 90, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','High Incidence'],
   'IL top corn/soybean state, paraquat widely applied (USDA NASS); Parkinson mortality 9.9/100k 2023 (CDC NCHS)'),

  (gen_random_uuid(), 'Paraquat', 'IA', 3, 87, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','High Incidence'],
   'IA top soybean producer; paraquat among highest-use states (USDA NASS); Parkinson mortality 10.4/100k 2023 (CDC NCHS)'),

  (gen_random_uuid(), 'Paraquat', 'MO', 4, 84, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','High Incidence'],
   'MO corn/soy belt high paraquat use (USDA NASS); Parkinson mortality 10.3/100k 2023 (CDC NCHS); 347k veterans'),

  (gen_random_uuid(), 'Paraquat', 'MS', 5, 81, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','High Incidence'],
   'MS top-10 paraquat-use state (USDA/BCH data); Parkinson mortality 10.9/100k 2023 (CDC NCHS)'),

  (gen_random_uuid(), 'Paraquat', 'TN', 6, 78, 'High Incidence',
   ARRAY['High Incidence','Exposure Hotspot'],
   'TN top-10 paraquat-use state (USDA NASS); Parkinson mortality 11.4/100k 2023 — 4th highest US (CDC NCHS)'),

  (gen_random_uuid(), 'Paraquat', 'AR', 7, 75, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','High Incidence'],
   'AR among highest paraquat-use states nationally (USDA NASS); Parkinson mortality 10.1/100k 2023 (CDC NCHS)'),

  (gen_random_uuid(), 'Paraquat', 'CA', 8, 72, 'Large Population',
   ARRAY['Large Population','Exposure Hotspot'],
   'CA top paraquat-use state; 4,158 Parkinson deaths 2023 — highest count nationally (CDC NCHS/Statista); 1.3M veterans'),

  (gen_random_uuid(), 'Paraquat', 'KS', 9, 69, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','High Incidence'],
   'KS top paraquat-use state (grain sorghum/wheat) (USDA NASS); Parkinson mortality 11.5/100k 2023 — 3rd highest US (CDC NCHS)'),

  (gen_random_uuid(), 'Paraquat', 'NC', 10, 65, 'High Incidence',
   ARRAY['High Incidence','Exposure Hotspot'],
   'NC top-10 paraquat-use state (USDA NASS); Parkinson mortality 10.0/100k 2023 (CDC NCHS); 615k veterans'),

-- ============================================================
-- TALCUM POWDER (10 states)
-- Sources: mymesothelioma.com CDC USCS 2015-2019; ACS Cancer Facts 2024
-- ============================================================
  (gen_random_uuid(), 'Talcum Powder', 'CA', 1, 95, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'CA: 1,579 mesothelioma cases 2015-2019 — highest nationally; 6.2M women 50+ (CDC/USCS via mymesothelioma.com)'),

  (gen_random_uuid(), 'Talcum Powder', 'TX', 2, 90, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: 947 mesothelioma cases 2015-2019; ~1,050 ovarian cancer cases/yr; 4.8M women 50+ (CDC/USCS; ACS 2024)'),

  (gen_random_uuid(), 'Talcum Powder', 'FL', 3, 87, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'FL: 1,146 mesothelioma cases 2015-2019; 4.8M women 50+; 21.75% age 65+ (CDC/USCS; USAFacts 2024)'),

  (gen_random_uuid(), 'Talcum Powder', 'PA', 4, 84, 'High Incidence',
   ARRAY['High Incidence','Industrial Exposure'],
   'PA: 874 mesothelioma cases, rate 1.0/100k 2015-2019; historic industrial asbestos (CDC/USCS; mymesothelioma.com)'),

  (gen_random_uuid(), 'Talcum Powder', 'NY', 5, 81, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'NY: 916 mesothelioma cases 2015-2019; 3.5M women 65+; ~1,490 ovarian cancer cases/yr (ACS 2024)'),

  (gen_random_uuid(), 'Talcum Powder', 'NJ', 6, 78, 'High Incidence',
   ARRAY['High Incidence','Industrial Exposure'],
   'NJ: 575 mesothelioma cases, rate 1.1/100k 2015-2019; historic asbestos manufacturing (CDC/USCS; mymesothelioma.com)'),

  (gen_random_uuid(), 'Talcum Powder', 'OH', 7, 75, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'OH: 650 mesothelioma cases, rate 0.9/100k 2015-2019; 1.88M age 65+; ~1,500 ovarian cancer cases/yr (CDC/USCS)'),

  (gen_random_uuid(), 'Talcum Powder', 'IL', 8, 72, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'IL: 634 mesothelioma cases 2015-2019; industrial/asbestos legacy; 490 ovarian cancer deaths/yr est. (ACS 2024)'),

  (gen_random_uuid(), 'Talcum Powder', 'WA', 9, 69, 'High Incidence',
   ARRAY['High Incidence','Industrial Exposure'],
   'WA: mesothelioma rate 1.1/100k, 440 cases 2015-2019; Puget Sound shipyard legacy (CDC/USCS; mymesothelioma.com)'),

  (gen_random_uuid(), 'Talcum Powder', 'MI', 10, 65, 'Industrial Exposure',
   ARRAY['Industrial Exposure','High Incidence'],
   'MI: 563 mesothelioma cases 2015-2019, rate 0.9/100k; auto/industrial asbestos history; 1.88M age 65+ (CDC/USCS)'),

-- ============================================================
-- OZEMPIC / MOUNJARO (10 states)
-- Sources: CDC BRFSS 2024 via America's Health Rankings; CDC BRFSS 2023 obesity map
-- ============================================================
  (gen_random_uuid(), 'Ozempic / Mounjaro', 'WV', 1, 95, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'WV: diabetes prevalence 18.4% — highest US 2024 (CDC BRFSS/AHR); obesity 40.1% (CDC BRFSS 2023)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'MS', 2, 91, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'MS: diabetes 15.2% 2024; obesity 40.1% — 2nd nationally (CDC BRFSS/AHR; CDC BRFSS 2023 obesity map)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'KY', 3, 88, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'KY: diabetes 16.2% 2024 — 2nd highest US (CDC BRFSS/AHR); obesity 35%+ (CDC BRFSS 2023)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'LA', 4, 85, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'LA: diabetes 15.4% 2024; obesity 39.9% — 4th nationally (CDC BRFSS/AHR; CDC BRFSS 2023)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'AL', 5, 82, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'AL: diabetes 15.1% 2024; obesity 39.2% — 5th nationally (CDC BRFSS/AHR; CDC BRFSS 2023 obesity map)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'TX', 6, 79, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: diabetes 13.5% affecting ~3.8M adults; obesity 36%+; 30M population (CDC BRFSS/AHR)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'AR', 7, 76, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'AR: diabetes 15.3% 2024; obesity 40.0% — 3rd nationally (CDC BRFSS/AHR; CDC BRFSS 2023 obesity map)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'FL', 8, 73, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'FL: diabetes 14.6% 2024 affecting ~2.3M adults; 21.8% age 65+ (CDC BRFSS/AHR; USAFacts 2024)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'SC', 9, 70, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'SC: diabetes 13.9% 2024; obesity 38%+ (CDC BRFSS/AHR; CDC BRFSS 2023 obesity map)'),

  (gen_random_uuid(), 'Ozempic / Mounjaro', 'OK', 10, 67, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'OK: diabetes 13.2% 2024; obesity 38.7% — 6th nationally (CDC BRFSS/AHR; CDC BRFSS 2023)'),

-- ============================================================
-- TYLENOL / ACETAMINOPHEN (10 states)
-- Sources: CDC ADDM MMWR April 2025 (2022 data); World Population Review 2026
-- ============================================================
  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'CA', 1, 95, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'CA: ASD prevalence 53.1/1,000 8-yr-olds 2022 — highest ADDM site nationally (CDC ADDM MMWR 2025); 440k annual births'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'NJ', 2, 90, 'High Incidence',
   ARRAY['High Incidence','Litigation Concentration'],
   'NJ: ~2.9% ASD prevalence (1 in 34 children) — highest diagnosed state rate (CDC ADDM/World Pop Review 2026)'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'PA', 3, 87, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'PA: 1.61% total autism prevalence 2021 — highest state rate nationally (World Population Review 2026); ADDM site'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'TX', 4, 84, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: ASD 9.7–30.0/1,000 by ADDM site 2022 (CDC ADDM MMWR 2025); 400k+ annual births; 29M population'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'MD', 5, 80, 'High Incidence',
   ARRAY['High Incidence','Litigation Concentration'],
   'MD: 1 in 38 (2.6%) 8-yr-olds with ASD 2022 — MD-ADDM site (CDC/Inclusive ABA 2025); 72k annual births'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'GA', 6, 77, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'GA: ADDM Network site 2022; Black children 1.6× higher ASD risk than White (CDC ADDM MMWR 2025); 133k births/yr'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'MN', 7, 74, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'MN: ASD prevalence 1.13% 2021 — among highest nationally; ADDM site (World Population Review 2026)'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'IN', 8, 71, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'IN: ADDM site 2022; ASD 4-yr prevalence 12.9/1,000; overall 1.09% prevalence (CDC ADDM MMWR 2025)'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'NY', 9, 68, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'NY: 1.09% autism prevalence 2021; 1,000/100k autism rate (World Population Review 2026); 212k annual births'),

  (gen_random_uuid(), 'Tylenol / Acetaminophen', 'FL', 10, 65, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'FL: 1.06% autism prevalence 2021; 230k annual births — 3rd highest nationally (World Population Review 2026)'),

-- ============================================================
-- ZANTAC (10 states)
-- Sources: ACS Cancer Facts & Figures 2024; USAFacts 2024 age 65+
-- ============================================================
  (gen_random_uuid(), 'Zantac', 'CA', 1, 95, 'Large Population',
   ARRAY['Large Population','High Incidence','Litigation Concentration'],
   'CA: ~6,600 new bladder cancer cases/yr; 15.8% age 65+; largest state-court Zantac docket (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'FL', 2, 91, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'FL: ~4,800 new bladder cancer cases/yr; 21.8% age 65+ — 3rd highest US (ACS Cancer Facts 2024; USAFacts 2024)'),

  (gen_random_uuid(), 'Zantac', 'TX', 3, 87, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: ~5,200 new bladder cancer cases/yr; large older adult population; active plaintiff bar (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'NY', 4, 84, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'NY: ~4,100 new bladder cancer cases/yr; 18.1% age 65+; active Zantac state court filings (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'PA', 5, 80, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'PA: ~3,200 new bladder cancer cases/yr; 20.4% age 65+ (ACS Cancer Facts 2024; USAFacts 2024)'),

  (gen_random_uuid(), 'Zantac', 'OH', 6, 77, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'OH: ~3,100 new bladder cancer cases/yr; 18.5% age 65+; high overall cancer incidence (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'IL', 7, 74, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'IL: ~2,700 new bladder cancer cases/yr; 13M population; active mass tort bar (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'MI', 8, 71, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'MI: ~2,200 bladder cancer cases/yr; 18.7% age 65+; high overall cancer incidence (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'NJ', 9, 68, 'Litigation Concentration',
   ARRAY['Litigation Concentration','High Incidence'],
   'NJ: ~2,100 bladder cancer cases/yr; 17.4% age 65+; active Zantac state court filings (ACS Cancer Facts 2024)'),

  (gen_random_uuid(), 'Zantac', 'NC', 10, 65, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'NC: ~2,300 bladder cancer cases/yr; cancer incidence 475.5/100k (State Cancer Profiles 2017-2021)'),

-- ============================================================
-- NEC BABY FORMULA (10 states)
-- Sources: CDC NCHS NVSS 2023 preterm data; March of Dimes 2025 Report Card
-- ============================================================
  (gen_random_uuid(), 'NEC Baby Formula', 'MS', 1, 95, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'MS: preterm birth rate 14.96% 2023 — highest US (CDC NCHS); NEC-IMR 22.0/100k — highest nationally 1999-2020 (JAMA 2023)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'LA', 2, 91, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'LA: preterm birth rate 13.36% 2023 (CDC NCHS); high Black infant population; NEC disparity 2.5× Black vs White (JAMA 2023)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'AL', 3, 88, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'AL: preterm birth rate 12.91% 2023 (CDC NCHS); 7,379 preterm births 2024 (March of Dimes 2025); large Black infant pop'),

  (gen_random_uuid(), 'NEC Baby Formula', 'WV', 4, 85, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'WV: preterm birth rate 13.09% 2023 (CDC NCHS); 2,281 preterm births 2024; grade F (March of Dimes 2025)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'GA', 5, 82, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'GA: preterm birth rate 11.82% 2023 (CDC NCHS); 14,907 preterm births 2024 — 3rd most nationally (March of Dimes 2025)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'SC', 6, 79, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'SC: preterm birth rate 11.61% 2023 (CDC NCHS); high Black infant share; 6,844 preterm births 2024 (March of Dimes)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'TX', 7, 76, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: preterm birth rate 11.13% 2023; 49,800+ preterm births/yr — largest absolute count nationally (CDC NCHS)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'TN', 8, 73, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'TN: preterm birth rate 11.34% 2023 (CDC NCHS); Memphis city 13.8% preterm (March of Dimes 2025)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'AR', 9, 70, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'AR: preterm birth rate 12.09% 2023 (CDC NCHS); 4,289 preterm births 2024; grade F (March of Dimes 2025)'),

  (gen_random_uuid(), 'NEC Baby Formula', 'KY', 10, 67, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'KY: preterm birth rate 11.28% 2023 (CDC NCHS); 6,209 preterm births 2024; grade F (March of Dimes 2025)'),

-- ============================================================
-- CPAP (10 states)
-- Sources: USAFacts 2024 (Census age 65+); CDC BRFSS 2023 obesity map; STAT News Philips recall 15M devices
-- ============================================================
  (gen_random_uuid(), 'CPAP', 'FL', 1, 95, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'FL: 4.8M residents 65+ — 21.8%, 2nd largest elderly pop; 1.4M+ est. CPAP users; obesity 29%+ (USAFacts 2024)'),

  (gen_random_uuid(), 'CPAP', 'CA', 2, 90, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'CA: 6.2M residents 65+ — largest absolute in US; ~2M+ est. CPAP users; obesity 25%+ (USAFacts 2024)'),

  (gen_random_uuid(), 'CPAP', 'TX', 3, 87, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: 3.9M residents 65+; obesity 36%+; 29M population — large absolute Philips recall impact (USAFacts 2024; CDC BRFSS)'),

  (gen_random_uuid(), 'CPAP', 'WV', 4, 84, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'WV: obesity 41.2% — highest US 2023; 21.9% age 65+ (CDC BRFSS 2023 obesity map; USAFacts 2024)'),

  (gen_random_uuid(), 'CPAP', 'PA', 5, 80, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'PA: 2.6M residents 65+ — 20.4%; obesity 31%+; large OSA-diagnosed Medicare population (USAFacts 2024)'),

  (gen_random_uuid(), 'CPAP', 'NY', 6, 77, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'NY: 3.6M residents 65+ — 18.1%; obesity 29%+; large Philips device market share (USAFacts 2024)'),

  (gen_random_uuid(), 'CPAP', 'AL', 7, 74, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'AL: obesity 39.2% — 5th highest US 2023 (CDC BRFSS 2023); 18.5% age 65+; high OSA proxy'),

  (gen_random_uuid(), 'CPAP', 'OH', 8, 71, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'OH: 2.1M residents 65+ — 18.5%; obesity 34%+; 605k veterans; major healthcare market (USAFacts 2024)'),

  (gen_random_uuid(), 'CPAP', 'ME', 9, 68, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'ME: 23.5% age 65+ — highest in US 2024 (USAFacts 2024); high OSA proxy; plaintiff-friendly courts'),

  (gen_random_uuid(), 'CPAP', 'MS', 10, 65, 'High Incidence',
   ARRAY['High Incidence','Large Population'],
   'MS: obesity 40.1% — 2nd highest US 2023; 17.3% age 65+ (CDC BRFSS 2023 obesity map)'),

-- ============================================================
-- 3M EARPLUGS (10 states)
-- NOTE: MDL settled 2023 ($6.01B). Residual state claims remain viable.
-- Source: VA VetPop 2024 via World Population Review
-- ============================================================
  (gen_random_uuid(), '3M Earplugs', 'TX', 1, 85, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'TX: 1,402,360 veterans 2024 — largest state veteran population; numerous major military bases (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'CA', 2, 80, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'CA: 1,305,450 veterans 2024 — 2nd largest nationally; multiple Army/USMC/Navy bases (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'FL', 3, 77, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'FL: 1,327,070 veterans 2024 — 3rd largest; 5,704/100k; Eglin, JAXNAS, MacDill AFB (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'NC', 4, 74, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'NC: 615,509 veterans 2024; Fort Liberty, Camp Lejeune, Seymour Johnson AFB (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'VA', 5, 71, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'VA: 629,500 veterans 2024; 7,137/100k rate — 2nd highest rate US; major DoD installations (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'GA', 6, 68, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'GA: 601,304 veterans 2024; Fort Moore (Benning), Fort Stewart, Dobbins AFB (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'PA', 7, 65, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'PA: 632,183 veterans 2024 — 4th largest state count; active plaintiff bar (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'OH', 8, 62, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'OH: 605,840 veterans 2024; 5,108/100k; Wright-Patterson AFB; plaintiff-friendly venues (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'NY', 9, 58, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'NY: 581,776 veterans 2024; Fort Drum, West Point; large urban plaintiff bar (VA VetPop 2024)'),

  (gen_random_uuid(), '3M Earplugs', 'WA', 10, 55, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'WA: 473,124 veterans 2024; 5,968/100k; Joint Base Lewis-McChord; active PTSD/hearing clinics (VA VetPop 2024)'),

-- ============================================================
-- HERNIA MESH (10 states)
-- Sources: USAFacts 2024 (age 65+); JAMA Surgery 2015 (hernia repair rates); Trustwell/Motley Rice MDL data
-- ============================================================
  (gen_random_uuid(), 'Hernia Mesh', 'CA', 1, 95, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'CA: 6.2M residents 65+ — largest elderly pop US; high surgical volume; active state court dockets (USAFacts 2024)'),

  (gen_random_uuid(), 'Hernia Mesh', 'FL', 2, 91, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'FL: 4.8M residents 65+ (21.8%) — 2nd most nationally; large hernia surgery volume (USAFacts 2024)'),

  (gen_random_uuid(), 'Hernia Mesh', 'TX', 3, 87, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'TX: 3.9M residents 65+; emergent hernia rate 71.3/100k for 65+ (JAMA Surgery 2015); active tort courts'),

  (gen_random_uuid(), 'Hernia Mesh', 'NY', 4, 83, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'NY: 3.6M residents 65+ (18.1%); large hospital system volume; Covidien state claims (USAFacts 2024)'),

  (gen_random_uuid(), 'Hernia Mesh', 'PA', 5, 80, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'PA: 2.6M residents 65+ (20.4%); MDL-adjacent litigation; 459/100k overall cancer rate (USAFacts 2024)'),

  (gen_random_uuid(), 'Hernia Mesh', 'OH', 6, 77, 'Litigation Concentration',
   ARRAY['Litigation Concentration','Large Population'],
   'OH: Bard hernia mesh MDL 2846 in S.D. Ohio — 24,000+ cases pending as of 2025 (Motley Rice); 2.1M residents 65+'),

  (gen_random_uuid(), 'Hernia Mesh', 'NJ', 7, 74, 'Litigation Concentration',
   ARRAY['Litigation Concentration','Large Population'],
   'NJ: Ethicon (J&J) home state; MCL for Physiomesh designated NJ Supreme Court; 1.6M residents 65+ (Trustwell Law)'),

  (gen_random_uuid(), 'Hernia Mesh', 'MA', 8, 71, 'Litigation Concentration',
   ARRAY['Litigation Concentration','Large Population'],
   'MA: Covidien hernia mesh MDL No. 3029 in D.Mass.; 4,700+ state court cases; 1.26M residents 65+ (Trustwell Law)'),

  (gen_random_uuid(), 'Hernia Mesh', 'IL', 9, 68, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'IL: 2.1M residents 65+; 13M population; high surgical volume; 459/100k overall cancer incidence (USAFacts 2024)'),

  (gen_random_uuid(), 'Hernia Mesh', 'MI', 10, 65, 'Large Population',
   ARRAY['Large Population','High Incidence'],
   'MI: 1.88M residents 65+ (18.7%); 10M population; large hernia mesh market; 460k veterans (USAFacts 2024)'),

-- ============================================================
-- AFFF FIREFIGHTING FOAM (10 states)
-- Source: PFAS Water Experts military base contamination database; EPA UCMR 5; MAPSCAPING
-- ============================================================
  (gen_random_uuid(), 'AFFF Firefighting Foam', 'CA', 1, 95, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Industrial Exposure'],
   'CA: NAWS China Lake 8,000,000 ppt total PFAS — highest single US site; 18+ AF/Navy/Army contaminated bases (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'TX', 2, 90, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Large Population'],
   'TX: 19 contaminated military sites; Sheppard AFB 2,859,600 ppt; Dyess AFB 1,623,170 ppt (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'FL', 3, 87, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Large Population'],
   'FL: Patrick AFB 4,510,000 ppt — 3rd highest US; NAS Key West 1.5M ppt; Tyndall AFB 957k ppt (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'LA', 4, 84, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Industrial Exposure'],
   'LA: England AFB 33,502,500 ppt — highest contamination of any US military base (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'VA', 5, 81, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Veteran Population'],
   'VA: MCB Quantico 2,293,632 ppt; Langley AFB 2,275,000 ppt; Norfolk Naval 284,922 ppt (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'GA', 6, 78, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Large Population'],
   'GA: Fort Stewart-Hunter AAF 2,136,700 ppt; Moody AFB 665,000 ppt; Robins AFB 330,000 ppt (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'MI', 7, 75, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Regulatory Activity'],
   'MI: Wurtsmith AFB legacy + Camp Grayling contamination; among highest UCMR 5 detection states (EPA UCMR 5 / MAPSCAPING)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'OK', 8, 72, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Industrial Exposure'],
   'OK: Altus AFB 2,739,880 ppt — 5th highest military site nationally; Vance AFB 690,000 ppt (PFAS Water Experts)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'NJ', 9, 69, 'Regulatory Activity',
   ARRAY['Regulatory Activity','Exposure Hotspot'],
   'NJ: highest density PFAS-contaminated water systems per EPA UCMR 5; historic industrial PFAS (EPA UCMR 5 / MAPSCAPING)'),

  (gen_random_uuid(), 'AFFF Firefighting Foam', 'NC', 10, 65, 'Exposure Hotspot',
   ARRAY['Exposure Hotspot','Veteran Population'],
   'NC: Cherry Point MCAS 559,623 ppt; Seymour Johnson AFB 414,000 ppt; 615k veterans (PFAS Water Experts)'),

-- ============================================================
-- CAMP LEJEUNE (10 states)
-- Source: VA VetPop 2024 via World Population Review; 261k+ claims filed (Navy.mil)
-- NOTE: Plaintiffs are nationwide veterans — NC has the base but victims are geographically distributed
-- ============================================================
  (gen_random_uuid(), 'Camp Lejeune', 'CA', 1, 95, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'CA: 1,305,450 veterans 2024 — largest USMC veteran pool (Camp Pendleton, 29 Palms) (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'TX', 2, 90, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'TX: 1,402,360 veterans 2024 — largest total veteran count; USMC and multi-branch (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'FL', 3, 87, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'FL: 1,327,070 veterans 2024 — large Marine/Navy veteran retiree pop; 5,704/100k (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'NC', 4, 84, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'NC: 615,509 veterans 2024; Camp Lejeune located in NC — large veteran population of former residents (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'VA', 5, 81, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'VA: 629,500 veterans 2024; 7,137/100k — 2nd highest rate US; USMC Quantico HQ (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'PA', 6, 78, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'PA: 632,183 veterans 2024 — 4th largest state count; large working-class veteran pop; active plaintiff bar (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'NY', 7, 74, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'NY: 581,776 veterans 2024; 19M population; large Marine veteran community; active mass tort bar (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'OH', 8, 71, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'OH: 605,840 veterans 2024; 5,108/100k; large blue-collar veteran community; plaintiff-friendly venues (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'GA', 9, 68, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'GA: 601,304 veterans 2024; Fort Moore, Fort Stewart; large active-duty/veteran communities (VA VetPop 2024)'),

  (gen_random_uuid(), 'Camp Lejeune', 'IL', 10, 65, 'Veteran Population',
   ARRAY['Veteran Population','Large Population'],
   'IL: 478,196 veterans 2024; 13M population; Chicago mass tort bar; diverse veteran community (VA VetPop 2024)');

COMMIT;
