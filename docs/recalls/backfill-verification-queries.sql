-- ============================================================================
-- Post-backfill verification queries
--
-- Run these after the one-time backfill (--backfill-since 2010-01-01) to
-- confirm that all 3,929 existing rows have been corrected from device
-- regulatory class labels to FDA recall severity class labels.
-- ============================================================================

-- 1. Distribution of recall_class after backfill
--    Expected (rough): ~9% Class I, ~88% Class II, ~3% Class III based on
--    enforcement.json overall distribution.  The exact split depends on what
--    manufacturers are in our corpus.
SELECT
    recall_class,
    COUNT(*)                                        AS row_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM public.recalls
WHERE source = 'openfda_device'
GROUP BY recall_class
ORDER BY recall_class;


-- 2. Philips Respironics CPAP foam recalls — spot-check
--    These four product families should show Class I for the original foam
--    events and Class II for the 2022 silicone-foam remediation follow-up.
--    res_event_numbers: 88058, 88071, 89276 → Class I
--                       91293             → Class II
--
--    Note: external_id stores product_res_number (Z-number), not
--    res_event_number.  The query below joins via raw_payload if available,
--    or you can look up by manufacturer name.
SELECT
    external_id,
    recall_class,
    event_date_initiated,
    product_description
FROM public.recalls r
JOIN public.recall_manufacturers m ON m.id = r.manufacturer_id
WHERE m.canonical_name ILIKE '%Philips Respironics%'
ORDER BY event_date_initiated;


-- 3. Count of Unclassified rows
--    These are recalls whose product_res_number had no match in the
--    enforcement endpoint at the time of ingest (typically the most recent
--    ~30 days after initiation).  Expected: small but non-zero.
--    If this is >5% of total, investigate enforcement endpoint lag.
SELECT
    COUNT(*)                                            AS unclassified_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.recalls WHERE source = 'openfda_device'), 1) AS pct_of_total
FROM public.recalls
WHERE source = 'openfda_device'
  AND recall_class = 'Unclassified';


-- 4. Class I recall count per manufacturer (top 20 by Class I recalls)
--    This feeds the class_i_recall_count displayed in the Watchlist UI.
--    After backfill, manufacturers like Philips Respironics should appear
--    with non-zero Class I counts.
SELECT
    m.canonical_name,
    COUNT(*) FILTER (WHERE r.recall_class = 'Class I')  AS class_i_count,
    COUNT(*) FILTER (WHERE r.recall_class = 'Class II') AS class_ii_count,
    COUNT(*) FILTER (WHERE r.recall_class = 'Class III') AS class_iii_count,
    COUNT(*)                                              AS total_recalls
FROM public.recalls r
JOIN public.recall_manufacturers m ON m.id = r.manufacturer_id
WHERE r.source = 'openfda_device'
GROUP BY m.canonical_name
ORDER BY class_i_count DESC, total_recalls DESC
LIMIT 20;
