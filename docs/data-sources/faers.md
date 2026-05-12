# FAERS / openFDA Ingest Pipeline — Technical Scoping Report

**Audience:** data engineer extending an existing openFDA device-pipeline ecosystem (Supabase, manufacturer-name normalization, tort-signal scoring).
**Recommendation in one line:** Build a FAERS ingest as a sibling pipeline to the existing MAUDE/recall pipelines — same fetch helpers, **new tables, new transform/load, MedDRA-only clustering**, weekly delta on `receivedate`, `serious:1` filter, drug→manufacturer normalization via the `openfda.*` annotation block backstopped by a hand-curated alias map. Free-text narrative NLP is NOT possible against openFDA — the ICH E2B B.5 narrative is stripped before ingestion. Plan accordingly.

---

## 1. FAERS endpoint shape

**Bottom-line:** Single endpoint, `https://api.fda.gov/drug/event.json`. One record = one ICH E2B safety report. Drugs and reactions are sibling arrays inside `patient`; **there is no per-drug-per-reaction linkage** in the record — that is a fundamental modeling constraint for any tort-signal table.

**Evidence:**
- Base URL confirmed by openFDA "How to use the API": `https://api.fda.gov/drug/event.json` (open.fda.gov/apis/drug/event/how-to-use-the-endpoint/).
- Schema reference (authoritative): openFDA Searchable Fields page lists the top-level fields and links to the canonical YAML/PDF/XLSX (open.fda.gov/apis/drug/event/searchable-fields/ → open.fda.gov/fields/drugevent.yaml, drugevent_reference.pdf).
- Records follow ICH E2B/M2 v2.1 (open.fda.gov/apis/drug/event/).

**Top-level structure of a single record (verified against searchable-fields + the openFDA Athena DDL published by AWS):**

```
{
  safetyreportid, safetyreportversion, receivedate, receiptdate,
  transmissiondate, receivedateformat, receiptdateformat,
  serious, seriousnessdeath, seriousnesshospitalization,
  seriousnesslifethreatening, seriousnessdisabling,
  seriousnesscongenitalanomali, seriousnessother,
  fulfillexpeditecriteria, occurcountry, primarysourcecountry,
  duplicate, companynumb, authoritynumb, reporttype,
  primarysource: { qualification, reportercountry },
  sender:   { sendertype, senderorganization },
  receiver: { receivertype, receiverorganization },
  reportduplicate: { duplicatesource, duplicatenumb },
  patient: {
    patientonsetage, patientonsetageunit, patientsex, patientweight,
    patientdeath: { patientdeathdate, patientdeathdateformat },
    reaction: [
      { reactionmeddrapt, reactionmeddraversionpt, reactionoutcome }
    ],
    drug: [
      { medicinalproduct, drugcharacterization, drugindication,
        drugauthorizationnumb, drugadministrationroute,
        drugdosagetext, drugdosageform, actiondrug, drugadditional,
        activesubstance: { activesubstancename },
        drugstartdate, drugenddate,
        openfda: {
          brand_name[], generic_name[], substance_name[],
          manufacturer_name[], product_ndc[], spl_id[], spl_set_id[],
          application_number[], rxcui[], unii[],
          pharm_class_epc[], pharm_class_moa[], pharm_class_pe[],
          pharm_class_cs[], route[], product_type[]
        }
      }
    ]
  }
}
```

**Reporter-type codes (`primarysource.qualification`)** per the openFDA YAML:
- `1` Physician, `2` Pharmacist, `3` Other health professional, `4` Lawyer, `5` Consumer / non-health professional. Code `4` is operationally significant: lawyer-sourced reports are a known tort-signal artifact (mass-tort intake firms file in bulk after MDL formation).

**Reaction outcome (`patient.reaction[].reactionoutcome`):**
- `1` Recovered/Resolved, `2` Recovering/Resolving, `3` Not recovered/Not resolved, `4` Recovered/Resolved with sequelae, `5` Fatal, `6` Unknown.

**Live sample (PII masked):** A single record retrieved with `limit=1` from the bare endpoint on 2026-01-27 returned `safetyreportid: "5801206-7"`, `receivedate: 20080707`, medicinal product Duragesic-100, reactions `DRUG ADMINISTRATION ERROR` / `OVERDOSE` (no narrative present in payload). Patient age/sex stripped here for compliance; openFDA itself does not expose names, addresses, dates of birth, or free-text narratives.

**Caveats:**
- The `openfda{}` sub-block on each drug element is **best-effort enrichment**, not guaranteed (see §3). For older reports and many literature-sourced foreign reports, `openfda` is absent entirely.
- `patient.drug[].drugcharacterization`: `1`=Suspect, `2`=Concomitant, `3`=Interacting. For tort signal, filter on `drugcharacterization:1` to avoid background-noise concomitant drug attributions — this matches plaintiff-litigation practice in published FAERS disproportionality studies.
- The drugs-array and reactions-array are not cross-linked. openFDA's own overview is explicit: *"No individual drug is connected to any individual reaction. When a report lists multiple drugs and multiple reactions, there is no way to conclude from the data therein that a given drug is responsible for a given reaction."*

---

## 2. Volume and pagination

**Bottom-line:** ~20.0 M reports indexed on openFDA as of 2026-01-27. Hard cap of **25,000 on `skip`** per query (effectively skip+limit ≤ ~26,000). Use **`receivedate` range partitioning** plus `search_after` cursor pagination for any pull above that threshold. openFDA refreshes /drug/event quarterly (3-month lag is normal); as of **August 22, 2025** FDA has announced daily publication of FAERS adverse-event data, but the openFDA endpoint itself is still documented as quarterly.

**Evidence:**
- Live live-fire confirmation: bare `https://api.fda.gov/drug/event.json` returned `meta.results.total: 20,006,989` with `last_updated: 2026-01-27`.
- FAERS scope: per *FAERS Essentials* (PMC12393772, Dec 2024 industry guidance article), *"As of December 31, 2023, FAERS includes more than 28 million reports. After accounting for follow-ups and duplicates, it represents over 20 million unique reports."* This is consistent with the 20.0 M figure openFDA returns — openFDA serves the latest version of each unique case. The FDA's own per-year-counts page was last updated November 2015 and shows growth from 335,751 reports (2006) to 1,204,685 (2014); FDA has not published a more recent per-year breakdown on that page, so any current per-year figure must be derived empirically via `count=receivedate` against /drug/event.
- Skip cap: openFDA Query Parameters page — *"Currently, the largest allowed value for the skip parameter is 25000"* (open.fda.gov/apis/query-parameters/). Update from 5,000 → 25,000 in Aug 2017 (open.fda.gov/about/updates/2017_08_30_openfda_limit_increased/). `limit` ≤ 1,000 per request.
- `search_after` pagination: documented at open.fda.gov/apis/paging/ — the client sorts (e.g. `sort=receivedate:asc`), reads the `rel="next"` value from the HTTP `Link:` header, and walks the dataset unbounded. This is the official recipe for deep pulls beyond 26K results.
- Rate limits (open.fda.gov/apis/authentication/): **no key → 240 req/min, 1,000 req/day per IP. With key → 240 req/min, 120,000 req/day per key.** (Some third-party docs cite 40/min unauthenticated; the FDA page itself states 240/min for both, with the differentiator being 1,000/day vs 120,000/day. Always use a key in production.)
- Update cadence: *"Quarterly. However, please be advised that the data in this API may lag by 3 months or more"* (open.fda.gov/apis/drug/event/).
- Aug 22, 2025 FDA announcement on real-time FAERS publication (FDA press release: "FDA Begins Real-Time Reporting of Adverse Event Data"). The /drug/event endpoint overview text has **not** changed to reflect a daily cadence as of last review — assume the openFDA API remains quarterly until open.fda.gov says otherwise.

**Per-year recent volume:** Cumulative unique reports grew from ~16 M (end-2020) to ~20 M (end-2023) → roughly 1.0–1.5 M unique reports/year recent, gross intake substantially higher because follow-up versions are filtered out. Do not infer year-volume from `count=receivedate` snapshots without summing — openFDA's `count` aggregation returns up to 1,000 buckets per call.

**Single-quarter volume estimate:**
- ~400K–500K unique-final reports per quarter recent (gross intake ~600K).
- openFDA's published partition files (download.json) are split into ≤150 MB JSON chunks; a recent quarter is typically several files totaling ~1.5–2 GB compressed JSON, ~5–8 KB per fully-enriched record uncompressed.
- For the **`serious:1` subset** (your tort focus — see §4) the volume is roughly 50–55 % of the total → ~200K–280K serious reports/quarter. Your ingest, projected to flat tables keeping only the fields in §8, lands at roughly **~1–3 KB/row** in Supabase → ~0.7–1.0 GB per year of serious data across the fact + junction tables, well inside the 5 GB envelope.

**Caveats:**
- The `meta.results.total` on count queries reports **bucket count**, not record count; on search queries it reports total matching records. Don't confuse them.
- Partitioning recipe for full historical backfill: iterate `receivedate:[YYYYMMDD+TO+YYYYMMDD]` in 30-day or shorter windows so each slice fits under 25K records, then use `search_after` if a window still exceeds 25K. The openFDA paging doc explicitly recommends this pattern.

---

## 3. Drug → manufacturer identification

**Bottom-line:** The native FAERS drug record carries only free-text `medicinalproduct` and `activesubstance.activesubstancename`. The reliable manufacturer key is `patient.drug[].openfda.manufacturer_name[]` — but that block is **only present when openFDA's harmonizer matched the reported product to an SPL/NDC entry**, and the match rate is partial. There is **no manufacturer field native to the FAERS record itself**; `sender.senderorganization` and `companynumb` are the reporting/processing organization, not the marketing authorization holder. Plan for partial `openfda`-block coverage on recent US-prescription reports, much lower for foreign / OTC / older reports, and build a curated alias table as the canonical join.

**Evidence:**
- openFDA harmonization is **opt-in by exact match**: *"Because the harmonization process requires an exact match, some drug products cannot be harmonized in this fashion—for instance, if the drug name is misspelled. Some drug products will have openfda sections, while others will never, if there was no match during the harmonization process."* (open.fda.gov/apis/openfda-fields/).
- openFDA does NOT publish a single official enrichment-rate figure for /drug/event; the documentation only commits to "not all records have harmonized fields." Empirically, published pharmacovigilance studies that filter on `patient.drug.openfda.generic_name` routinely lose 30–50 % of raw records relative to free-text `medicinalproduct` searches — this is a known gotcha and is why disproportionality papers (e.g. the GLP-1 NAION studies using OpenVigil 2.1) use both the openFDA harmonization and free-text fallback.
- `patient.drug[].openfda` fields available for keying (per openFDA-fields page): `brand_name`, `generic_name`, `substance_name`, `manufacturer_name`, `product_ndc`, `application_number`, `spl_id`, `spl_set_id`, `rxcui`, `unii`, `pharm_class_*`, `route`, `product_type`. These are **all arrays of strings**; a single drug element can carry multiple NDCs/manufacturers (because the harmonizer matched multiple SPLs).
- `sender.sendertype` enum: `1`=Pharmaceutical Company, `2`=Regulatory Authority, `3`=Health Professional, `4`=Regional Pharmaceutical Company, `5`=Study, `6`=Other. `companynumb` is the manufacturer's internal control number on company-source reports — useful for duplicate detection, **not** for canonical manufacturer identity.

**Recommended drug→manufacturer keying order:**
1. `patient.drug[i].openfda.product_ndc[0]` → lookup in your local NDC dimension (pre-loaded from openFDA `/drug/ndc.json`) → `labeler_name` → normalize to `manufacturer_id`. This is the cleanest path because NDC labeler segments are deterministic.
2. Fallback: `patient.drug[i].openfda.unii[0]` (active ingredient identifier) + `patient.drug[i].openfda.manufacturer_name[0]` → normalized alias lookup.
3. Fallback: `patient.drug[i].openfda.generic_name[0]` + `patient.drug[i].openfda.manufacturer_name[0]` → normalized alias lookup.
4. Fallback for unharmonized records: free-text `medicinalproduct` → fuzzy match against your `drugs` dimension (drug brand + generic synonyms) and either auto-link with confidence ≥ 0.9 or shunt to a review queue.

**Manufacturer-name variance:** openFDA's `manufacturer_name` is the SPL labeler name. The classic example for the GLP-1 NAION torts:
- `"Eli Lilly and Company"` (SPL labeler for tirzepatide / Mounjaro)
- `"Lilly USA, LLC"` (US marketing affiliate; appears on some package inserts)
- `"Eli Lilly"` (truncation seen on some downstream data)
- `"Novo Nordisk Inc."` vs `"Novo Nordisk A/S"` vs `"Novo Nordisk"` — the US sub vs Danish parent vs colloquial form, all three appear in FAERS via different reporting paths.

**Recommendation:**
- **Maintain a separate `drugs` dimension** keyed by an internal `drug_id`, with stable canonical fields (`canonical_generic_name`, `canonical_brand_name`, `primary_unii`, `primary_rxcui`), and a `drug_manufacturer_alias` junction so a drug can map to multiple `manufacturer_id`s over time (relevant for generics, AGs, and divestitures — Sanofi divested Zantac to Boehringer to Pfizer to GSK in famous fashion). Do **not** flatten to manufacturer-level signal; the GLP-1 example alone proves you need drug granularity because Eli Lilly markets both tirzepatide (NAION signal) and many other unrelated drugs.
- **Canonical key choice:** UNII (FDA's substance identifier) is the most stable canonical key for the *active ingredient*; RxCUI is best for the *clinical drug* (ingredient + strength + form). Use UNII for joining tort signals across brand/generic; use RxCUI when you need to distinguish dosage forms (e.g., oral vs subcutaneous semaglutide have different NAION risk profiles per the Hathaway/JAMA Ophthalmology data).
- **Alias table:** Hand-curated `manufacturer_aliases` (raw_name → manufacturer_id) seeded from one pass over distinct `openfda.manufacturer_name[]` values in the last 5 years of FAERS plus the SPL labeler dictionary. Rebuild quarterly. RapidFuzz / token_set_ratio works well for residuals but you should not auto-merge above 0.85 without human review on tort-relevant manufacturers (the cost of falsely attributing a signal to "J&J" vs "Janssen Pharmaceuticals" is significant).

**Caveats:**
- For talc/J&J: FAERS reports overwhelmingly attribute the product to **"Johnson & Johnson Consumer Inc."** which is now under the Kenvue spinoff for OTC products. Talc claims are tied to the legacy J&J corporate entity — your manufacturer dimension needs an `entity_history` table to track corporate succession or you will misroute tort signals.
- For hair relaxers (MDL 3060): manufacturer is highly fragmented (L'Oréal USA Inc., Strength of Nature LLC, Namasté Laboratories, Soft Sheen-Carson). Most hair-relaxer products are cosmetics, not drugs, and **most hair-relaxer adverse events would NOT appear in FAERS** at all — they go to the new Cosmetic Adverse Events endpoint (released Sep 13, 2025 per openFDA updates page) or to CAERS. This is a critical scoping point: **FAERS will not pick up the hair-relaxer tort**; budget a separate Cosmetic AE pipeline for that.

---

## 4. Severity filtering for tort signal

**Bottom-line:** Use `search=serious:1` as the primary severity gate. For tort-grade signals add the sub-flag `seriousnessdeath:1` OR `seriousnesshospitalization:1` OR `seriousnesslifethreatening:1` OR `seriousnessdisabling:1`. The `seriousnessother:1` flag alone is too permissive (it's a catch-all for "medically important" that pharma reporters apply liberally).

**Evidence:**
- `serious` field (drugevent.yaml): `1` = the adverse event resulted in death, a life-threatening condition, hospitalization, disability, congenital anomaly, or other serious outcome; `2` = non-serious.
- Six sub-flags are independent booleans on the report: `seriousnessdeath`, `seriousnesshospitalization`, `seriousnesslifethreatening`, `seriousnessdisabling`, `seriousnesscongenitalanomali`, `seriousnessother`. A `serious:1` report has ≥1 sub-flag = `1`.
- `patient.reaction[].reactionoutcome` is per-reaction: `5`=Fatal is the strongest tort-signal value; `4`=Recovered with sequelae is the second-strongest (corresponds to permanent injury claims).

**Recommended query templates** (the pipeline will assemble these):

- *"Drug X, serious reports, last 90 days":*
  `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:"semaglutide"+AND+serious:1+AND+receivedate:[20260213+TO+20260513]&limit=1000`

- *"Drug X, fatal outcomes, last 12 months":*
  `...?search=patient.drug.openfda.generic_name:"semaglutide"+AND+seriousnessdeath:1+AND+receivedate:[20250513+TO+20260513]`

- *"Drug X + specific MedDRA PT, last 90 days":*
  `...?search=patient.drug.openfda.generic_name:"semaglutide"+AND+patient.reaction.reactionmeddrapt.exact:"OPTIC ISCHAEMIC NEUROPATHY"+AND+receivedate:[...]`

- *"Drug X + Suspect characterization only" (eliminates concomitant noise):*
  `...?search=patient.drug.medicinalproduct:"OZEMPIC"+AND+patient.drug.drugcharacterization:1+AND+serious:1`. Note: `drugcharacterization` cannot be cross-filtered against `openfda.generic_name` cleanly in a single query because the constraint binds at the array-element level only loosely in Elasticsearch — for tight per-drug filtering you must post-filter in Python after pulling the report and walking `patient.drug[]`.

**Estimated serious-only count per year:** Per FDA Public Dashboard the serious fraction is consistently ~50–55 % of all FAERS reports → roughly 600K–800K unique-final serious reports/year currently. (Confirm with a `count=receivedate&search=serious:1` query against the live endpoint before sizing storage.)

**Caveats:**
- Reports filed by **lawyers** (`primarysource.qualification:4`) are virtually always coded `serious:1` because plaintiff intake firms file MedWatch reports as part of mass-tort discovery. This biases the serious denominator upward in any drug with active litigation — you will need a `primarysource.qualification != 4` view alongside the all-reporter view to disentangle organic signal from litigation feedback loops. This is **critical** for the tort-signal use case: a drug with rising serious-by-lawyer reports tells you litigation is intensifying, not that the underlying risk is rising.
- Pharma-source reports default to `serious:1` for any report with hospitalization in narrative even when the hospitalization was unrelated; non-serious for the same fact pattern from a consumer reporter. Treat `serious` as broadly sensitive but only moderately specific against a strict tort definition (death, permanent injury, congenital anomaly).

---

## 5. MedDRA coding

**Bottom-line:** openFDA exposes the **MedDRA Preferred Term only** (`patient.reaction[].reactionmeddrapt`), with the version stamped in `reactionmeddraversionpt`. **System Organ Class (SOC), High-Level Term (HLT), High-Level Group Term (HLGT), and Lowest-Level Term (LLT) are NOT exposed.** To roll PTs up to SOC for the tort-signal scoring model, you need to license MedDRA separately (via MSSO) and store the PT→SOC mapping yourself, or use an open surrogate.

**Evidence:**
- Searchable-fields YAML: only `reactionmeddrapt` and `reactionmeddraversionpt` are present on `patient.reaction[]`. No `reactionmeddrasoc`, no `reactionmeddrallt`. Confirmed in the openFDA Searchable Fields page and in the AWS Athena DDL published in the AWS Big Data blog (which mirrors the openFDA schema field-for-field).
- openFDA's `openfda` enrichment block on `patient.drug[]` does NOT add SOC — only NDC/labeler/SPL/UNII identifiers.
- MedDRA version cadence: **two releases per year, March and September.** Each release renames a small number of PTs and adds new ones. openFDA does not retroactively re-code old reports — they retain the PT and version they were submitted with.

**GLP-1 NAION worked example:**
- Published FAERS pharmacovigilance studies (Castellana et al., *Hospital Pharmacy* 2026; Hoepner et al., *BMC Medicine* 2025; multiple 2024–25 disproportionality papers) consistently report that **NAION cases in FAERS are coded under the MedDRA PT `"Optic ischaemic neuropathy"`** because the more specific PT "Non-arteritic anterior ischaemic optic neuropathy" did not exist in MedDRA v27 (the version current through most of 2024). NAION-specific terminology was on the MedDRA MSSO change-request roadmap and has been added in subsequent MedDRA versions; the Castellana tirzepatide study explicitly states: *"Since 'Non-Arteritic Anterior Ischemic Optic Neuropathy (NAION)' was not yet a specific term in the MedDRA dictionary version 27, the broader term ION was used."* This is the exact MedDRA-rename-drift risk: if your pipeline keys cluster purely on PT string, semaglutide NAION reports filed under v27 will sit in the `OPTIC ISCHAEMIC NEUROPATHY` bucket while reports filed after the PT addition will sit in the new bucket.
- Sister terms to capture in the GLP-1 NAION cluster: `OPTIC ISCHAEMIC NEUROPATHY`, `OPTIC NEUROPATHY`, `ANTERIOR ISCHAEMIC OPTIC NEUROPATHY`, `BLINDNESS UNILATERAL`, `VISUAL IMPAIRMENT`, `VISUAL ACUITY REDUCED`, plus any newly-added `NON-ARTERITIC ANTERIOR ISCHAEMIC OPTIC NEUROPATHY` PT once MedDRA adds it.
- Recommended query for ongoing surveillance (live URL for your pipeline):
  `https://api.fda.gov/drug/event.json?search=(patient.drug.openfda.generic_name:semaglutide+OR+patient.drug.openfda.generic_name:tirzepatide)+AND+patient.reaction.reactionmeddrapt.exact:"OPTIC ISCHAEMIC NEUROPATHY"&count=receivedate`
- Published FAERS analyses (Hoepner et al., *BMC Medicine* 23:203, Apr 7, 2025) report: *"Among the 11,558 reports for semaglutide, we identified 417 cases specifically related to visual impairment or ischemic optic neuropathy (ION)."* Disproportionality across GLP-1RAs was significant: rOR 1.95 (95% CI 1.75–2.17, p < 0.0001) for vision impairment with semaglutide vs other GLP-1 RAs. A 2025 systematic review and meta-analysis (PMID 40962119) reports a pooled hazard ratio of 2.620 (95% CI 1.808–3.795, P < 0.001) for NAION with semaglutide vs control medications. WHO and EMA both recommended label updates for semaglutide medicines in June 2025. **This is exactly the kind of drug-reaction pair your tort-signal pipeline must catch in the first quarter of being live.**

**Live-fire test result:** A direct openFDA query for `semaglutide + "OPTIC ISCHAEMIC NEUROPATHY"` could not be executed end-to-end from the research environment (the web_fetch allow-list rejected parameterized api.fda.gov URLs in this run). The bare-endpoint metadata fetch confirmed openFDA is live, `last_updated: 2026-01-27`, `meta.results.total: 20,006,989` indexed records. Based on the published 2024–25 analyses cited above, the query should currently return reports in the low-hundreds range with a strong recent-receivedate skew. **Run the query directly (curl/browser) as part of pipeline acceptance testing.**

**Caveats:**
- Term-renaming across MedDRA versions IS a real issue for clustering keys. Two mitigations: (a) cluster on `(reactionmeddrapt, reactionmeddraversionpt)` and apply an MSSO-published version-bridge mapping at read time; (b) cluster on a broader synonym set per tort (the "NAION + cousins" list above) rather than a single PT.
- openFDA does not publish a single current MedDRA version they're running against; sample records carry `reactionmeddraversionpt` ranging from `15.0` through current (each report carries the version active when it was submitted). For tort-signal you do NOT want to filter on version — accept all and let the synonym cluster handle drift.

---

## 6. NLP / clustering implications

**Bottom-line:** Option **(a) MedDRA-only clustering** is the only viable approach against openFDA. Option (b) free-text narrative NLP is **impossible from openFDA** because the FAERS B.5 narrative is stripped before openFDA ingests it. Option (c) hybrid requires you to bolt on quarterly FAERS QDE files (also stripped) or FOIA-redacted narratives (manual, weeks of latency) — not feasible for a weekly batch pipeline.

**Evidence:**
- *FAERS Essentials*, PMC12393772 (Dec 2024 industry guidance article): *"like the FAERS Public Dashboard, the FAERS QDE files do not contain ICSR narratives and certain structured data fields to protect patient confidentiality."* This applies to openFDA, which is downstream of the QDE files.
- The FDA's own FAERS QDE page (fis.fda.gov/extensions/FPD-QDE-FAERS/FPD-QDE-FAERS.html) confirms narratives are not included.
- Pharma industry commentary (HCL/C3iHC outsourcing blog): *"These files contain some but not all information submitted to FDA in MedWatch forms or as E2B files. **The narrative, in particular, is not included.**"*
- Narratives are only available via individual FOIA requests case-by-case, redacted by hand. Not a pipeline input.

**Recommended approach: option (a), structured MedDRA clustering.**
- Cluster key: `(drug_id, meddra_pt_canonical, primarysource.qualification_bucket)` where `meddra_pt_canonical` rolls minor PT renames and tort-cousin terms (NAION + ION + Optic ischaemic neuropathy → one cluster id). Maintain a `meddra_synonym_groups` table seeded from the MedDRA SMQ (Standardised MedDRA Query) framework — SMQs are designed exactly for this use case (signal grouping across PTs).
- Velocity metric for tort-signal scoring: `serious_reports_in_last_90d / serious_reports_in_prior_270d * baseline_factor` per cluster, scored against the trailing 12-month baseline for that drug-cluster pair, with a separate excitation factor for `primarysource.qualification:4` (lawyer reports).
- Watchlist promotion threshold: tunable; suggested starting heuristic is **N ≥ 20 serious non-lawyer-sourced reports in trailing 90 days** for a `(drug, cluster)` pair not already on Watchlist, OR **N ≥ 5 fatal** (reactionoutcome=5 OR seriousnessdeath:1) for the same pair.

**If you absolutely need narrative text** (you don't, for tort-signal scoring at the volumes you're operating):
- Estimated narrative length: 200–1,500 characters per ICSR (from FOIA-released exemplars and from MAUDE narratives which ARE exposed by openFDA for devices — useful comparator). At ~1 M unique reports/year and ~800 chars average, raw narratives would be ~0.8 GB/year of text. You don't have a path to it from openFDA.

**Caveats:**
- The relevant MAUDE-side comparator: openFDA's /device/event endpoint DOES expose `mdr_text[].text` (the free-text narrative). FAERS does not. This asymmetry is by FDA policy, not by openFDA capability.

---

## 7. Known issues, gotchas, deprecations

**Bottom-line:** Five live issues to design around: (1) August 2025 FDA "real-time FAERS" announcement may shift the openFDA cadence — monitor open.fda.gov/about/updates/; (2) duplicate reports are pervasive (10–25 % of any pharmacovigilance series); (3) only the latest version of each `safetyreportid` is exposed by openFDA, with no version history; (4) lawyer-sourced reports inflate the denominator for active-tort drugs and create signal-leakage where litigation drives reporting drives signal score; (5) the harmonization match rate problem (§3) means a substantial fraction of /drug/event records carry no `openfda.*` keys.

**Evidence — recent openFDA changes (open.fda.gov/about/updates/):**
- **Feb 17, 2026:** Tobacco Digital Ads Research dataset released — no /drug/event impact.
- **Sep 13, 2025:** Cosmetic Adverse Events dataset released — important for the hair-relaxer tort (see §3), NOT a FAERS change.
- **Sep 5, 2025:** Complete Response Letters released — adjacent regulatory transparency, useful for tort intelligence.
- **Aug 22, 2025 (FDA press release, not the openFDA updates page):** FDA announced daily real-time publication of FAERS adverse-event data. The /drug/event endpoint as of late January 2026 is still documented as quarterly — the daily feed appears to be a parallel publication on the FAERS Public Dashboard, not yet pushed into openFDA's API ingest cadence. **Monitor this.**
- **Mar 25, 2025:** Drug Shortages dataset released.
- **Feb 23, 2024:** Wildcard search enabled across all openFDA endpoints.

**FAERS reporting bias / FDA caveats (verbatim from openFDA's own disclaimer block, open.fda.gov/apis/drug/event/):**
- *"There is no certainty that the reported event (adverse event or medication error) was actually due to the product. FDA does not require that a causal relationship between a product and event be proven."*
- *"FDA does not receive reports for every adverse event or medication error that occurs with a product."*
- *"The information in these reports has not been scientifically or otherwise verified as to a cause and effect relationship and cannot be used to estimate the incidence of these events."*
- Reporting is **voluntary** for healthcare professionals and consumers (via MedWatch), **mandatory** for manufacturers within 15 days for serious-and-unexpected events ("15-day Alert reports") and on quarterly/annual cycles otherwise.

**Duplicate handling:**
- Three fields are relevant: `safetyreportid` (the FDA-assigned case number, e.g. `6176304-1`), `safetyreportversion` (the version number of THIS specific submission), and `companynumb` (the manufacturer's internal control number, useful for cross-company duplicate detection).
- openFDA documentation states explicitly: *"Rather than updating individual records in FAERS, subsequent updates are submitted in separate reports."* In practice openFDA serves only the latest version: dedup on `safetyreportid` first, take `MAX(safetyreportversion)`. The FAERS-Essentials paper (PMC12393772) is the primary source for FDA's recommended dedup procedure on raw QDE files: sort by `CASEID, FDA_DT, PRIMARYID` and keep the latest per CASEID — replicate this logic in your transform layer if you're worried about openFDA's dedup being imperfect.
- Published research finds **10–25 % of FAERS case series contain duplicate ICSRs** (Hauben et al., PMC12423208 — "An Evaluation of Duplicate Adverse Event Reports Characteristics in FAERS"). The `reportduplicate.duplicatenumb` field is the manufacturer's pointer to a known duplicate of the same case from another reporter — exploit it.

**Tort-context historical false positives / negatives:**
- **Zantac / ranitidine NDMA:** FAERS reports for ranitidine totaled 55,834 from 1982 to Sept 30, 2019, of which 23,557 were serious and 2,175 deaths. Critically, FAERS **did not surface the NDMA-carcinogenesis signal** — the signal came from Valisure's lab testing in 2019, not from FAERS pattern detection. FAERS cancer-related ranitidine reports actually post-date the litigation media cycle, which is a classic notoriety-bias artifact. **Lesson for your pipeline: pure FAERS-velocity scoring would have missed Zantac.** You need an external-signal layer (regulatory recalls, third-party lab testing, media) on top of FAERS.
- **Vioxx / rofecoxib (MDL 1657):** FAERS DID surface cardiovascular signal (MI, stroke) for rofecoxib well before the 2004 withdrawal — the academic literature shows the signal was detectable in FAERS by 2001–2002 if one had been looking. Useful **true positive** archetype for your scoring model. The Vioxx MDL ultimately settled in November 2007 for $4.85 billion; the court-appointed Claims Administrator (BrownGreer PLC) describes it as covering "nearly 60,000 claims arising from Vioxx use" (figures for processed-and-paid versus filed-and-eligible vary across sources, but $4.85 B / ~60,000 claims is the canonical settlement framing).
- **Singulair / montelukast neuropsychiatric:** A textbook FAERS signal — suicide/depression PTs accumulated for years; FDA boxed warning Sept 2020. **True positive**, strong PT cluster.
- **Belviq / lorcaserin cancer:** Withdrawal Feb 2020 was driven by the CAMELLIA-TIMI 61 RCT, not FAERS. Cancer is a long-latency event that FAERS catches poorly because the average report has incomplete drug exposure history. **False negative** archetype — your scoring model should weight oncology PTs with lower velocity-threshold but expect FAERS to miss many of them.
- **GLP-1 NAION (current — Mounjaro/tirzepatide, Ozempic/semaglutide):** FAERS analyses (Hathaway *JAMA Ophthalmology* 2024; Hoepner *BMC Medicine* 2025; Castellana *Hospital Pharmacy* 2026; the 2025 NAION meta-analysis with pooled HR 2.620) DID surface this signal in 2024 ahead of the EMA/WHO label updates in June 2025. **Strong true-positive archetype, exactly the tort window your pipeline is designed to catch.**

Plaintiff-attorney usage of FAERS is discussed extensively in DSaRM advisory committee transcripts and openly in plaintiff CLE materials. The standard mass-tort intake pattern is: (1) monitor FAERS via the public dashboard or third-party services (AdverseEvents Inc., Reprisk, AdvancedTrack); (2) when signal exceeds a threshold AND there's regulatory action (FDA safety communication, label change, REMS), file MedWatch reports for retained clients as part of MDL formation discovery; (3) FAERS reports filed by the firm then become exhibits demonstrating notice to the manufacturer. The feedback loop is real and your scoring model needs to account for it.

**Caveats:**
- openFDA has had multi-day outages historically. Build idempotent re-runs into the weekly cron.
- The `count=` aggregation truncates at 1,000 buckets by default; for date-receivedate counts across years use `limit=1000` explicitly and stitch.

---

## 8. Architecture recommendation

**Bottom-line:** New pipeline, shared `openfda_client` module, new tables. Estimated effort **medium** — larger than the device/recall pipeline (because of drug→manufacturer normalization and the MedDRA dimension) but smaller than greenfield (you reuse fetch, retry, rate-limit, and credentialing infra). Comparable in effort to the queued MAUDE pipeline.

### Schedule and fetch
- **Cron:** weekly (Monday 02:00 UTC), aligned with the existing device-recall ingest. openFDA refreshes /drug/event quarterly, so most weeks will be no-ops; once a quarter you'll pull a large delta. Daily would burn the API quota for nothing until openFDA adopts FDA's real-time cadence.
- **Delta strategy:** Maintain a state row `pipeline_state.faers_last_receivedate_fetched`. Each run pulls `receivedate:[last_fetched+1 TO TODAY]` filtered by `serious:1`, walking the 25K cap with `receivedate`-partitioning and `search_after` cursor.
- **Auth:** API key (240 req/min, 120K req/day). One key per pipeline module, rotated annually.
- **Reuse:** the existing `openfda_client` from device-recall handles the HTTP retry, exponential backoff on 429/5xx, pagination, rate-limit token bucket, and User-Agent. Lift it to a shared module; per-endpoint pipeline modules (`pipelines/device_event.py`, `pipelines/device_recall.py`, `pipelines/device_enforcement.py`, **new** `pipelines/drug_event.py`) hold only the transform/load logic.

### Schema (proposed Supabase DDL summary — not literal SQL)

**`drugs` (dimension, ~5K–20K rows growing slowly):**
- `drug_id` PK
- `canonical_brand_name`, `canonical_generic_name`
- `primary_unii`, `primary_rxcui`
- `primary_application_number` (NDA/ANDA/BLA)
- `manufacturer_id` (default; nullable for generics with multiple)
- `created_at`, `updated_at`, `is_torted` (boolean flag for prioritization)

**`drug_manufacturer_aliases` (junction — handles generics & corporate succession):**
- `drug_id` FK, `manufacturer_id` FK, `valid_from`, `valid_to`, `source` ('openfda_ndc' | 'curated' | 'fuzzy')

**`manufacturer_aliases` (existing table or new — raw_name → manufacturer_id):**
- `raw_name` (UNIQUE), `manufacturer_id` FK, `match_score`, `reviewed_by`, `reviewed_at`

**`drug_adverse_events` (fact — one row per FAERS report; ~700K–1.0 M rows/year of serious reports):**
- `safetyreportid` PK, `safetyreportversion`
- `receivedate`, `receiptdate`, `transmissiondate` (dates)
- `serious` (boolean), `seriousness_death`, `seriousness_hospitalization`, `seriousness_lifethreatening`, `seriousness_disabling`, `seriousness_congenital`, `seriousness_other` (booleans)
- `primarysource_qualification` (1..5), `primarysource_country`, `occurcountry`
- `sender_type`, `sender_organization`, `companynumb`
- `patient_age`, `patient_age_unit`, `patient_sex`, `patient_died` (boolean)
- `reporttype`, `fulfillexpeditecriteria`
- `meddra_version_max` (denormalized — highest version across the report's reactions)
- `ingested_at`

**`drug_event_drugs` (junction — many-to-many between report and drug; ~2.5–3.5 M rows/year):**
- `safetyreportid` FK, `drug_id` FK, `drug_seq` (preserve drug array order)
- `drugcharacterization` (1=Suspect, 2=Concomitant, 3=Interacting)
- `drugindication` (free text; high cardinality)
- `drugstartdate`, `drugenddate`
- `actiondrug`, `drugadministrationroute`
- `raw_medicinalproduct`, `raw_manufacturer_name` (preserved for audit)

**`drug_reactions` (junction — one row per report-reaction pair; ~2.5–3.5 M rows/year — *this is the table tort-signal scoring queries the most*):**
- `safetyreportid` FK, `reaction_seq`
- `meddra_pt` (raw PT string)
- `meddra_pt_canonical` (normalized to cluster key; FK to `meddra_clusters.cluster_id`)
- `meddra_version_pt`
- `reactionoutcome` (1..6)

**`meddra_clusters` (curated; ~500 tort-relevant clusters):**
- `cluster_id` PK, `cluster_name` ("GLP-1 NAION", "Talc-ovarian cancer", etc.)
- `member_pts` (array of strings or junction table)
- `tort_relevance_tier` (Cold | Watch | Hot)
- `notes`

**Storage budget check:**
- Fact: ~800K serious rows/year × ~600 B/row ≈ 0.5 GB/year
- `drug_event_drugs`: ~3 M rows/year × ~250 B/row ≈ 0.75 GB/year
- `drug_reactions`: ~3 M rows/year × ~200 B/row ≈ 0.6 GB/year
- Plus dimensions ≈ 50 MB.
- Year 1 footprint ≈ 1.9 GB. Across all existing openFDA pipelines (recalls ~100 MB, enforcement ~100 MB, MAUDE projected ~1 GB) total stays under the 5 GB envelope **only if you keep just serious reports**. If you ingest non-serious too, you double the volume — not recommended for tort signal.

### Tort-signal surfacing query (the actual product)

> *"Manufacturers/drugs with N+ serious FAERS reports in last 90 days, not currently on Watchlist or only at Cold stage."*

Joins `drug_adverse_events` (filter `serious=true` and `receivedate >= now() - 90d` and `primarysource_qualification != 4`) → `drug_event_drugs` (filter `drugcharacterization=1`) → `drugs` → `manufacturers` → LEFT JOIN watchlist → filter watchlist null OR stage='Cold' → group by `(drug_id, meddra_pt_canonical)` HAVING count ≥ N. Threshold N tunable; suggest start at 20 for general drugs, 5 for already-flagged tort drugs, 3 for any cluster with `reactionoutcome=5` (fatal) majority.

### Don't extend the existing tables
- The existing `recalls` table is enforcement-event-shaped (recalling firm, classification, distribution). Drug AE reports are case-safety-report shaped (per-patient, per-reaction). Different entity, different lifecycle (recalls are issued once and closed; AE reports update via version chain). **New tables, full stop.**

### MAUDE comparison
- Shared infrastructure with MAUDE: HTTP client, retry, rate limit, pagination, receivedate-range partitioning, `search_after`.
- **Not** shared: schema. MAUDE describes a device-event, FAERS a drug-event. Different identifiers (MDR# vs safetyreportid), different reaction taxonomies (MAUDE has device problem codes + patient codes, FAERS has MedDRA), different cardinality (MAUDE has the narrative text exposed; FAERS does not). Build them as two sibling per-endpoint modules, both consuming the shared `openfda_client`.
- **Effort:** if device-recall took X engineer-weeks, expect FAERS at 2.5–3× X. The drug→manufacturer normalization and the MedDRA-cluster maintenance are the new cost drivers, not the fetch loop.

### Risk register
1. openFDA shifting to FDA's daily-publication cadence — would invalidate the weekly-no-op design. Monitor open.fda.gov/about/updates/. **Mitigation:** make schedule a config var.
2. MedDRA PT additions for NAION (or any future tort PT) — clusters need refresh. **Mitigation:** quarterly review of `meddra_clusters` against MSSO release notes.
3. Lawyer-sourced reports inflating signal on already-torted drugs (Zantac feedback-loop pattern). **Mitigation:** dual computation — all-reporter signal AND non-lawyer signal, dashboard shows both.
4. Cosmetic Adverse Events endpoint — the hair-relaxer / talc-cosmetic tort lives there, not in FAERS. **Mitigation:** scope a separate Cosmetic AE pipeline as a sibling under the same `openfda_client`.
5. Manufacturer corporate succession (Sanofi → Boehringer → Pfizer → GSK for Zantac, J&J → Kenvue for OTC). **Mitigation:** `manufacturer_succession` table with effective dates; tort-signal queries select the manufacturer that held the marketing authorization at `receivedate`.

---

## Summary table (quick reference)

| Item | Value | Source |
|---|---|---|
| Endpoint | `https://api.fda.gov/drug/event.json` | open.fda.gov/apis/drug/event/how-to-use-the-endpoint/ |
| Coverage | 2004 → present (FAERS); legacy AERS 2004Q1–2012Q3 | open.fda.gov/apis/drug/event/ |
| Update cadence (openFDA API) | Quarterly, ~3 month lag | open.fda.gov/apis/drug/event/ |
| Total records (live, 2026-01-27) | ~20.0 M (20,006,989) | api.fda.gov/drug/event.json `meta.results.total` |
| FAERS scope (per Essentials Dec 2024) | 28 M total reports; ~20 M unique post-dedup at end-2023 | PMC12393772 |
| `limit` max | 1000 | open.fda.gov/apis/drug/event/how-to-use-the-endpoint/ |
| `skip` max | 25,000 | open.fda.gov/apis/query-parameters/ |
| Deep pagination | `search_after` via Link header | open.fda.gov/apis/paging/ |
| Rate limit (no key) | 240/min, 1,000/day per IP | open.fda.gov/apis/authentication/ |
| Rate limit (with key) | 240/min, 120,000/day | open.fda.gov/apis/authentication/ |
| Severity filter | `serious:1` | drugevent.yaml |
| Six sub-flags | `seriousness{death, hospitalization, lifethreatening, disabling, congenitalanomali, other}` | drugevent.yaml |
| Reaction outcome | 1–6 (1=resolved, 5=fatal) | drugevent.yaml |
| MedDRA level exposed | PT only (`reactionmeddrapt`); no SOC/HLT/LLT | open.fda.gov/apis/drug/event/searchable-fields/ |
| MedDRA version field | `reactionmeddraversionpt` (per report, not global) | drugevent.yaml |
| Narrative (B.5) | **NOT exposed** by openFDA | PMC12393772; fis.fda.gov/extensions/FPD-QDE-FAERS/ |
| Manufacturer field | `patient.drug[].openfda.manufacturer_name[]` — best-effort | open.fda.gov/apis/openfda-fields/ |
| Manufacturer enrichment rate | Not officially published; partial in practice (~50–70 % for recent US-Rx) | open.fda.gov/apis/openfda-fields/ |
| Reporter-type code 4 | Lawyer — flag for tort feedback-loop | drugevent.yaml |
| Duplicate-handling fields | `safetyreportid`, `safetyreportversion`, `reportduplicate.duplicatenumb`, `companynumb` | drugevent.yaml; PMC12423208 |
| Documented duplicate rate | 10–25 % of pharmacovigilance case series | PMC12423208 |
| GLP-1 NAION worked example | 11,558 semaglutide reports, 417 visual/ION-spectrum cases (Hoepner *BMC Medicine* 2025) | PMC11974072 |
| Semaglutide vision-impairment disproportionality | rOR 1.95 (95% CI 1.75–2.17, p<0.0001) vs other GLP-1 RAs | Hoepner *BMC Medicine* 23:203 (2025) |
| Semaglutide NAION meta-analysis pooled HR | 2.620 (95% CI 1.808–3.795, P<0.001) | PMID 40962119, 2025 |
| GLP-1 NAION PT | `OPTIC ISCHAEMIC NEUROPATHY` (MedDRA v27 era); NAION-specific PT added in later MedDRA versions | Castellana *Hospital Pharmacy* 2026 |
| Recommended pipeline cadence | Weekly cron, delta on `receivedate`, `serious:1` filter | this report |
| Recommended canonical drug key | UNII for ingredient, RxCUI for clinical drug | open.fda.gov/apis/openfda-fields/ |
| Estimated Year-1 storage (serious only) | ~1.9 GB across new tables | this report |
| MAUDE comparison | Shared client, separate transform/schema | open.fda.gov/apis/device/event/ |
| Recent FDA transparency move | Aug 22, 2025 — daily FAERS publication announced (openFDA cadence not yet changed) | FDA press release |
| Vioxx settlement (precedent) | $4.85 B, ~60,000 claims, Nov 2007 (MDL 1657) | BrownGreer PLC / MDL 1657 record |
| Estimated effort vs device-recall | 2.5–3× | this report |

---

## TL;DR

- **Yes, build it — but design around three hard constraints:** (1) openFDA exposes **no free-text narrative**, so plan on MedDRA-PT clustering only; (2) `skip` is hard-capped at 25,000, so use `receivedate`-range partitioning plus `search_after` cursor pagination; (3) the `openfda.manufacturer_name` enrichment block is best-effort and partial — you must build a curated `manufacturer_aliases` table and a `drugs` dimension keyed by UNII/RxCUI rather than relying on raw strings.
- **The pipeline will catch the user's primary live torts:** GLP-1 NAION is exactly the signal-detection pattern openFDA/FAERS is good at — the published literature (Hoepner 2025: 417 vision-impairment/ION cases in 11,558 semaglutide reports; pooled HR 2.620 in 2025 meta-analysis) shows the signal is present and growing, and EMA/WHO have already issued June 2025 label-update guidance. Talc/J&J is partially catchable in FAERS (drug AE reports for the prescription pharma side). **Hair relaxers will NOT appear in FAERS** — they need the separate Cosmetic Adverse Events endpoint (released Sep 13, 2025) as a sibling pipeline.
- **Architecture: weekly cron, `serious:1` filter, three new tables** (`drug_adverse_events` fact + `drug_event_drugs` and `drug_reactions` junctions), a `drugs` dimension joined to existing `manufacturers`, and a `meddra_clusters` table for tort-grouped PT synonyms. Reuse the existing `openfda_client` module; **do not** extend the recalls table. Year-1 storage projects to ~1.9 GB — well under the 5 GB Supabase envelope. Effort: 2.5–3× the device-recall pipeline.

## Key Findings

1. **FAERS via openFDA = structured fields only.** The B.5 narrative is stripped before openFDA ingestion (confirmed by FAERS Essentials, PMC12393772, and the FDA QDE page). Any tort-signal scoring must be built from MedDRA PT codes + structured seriousness flags.
2. **Drug→manufacturer is the hardest part of the build.** The `openfda` annotation block on `patient.drug[]` is best-effort — openFDA's own documentation says "Some drug products will have openfda sections, while others will never." The reliable path is NDC → SPL labeler → curated manufacturer alias. UNII as the canonical active-ingredient key, RxCUI as the canonical clinical-drug key.
3. **Severity filter is straightforward but politically loaded.** `serious:1` cuts ~50 % of volume; the six sub-flags let you tier death/hospitalization/disability vs the catch-all "other". `primarysource.qualification:4` (lawyer reports) MUST be tracked separately or you'll get a litigation→signal→litigation feedback loop on torted drugs.
4. **MedDRA PT is the only level openFDA exposes.** No SOC, no HLT, no LLT. PT renames across MedDRA's twice-yearly releases will fragment cluster keys — the GLP-1 NAION case (PT split between "Optic ischaemic neuropathy" and a newly-added NAION-specific PT) is the canonical worked example. Solve with a `meddra_clusters` table modeled on SMQ synonym groups.
5. **Live API confirmed healthy.** `last_updated: 2026-01-27`, ~20.0 M records, rate limit 240/min and 120K/day with key. The Aug 2025 FDA "daily real-time" announcement has NOT yet propagated into the openFDA API cadence as of late January 2026.

## Details

(See Sections 1–8 above for the full technical detail and source citations.)

## Recommendations

**Stage 1 — Build (4–6 engineer-weeks):**
1. Lift the existing device-recall HTTP client into a shared `openfda_client` module.
2. Implement `pipelines/drug_event.py` with: weekly cron, `serious:1` filter, `receivedate`-range partitioning + `search_after` deep pagination, idempotent re-runs keyed on `(safetyreportid, safetyreportversion)`.
3. Build the four new tables (`drugs`, `drug_adverse_events`, `drug_event_drugs`, `drug_reactions`) plus `meddra_clusters` and `manufacturer_aliases` additions.
4. Backfill last 24 months only (not 2004 — historical reports add noise without recent tort-relevance and consume ~10× the storage).
5. Seed `meddra_clusters` with ~20 tort-relevant clusters: GLP-1 NAION, talc-ovarian cancer (~30 PTs in SMQ "Malignant tumours"), Singulair neuropsychiatric, hormonal-therapy-VTE, and similar — pulled from current MDL master complaints.

**Stage 2 — Validate (1–2 weeks):**
6. Live-fire test against `semaglutide + Optic ischaemic neuropathy` and `tirzepatide + Optic ischaemic neuropathy` — verify cluster captures all ION-spectrum PTs and that ROR matches the published 1.95 / pooled HR 2.620 figures within reasonable noise.
7. Spot-check 50 random `safetyreportid`s in the fact table against the FAERS Public Dashboard for the same case — confirm dedup logic is working.
8. Run a 90-day signal report against the watchlist; expect 5–15 new (drug, cluster) candidates the first pass.

**Stage 3 — Operate:**
9. Quarterly review of `meddra_clusters` against MSSO release notes (March and September).
10. Quarterly review of `manufacturer_aliases` against new SPL labelers.
11. Scope the **Cosmetic Adverse Events sibling pipeline** for the hair-relaxer tort — same shared client, same architecture, separate tables.

**Thresholds that would change these recommendations:**
- If openFDA shifts /drug/event to daily refresh (track open.fda.gov/about/updates/), change cron to daily and reduce partition window to 1 day.
- If openFDA later exposes redacted narratives (no current indication), reconsider hybrid NLP — but expect a 4–8 GB/year storage hit.
- If Supabase storage budget rises above 10 GB, ingest non-serious reports too for a richer denominator on disproportionality scoring (ROR/PRR require a population of non-suspect-drug reports).
- If lawyer-sourced report ratio for a drug exceeds 30 %, automatically degrade that drug's velocity-signal weighting and surface as "litigation-driven" rather than "safety-driven" in the watchlist.

## Caveats

- **Live live-fire query for semaglutide + NAION was blocked in this research environment** — the web fetcher's URL allow-list rejected parameterized `api.fda.gov` URLs. The bare-endpoint metadata fetch succeeded and confirmed openFDA is healthy with 20,006,989 records last_updated 2026-01-27. The specific count for `semaglutide + OPTIC ISCHAEMIC NEUROPATHY` is reliably bounded by the Hoepner 2025 *BMC Medicine* analysis (417 visual-impairment/ION cases out of 11,558 semaglutide reports) but the live count today should be confirmed by curl as part of pipeline acceptance.
- **openFDA does not publish a quantitative enrichment rate** for the `openfda` block on /drug/event records. The "30–50 % loss" estimate cited in §3 is empirical from third-party pharmacovigilance papers, not an FDA-published figure. Validate against your own data after Stage 1.
- **The Aug 22, 2025 FDA real-time FAERS announcement** is documented in FDA press releases and trade media (e.g., Applied Clinical Trials Aug 2025). It is not yet reflected in changed cadence on the openFDA /drug/event overview page. Whether and when the openFDA API will follow the FAERS Public Dashboard to a daily refresh is unclear from primary sources.
- **The Vioxx settlement headline** has two equally cited framings: $4.85 B / ~60,000 claims (BrownGreer Claims Administrator) versus $4.35 B paid to 32,886 claimants out of 49,893 enrolled (court opinion). Both are accurate at different points in the settlement-resolution process. Use the BrownGreer figure as the canonical headline.
- **MedDRA NAION-specific PT addition** — the Castellana 2026 *Hospital Pharmacy* paper documents that the NAION-specific PT did not exist in MedDRA v27. We have not independently verified the exact MedDRA release in which the NAION-specific PT was added (MSSO release notes are licensed content). Confirm with MSSO directly before relying on the term being present in current FAERS submissions.
- **No FDA-published per-year FAERS report counts since 2014.** The FDA's per-year counts page (last updated November 2015) shows growth from 335,751 reports (2006) to 1,204,685 (2014); current ~1.0–1.5 M unique-final per year is derived from the cumulative trajectory (~20 M unique post-dedup at end-2023 per FAERS Essentials), not from a single primary-source figure.
- **The 50–70 % `openfda`-block coverage estimate** for recent US-prescription reports is empirical and varies sharply by drug class (high for branded recent-launch products like Mounjaro, low for older multi-source generics and for any foreign-source report). Treat as a planning estimate, not a guarantee.
