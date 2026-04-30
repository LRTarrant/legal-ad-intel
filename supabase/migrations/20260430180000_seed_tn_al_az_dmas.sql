-- Seed DMA rows for Tennessee (6), Alabama (4), and Arizona (3).
-- These states had zero geo_targets rows, causing state-intelligence pages
-- to show "data collection in progress" placeholders for all advertising sections.

-- Tennessee DMAs
INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '659', 'Nashville', 'TN', 2800000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '659');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '640', 'Memphis', 'TN', 1250000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '640');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '557', 'Knoxville', 'TN', 1000000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '557');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '531', 'Tri-Cities (Bristol-Kingsport-Johnson City)', 'TN', 500000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '531');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '575', 'Chattanooga', 'TN', 600000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '575');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '639', 'Jackson, TN', 'TN', 130000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '639');

-- Alabama DMAs
INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '630', 'Birmingham (Anniston and Tuscaloosa)', 'AL', 1800000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '630');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '691', 'Huntsville-Decatur (Florence)', 'AL', 750000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '691');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '686', 'Mobile-Pensacola (Ft Walton Beach)', 'AL', 1400000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '686');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '698', 'Montgomery-Selma', 'AL', 450000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '698');

-- Arizona DMAs
INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '753', 'Phoenix (Prescott)', 'AZ', 5000000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '753');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '789', 'Tucson (Sierra Vista)', 'AZ', 1100000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '789');

INSERT INTO geo_targets (geo_type, geo_code, geo_name, state_abbr, population)
SELECT 'DMA', '771', 'Yuma-El Centro', 'AZ', 360000
WHERE NOT EXISTS (SELECT 1 FROM geo_targets WHERE geo_type = 'DMA' AND geo_code = '771');
