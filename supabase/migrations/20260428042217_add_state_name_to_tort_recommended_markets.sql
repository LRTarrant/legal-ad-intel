BEGIN;

-- Add the state_name column (nullable initially for backfill)
ALTER TABLE tort_recommended_markets ADD COLUMN IF NOT EXISTS state_name text;

-- Backfill state_name from the 2-letter state code
UPDATE tort_recommended_markets
SET state_name = CASE state
  WHEN 'AL' THEN 'Alabama'
  WHEN 'AK' THEN 'Alaska'
  WHEN 'AZ' THEN 'Arizona'
  WHEN 'AR' THEN 'Arkansas'
  WHEN 'CA' THEN 'California'
  WHEN 'CO' THEN 'Colorado'
  WHEN 'CT' THEN 'Connecticut'
  WHEN 'DE' THEN 'Delaware'
  WHEN 'FL' THEN 'Florida'
  WHEN 'GA' THEN 'Georgia'
  WHEN 'HI' THEN 'Hawaii'
  WHEN 'ID' THEN 'Idaho'
  WHEN 'IL' THEN 'Illinois'
  WHEN 'IN' THEN 'Indiana'
  WHEN 'IA' THEN 'Iowa'
  WHEN 'KS' THEN 'Kansas'
  WHEN 'KY' THEN 'Kentucky'
  WHEN 'LA' THEN 'Louisiana'
  WHEN 'ME' THEN 'Maine'
  WHEN 'MD' THEN 'Maryland'
  WHEN 'MA' THEN 'Massachusetts'
  WHEN 'MI' THEN 'Michigan'
  WHEN 'MN' THEN 'Minnesota'
  WHEN 'MS' THEN 'Mississippi'
  WHEN 'MO' THEN 'Missouri'
  WHEN 'MT' THEN 'Montana'
  WHEN 'NE' THEN 'Nebraska'
  WHEN 'NV' THEN 'Nevada'
  WHEN 'NH' THEN 'New Hampshire'
  WHEN 'NJ' THEN 'New Jersey'
  WHEN 'NM' THEN 'New Mexico'
  WHEN 'NY' THEN 'New York'
  WHEN 'NC' THEN 'North Carolina'
  WHEN 'ND' THEN 'North Dakota'
  WHEN 'OH' THEN 'Ohio'
  WHEN 'OK' THEN 'Oklahoma'
  WHEN 'OR' THEN 'Oregon'
  WHEN 'PA' THEN 'Pennsylvania'
  WHEN 'RI' THEN 'Rhode Island'
  WHEN 'SC' THEN 'South Carolina'
  WHEN 'SD' THEN 'South Dakota'
  WHEN 'TN' THEN 'Tennessee'
  WHEN 'TX' THEN 'Texas'
  WHEN 'UT' THEN 'Utah'
  WHEN 'VT' THEN 'Vermont'
  WHEN 'VA' THEN 'Virginia'
  WHEN 'WA' THEN 'Washington'
  WHEN 'WV' THEN 'West Virginia'
  WHEN 'WI' THEN 'Wisconsin'
  WHEN 'WY' THEN 'Wyoming'
  WHEN 'DC' THEN 'District of Columbia'
END
WHERE state_name IS NULL;

-- Now enforce NOT NULL
ALTER TABLE tort_recommended_markets ALTER COLUMN state_name SET NOT NULL;

COMMIT;
