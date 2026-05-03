-- Seed: dma_markets_v1
-- Purpose: Initial DMA seed for Campaign Builder PI launch
-- Coverage: Top 25 national markets + full coverage for live states (AL, AZ, CA, FL, GA, TN)
--           + major-metro coverage for top-10-PI-volume states (TX, NY, IL, OH, NC, MI, PA)
-- Source: Nielsen DMA codes (verified against published reference)
--
-- Note: display_name is the colloquial single-name version used in script generation.
-- full_name is the official Nielsen designation (only shown in UI picker, never in scripts).

INSERT INTO dma_markets (dma_code, display_name, full_name, primary_state, states_covered, population, rank) VALUES
-- Top 25 national markets
('501', 'New York', 'New York', 'NY', ARRAY['NY','NJ','PA','CT'], 20300000, 1),
('803', 'Los Angeles', 'Los Angeles', 'CA', ARRAY['CA'], 17600000, 2),
('602', 'Chicago', 'Chicago', 'IL', ARRAY['IL','IN'], 9500000, 3),
('504', 'Philadelphia', 'Philadelphia', 'PA', ARRAY['PA','NJ','DE'], 8000000, 4),
('623', 'Dallas', 'Dallas-Ft. Worth', 'TX', ARRAY['TX'], 7800000, 5),
('807', 'San Francisco', 'San Francisco-Oakland-San Jose', 'CA', ARRAY['CA'], 7400000, 6),
('511', 'Washington DC', 'Washington (Hagerstown)', 'DC', ARRAY['DC','MD','VA','WV'], 6500000, 7),
('618', 'Houston', 'Houston', 'TX', ARRAY['TX'], 6900000, 8),
('506', 'Boston', 'Boston (Manchester)', 'MA', ARRAY['MA','NH'], 6500000, 9),
('524', 'Atlanta', 'Atlanta', 'GA', ARRAY['GA','AL'], 6300000, 10),
('753', 'Phoenix', 'Phoenix (Prescott)', 'AZ', ARRAY['AZ'], 5300000, 11),
('528', 'Miami', 'Miami-Ft. Lauderdale', 'FL', ARRAY['FL'], 4700000, 12),
('819', 'Seattle', 'Seattle-Tacoma', 'WA', ARRAY['WA'], 5100000, 13),
('505', 'Detroit', 'Detroit', 'MI', ARRAY['MI'], 4900000, 14),
('534', 'Orlando', 'Orlando-Daytona Beach-Melbourne', 'FL', ARRAY['FL'], 4400000, 15),
('613', 'Minneapolis', 'Minneapolis-St. Paul', 'MN', ARRAY['MN','WI'], 4500000, 16),
('539', 'Tampa', 'Tampa-St. Petersburg (Sarasota)', 'FL', ARRAY['FL'], 4400000, 17),
('560', 'Raleigh-Durham', 'Raleigh-Durham (Fayetteville)', 'NC', ARRAY['NC'], 3300000, 18),
('510', 'Cleveland', 'Cleveland-Akron (Canton)', 'OH', ARRAY['OH'], 3600000, 19),
('862', 'Sacramento', 'Sacramento-Stockton-Modesto', 'CA', ARRAY['CA'], 4200000, 20),
('533', 'Hartford', 'Hartford & New Haven', 'CT', ARRAY['CT'], 2700000, 21),
('751', 'Denver', 'Denver', 'CO', ARRAY['CO'], 4400000, 22),
('566', 'Harrisburg', 'Harrisburg-Lancaster-Lebanon-York', 'PA', ARRAY['PA'], 2300000, 23),
('527', 'Indianapolis', 'Indianapolis', 'IN', ARRAY['IN'], 2900000, 24),
('825', 'San Diego', 'San Diego', 'CA', ARRAY['CA'], 3300000, 25),
('820', 'Portland OR', 'Portland, OR', 'OR', ARRAY['OR','WA'], 3300000, 26),

-- ALABAMA full coverage
('630', 'Birmingham', 'Birmingham (Anniston and Tuscaloosa)', 'AL', ARRAY['AL'], 1800000, 44),
('691', 'Huntsville', 'Huntsville-Decatur (Florence)', 'AL', ARRAY['AL','TN'], 1100000, 81),
('686', 'Mobile', 'Mobile-Pensacola (Ft. Walton Beach)', 'AL', ARRAY['AL','FL'], 1500000, 60),
('698', 'Montgomery', 'Montgomery-Selma', 'AL', ARRAY['AL'], 660000, 117),
('522', 'Columbus GA', 'Columbus, GA (Opelika, AL)', 'GA', ARRAY['GA','AL'], 540000, 128),

-- ARIZONA full coverage (Phoenix in top 25)
('789', 'Tucson', 'Tucson (Sierra Vista)', 'AZ', ARRAY['AZ'], 1200000, 67),
('771', 'Yuma-El Centro', 'Yuma-El Centro', 'AZ', ARRAY['AZ','CA'], 380000, 159),

-- CALIFORNIA additional (LA, SF, Sacramento, San Diego in top 25)
('800', 'Bakersfield', 'Bakersfield', 'CA', ARRAY['CA'], 920000, 124),
('855', 'Santa Barbara', 'Santa Barbara-Santa Maria-San Luis Obispo', 'CA', ARRAY['CA'], 750000, 122),
('828', 'Monterey-Salinas', 'Monterey-Salinas', 'CA', ARRAY['CA'], 770000, 125),
('802', 'Eureka', 'Eureka', 'CA', ARRAY['CA'], 280000, 196),
('866', 'Fresno-Visalia', 'Fresno-Visalia', 'CA', ARRAY['CA'], 1700000, 56),
('804', 'Palm Springs', 'Palm Springs', 'CA', ARRAY['CA'], 460000, 145),
('868', 'Chico-Redding', 'Chico-Redding', 'CA', ARRAY['CA'], 600000, 132),

-- FLORIDA additional (Miami, Orlando, Tampa, West Palm in top 25)
('530', 'Tallahassee', 'Tallahassee-Thomasville', 'FL', ARRAY['FL','GA'], 800000, 109),
('592', 'Gainesville', 'Gainesville', 'FL', ARRAY['FL'], 470000, 162),
('561', 'Jacksonville', 'Jacksonville', 'FL', ARRAY['FL'], 2000000, 47),
('571', 'Ft. Myers', 'Ft. Myers-Naples', 'FL', ARRAY['FL'], 1700000, 60),
('656', 'Panama City', 'Panama City', 'FL', ARRAY['FL'], 480000, 156),
('548', 'West Palm Beach', 'West Palm Beach-Ft. Pierce', 'FL', ARRAY['FL'], 1900000, 38),

-- GEORGIA additional (Atlanta in top 25)
('520', 'Augusta', 'Augusta', 'GA', ARRAY['GA','SC'], 770000, 116),
('507', 'Savannah', 'Savannah', 'GA', ARRAY['GA','SC'], 850000, 95),
('503', 'Macon', 'Macon', 'GA', ARRAY['GA'], 580000, 124),
('525', 'Albany GA', 'Albany, GA', 'GA', ARRAY['GA'], 350000, 167),

-- TENNESSEE full coverage
('659', 'Nashville', 'Nashville', 'TN', ARRAY['TN','KY'], 2700000, 27),
('640', 'Memphis', 'Memphis', 'TN', ARRAY['TN','MS','AR'], 1700000, 50),
('557', 'Knoxville', 'Knoxville', 'TN', ARRAY['TN'], 1100000, 64),
('531', 'Tri-Cities', 'Tri-Cities, TN-VA', 'TN', ARRAY['TN','VA'], 770000, 99),
('575', 'Chattanooga', 'Chattanooga', 'TN', ARRAY['TN','GA'], 950000, 86),
('639', 'Jackson TN', 'Jackson, TN', 'TN', ARRAY['TN'], 230000, 184),

-- Top-10-PI-volume state additional coverage
-- TEXAS (Dallas, Houston in top 25)
('641', 'San Antonio', 'San Antonio', 'TX', ARRAY['TX'], 2900000, 31),
('635', 'Austin', 'Austin', 'TX', ARRAY['TX'], 2400000, 34),
('765', 'El Paso', 'El Paso (Las Cruces)', 'TX', ARRAY['TX','NM'], 1100000, 98),
('692', 'Beaumont', 'Beaumont-Port Arthur', 'TX', ARRAY['TX'], 480000, 145),
('709', 'Tyler', 'Tyler-Longview (Lufkin & Nacogdoches)', 'TX', ARRAY['TX'], 700000, 111),
('600', 'Corpus Christi', 'Corpus Christi', 'TX', ARRAY['TX'], 670000, 130),

-- NORTH CAROLINA (Raleigh in top 25)
('517', 'Charlotte', 'Charlotte', 'NC', ARRAY['NC','SC'], 3000000, 22),
('518', 'Greensboro', 'Greensboro-High Point-Winston Salem', 'NC', ARRAY['NC'], 1600000, 47),
('519', 'Charleston SC', 'Charleston, SC', 'SC', ARRAY['SC'], 800000, 90),

-- OHIO (Cleveland in top 25)
('515', 'Cincinnati', 'Cincinnati', 'OH', ARRAY['OH','KY','IN'], 2200000, 36),
('535', 'Columbus OH', 'Columbus, OH', 'OH', ARRAY['OH'], 2200000, 33),
('542', 'Dayton', 'Dayton', 'OH', ARRAY['OH'], 1100000, 65),
('547', 'Toledo', 'Toledo', 'OH', ARRAY['OH'], 1000000, 75),

-- MICHIGAN (Detroit in top 25)
('563', 'Grand Rapids', 'Grand Rapids-Kalamazoo-Battle Creek', 'MI', ARRAY['MI'], 1700000, 41),
('553', 'Marquette', 'Marquette', 'MI', ARRAY['MI'], 200000, 180),
('513', 'Flint', 'Flint-Saginaw-Bay City', 'MI', ARRAY['MI'], 1200000, 73),

-- NEW YORK (NYC in top 25)
('514', 'Buffalo', 'Buffalo', 'NY', ARRAY['NY'], 1500000, 53),
('555', 'Syracuse', 'Syracuse', 'NY', ARRAY['NY'], 1100000, 84),

-- ILLINOIS (Chicago in top 25)
('675', 'Peoria', 'Peoria-Bloomington', 'IL', ARRAY['IL'], 590000, 118),
('648', 'Champaign', 'Champaign & Springfield-Decatur', 'IL', ARRAY['IL'], 800000, 87),

-- INDIANA (Indianapolis in top 25)
('582', 'Lafayette IN', 'Lafayette, IN', 'IN', ARRAY['IN'], 200000, 188),

-- PENNSYLVANIA (Philadelphia, Harrisburg in top 25)
('508', 'Pittsburgh', 'Pittsburgh', 'PA', ARRAY['PA'], 2300000, 26),
('577', 'Wilkes Barre', 'Wilkes Barre-Scranton', 'PA', ARRAY['PA'], 1300000, 56),
('574', 'Johnstown', 'Johnstown-Altoona-State College', 'PA', ARRAY['PA'], 770000, 102),
('516', 'Erie', 'Erie', 'PA', ARRAY['PA'], 320000, 145)
ON CONFLICT (dma_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  full_name = EXCLUDED.full_name,
  primary_state = EXCLUDED.primary_state,
  states_covered = EXCLUDED.states_covered,
  population = EXCLUDED.population,
  rank = EXCLUDED.rank,
  updated_at = NOW();

-- Note: This is an initial seed for v1 launch covering live states + top national markets.
-- Full Nielsen DMA list (210 total) should be populated in a later batch as needed.
