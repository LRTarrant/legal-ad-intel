-- Fix Alaska borough demographics not joining to County Intelligence.
--
-- County Intelligence joins census_demographics to the map geometry by
-- normalized county name. Five of Alaska's 29 boroughs failed to join, so they
-- showed "—" for all demographics. Two distinct causes, both fixed here.
--
-- This migration is idempotent (re-runnable): the UPDATEs match the exact
-- truncated strings (a second run finds nothing to change), and the INSERT uses
-- ON CONFLICT DO NOTHING on the (fips_full, acs_vintage) unique key.
--
-- 1) TRUNCATED NAMES (Alaska-only). Four "City and Borough" units were stored
--    with the trailing " Borough" missing ("Juneau City and", etc.), so the
--    name normalizer (which strips a trailing "City and Borough") never reduced
--    them to the bare "Juneau"/"Sitka"/"Wrangell"/"Yakutat" the geometry and
--    accident data use. Restore the canonical Census names.
UPDATE census_demographics SET county_name = 'Juneau City and Borough'
  WHERE state_abbr = 'AK' AND county_name = 'Juneau City and';
UPDATE census_demographics SET county_name = 'Sitka City and Borough'
  WHERE state_abbr = 'AK' AND county_name = 'Sitka City and';
UPDATE census_demographics SET county_name = 'Wrangell City and Borough'
  WHERE state_abbr = 'AK' AND county_name = 'Wrangell City and';
UPDATE census_demographics SET county_name = 'Yakutat City and Borough'
  WHERE state_abbr = 'AK' AND county_name = 'Yakutat City and';

-- 2) 2019 REORGANIZATION. The map geometry (us-atlas) and FARS accident data
--    still use the pre-2019 "Valdez-Cordova Census Area" (FIPS 02261). In 2019
--    it was partitioned, with no boundary change, into Chugach (02063) and
--    Copper River (02066), which is what current ACS — and thus
--    census_demographics — carries. Because the split was an exact partition,
--    reconstruct the old area as a population-weighted aggregate of the two
--    successors so the borough the map actually renders gets demographics.
--    (Medians are pop-weighted averages of the component medians — an estimate,
--    since true medians can't be recombined from summaries. The two successor
--    rows are left intact; nothing aggregates this table per state, so the
--    extra reconstructed row does not double-count any displayed figure.)
INSERT INTO census_demographics (
  fips_full, state_abbr, county_name, acs_vintage,
  total_population, median_age,
  pct_white, pct_black, pct_hispanic, pct_asian, pct_native,
  median_household_income, pct_poverty, mean_commute_minutes
)
SELECT
  '02261', 'AK', 'Valdez-Cordova', 2024,
  SUM(total_population),
  ROUND(SUM(median_age::numeric              * total_population) / SUM(total_population), 1),
  ROUND(SUM(pct_white::numeric               * total_population) / SUM(total_population), 1),
  ROUND(SUM(pct_black::numeric               * total_population) / SUM(total_population), 1),
  ROUND(SUM(pct_hispanic::numeric            * total_population) / SUM(total_population), 1),
  ROUND(SUM(pct_asian::numeric               * total_population) / SUM(total_population), 1),
  ROUND(SUM(pct_native::numeric              * total_population) / SUM(total_population), 1),
  ROUND(SUM(median_household_income::numeric * total_population) / SUM(total_population))::int,
  ROUND(SUM(pct_poverty::numeric             * total_population) / SUM(total_population), 1),
  ROUND(SUM(mean_commute_minutes::numeric    * total_population) / SUM(total_population), 1)
FROM census_demographics
WHERE state_abbr = 'AK' AND fips_full IN ('02063', '02066')
ON CONFLICT (fips_full, acs_vintage) DO NOTHING;
