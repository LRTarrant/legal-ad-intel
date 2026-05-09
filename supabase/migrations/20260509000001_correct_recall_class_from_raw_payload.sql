-- ============================================================================
-- Correct recall_class taxonomy — document + COMMENT ON COLUMN
--
-- Background
-- ----------
-- The openfda_device_recalls pipeline previously populated recall_class by
-- reading openfda.device_class (the device's FDA regulatory class: 1/2/3 for
-- general/special/PMA controls).  This is an orthogonal taxonomy to recall
-- severity class, which lives in the top-level "classification" field of the
-- openFDA recall record:
--
--   recall severity  Class I   = most dangerous (risk of serious injury/death)
--   recall severity  Class II  = may cause temporary health problems
--   recall severity  Class III = unlikely to cause adverse health reactions
--
-- Example: Philips Respironics PE-PUR foam CPAP/BiPAP recalls (external_ids
-- 88058, 88071 — initiated 2021-06-14) are recall severity Class I but were
-- stored as "Class II" because CPAP devices are device regulatory class 2.
--
-- The pipeline script (openfda_device_recalls.py) is fixed in the same PR
-- to read event.get("classification") going forward.
--
-- Raw-payload situation (discovered 2026-05-09)
-- -----------------------------------------------
-- ALL 3,929 existing rows in public.recalls (source = 'openfda_device') have
-- raw_payload = NULL.  The initial data load did not store the raw API
-- response.  Therefore, a purely SQL-driven correction from stored data is
-- not feasible.
--
-- Correction path
-- ---------------
-- The script uses on_conflict="source,external_id" with resolution=
-- "merge-duplicates".  On the FIRST execution of the updated script, every
-- existing row will be upserted: recall_class will be overwritten with the
-- correct severity class read from event.get("classification"), and
-- raw_payload will be populated for the first time.
--
-- See docs/recalls/recall-class-taxonomy-correction.md for the full
-- before/after delta report including Philips CPAP confirmation.
-- ============================================================================

COMMENT ON COLUMN public.recalls.recall_class IS
  'FDA recall severity class (Class I = most serious risk of injury/death,
Class II = may cause temporary health problems,
Class III = unlikely to cause adverse health reactions).
Source: top-level classification field from openFDA /device/recall.json.
NOTE: rows ingested before 2026-05-09 were mislabeled with device regulatory
class (openfda.device_class) instead of recall severity. Corrected via
openfda_device_recalls.py taxonomy fix on 2026-05-09.
See docs/recalls/recall-class-taxonomy-correction.md.';
