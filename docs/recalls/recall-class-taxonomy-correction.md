# FDA Recall Class Taxonomy Correction — Delta Report

**Generated:** 2026-05-09  
**PR:** `claude/recall-watchlist-class-i-ii`  
**Author:** openfda_device_recalls.py audit

---

## What this report is

This is **not an expansion report**. No net-new recalls were added to the
database by this PR. Every row described here was already in `public.recalls`
before this PR merged.

This PR corrects a longstanding mislabeling in the `recall_class` column. The
existing pipeline was reading `openfda.device_class` (the device's FDA
regulatory class — a manufacturing/safety-controls taxonomy) and storing it as
`recall_class`. The schema's intent, and the correct value, is the recall's own
**severity classification** from the top-level `classification` field of the
openFDA recall record.

These two taxonomies use the same Class I / II / III labels but mean opposite
things:

| Label | Device regulatory class | Recall severity class |
|---|---|---|
| Class I | General controls — **lowest-risk** devices (e.g. tongue depressors) | **Most serious** — risk of serious injury or death |
| Class II | Special controls — moderate-risk devices (e.g. CPAP machines) | May cause temporary health problems |
| Class III | PMA required — **highest-risk** devices (e.g. cardiac implants) | Unlikely to cause adverse health reactions |

The Philips Respironics PE-PUR foam recall (June 2021) is the canonical example
of this inversion: CPAP devices are device class 2, so the recall was stored as
`"Class II"`. But FDA classified those recall events as **Recall Class I** (most
serious), because degraded foam particles could be inhaled or ingested and cause
cancer or respiratory harm. The existing `recall_class = "Class II"` on those
rows is wrong.

---

## Before snapshot (current state, as of 2026-05-09)

Queried directly from `public.recalls WHERE source = 'openfda_device'`:

| recall_class (stored) | Row count | What it actually means |
|---|---|---|
| Class I | 753 | Recalls involving **device regulatory class 1** products (general controls — low-risk devices like lab reagents, dentistry supplies) |
| Class II | 3,176 | Recalls involving **device regulatory class 2** products (special controls — moderate-risk devices like CPAP machines, imaging systems, ventilators) |
| Class III | 0 | — |
| Unclassified | 0 | — |
| **Total** | **3,929** | **873 distinct manufacturers** |

---

## Raw-payload situation

`raw_payload` is `NULL` for **all 3,929 existing rows**. The initial data load
did not store the raw openFDA API response. This prevents a purely SQL-driven
correction from stored data.

**Consequence:** the `recall_class` correction for existing rows will be applied
by the first execution of the updated `openfda_device_recalls.py` script.
Because the script uses `on_conflict="source,external_id"` with
`resolution="merge-duplicates"`, every existing row will be upserted on the
next run: `recall_class` will be overwritten with the value from
`event.get("classification")`, and `raw_payload` will be populated for the
first time.

The first weekly run (Monday 12:00 UTC) after this PR merges will complete the
correction automatically.

---

## Row-level reconciliation (what will change on first script run)

### Direction of changes

Every row will shift from a device-class label to a recall-severity label. The
two taxonomies are mostly non-overlapping in practice:

- Rows currently `"Class I"` (device class 1): primarily in vitro diagnostics,
  lab reagents, and dentistry supplies. FDA frequently issues **recall Class I**
  events for these when test results are wrong (e.g., a faulty rapid diagnostic
  test that misses a serious condition). Expect a substantial portion of these
  753 rows to remain `"Class I"` — but now with the correct meaning.

- Rows currently `"Class II"` (device class 2): CPAP machines, ventilators,
  imaging systems, patient monitors, orthopedic implants. These span all three
  recall severity classes. The Philips CPAP foam recalls (Class I severity) are
  in this group. Expect these 3,176 rows to disperse across Class I, II, and III
  severity labels.

### Expected post-correction distribution (approximate)

Based on historical FDA device recall class distributions:

| recall_class (corrected) | Estimated rows | Notes |
|---|---|---|
| Class I | ~980–1,375 | ~25–35% of total |
| Class II | ~2,357–2,553 | ~60–65% of total |
| Class III | ~79–197 | ~2–5% of total |
| Unclassified | <40 | Pending FDA classification |

**These are estimates.** Actual numbers will be known after the first script run.
Run the following query after the first weekly execution to confirm:

```sql
SELECT recall_class, COUNT(*) AS row_count
FROM public.recalls
WHERE source = 'openfda_device'
GROUP BY recall_class
ORDER BY recall_class;
```

---

## Philips CPAP foam recall — confirmed

The iconic Philips Respironics PE-PUR foam recall is **confirmed present** in the
database. Four product families are tracked:

| external_id | Event date | Product families | Current label | Correct label |
|---|---|---|---|---|
| 88058 | 2021-06-14 | DreamStation, SystemOne, REMstar SE Auto, DreamStation Go, Dorma 400/500 (CPAP/BiPAP) | `Class II` ❌ | `Class I` ✓ |
| 88071 | 2021-06-14 | A-Series BiPAP A30/A40/V30, Trilogy 100/200, Garbin Plus, Aeris, LifeVent | `Class II` ❌ | `Class I` ✓ |
| 89276 | 2021-12-22 | Trilogy Evo (PE-PUR foam in repair kits) | `Class II` ❌ | `Class I` ✓ |
| 91293 | 2022-12-07 | Trilogy 100/200 (silicone foam separation — remediation follow-up) | `Class II` ❌ | `Class II` ✓ (this one is recall Class II) |

The original June 2021 foam events (88058, 88071) are the primary Recall Class I
actions — degraded PE-PUR foam particles could be inhaled or ingested, with
potential for carcinogenicity and respiratory harm. After the first script run
these two rows will correctly show `recall_class = "Class I"`.

---

## Other household-name manufacturers confirmed present

All of the following are in the database and will be correctly classified on the
first script run. Current labels reflect device class, not recall severity.

| Manufacturer (canonical) | Total recalls | Current class I (device) | Current class II (device) |
|---|---|---|---|
| Philips (parent) | 102 | 2 | 100 |
| Philips Respironics | 23 | 0 | 23 |
| GE | 59 | 0 | 59 |
| Abbott Laboratories | 15 | 6 | 9 |
| Boston Scientific | 37 | 0 | 37 |
| Hologic | 16 | 6 | 10 |
| Roche Diagnostics Operations | 10 | 6 | 4 |
| Medtronic Perfusion | 19 | 2 | 17 |
| Zimmer | 17 | 1 | 16 |
| Stryker Sustainability Solutions | 8 | 4 | 4 |
| Ortho-Clinical Diagnostics | 38 | 21 | 17 |
| B Braun | 27 | 0 | 27 |

---

## Net-new manufacturers

None. This PR corrects labels on existing data only. The manufacturer count
remains **873**. Net-new manufacturers will accrue on subsequent weekly script
runs as openFDA publishes new recall events.

---

## Stage-shift impacts (thermometer)

**No stage shifts expected from this PR alone.** The Five-Stage Thermometer is
driven by litigation signals (case counts, state counts, specialty firm counts,
MDL signals) — not by recall class. All existing rows have `stage = 1` (Cold)
unless already elevated by CourtListener matches. Reclassifying rows from
device class to recall severity class does not trigger a thermometer recompute.

When `recall_class` is corrected, the `class_i_recall_count` field per
manufacturer in the Watchlist UI will update (it filters on
`recall_class === "Class I"`). Manufacturers like Philips Respironics will go
from `class_i_recall_count = 0` to `class_i_recall_count ≥ 2` (the PE-PUR foam
recalls). This is a display change only, not a stage change.

---

## Sanity-check confirmations

- [x] **Philips CPAP foam recall present** — external_ids 88058 and 88071 confirmed
      in DB; currently mislabeled `Class II`; will correctly become `Class I`
      on first script run.
- [x] **Abbott Laboratories present** — 15 recalls; 6 currently stored as Class I
      (device class 1 diagnostics), 9 as Class II.
- [x] **GE present** — 59 recalls, all device class 2 (imaging systems).
- [x] **Medtronic present** (as "Medtronic Perfusion") — 19 recalls.
- [x] **Boston Scientific present** — 37 recalls, all device class 2.
- [x] **Roche Diagnostics present** — 10 recalls.
- [x] **Total non-zero** — 3,929 rows across 873 manufacturers confirmed.

---

## Script changes in this PR

### `pipeline/pipelines/openfda_device_recalls.py`

| Before | After |
|---|---|
| `_event_class_label()` reads `openfda.device_class` | Reads `event.get("classification")` (recall severity) |
| `CLASS_MAP` maps digit strings `"1"`, `"2"`, `"3"` | Maps `"Class I"`, `"Class II"`, `"Class III"` directly |
| `--classes` default: `"Class I,Class II"` | Default: `"Class I,Class II,Class III"` (nothing silently filtered) |
| Docstring: "we only ingest Class I + II" | Documents recall severity vs device class distinction |

### `.github/workflows/recall-watchlist-weekly.yml`

New `openfda-recalls` job added before `courtlistener-search`:
- Runs `openfda_device_recalls.py` weekly (Monday 12:00 UTC)
- `continue-on-error: true` — FDA API flakiness does not block CourtListener
  or thermometer-score jobs downstream
- `courtlistener-search` gains `needs: [openfda-recalls]` — fresh recalls are
  in place before case-matching begins

---

## FOLLOW_UPS

1. **Verify corrected distribution after first script run** — run the validation
   query in the migration file; confirm Philips foam recalls show `Class I`.

2. **Scoring model adjustment: weight Class I recalls higher** — the current
   thermometer model is class-agnostic. Once the corrected class data flows,
   a Class I recall should likely push a manufacturer to Stage 2 (Warming) on
   ingest rather than Stage 1 (Cold). Needs separate design discussion before
   implementation.

3. **MAUDE adverse events ingestion** — highest-ROI next expansion per
   strategic audit. MAUDE links individual device malfunction/injury/death
   reports to specific devices and manufacturers; complements recall data and
   provides plaintiff-firm-actionable pre-filing signals. Separate scoping pass
   required.

4. **FAERS pharmaceutical adverse events** — required to address GLP-1
   (Ozempic/Wegovy), hair relaxer, talc, and PFAS pharmaceutical tort signals.
   No overlap with device recall pipeline; entirely separate ingest.

5. **CPSC consumer product recalls** — non-FDA tort signals (cribs, car seats,
   power tools). Different API, different manufacturer universe.

6. **Complaint text mining via CourtListener RECAP** — case docket text can
   surface recall-linked mass-tort filings before CourtListener search picks
   them up via party/defendant matching. Separate pipeline design needed.

7. **UI redesign signals** (based on corrected data shape)
   - Manufacturer count stays at 873 post-correction; no pagination pressure yet.
   - `class_i_recall_count` will start showing non-zero values per manufacturer
     once correction lands. The existing Watchlist UI already surfaces this
     field — no redesign needed for the count.
   - Per-class filtering (e.g., "show only Class I manufacturers") would be
     useful but is a post-correction feature. Hold until actual corrected data
     shape is observed.
   - "Recently Escalated" section is unaffected by class correction — no stage
     shifts from reclassification alone.
   - **Current verdict: no UI redesign needed for this PR.** The existing
     patterns absorb the corrected data cleanly. Revisit after first post-merge
     script run and actual corrected distribution is confirmed.
