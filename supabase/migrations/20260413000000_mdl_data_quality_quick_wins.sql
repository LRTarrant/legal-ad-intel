-- MDL Data Quality Quick Wins
-- Applied: 2026-04-13
-- Context: Audit of MDL/docket data revealed gaps in completeness and accuracy.
--          This migration implements 6 targeted fixes identified as quick wins.
--
-- All statements are idempotent and safe to re-run.

------------------------------------------------------------------------
-- Fix 1: Map mass_tort_id for all MDLs with matching torts
--   24 MDLs mapped to 14 mass_torts. 194 MDLs remain null (antitrust,
--   data breach, patent, securities cases with no matching mass_tort).
------------------------------------------------------------------------

UPDATE mdls SET mass_tort_id = mt.id
FROM mass_torts mt
WHERE mdls.mass_tort_id IS NULL
  AND (
    -- Direct name matches
    (mdls.title ILIKE '%talcum%' AND mt.name = 'Talcum Powder')
    OR (mdls.title ILIKE '%roundup%' AND mt.name = 'Roundup')
    OR (mdls.title ILIKE '%zantac%' AND mt.name = 'Zantac')
    OR (mdls.title ILIKE '%paraquat%' AND mt.name = 'Paraquat')
    OR (mdls.title ILIKE '%camp lejeune%' AND mt.name = 'Camp Lejeune')
    OR (mdls.title ILIKE '%hair relaxer%' AND mt.name = 'Hair Relaxer')
    OR (mdls.title ILIKE '%3m combat arms%' AND mt.name = '3M Earplugs')
    OR (mdls.title ILIKE '%social media%' AND mt.name = 'Social Media Youth Harm')
    OR (mdls.title ILIKE '%tiktok%' AND mt.name = 'Social Media Youth Harm')
    OR (mdls.title ILIKE '%roblox%' AND mt.name = 'Social Media Youth Harm')
    OR (mdls.title ILIKE '%acetaminophen%' AND mt.name = 'Tylenol / Acetaminophen')
    -- AFFF / firefighting foam
    OR (mdls.title ILIKE '%aqueous film%' AND mt.name = 'AFFF Firefighting Foam')
    OR (mdls.title ILIKE '%du pont%c-8%' AND mt.name = 'AFFF Firefighting Foam')
    -- CPAP
    OR (mdls.title ILIKE '%philips%cpap%' AND mt.name = 'CPAP')
    OR (mdls.title ILIKE '%soclean%' AND mt.name = 'CPAP')
    -- Hernia Mesh
    OR (mdls.title ILIKE '%hernia mesh%' AND mt.name = 'Hernia Mesh')
    OR (mdls.title ILIKE '%atrium%c-qur%' AND mt.name = 'Hernia Mesh')
    OR (mdls.title ILIKE '%ethicon%physiomesh%' AND mt.name = 'Hernia Mesh')
    -- NEC Baby Formula
    OR (mdls.title ILIKE '%preterm infant nutrition%' AND mt.name = 'NEC Baby Formula')
    OR (mdls.title ILIKE '%abbott infant formula%' AND mt.name = 'NEC Baby Formula')
    -- Ozempic / GLP-1
    OR (mdls.title ILIKE '%ozempic%' AND mt.name = 'Ozempic / Mounjaro')
    OR (mdls.title ILIKE '%glucagon-like peptide%' AND mt.name = 'Ozempic / Mounjaro')
    -- Opiates
    OR (mdls.title ILIKE '%opiate%' AND mt.name = 'Opioids')
    OR (mdls.title ILIKE '%opioid%' AND mt.name = 'Opioids')
  );

------------------------------------------------------------------------
-- Fix 2: Mark 60 orphan MDLs as inactive
--   MDLs not present in the most recent JPML snapshot are no longer
--   actively tracked by the JPML panel → set status = 'inactive'.
------------------------------------------------------------------------

UPDATE mdls
SET status = 'inactive'
WHERE mdl_number NOT IN (
    SELECT DISTINCT mdl_number
    FROM jpml_snapshots
    WHERE report_date = (SELECT MAX(report_date) FROM jpml_snapshots)
)
AND status != 'inactive';

------------------------------------------------------------------------
-- Fix 3: Copy filed_date from JPML snapshots
--   158 active MDLs now have filed_date (range: 2000-06-06 to 2025-11-19).
--   closed_date: 0 populated — all JPML-tracked MDLs are currently open.
------------------------------------------------------------------------

UPDATE mdls m
SET filed_date = js.date_filed
FROM (
    SELECT DISTINCT ON (mdl_number) mdl_number, date_filed
    FROM jpml_snapshots
    ORDER BY mdl_number, report_date DESC
) js
WHERE js.mdl_number = m.mdl_number
  AND js.date_filed IS NOT NULL
  AND m.filed_date IS NULL;

------------------------------------------------------------------------
-- Fix 4: Calculate pending_actions_change using LAG() window function
--   4,218 of 4,435 rows populated. 217 null (first month per MDL).
------------------------------------------------------------------------

WITH changes AS (
    SELECT
        id,
        pending_actions - LAG(pending_actions) OVER (
            PARTITION BY mdl_number ORDER BY month
        ) AS delta
    FROM mdl_stats_monthly
)
UPDATE mdl_stats_monthly msm
SET pending_actions_change = c.delta
FROM changes c
WHERE msm.id = c.id
  AND c.delta IS NOT NULL
  AND msm.pending_actions_change IS NULL;

------------------------------------------------------------------------
-- Fix 5: Fix 17 missing districts + judge_name swap on MDL 2626
--   15 nulls backfilled from JPML snapshots. 2 manually corrected:
--     MDL 2626: judge_name had "FLM" → district="FLM", judge="Harvey E. Schlesinger"
--     MDL 3074: district set to "PAE"
------------------------------------------------------------------------

-- Backfill from JPML snapshots
UPDATE mdls m
SET district = js.district
FROM (
    SELECT DISTINCT ON (mdl_number) mdl_number, district
    FROM jpml_snapshots
    ORDER BY mdl_number, report_date DESC
) js
WHERE js.mdl_number = m.mdl_number
  AND m.district IS NULL
  AND js.district IS NOT NULL;

-- Manual corrections
UPDATE mdls SET district = 'FLM', judge_name = 'Harvey E. Schlesinger'
WHERE mdl_number = 2626 AND (district IS NULL OR judge_name = 'FLM');

UPDATE mdls SET district = 'PAE'
WHERE mdl_number = 3074 AND district IS NULL;

------------------------------------------------------------------------
-- Fix 6: Generate source_url for all 218 MDLs
--   Tier 1: 5 major MDLs → direct CourtListener docket URLs (verified IDs)
--   Tier 2: 153 active MDLs → CourtListener search URLs using master_docket
--   Tier 3: 60 inactive MDLs → JPML pending-MDLs listing page
------------------------------------------------------------------------

-- Tier 1: Direct CourtListener URLs for 5 MDLs with known docket IDs
UPDATE mdls SET source_url = CASE mdl_number
    WHEN 2738 THEN 'https://www.courtlistener.com/docket/6245245/in-re-johnson-johnson-talcum-powder-products-marketing/'
    WHEN 2873 THEN 'https://www.courtlistener.com/docket/8408916/in-re-aqueous-film-forming-foams-products-liability-litigation/'
    WHEN 2741 THEN 'https://www.courtlistener.com/docket/5981306/in-re-roundup-products-liability-litigation/'
    WHEN 2804 THEN 'https://www.courtlistener.com/docket/61465334/in-re-national-prescription-opiate-litigation/'
    WHEN 2924 THEN 'https://www.courtlistener.com/docket/64859863/in-re-zantac-ranitidine-products-liability-litigation/'
END
WHERE mdl_number IN (2738, 2873, 2741, 2804, 2924)
  AND source_url IS NULL;

-- Tier 2: CourtListener search URLs for remaining active MDLs
UPDATE mdls m
SET source_url = 'https://www.courtlistener.com/?type=r&docket_number='
    || js.master_docket
    || '&court='
    || CASE m.district
        WHEN 'ALN' THEN 'alnd' WHEN 'ALM' THEN 'almd' WHEN 'ALS' THEN 'alsd'
        WHEN 'ARE' THEN 'ared' WHEN 'ARW' THEN 'arwd' WHEN 'AZ'  THEN 'azd'
        WHEN 'CAC' THEN 'cacd' WHEN 'CAE' THEN 'caed' WHEN 'CAN' THEN 'cand'
        WHEN 'CAS' THEN 'casd' WHEN 'CO'  THEN 'cod'  WHEN 'CT'  THEN 'ctd'
        WHEN 'DC'  THEN 'dcd'  WHEN 'DE'  THEN 'ded'
        WHEN 'FLM' THEN 'flmd' WHEN 'FLN' THEN 'flnd' WHEN 'FLS' THEN 'flsd'
        WHEN 'GAN' THEN 'gand' WHEN 'GAS' THEN 'gasd'
        WHEN 'HI'  THEN 'hid'
        WHEN 'IAN' THEN 'iand' WHEN 'IAS' THEN 'iasd' WHEN 'ID'  THEN 'idd'
        WHEN 'ILN' THEN 'ilnd' WHEN 'ILS' THEN 'ilsd'
        WHEN 'INN' THEN 'innd' WHEN 'INS' THEN 'insd'
        WHEN 'KS'  THEN 'ksd'  WHEN 'KYE' THEN 'kyed' WHEN 'KYW' THEN 'kywd'
        WHEN 'LAE' THEN 'laed' WHEN 'LAM' THEN 'lamd' WHEN 'LAW' THEN 'lawd'
        WHEN 'MA'  THEN 'mad'  WHEN 'MD'  THEN 'mdd'  WHEN 'ME'  THEN 'med'
        WHEN 'MIE' THEN 'mied' WHEN 'MIW' THEN 'miwd' WHEN 'MN'  THEN 'mnd'
        WHEN 'MOE' THEN 'moed' WHEN 'MOW' THEN 'mowd'
        WHEN 'MSN' THEN 'msnd' WHEN 'MSS' THEN 'mssd' WHEN 'MT'  THEN 'mtd'
        WHEN 'NCE' THEN 'nced' WHEN 'NCM' THEN 'ncmd' WHEN 'NCW' THEN 'ncwd'
        WHEN 'ND'  THEN 'ndd'  WHEN 'NE'  THEN 'ned'  WHEN 'NH'  THEN 'nhd'
        WHEN 'NJ'  THEN 'njd'  WHEN 'NM'  THEN 'nmd'  WHEN 'NV'  THEN 'nvd'
        WHEN 'NYE' THEN 'nyed' WHEN 'NYN' THEN 'nynd' WHEN 'NYS' THEN 'nysd'
        WHEN 'NYW' THEN 'nywd'
        WHEN 'OHN' THEN 'ohnd' WHEN 'OHS' THEN 'ohsd'
        WHEN 'OKE' THEN 'oked' WHEN 'OKN' THEN 'oknd' WHEN 'OKW' THEN 'okwd'
        WHEN 'OR'  THEN 'ord'
        WHEN 'PAE' THEN 'paed' WHEN 'PAM' THEN 'pamd' WHEN 'PAW' THEN 'pawd'
        WHEN 'RI'  THEN 'rid'  WHEN 'SC'  THEN 'scd'  WHEN 'SD'  THEN 'sdd'
        WHEN 'TNE' THEN 'tned' WHEN 'TNM' THEN 'tnmd' WHEN 'TNW' THEN 'tnwd'
        WHEN 'TXE' THEN 'txed' WHEN 'TXN' THEN 'txnd' WHEN 'TXS' THEN 'txsd'
        WHEN 'TXW' THEN 'txwd' WHEN 'UT'  THEN 'utd'
        WHEN 'VAE' THEN 'vaed' WHEN 'VAW' THEN 'vawd' WHEN 'VT'  THEN 'vtd'
        WHEN 'WAE' THEN 'waed' WHEN 'WAW' THEN 'wawd'
        WHEN 'WIE' THEN 'wied' WHEN 'WIW' THEN 'wiwd'
        WHEN 'WVN' THEN 'wvnd' WHEN 'WVS' THEN 'wvsd' WHEN 'WY'  THEN 'wyd'
        ELSE LOWER(m.district) || 'd'
    END
FROM (
    SELECT DISTINCT ON (mdl_number) mdl_number, master_docket
    FROM jpml_snapshots
    ORDER BY mdl_number, report_date DESC
) js
WHERE js.mdl_number = m.mdl_number
  AND m.source_url IS NULL
  AND m.status = 'active';

-- Tier 3: JPML listing page for inactive MDLs
UPDATE mdls
SET source_url = 'https://www.jpml.uscourts.gov/content/pending-mdls'
WHERE status = 'inactive'
  AND source_url IS NULL;
