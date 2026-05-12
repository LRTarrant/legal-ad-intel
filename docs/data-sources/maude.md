# Scoping FDA MAUDE Adverse-Event Ingest for the Transport Marketing Pipeline

**TL;DR**
- Adding MAUDE is straightforward and high-leverage: same openFDA pattern as `device/recall.json`, same auth model, same `meta.results.total` semantics — but the endpoint is `https://api.fda.gov/device/event.json`, with much larger volumes (~23.9M total records, ~2–3M new device-records per year), nested `device[]`/`patient[]`/`mdr_text[]` arrays, and free-text narratives that should be truncated/hashed rather than stored verbatim at full length.
- For tort-signal use, filter to `event_type:("Death" OR "Injury")` over a rolling `date_received` window, join to existing manufacturer records primarily on `device[0].device_report_product_code` (3-letter FDA product code, tightly normalized) + `device[0].openfda.regulation_number`, and use a secondary fuzzy join on `manufacturer_g1_name` / `device[0].manufacturer_d_name` / `manufacturer_name` (all free-text, multi-spelling, no normalization on FDA side). Treat the product code as the strongest join, then fuzzy on names.
- Start with a volume-only leading-indicator ("manufacturer + product code with N+ Death/Injury reports in last 90 days, slope > 2× prior 180-day baseline"). Defer narrative clustering to v2. Engineering effort vs. your existing `openfda_device_recalls.py`: **medium** (~1.5–2× larger; ~1–2 engineer-days), mostly due to `search_after` pagination, the nested-array flatten, and the rollup MV. **Hard deadline factor: FDA launched AEMS on March 11, 2026 and plans to migrate MAUDE into it by end of May 2026 — plan for endpoint/schema change in the next 1–3 months and wrap the URL + field map in a thin adapter.**

---

## Key Findings

- The openFDA MAUDE endpoint is `https://api.fda.gov/device/event.json`, updated weekly, covering ~1991/1992 to present, with 23,922,719 total records as of `meta.last_updated: 2026-02-10`.
- Annual device-record volumes from FDA's MDR Data Files (a strong proxy for total MAUDE reports per year): 2021: 2,031,124; 2022: 2,949,901; 2023: 2,342,042; 2024: 2,628,663; 2025: 2,888,001. Death+Injury is roughly 10–15% of this; back-of-envelope ~200K–500K severe records per year.
- MAUDE records have three nested arrays (`device[]`, `patient[]`, `mdr_text[]`) and three distinct manufacturer name fields (`manufacturer_g1_name`, `device[].manufacturer_d_name`, `manufacturer_name`) — none of them normalized by FDA. The `device[].openfda{}` sub-block exposes derived `regulation_number`, `device_class`, `device_name`, `medical_specialty_description`, `fei_number[]`, `registration_number[]` — but no `k_number` on this endpoint.
- openFDA's documented pagination limit is `skip ≤ 25000`; the official mechanism past that is `search_after` (cursor via `Link: rel="next"` header). Rate limits: 240 req/min, 1,000/day without key vs. 120,000/day with key — **an API key is required at MAUDE volume**.
- Known biases: ASR program ended June 2019, causing a structural step-change (volume roughly doubled by 2022 vs. 2018); Essure (Bayer) showed the canonical false-positive pattern where ~57,802 reports were filed under a 2020 FDA variance from litigation-derived social-media data; manufacturer-source reports can be templated/litigation-driven.
- Famous MAUDE-as-leading-indicator cases with rough timing: Philips CPAP (only ~30 PE-PUR MDRs pre-June 2021 recall, then 100K+ in 24 months post-recall, MDL still active April 2026); transvaginal mesh (>1,000 reports 2005–2007 triggered 2008 FDA notification, 5× volume by 2011 → MDL 2012, ban 2019); Bard IVC filters (~27 deaths + hundreds of injuries known by 2004, NBC News exposé 2015, MDL 2015–2016, first bellwether 2018 — extreme outlier where signal failed to drive recall); Essure (47,856 reports cumulative by Dec 2019, $1.6B settlement Aug 2020).
- **AEMS launched March 11, 2026.** MAUDE migration to AEMS is scheduled for end of May 2026. openFDA's `/device/event.json` is not formally deprecated, but plan for instability in mid-to-late 2026.

---

## 1. MAUDE endpoint shape

**Bottom line:** Endpoint is `https://api.fda.gov/device/event.json` (confirmed). Each record is a deeply nested JSON with top-level scalars (event metadata, severity, dates, originator) plus three arrays: `device[]`, `patient[]`, `mdr_text[]`. Updated weekly. Coverage ~1991/1992 to present.

### Evidence

- Endpoint and update cadence: openFDA Device Adverse Event Overview states "openFDA device adverse event API returns data from Manufacturer and User Facility Device Experience (MAUDE)… data is updated weekly" and "Time period covered in this API: 2009 to null" in the Key Facts box, while the body text says "from about 1992 to the present." Treat the lower bound as ~1991–1992 in practice. (https://open.fda.gov/apis/device/event/)
- Base URL confirmed at https://open.fda.gov/apis/device/event/how-to-use-the-endpoint/: `https://api.fda.gov/device/event.json`.
- Full field schema available as YAML at https://open.fda.gov/fields/deviceevent.yaml (linked from the Searchable Fields page: https://open.fda.gov/apis/device/event/searchable-fields/).

### Top-level fields (event-level)

Confirmed from a live API record and FDA's published MDR data dictionary at https://www.fda.gov/medical-devices/medical-device-reporting-mdr-how-report-medical-device-problems/mdr-data-files:

- **Identifiers**: `mdr_report_key`, `report_number`, `report_source_code` (P=Voluntary, U=User Facility, D=Distributor, M=Manufacturer)
- **Severity**: `event_type` — controlled vocabulary: `Death`, `Injury`, `Malfunction`, `Other`, `No answer provided`. Legacy variants `IN`, `IL`, `IJ` for Injury appear in older records.
- **Flags**: `adverse_event_flag` (Y/N), `product_problem_flag` (Y/N), `manufacturer_link_flag`
- **Dates**: `date_received` (FDA receipt — **use this for time windows**), `date_of_event` (often blank/approximate), `report_date`, `date_facility_aware`, `date_report_to_fda`, `date_added`, `date_changed`
- **Source/location**: `event_location` (HOSPITAL/HOME/NURSING HOME/etc.), `source_type[]`, `reporter_occupation_code`, `type_of_report[]` (Initial/Followup/etc.), `remedial_action[]`
- **Reporter/originating manufacturer (Section G)**: `manufacturer_name` (F14), `manufacturer_g1_name`, `manufacturer_g1_address_1/2`, `manufacturer_g1_city/state/country/zip_code/postal_code`, plus `manufacturer_contact_*`
- **Regulatory**: `pma_pmn_number` (sometimes top-level), `exemption_number`, `summary_report`

### `device[]` array (per device involved)

- `device_sequence_number`, `device_event_key`
- **Device identity**: `brand_name`, `generic_name`, `model_number`, `catalog_number`, `lot_number`, **`device_report_product_code`** (3-letter FDA product code — strongest cross-dataset join key)
- **Section D manufacturer**: `manufacturer_d_name`, `manufacturer_d_address_1/2`, `manufacturer_d_city/state/country/zip_code`
- **Device handling**: `device_operator`, `device_availability`, `date_returned_to_manufacturer`, `device_age_text`, `device_evaluated_by_manufacturer`, `implant_flag`, `date_removed_flag`
- **UDI** (added 10/20/2022): `udi_di`, `udi_public`. Many older records lack UDI.
- **`openfda{}` enrichment sub-block** on each device (derived/annotated by openFDA, not on the raw form):
  - `device_name`
  - `medical_specialty_description`
  - `regulation_number` (CFR section, e.g. `878.4493`)
  - `device_class` (1/2/3/U/N/F)
  - `registration_number[]`
  - `fei_number[]`
  - **Note: `k_number` is NOT in the device/event YAML's `openfda` block** per https://open.fda.gov/fields/deviceevent.yaml. For 510(k) clearance numbers, secondary lookup against `/device/510k.json` is required.

### `patient[]` array

- `patient_sequence_number`, `date_received`, `patient_age`, `patient_sex`, `patient_weight`, `patient_ethnicity`, `patient_race`
- **`sequence_number_outcome[]`** — controlled vocabulary, multiple allowed per patient: `Life Threatening`, `Hospitalization`, `Disability`, `Congenital Anomaly`, `Required Intervention`, `Other`, `Death`, plus `Unknown`/`No Information`/`Not Applicable`/`Invalid Data`
- **`sequence_number_treatment[]`** — treatment vocabulary
- **`patient_problems[]`** — controlled-vocabulary Health Effect / Clinical codes (e.g., "Pain", "Allergic Reaction"). Added to public MAUDE in **September 2020**; sparse on older records (per https://www.fda.gov/medical-devices/medical-device-reporting-mdr-how-report-medical-device-problems/mdr-data-files).

### `mdr_text[]` array

- `mdr_text_key`, `patient_sequence_number`, `date_report`
- **`text_type_code`** — three values derived from Form 3500A sections (per the FDA MDR data dictionary):
  - `Description of Event or Problem` (Section B5 — reporter's narrative)
  - `Additional Manufacturer Narrative` (Section H10)
  - `Manufacturer Narrative` (Section H3 — manufacturer's investigation/evaluation)
- **`text`** — the narrative. Length varies wildly: voluntary reports often a few hundred bytes; manufacturer reports often 2,000–8,000+ bytes with structured sections. Trade-secret content is redacted as `(b)(4)`, PHI/personnel as `(b)(6)`.

### Two real sample records

**Sample A** — live `https://api.fda.gov/device/event.json?limit=1` response (1992 hospital-bed report; reproduced verbatim from the API, no further anonymization required as the record contains no PII):

```json
{
  "event_type": "Injury",
  "date_received": "19920310",
  "date_of_event": "19920220",
  "report_source_code": "User Facility report",
  "event_location": "HOSPITAL",
  "adverse_event_flag": "Y",
  "product_problem_flag": "N",
  "device": [{
    "device_sequence_number": "1",
    "brand_name": "N/A",
    "generic_name": "MANUAL HOSPITAL BED",
    "manufacturer_d_name": "SCI-O-TECH/GOODMAN",
    "model_number": "720",
    "device_report_product_code": "FNJ",
    "implant_flag": "N",
    "openfda": {
      "device_name": "Bed, Manual",
      "medical_specialty_description": "General Hospital",
      "regulation_number": "880.5120",
      "device_class": "1"
    }
  }],
  "patient": [{
    "patient_sequence_number": "1",
    "patient_age": "92 YR",
    "sequence_number_outcome": ["Required Intervention"]
  }],
  "mdr_text": [{
    "text_type_code": "Description of Event or Problem",
    "text": "RESIDENT WAS IN BED WITH BOTH SIDERAILS IN 'UP' POSITION. NURSING ASSISTANT HEARD A NOISE... RESIDENT WAS SENT TO HOSPITAL AND RECEIVED TREATMENT FOR BROKEN ARM..."
  }]
}
```

**Sample B** — schematic shape of a recent Philips DreamStation MAUDE record (illustrative of the structure for high-severity, manufacturer-source reports; format mirrors the public MAUDE detail page at https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/detail.cfm; reporter identifiers omitted):

```json
{
  "event_type": "Injury",
  "date_received": "20220815",
  "report_source_code": "Manufacturer report",
  "manufacturer_g1_name": "PHILIPS RS NORTH AMERICA LLC",
  "manufacturer_g1_city": "PITTSBURGH",
  "manufacturer_g1_state": "PA",
  "device": [{
    "brand_name": "DREAMSTATION CPAP",
    "generic_name": "VENTILATOR, NON-CONTINUOUS (RESPIRATOR)",
    "manufacturer_d_name": "PHILIPS RS NORTH AMERICA LLC",
    "device_report_product_code": "BZD",
    "openfda": {
      "device_name": "Ventilator, Non-Continuous (Respirator)",
      "medical_specialty_description": "Anesthesiology",
      "regulation_number": "868.5905",
      "device_class": "2"
    }
  }],
  "patient": [{
    "sequence_number_outcome": ["Hospitalization", "Required Intervention"],
    "patient_problems": ["Respiratory irritation", "Cough"]
  }],
  "mdr_text": [
    {"text_type_code": "Description of Event or Problem",
     "text": "Patient reported black particulate in CPAP tubing and persistent cough after using the device. Foam degradation suspected. ..."},
    {"text_type_code": "Manufacturer Narrative",
     "text": "(b)(4) investigation initiated. Device is subject to the June 2021 field safety notice for PE-PUR foam degradation. ..."}
  ]
}
```

### Caveats

- `device.openfda` is **sparse on older records** and on foreign manufacturers without a US FEI. Don't assume `fei_number`/`registration_number` will be populated.
- Per the FDA MDR data dictionary, `event_type` (Section H1) is "only relevant for report source type 'M'" — Voluntary (P) reports often have `event_type` blank or `*`. If you want voluntary patient-submitted severe events, OR your filter with `adverse_event_flag.exact:Y`.
- `date_of_event` is frequently blank or approximate. **Always filter rolling windows on `date_received`.**

---

## 2. Volume and pagination

**Bottom line:** ~23.9M total MAUDE records in openFDA (last_updated 2026-02-10). New device records per year: 2021 ≈ 2.03M, 2022 ≈ 2.95M, 2023 ≈ 2.34M, 2024 ≈ 2.63M, 2025 ≈ 2.89M. The 25,000 skip limit applies, but openFDA officially supports `search_after` cursor pagination for unlimited-size result sets. openFDA refresh cadence: **weekly** (the upstream MAUDE itself updates monthly per FDA).

### Evidence

- **Total record count: 23,922,719** as of `last_updated: 2026-02-10`, returned by `meta.results.total` from `https://api.fda.gov/device/event.json?limit=1`.
- **Per-year device-record counts from FDA's MDR Data Files page** (https://www.fda.gov/medical-devices/medical-device-reporting-mdr-how-report-medical-device-problems/mdr-data-files):
  - 2020: 1,567,545; 2021: 2,031,124; 2022: 2,949,901; 2023: 2,342,042; 2024: 2,628,663; 2025: 2,888,001
  - Master record file through 2025: 23,636,068 records
- FDA description: "Each year, the FDA receives over two million medical device reports of suspected device-associated deaths, serious injuries, and malfunctions."
- **25,000 skip limit** confirmed at https://open.fda.gov/apis/query-parameters/: "Currently, the largest allowed value for the skip parameter is 25000." Originally 5,000, raised to 25,000 in Aug 2017 (https://open.fda.gov/about/updates/2017_08_30_openfda_limit_increased/).
- **`search_after` cursor pagination** documented at https://open.fda.gov/apis/paging/. Mechanism:
  1. Initial query with `limit=N&sort=date_received:asc` (no `skip`).
  2. Read the `Link: <…>; rel="next"` header — contains the next-page URL with `search_after=...`.
  3. Follow that URL; repeat until `Link` header is absent.
- **Update cadence at openFDA: weekly** (https://open.fda.gov/apis/device/event/). Upstream MAUDE updates monthly (https://open.fda.gov/data/maude/), so openFDA is polling a monthly upstream weekly — practical event-to-API lag is weeks to a few months.

### Caveats

- The `search_after` opaque cursor changes across Elasticsearch upgrades — log and follow it, don't try to reconstruct.
- The 25,000 cap is enforced even with `limit=1`. Plan to use `search_after` once cumulative offset would exceed 25K.
- 2019–2020 volume jump partly reflects the post-ASR data dump (see §6) — Y/Y comparisons crossing 2019 are not apples-to-apples.
- For your weekly 5-year-lookback window filtered to Death/Injury, expected pull volume is in the **low hundreds of thousands** per refresh — manageable with `search_after` if you're using the API key (240/min, 120K/day).

---

## 3. Join key to existing recalls data

**Bottom line:** Use a **layered join**. Primary key: `device[0].device_report_product_code` (FDA 3-letter product code; tightly normalized by FDA) + `device[0].openfda.regulation_number` (CFR section, very stable). Secondary fuzzy join on the three manufacturer name fields → recall `recalling_firm`. Do not expect any single string-equality join to work; the literature consistently documents MAUDE manufacturer names as non-standardized, duplicated, and incomplete.

### Evidence

- **Three distinct manufacturer name fields in a MAUDE record** (per FDA's MDR data dictionary):
  - `manufacturer_g1_name` — top-level "Manufacturer G1" (Form Section G1) — the reporter-manufacturer (who filed the MDR). Populated when `report_source_code='M'`.
  - `manufacturer_name` — top-level (F14) — manufacturer named in Section F. Populated mainly on Distributor/User Facility reports.
  - `device[].manufacturer_d_name` — Section D3 — the firm the reporter identifies as the device's manufacturer for each device on the report.
  - In a clean Manufacturer-source record, `manufacturer_g1_name` and `device[0].manufacturer_d_name` usually match. In Voluntary or User Facility reports, only `device[].manufacturer_d_name` may be populated, and it's free-text.
- **All three are unnormalized free-text.** Published MAUDE practitioner studies document this clearly. The peer-reviewed transvaginal mesh evaluation at https://pubmed.ncbi.nlm.nih.gov/29520389/ reported "numerous examples of missing, duplicated, and non-standardized entries. Analysis revealed 64 reports with duplicated information, and six reports representing multiple patients. Forty-seven percent of medical device reports did not identify a reporter source. At least 28% of reported devices are no longer on the US market." The 2025 SAGE longitudinal MAUDE-trend study (https://journals.sagepub.com/doi/10.1177/20552076251314094) reaches similar conclusions about field hygiene.
- **`device_report_product_code` is the strongest join key**: 3-letter codes are assigned by FDA's Device Classification database; mandatory on every MDR and tightly controlled. `openfda.regulation_number` is derived 1:1 from product-code class groupings. For your purposes, joining `recall.product_code` ↔ `event.device[].device_report_product_code` is the most reliable cross-dataset link.
- **`openfda.registration_number` and `openfda.fei_number`** are derived/normalized by openFDA against the Registration & Listing database — when present, they're clean; coverage is incomplete on older and foreign records.
- **`openfda.k_number` is NOT on this endpoint** per https://open.fda.gov/fields/deviceevent.yaml. Secondary lookup against `/device/510k.json` is required to bridge to 510(k) clearance.
- **Realistic fuzzy-match expectation**: There is no published benchmark study measuring MAUDE-to-recall manufacturer-name match rates specifically. Practitioner experience with MAUDE and the published mesh/cochlear/orthopedic studies (https://pmc.ncbi.nlm.nih.gov/articles/PMC11755539/, https://www.medrxiv.org/content/10.1101/2020.04.30.20086660.full.pdf) treat manufacturer names as noisy and typically filter at product-code level before re-aggregating to firm. Reasonable working estimate after normalization (uppercase, strip punctuation, strip suffixes like INC/LLC/CORP/CORPORATION/LTD): **~70–85% direct match for large established manufacturers**, lower for foreign/subsidiary/legacy entities. Lance should measure on his actual data.

### Recommended join strategy

1. **Primary**: `event.device[0].device_report_product_code` ↔ `recall.product_code` (when present). Buckets at the device-type level, which is how torts are scoped in practice.
2. **Secondary**: normalize `manufacturer_g1_name` (fallback `device[0].manufacturer_d_name`, fallback `manufacturer_name`), fuzzy-match (Jaro-Winkler ≥ 0.92 or token-set ratio ≥ 90) against `recalling_firm_normalized`.
3. **Tertiary disambiguation**: `openfda.fei_number` / `openfda.registration_number` when populated.
4. Store all three raw name fields; do normalization in a generated column or view so you can iterate without re-ingesting.

### Caveats

- A single MDR can list multiple devices in `device[]` — typically one suspected-cause device plus accessories. For tort scoring, take `device[0]` but log array length to allow re-processing.
- `device[].manufacturer_d_name` is whatever the **reporter** wrote — may be the OEM, contract manufacturer, re-labeler, or wholly-owned subsidiary.

---

## 4. Time/severity filtering for tort signal

**Bottom line:** Filter on `event_type.exact:("Death" OR "Injury")` AND `date_received:[YYYYMMDD TO YYYYMMDD]`. Recent annual Death+Injury volume is in the **hundreds of thousands per year**, mostly Injury; Death-only is in the **tens of thousands per year**. Always use `.exact` for term queries; otherwise openFDA tokenizes "No answer provided" into separate buckets.

### Evidence

- **Severity field**: `event_type` at top level, controlled values `Death | Injury | Malfunction | Other | No answer provided` per the openFDA YAML and the example query at https://open.fda.gov/apis/device/event/example-api-queries/.
- **Additional severity signal on `patient[]`**:
  - `sequence_number_outcome[]` — vocabulary: `Life Threatening`, `Hospitalization`, `Disability`, `Congenital Anomaly`, `Required Intervention`, `Other`, `Death`. Multiple values per patient common.
  - `patient_problems[]` — controlled health-effect codes (added Sept 2020; sparse pre-2020).
- **Query template** (per https://open.fda.gov/apis/query-parameters/ and the example page):
  ```
  https://api.fda.gov/device/event.json
    ?search=event_type.exact:("Death"+OR+"Injury")
            +AND+date_received:[20250101+TO+20251231]
    &limit=1000
    &sort=date_received:asc
  ```
  Per-bucket counts via `count=event_type.exact`.
- **Annual high-severity volume — Lance should pull live** with:
  ```
  https://api.fda.gov/device/event.json?search=date_received:[20230101+TO+20231231]&count=event_type.exact
  https://api.fda.gov/device/event.json?search=date_received:[20240101+TO+20241231]&count=event_type.exact
  https://api.fda.gov/device/event.json?search=date_received:[20250101+TO+20251231]&count=event_type.exact
  ```
  These are public, no API key required for occasional use, but the daily 1,000-request cap will apply if you start scripting against them — use a key. Based on total device-record file sizes (2.34M–2.89M/yr from the MDR Data Files page) and published Death+Injury fractions (10–15%), expect:
  - **Death+Injury per year: roughly 200,000–500,000** (order of magnitude)
  - **Death-only per year: roughly 15,000–40,000**

### Caveats

- The MDR data dictionary states `event_type` is "only relevant for report source type 'M'"; voluntary reports often have it blank. If you want voluntary signals, OR with `adverse_event_flag.exact:Y`.
- Multiple MAUDE NLP studies note `event_type` is occasionally misclassified in manufacturer reports. Treat it as adequate for population-level signal but not authoritative on individual records.
- The 2019 ASR data dump (see §6) inflated 2019–2020 baseline volumes for affected device categories. Anchor on 2021+ baselines.

---

## 5. NLP/clustering implications

**Bottom line:** For weekly batch on Supabase, **do not store full narratives long-term**. Use option (c) — volume + structured fields — for the leading indicator. Store **truncated narratives (~1,000–1,500 chars) plus a SHA-256 content hash** for ~12–18 months of Death/Injury records as an analyst-review sample. Defer narrative clustering to v2 on a separate worker.

### Sizing the storage decision

**Inputs (from §2/§4):**
- Annual Death+Injury records: ~200K–500K
- Narratives per record: typically 1–3 in `mdr_text[]` (Description of Event + Manufacturer Narrative when source=M)
- Narrative length: voluntary ~200–500 bytes; manufacturer typically 2,000–8,000 bytes, occasionally 10,000+. Working average ~3,000 bytes for Death/Injury records (skewed by manufacturer narratives).

**Option (a) — store everything raw**:
- 350K records/year × 2 narratives × 3,000 bytes = **~2.1 GB/year of narrative text alone**
- Plus device/patient/openfda blocks: ~0.5–1 GB/year additional
- 5-year retention: **10–15 GB** — exceeds your "few GB" target.

**Option (b) — pre-cluster in ETL**:
- MiniLM embeddings (384-d × 4 bytes = 1.5 KB/record) ≈ ~0.5 GB/year. Manageable.
- But adds embedding-model dependency and meaningful CPU on GHA. Not worth it for v1.

**Option (c) — volume + structured only**:
- Per record store: identifiers, severity, dates (3), product code, regulation_number, normalized manufacturer (3 fields), patient outcomes/problems (2 arrays), narrative_truncated_1500, narrative_full_sha256. ~2–3 KB/record.
- 350K records/year × 2.5 KB = **~875 MB/year**; 5-year: **~4.4 GB**.
- Still over "few GB" — further trim by retaining only **last 12–18 months at full resolution** + 5-year rollups in a materialized view.

### Recommendation

**Hybrid (c + rollup)**:
1. `openfda_maude_events` table — last 18 months of Death/Injury records only; `narrative_text` truncated to 1,500 chars; `narrative_full_sha256` for dedup. ~500K–750K rows, ~1.5–2 GB.
2. `manufacturer_maude_rollup` materialized view — 5-year history aggregated to `(product_code, normalized_manufacturer, year_month, event_type)` with counts and outcome distributions. <50 MB.
3. Volume-only spike detection on the rollup.
4. When a spike fires, surface truncated narratives from `openfda_maude_events` for analyst review. Defer real clustering to v2.

### Caveats

- 1,000-char truncation loses the manufacturer-investigation tail of long records, which is exactly where actionable language sits ("foam degradation," "embolic event," "device migration"). For tort-quality records, consider keeping `text_type_code='Description of Event or Problem'` and `text_type_code='Manufacturer Narrative'` separately, each capped at ~1,500 chars.
- Litigation-driven reports (Essure 2020 variance; see §6) are heavily templated and skew naive volume signals — filter on `report_source_code` and treat sudden manufacturer-source spikes as suspect.

---

## 6. Known issues, gotchas, deprecations as of mid-2026

**Bottom line:** Three big things. (1) **FDA launched AEMS on March 11, 2026, migrating MAUDE into it by end of May 2026** — endpoint/schema change is imminent. (2) The 2019 termination of the Alternative Summary Reporting (ASR) program created a one-time data dump of ~6M historical reports and an ongoing structural volume increase; pre-2021 baselines are not comparable to post-2021. (3) Litigation-driven reports (Essure variance, transvaginal mesh attorney-sourced reports) are a documented source of MAUDE volume *caused by* litigation rather than predicting it — the canonical false-positive pattern.

### Active openFDA GitHub issues (https://github.com/FDA/openfda/issues)

Approximately 12 open issues as of mid-2026. Recent ones (#211 Jan 31 2025, #210 Jan 27 2025, #206 Oct 22 2024, #205 Sep 25 2024, #204 Aug 7 2024) are open but none flag a blocking problem for `/device/event`. Historical issue #108 ("Skip value must 25000 or less prevents access to adverse events data") is **closed** — resolved by the `search_after` mechanism at https://open.fda.gov/apis/paging/. No active deprecation issues for the device/event endpoint specifically.

### Rate limits (https://open.fda.gov/apis/authentication/)

- Without API key: 240 req/min, **1,000 req/day per IP**.
- With API key: 240 req/min, **120,000 req/day**.
- At MAUDE volume (~1,750 requests per weekly refresh assuming `limit=1000`), the no-key limit will break your workflow. **Get an API key.**

### AEMS migration — critical timeline risk

- **March 11, 2026**: FDA launched the **Adverse Event Monitoring System (AEMS)** — unified replacement for FAERS, VAERS, MAUDE, AERS, HFCS, CTPAE. Public landing page: https://www.fda.gov/safety/fda-adverse-event-monitoring-system-aems.
- FDA's stated plan is to **complete MAUDE migration into AEMS by end of May 2026** (Emergo by UL, ASCO Post, Pharmaceutical Commerce, AIM all confirm). FDA has stated it will "roll out enhanced application program interfaces (APIs) and data analytics tools for the new system over the coming months."
- openFDA's `/device/event.json` is not formally deprecated, but its upstream is being replaced. **Plan for 2–6 months of schema/endpoint instability starting June 2026.** Wrap the URL and field map in a thin adapter layer.

### Reporting biases and gotchas

- **ASR program end (June 2019)**: 1997–June 2019, FDA's Alternative Summary Reporting program let manufacturers file quarterly summary spreadsheets (not in MAUDE) for ~108 device categories. June 2019, FDA revoked all 108 exemptions, released **~6M previously hidden reports** as legacy files. From mid-2019 onward, manufacturers had to file individual MDRs in MAUDE. **Total volume roughly doubled between 2018 (~1.05M device records) and 2022 (~2.95M)** — confirmed by FDA's MDR Data Files page. Distributor reports specifically went from "100–1000s/yr" pre-2019 to "10,000s–100,000s/yr" post-2019 per https://pmc.ncbi.nlm.nih.gov/articles/PMC11755539/. **Anchor baselines on 2021+ data only.**
- **VMSR (Voluntary Malfunction Summary Reporting)** still exists for certain malfunctions (not Deaths or Serious Injuries) and produces quarterly summary records in MAUDE — accounts for the Stryker, Animas, Edwards, Baxter, Medtronic summary clusters in the 2025 SAGE study.
- **Voluntary reports (`report_source_code:P`)** often have `event_type` blank and narratives of one or two sentences. High voluntary volume for a manufacturer is meaningful as social signal but not MDR-quality.
- **`(b)(4)` and `(b)(6)` redactions**: `(b)(4)` is trade secret/CBI (manufacturer redaction); `(b)(6)` is personnel/medical privacy. Common in manufacturer narratives. >20% `(b)(4)` content makes a narrative largely unanalyzable.
- **Product-code mismatches**: reporters sometimes assign the wrong product code (especially combination devices). Cross-check `device_report_product_code` against `device[].generic_name`.
- **Backlog-clearing spikes**: when a firm catches up on a reporting backlog, `date_received` shows a spike even though `date_of_event` is spread across years. **Always cross-check `date_received` spikes against `date_of_event` distribution before alerting.**

### Famous MAUDE-as-leading-indicator examples

- **Philips CPAP / DreamStation PE-PUR foam** — Class I recall June 14, 2021. FDA noted Philips had **only ~30 MDRs associated with PE-PUR foam degradation prior to the recall**, with a self-reported 0.03% complaint rate in 2020 (https://www.massdevice.com/how-philips-significant-respiratory-devices-recall-unfolded/). **Post-recall, between April 2021 and June 2023, FDA received 116,000+ MDRs related to the recalled devices and 561 deaths potentially linked** (https://www.drugwatch.com/philips-cpap/recall/, https://www.sleepfoundation.org/cpap/cpap-recalls). MDL still active in W.D. Pa. with 621 individual cases as of April 2026; $479M economic-loss settlement reached 2024. **MAUDE lead time: signal was buildable within weeks-to-months of the recall announcement; mass-tort scale ~2 years later.** Note this is an unusual case where the recall *preceded* the MAUDE signal flood — the lead indicator was the manufacturer's internal foam-degradation testing, not MAUDE itself.
- **C.R. Bard IVC Filters** (Recovery, G2, G2X) — Bard "became aware of 27 reported deaths and hundreds of injuries associated with failures of the Recovery IVC filter" by 2004, more than a year after market launch (https://trulaw.com/ivc-filter-lawsuits/bard-ivc-filter-lawsuits/). MAUDE reports accumulated for over a decade without an IVC recall. NBC News exposé 2015; MDL formed 2015–2016; first bellwether (Booker, $3.6M verdict) 2018 (https://www.cochranlaw.com/legal-topic/ivc-filter-recalls-lawsuit-history/). **MAUDE lead time: 10+ years — extreme outlier where signal failed to trigger recall.**
- **Transvaginal Mesh** (Boston Scientific, Ethicon, Bard, AMS) — FDA's 2008 Public Health Notification was triggered by "over 1,000 reports filed during a three-year period (2005–2007) from nine surgical mesh manufacturers" (https://pmc.ncbi.nlm.nih.gov/articles/PMC5840117/). 2011 Safety Communication cited "five times as many" reports for 2008–2010. MDLs formed 2012; FDA suspended remaining transvaginal POP mesh distribution 2019. **MAUDE lead time: ~3 years from signal to first regulatory action; ~7 years to market exit.**
- **Essure** (Bayer/Conceptus) — FDA reviewed MAUDE reports since 2002 approval; by Dec 31, 2019, **47,856 adverse event reports cumulative** (https://www.leadingjustice.net/news/08/26/2020/bayer-agrees-to-1-6-billion-settlement-to-resolve-essure-injury-claims/). Bayer discontinued US sales Dec 2018; $1.6B settlement Aug 2020. **Reverse-pattern flag**: under a 2020 FDA variance, Bayer was required to file **57,802 reportable events** derived from social-media data received as part of litigation between June 2020 and March 2021 (https://www.fda.gov/medical-devices/essure-permanent-birth-control/problems-reported-essure). **This is the canonical MAUDE false-positive: tens of thousands of reports caused by litigation rather than predicting it.**
- **Metal-on-metal hip implants** (DePuy ASR, Stryker Rejuvenate/ABG II) — DePuy ASR recalled Aug 2010 after years of accumulating MAUDE revision-rate and metallosis reports; ~$2.5B in settlements by 2013. Stryker Rejuvenate recalled July 2012. Pattern matches mesh: 3–5 year MAUDE lead time.

### Other known false-positive patterns

- **Litigation-induced reporting** — Essure-style, where plaintiffs' counsel surfaces reports during discovery and the manufacturer is required to file them. Look at `report_source_code='M'`, `report_date - date_of_event > 1 year`, and narrative templating.
- **UDI/brand-name changes** create apparent spikes in "new" devices.
- **Coordinated patient-advocacy campaigns** drive voluntary report bursts (Essure, breast implants).

---

## 7. Architecture recommendation

**Bottom line:** Add one new Python file (`openfda_device_events.py`) mirroring `openfda_device_recalls.py`. Paginate via `search_after`. Filter to `event_type:("Death" OR "Injury")` + 5-year `date_received` window. Persist to a new `openfda_maude_events` table keyed on `(source='maude', external_id=mdr_report_key)`. Compute a `manufacturer_maude_rollup` materialized view. Run as a separate step in the existing weekly GitHub Action. **Effort: medium — ~1–2 engineer-days vs. ~0.5 day for the recall script** because of `search_after`, narrative truncation, the nested-array flatten, and the rollup MV. Use volume-only spike detection in v1; defer narrative clustering.

### New endpoint & ingest pattern

- New endpoint: `https://api.fda.gov/device/event.json`
- Query template (per refresh, rolling 5-year window):
  ```
  search=event_type.exact:("Death" OR "Injury")
         AND date_received:[YYYYMMDD TO YYYYMMDD]
  limit=1000
  sort=date_received:asc,mdr_report_key:asc
  ```
- Pagination: `search_after` cursor via `Link: rel="next"` header, not `skip`.
- API key required at this volume. Store in GitHub Actions secrets as `OPENFDA_API_KEY`; pass as `?api_key=...`.

### New tables

```sql
CREATE TABLE openfda_maude_events (
  source TEXT NOT NULL DEFAULT 'maude',
  external_id TEXT NOT NULL,                    -- mdr_report_key
  report_number TEXT,
  event_type TEXT,                              -- Death | Injury
  report_source_code TEXT,                      -- M | U | D | P
  date_received DATE NOT NULL,
  date_of_event DATE,
  product_code TEXT,                            -- device[0].device_report_product_code
  regulation_number TEXT,                       -- device[0].openfda.regulation_number
  device_class TEXT,
  brand_name TEXT,
  generic_name TEXT,
  manufacturer_g1_name TEXT,                    -- Form G1 (reporter)
  manufacturer_d_name TEXT,                     -- Form D3 (device-section)
  manufacturer_name_raw TEXT,                   -- F14
  manufacturer_normalized TEXT,
  fei_number TEXT[],
  registration_number TEXT[],
  patient_outcomes TEXT[],                      -- patient[0].sequence_number_outcome
  patient_problems TEXT[],
  narrative_truncated TEXT,                     -- first 1500 chars
  narrative_full_sha256 TEXT,
  raw_jsonb JSONB,                              -- optional, TTL'd to 90 days
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, external_id)
);

CREATE INDEX idx_maude_received ON openfda_maude_events(date_received DESC);
CREATE INDEX idx_maude_mfr_norm ON openfda_maude_events(manufacturer_normalized);
CREATE INDEX idx_maude_product ON openfda_maude_events(product_code);
```

```sql
CREATE MATERIALIZED VIEW manufacturer_maude_rollup AS
SELECT
  manufacturer_normalized,
  product_code,
  date_trunc('month', date_received) AS month,
  event_type,
  COUNT(*) AS report_count,
  SUM(CASE WHEN 'Death' = ANY(patient_outcomes) THEN 1 ELSE 0 END) AS death_outcomes,
  COUNT(DISTINCT report_source_code) AS source_diversity
FROM openfda_maude_events
WHERE date_received >= NOW() - INTERVAL '5 years'
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX ON manufacturer_maude_rollup
  (manufacturer_normalized, product_code, month, event_type);
```

### Workflow integration

Same weekly GitHub Action, new step **after** recall ingest:
1. (existing) Pull recalls, upsert.
2. (new) Pull MAUDE Death/Injury, 5-year window, upsert into `openfda_maude_events`.
3. (new) `REFRESH MATERIALIZED VIEW CONCURRENTLY manufacturer_maude_rollup;`
4. (new) Run spike-detection query, populate watchlist suggestions.

Use a separate step (not a separate workflow) so MAUDE failure doesn't block recall refresh. Set `continue-on-error: true` on the MAUDE step initially.

### Manufacturer-name normalization extension

Your existing recall ingest already normalizes `recalling_firm`. Extend the same function to handle MAUDE's three name fields with a fallback chain:

```python
def maude_mfr_for_join(record: dict) -> str:
    raw = (record.get("manufacturer_g1_name")
           or (record.get("device") or [{}])[0].get("manufacturer_d_name")
           or record.get("manufacturer_name")
           or "")
    return normalize_firm_name(raw)  # existing function from recall ingest
```

~30 lines including a `manufacturer_alias` table for fuzzy-matched entries. Expect ~70–85% direct hit rate post-normalization.

### Spike-detection SQL (v1 — volume only)

```sql
WITH last90 AS (
  SELECT manufacturer_normalized, product_code, SUM(report_count) AS n_recent
  FROM manufacturer_maude_rollup
  WHERE month >= NOW() - INTERVAL '90 days'
  GROUP BY 1,2
),
baseline AS (
  SELECT manufacturer_normalized, product_code,
         SUM(report_count) / 2.0 AS n_baseline_per_90d   -- 180d → 90d-equiv
  FROM manufacturer_maude_rollup
  WHERE month >= NOW() - INTERVAL '270 days'
    AND month <  NOW() - INTERVAL '90 days'
  GROUP BY 1,2
)
SELECT l.manufacturer_normalized, l.product_code,
       l.n_recent, b.n_baseline_per_90d,
       l.n_recent / NULLIF(b.n_baseline_per_90d, 0) AS spike_ratio
FROM last90 l
LEFT JOIN baseline b USING (manufacturer_normalized, product_code)
WHERE l.n_recent >= 10
  AND (b.n_baseline_per_90d IS NULL OR l.n_recent > 2 * b.n_baseline_per_90d);
```

Join the output to your `manufacturers` table; for firms at `Cold` (or off-watchlist), elevate to `Warming` based on MAUDE alone — keeping Class I recalls as the existing hard floor for `Warming`. Don't auto-promote past `Warming` on MAUDE alone; require analyst review.

### Effort estimate vs. `openfda_device_recalls.py`

| Component | Effort delta | Reason |
|---|---|---|
| HTTP/retry/API-key | Same | Pattern reuse |
| Pagination | **+0.5 day** | `search_after` cursor with Link-header follow |
| JSON flatten | **+0.5 day** | Three nested arrays (device/patient/mdr_text) |
| Severity/date filter | Same | Standard openFDA search |
| Mfr-name normalization extension | **+0.25 day** | Three-field fallback + alias table |
| Narrative truncation + SHA-256 | **+0.1 day** | Trivial |
| Upsert | Same | `(source, mdr_report_key)` primary key |
| Rollup MV + spike-detection SQL | **+0.25 day** | One MV, one query, scheduled refresh |
| Tests | **+0.25 day** | Larger fixture payloads |
| **Total** | **~1.5–2× recall ingest** | ~1–2 engineer-days |

### Versioning concern (AEMS migration)

Wrap the openFDA URL and field mapping behind a thin adapter so when AEMS goes live (likely June 2026 – Q4 2026) only the adapter changes:
- `OPENFDA_DEVICE_EVENT_URL` as a config var
- `MAUDE_FIELD_MAP` dict (e.g., `{"event_type": "event_type", "date_received": "date_received", …}`) — update keys when AEMS field names change
- Keep `openfda_maude_events` schema stable; translate at ingest

### Recommendation on leading-indicator detection

**Start with volume-only (v1):**
1. Implements in 1–2 days vs. weeks for clustering.
2. The famous lead-indicator cases (Philips post-recall MDR surge, transvaginal mesh, metal-on-metal hips) were **detectable by volume alone** — sustained 3–10× increases for a specific product code, not subtle semantic shifts.
3. False positives from litigation-driven reports (Essure variance) and ASR-era backfills are mostly removable with simple filters (`report_source_code`, date-of-event vs. date-received delta).
4. Narrative clustering adds embedding-model dependency, version risk, storage cost, and another failure mode.

**Defer narrative clustering to v2** only if you find concrete failure modes that volume cannot detect — e.g., same product code, same manufacturer, steady volume but the failure mode shifts (mechanical → chemical, single-component → systemic). At that point, run embeddings on a separate worker (Cloud Run / Lambda) over trailing 30 days of high-severity narratives, write cluster IDs back to a `maude_narrative_clusters` table, and add cluster-shift detection to the spike SQL.

---

## Recommendations (staged)

1. **Week 1**: Get an openFDA API key. Build `openfda_device_events.py` with `search_after` pagination, Death+Injury filter, 5-year `date_received` window. Stand up `openfda_maude_events` table and `manufacturer_maude_rollup` MV. Wire into existing GHA as a separate step with `continue-on-error: true`. **Ship threshold**: weekly refresh completes in <30 min, ingests the expected ~250K–500K rows for the rolling 18-month retention window, fills the rollup MV.
2. **Week 2–3**: Manufacturer-name normalization audit. Pull top 200 firms by MAUDE volume; eyeball-match to your `manufacturers` dimension; build `manufacturer_alias` for unmatched entries. **Ship threshold**: ≥85% of MAUDE Death/Injury volume joins to a known manufacturer.
3. **Week 4**: Spike-detection SQL plus integration into thermometer-stage logic. Add MAUDE-derived signal to `Warming` eligibility (manufacturer reaches `Warming` if Class I recall **OR** sustained MAUDE spike with `report_source_code <> 'D'` to suppress Essure-style false positives). **Ship threshold**: spike detector produces <20 candidates/week (manageable for analyst review) with ≥1 validated lead-time win in retrospective backtest against your existing Philips/Bard/mesh known-tort cases.
4. **June 2026 onward (AEMS watch)**: Monitor https://www.fda.gov/safety/fda-adverse-event-monitoring-system-aems and the openFDA blog/GitHub for the API cutover. **Trigger to act**: openFDA announces breaking changes to `/device/event.json` schema or URL, or quietly stops updating MAUDE on the documented weekly cadence. Then point the adapter at AEMS's new device endpoint.
5. **Q3 2026 — v2 (narrative clustering)**: Only if v1 spike detection has demonstrated value AND you have a specific case where volume-only missed a signal. Build on a separate worker, not in the weekly Supabase ETL.

---

## Caveats

- **AEMS migration is the biggest unknown.** Build for change. If the migration slips (plausible for federal IT), openFDA's `/device/event.json` may persist as the canonical interface through 2027. If on schedule, expect a 2–6 month transition window starting June 2026. Wrap the URL and field map in an adapter.
- **Annual Death+Injury counts in §4 are estimates** from total device-record file sizes × published Death+Injury fraction. Lance should pull live counts via the three count-endpoint queries before committing to retention sizing. If recent year totals come in materially above 500K Death+Injury, shorten the 18-month full-resolution retention.
- **`event_type` is unreliable on voluntary reports** — for completeness, OR with `adverse_event_flag.exact:Y`. For tort-quality signal (manufacturer-confirmed events), filter to `report_source_code.exact:M`.
- **No formal published benchmark exists** for MAUDE-to-recall manufacturer-name fuzzy-match rates. The 70–85% estimate is practitioner-grade; measure on your actual data after the first ingest.
- **MAUDE is passive surveillance.** FDA's own disclaimer states reports do not establish causation, may be duplicated, incomplete, or biased. Treat as a *signal*, not as evidence.
- **The Essure pattern (litigation-driven reports under FDA variance) is a real and substantial false-positive source.** Audit any sudden manufacturer-source MDR spike for `date_of_event` vs. `date_received` lag and templated narrative language before alerting.
