# CPSC / SaferProducts.gov / NEISS Ingest Pipeline — Technical Scoping Report

**Audience:** data engineer extending an existing openFDA recall/MAUDE/FAERS pipeline ecosystem (Supabase, manufacturer-name normalization, tort-signal scoring).

**Recommendation in one line:** Build a CPSC ingest as a sibling pipeline to the existing openFDA recall pipeline — **three distinct data surfaces, not one**. Start with the Recalls API (no auth, ~10K records, weekly refresh, low risk) as v1; add the SaferProducts.gov Incident Reports OData API as v2 for leading-indicator signal; defer the api.cpsc.gov NEISS endpoint to v3 as aggregate-only context data. The major scope risk is **political, not technical**: CPSC's proposed FY2026 transfer to HHS (still pending Congress as of May 2026) parallels the AEMS migration risk for FAERS/MAUDE — wrap URLs and field maps in an adapter layer. Section 6(b) of the CPSA structurally delays public incident data by 10+ business days, so CPSC public surfaces have inherently more lag than MAUDE.

-----

## 1. Endpoint shape

**Bottom-line:** There are **three distinct CPSC data surfaces**; do not conflate them. Each has a different host, auth model, schema, and update cadence.

### 1a. Recalls API (canonical, no auth)

- **Base:** `https://www.saferproducts.gov/RestWebServices/Recall`
- **Auth:** none required
- **Formats:** XML (default), JSON via `?format=json`
- **Update cadence:** weekly (per CPSC: "Data updates weekly as new recalls are announced.")
- **Documentation:** `https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information` and the v1.4 Programmers Guide PDF.

**Top-level single-valued fields per record:**

- `RecallID` (integer, internal CPSC ID)
- `RecallNumber` (string, e.g. `"16143"`, `"17-001"`)
- `RecallDate` (ISO 8601)
- `Title` (e.g. `"Fisher-Price Recalls Infant Cradle Swings Due to Fall Hazard"`)
- `Description` (long narrative, often 500–2000 chars)
- `URL` (CPSC.gov press release link)
- `ConsumerContact` (company contact info free text)
- `LastPublishDate`

**Nested collections per record:**

- `Products[]` — `{ CategoryID, Description, Model, Name, NumberOfUnits (free text like "About 34,000"), Type }`
- `Manufacturers[]` — `{ CompanyID (often "0"), Name }` — **free text, NOT normalized across recalls**
- `ManufacturerCountries[]` — `[{ Country }]`
- `Hazards[]` — `{ HazardTypeID, Name }` (e.g., `"Fall Hazard"`, `"Burn Hazard"`, `"Entrapment Hazard"`)
- `Remedies[]` — `[{ Name }]` (Refund, Repair, Replace, etc.)
- `Injuries[]` — `[{ Name }]` (often free text: `"Peloton has received two reports of a seat peg coming out..."`)
- `Retailers[]` — `[{ CompanyID, Name }]`
- `Importers[]`, `Distributors[]` — same structure
- `Images[]` — `[{ URL }]`
- `ProductUPCs[]` — UPCs when provided
- `Inconjunctions[]` — links to related actions

**Searchable query parameters** (case-insensitive wildcard, per Programmers Guide v1.4):
`RecallID`, `RecallNumber`, `RecallDateStart`, `RecallDateEnd`, `LastPublishDateStart`, `LastPublishDateEnd`, `RecallURL`, `RecallTitle`, `ConsumerContact`, `RecallDescription`, `ProductName`, `ProductDescription`, `ProductModel`, `ProductType`, `InconjunctionURL`, `ImageURL`, `Injury`, `Manufacturer`, `Retailer`, `Importer`, `Distributor`, `ManufacturerCountry`, `UPC`, `Hazard`.

### 1b. SaferProducts.gov Incident Reports API (OData, auth required)

- **Base:** `https://www.saferproducts.gov/WebApi/Cpsc.Cpsrms.Web.Api.svc/`
- **Specific endpoint:** `/IncidentDetails`
- **Protocol:** OData v3 (per `https://www.odata.org/documentation/odata-version-3-0/odata-version-3-0-core-protocol/`)
- **Auth:** **API key required**, passed as Basic Auth *username* (no password). Free signup at SaferProducts.gov.
- **Data model:** queryable at `https://www.saferproducts.gov/WebApi/Cpsc.Cpsrms.Web.Api.svc/$metadata`
- **Format:** Atom feed by default; appendable JSON

**Field groups exposed per published incident report** (per SaferProducts.gov developer FAQ):

- **Incident:** Report Number, Incident Date, Incident Location, Incident Description (narrative), Incident Report Publication Date, Locale
- **Manufacturer:** Name, Location, Notification Date, Comments (manufacturer rebuttal text, often present)
- **Product:** Brand Name, Model Name, Manufactured Date, Purchased Date, Incident Product Description
- **Retail Company:** Name, Location

**Critical workflow constraint:** Published reports go through a **10-business-day manufacturer review window** before publication. The pipeline must handle:

- New reports appearing after that window
- Reports being **modified or removed** after publication if a manufacturer claims "materially inaccurate information" and CPSC agrees
- Manufacturer Comments being attached to existing reports

### 1c. Violations & NEISS Data API (api.cpsc.gov OpenData)

- **Base:** `https://api.cpsc.gov/opendataApi/`
- **Subpaths:**
  - `/neissdata/list` — NEISS emergency-department injury surveillance
  - `/loadata/list` — Letters of Advice (regulatory violations)
- **Auth:** **API key required** via api.data.gov signup (different from SaferProducts key)
- **Headers:** `Accept: application/json` to override default XML
- **Pagination:** `&page=N` (0-indexed), 50 records per page hard cap; pagination metadata in `X-Api-Pagination` response header (`NextPage`, `PreviousPage`, `TotalPages`, `TotalElements` as JSON)

**NEISS record fields:** `cpscCase`, `psu`, `weight`, `stratum`, `age`, `sex`, `race`, `raceOther`, `diag`, `trmtDate`, `bodyPart`, `disposition`, `location`, `fmv`, `prodCodes` (up to 3 product codes per case: `startProductCode1/2/3`), `narr1` (≤400 chars), `narr2` (≤400 chars), `year`. Length of narrative was increased from 142 to 400 chars effective Jan 1, 2019.

**Caveats:**

- NEISS is a **statistical sample of ~100 hospitals out of ~5,000+** ED-equipped hospitals nationally. It is NOT a census. Use weights (`weight`) to estimate national totals.
- 2018 schema change added: `Diagnosis_2`, `Other_Diagnosis_2`, `Body_Part_2`, `Product_3`, `Ethnicity`, `Alcohol_Involved`, `Drug_Involved` — pre-2019 records lack these.
- Most-recent year typically becomes available the following April (e.g., 2024 data available April 2025).
- CPSC does not release data collected on behalf of other agencies (e.g., NEISS-AIP/CDC partnership data).

-----

## 2. Volume and pagination

**Bottom-line:** Recalls API is **tiny** (~10K total records, single-call pull <30 MB). Incident Reports API volume is moderate but growing fast. NEISS is medium (~350K injury cases/year sampled). All three have different pagination semantics.

**Recalls API volume:**

- 6,695 total records as of April 2016 (verified pull, Stanford journalism class).
- ~300/year average since (323 in 2023 — a record high since 2016; 270 in FY 2022).
- Cumulative ~9,000–10,000 today (Apify scraper marketplaces reference "9,000+ recalls").
- Single bare query returns the full collection: `https://www.saferproducts.gov/RestWebServices/Recall?format=json` (~20 MB for full set circa 2016, larger today).
- No documented pagination limit. Date filtering is the only practical chunking mechanism (`RecallDateStart`/`RecallDateEnd`).

**Incident Reports API volume:**

- Hundreds of thousands of consumer reports submitted per year. Volume that's *published* is materially smaller — must pass §1102.10(d) minimums (product description, manufacturer ID, harm description, date, submitter category) AND survive the 10-day manufacturer review.
- Individual-product accumulation gives a sense of typical volume: PowerXL juicer had 261 complaints (47 injury reports) before its June 2023 recall; Peloton Tread+ accumulated 150+ reports before Peloton's Section 15(b) filing.
- Pagination: OData `$top` and `$skip` parameters (`$top=100&$skip=200`). No documented hard cap on `$skip` (unlike openFDA's 25,000 cap). Practical limit is server response time.

**NEISS volume:**

- ~350,000 injury cases sampled per year (CPSC produces national estimates from this).
- Pagination: 50 records per page (hard cap), via `&page=N`. For a year of data (~350K records ÷ 50) you'll need ~7,000 paginated requests. Plan multi-hour ingest runs or rely on the annual XLSX/SAS dataset downloads instead of the API for bulk pulls.
- Recent 20 years of NEISS data available online; older data archived.

**Caveats:**

- The Recalls API has no formally documented rate limit but server tolerance is unknown — exponential backoff on 5xx is essential.
- Incident Reports API key applications have no published quota; throttle conservatively.
- The api.cpsc.gov violations/NEISS API uses api.data.gov keys which are documented at 1,000 req/hour by default (per api.data.gov standard).

-----

## 3. Manufacturer identification / normalization

**Bottom-line:** The hardest problem in the CPSC pipeline. **All three surfaces use free-text, unnormalized manufacturer names**, often with multiple companies per record (manufacturer + importer + distributor + retailer), and Section 6(b) of the CPSA structurally restricts what CPSC can publish about specific manufacturers. Plan a curated alias table (`cpsc_manufacturer_aliases`) as the canonical join layer, similar to the FAERS approach.

**Recalls API:**

- `Manufacturers[].Name` is free text. `CompanyID` is usually `"0"` (placeholder, not a real foreign key).
- Same firm appears differently across recalls: `"Fisher-Price"` / `"Fisher Price, Inc."` / `"Mattel"` / `"Mattel, Inc."` are all the same parent.
- `Manufacturers[]` array can be **empty** for some recalls — in those cases the manufacturer must be parsed from `Title` or `Description` text, or inferred from `Importer`/`Distributor`/`Retailer`.
- `ManufacturerCountries[]` is useful for tort signal: heavily-skewed Chinese manufacturers in lithium-ion battery and e-bike recalls signal a different liability profile than US/EU manufacturers.

**Incident Reports API:**

- `Manufacturer.Name` is whatever the consumer typed. CPSC review attempts to validate but acknowledges misidentification: per FAQ, *"If I accidentally name the wrong manufacturer in my Report, will the Report still be posted?"* — yes, posted with manufacturer comment opportunity.
- `Manufacturer.Comments` field often contains the manufacturer's rebuttal/clarification. Useful for noise reduction; harmful if used naively as ground truth.
- `Manufacturer.NotificationDate` shows when CPSC notified the firm (start of the 10-day review window).

**NEISS:**

- No manufacturer field at all. Products are identified by `prodCodes` (4-digit CPSC product codes from the NEISS Coding Manual). Manufacturer is only sometimes in the narrative (`narr1`, `narr2`), e.g., *"gasoline-powered rotary mower made by XYZ Company"*. Not reliable for entity-level joins.

**Foreign / Amazon-sold manufacturer problem:**

- Recent lithium-ion battery and e-bike recalls/warnings reference Chinese manufacturers that **refuse to participate in CPSC recall negotiations** (FENGQS, Unit Pack Power, VIVI). These get **Urgent Warnings** at `cpsc.gov/Warnings/` instead of formal recalls at `cpsc.gov/Recalls/`. The Recalls API may or may not include these — verify on first pull. As of May 2026: Rad Power Bikes warning (Nov 2025), FENGQS warning (Aug 2025), UPP warning (April 2024) are all warning-only (no formal recall), so a tort-signal pipeline that only listens to the Recalls API will miss them.
- For Amazon-sold products: `Retailers[].Name` will list `"Amazon"` or `"Amazon.com"`, useful for filtering or pivoting to retailer-level analysis.

**Recommended normalization strategy:**

1. Pull all distinct `Manufacturers[].Name`, `Importers[].Name`, `Distributors[].Name`, `Retailers[].Name` strings (and Incident Reports `Manufacturer.Name`).
1. Strip suffixes (`, Inc.`, `, LLC`, `Co. Ltd.`, `d/b/a`).
1. Lowercase, collapse whitespace.
1. Match against existing `manufacturers` dim. For misses, build `cpsc_manufacturer_aliases` (alias_text, canonical_manufacturer_id, role: manufacturer/importer/distributor/retailer).
1. For Chinese manufacturers in warnings-only events, expect ~30–50% to remain unmatched until manual curation.

-----

## 4. Severity / time / event filtering

**Bottom-line:** Unlike FDA Class I/II/III recalls, CPSC has **no built-in severity hierarchy**. Build a severity proxy from a combination of: `Hazards[]` taxonomy, `Injuries[]` death count parsing, `NumberOfUnits` magnitude, and title pattern matching for "Risk of Serious Injury or Death" language. Use `RecallDate` (not `LastPublishDate`) for the canonical time axis.

**For tort signal, suggest:**

**Recall-level severity tier:**

- **Tier A (highest):** Title contains "Death" OR `Injuries[]` mentions specific fatality counts ("one child died", "received reports of deaths") OR Hazard is in {`Asphyxiation`, `Strangulation`, `Drowning`, `Suffocation`, `Battery Ingestion` (Reese's Law)}.
- **Tier B:** Title contains "Risk of Serious Injury or Death" OR Hazard is in {`Fire`, `Burn`, `Entrapment`, `Fall`, `Laceration` (severe)} AND `NumberOfUnits` > 10,000.
- **Tier C:** Everything else with a real injury report.
- **Tier D:** Defect-only / no-injury-reported recalls (most common).

**Incident-report-level severity:**

- Parse `Incident.Description` for death/serious-injury language (`"hospitalized"`, `"emergency room"`, `"died"`, `"surgery"`).
- Locale filter: `Home` and `Childcare` weight higher for product-liability torts; `Public Place` lower.
- Manufacturer-notification-date elapsed: reports with no manufacturer response after 30+ days are signal-rich.

**Time axes:**

- **`RecallDate`** is the primary tort-signal anchor (analogous to `date_received` in MAUDE).
- `LastPublishDate` is when CPSC last updated the recall page (e.g., after remedy changes, supplier additions). Use this for delta detection on weekly ingest.
- For incident reports: `IncidentDate` is the underlying event; `IncidentReportPublicationDate` is when it became visible to the pipeline. The gap between these (mean ~30–60 days) is the leading-indicator window.

**Backlog / spike considerations:**

- CPSC announces "re-recalls" when manufacturers stockpile unsold units or when post-recall deaths continue. Fisher-Price Rock 'n Play was re-announced in January 2023 after 8 additional deaths post-2019 recall. Pipeline must handle the same `RecallID`/`RecallNumber` being updated with new `LastPublishDate` — treat as update, not new event.
- CPSC's anti-fraud initiative (announced early 2026) is generating bulk batches of "fraudulent recall scheme" press releases. Filter these out of the Recalls API output — they share the recall list page but aren't actual product recalls.

-----

## 5. Storage / NLP tradeoffs

**Bottom-line:** Recalls fits comfortably in <100 MB. Incident Reports adds maybe ~1 GB/year. NEISS adds ~50 MB/year if aggregated. **Do not extend the existing `recalls` table** — CPSC entities, recall-number namespaces, and severity semantics differ enough that you'll fight schema mismatches.

**Recommended schema (Supabase):**

```sql
-- Phase 1 (v1)
cpsc_recalls (
  recall_id INTEGER PRIMARY KEY,         -- CPSC's RecallID
  recall_number TEXT UNIQUE NOT NULL,    -- "16143" or "17-001"
  recall_date DATE NOT NULL,
  last_publish_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  consumer_contact TEXT,
  cpsc_url TEXT,
  severity_tier CHAR(1),                 -- A/B/C/D, computed at ingest
  death_count INTEGER,                   -- parsed from Injuries[]
  injury_count INTEGER,                  -- parsed from Injuries[]
  units_recalled_text TEXT,              -- "About 34,000" preserved verbatim
  units_recalled_int BIGINT,             -- parsed best-effort
  raw_json JSONB NOT NULL,               -- always keep raw
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'cpsc_recall',     -- so downstream queries can union
  is_warning_only BOOLEAN DEFAULT FALSE  -- for the cpsc/Warnings/ URL pattern
);

cpsc_recall_products (recall_id FK, category_id, name, type, model, description, units_text)
cpsc_recall_manufacturers (recall_id FK, manufacturer_id FK NULLABLE, raw_name TEXT, country TEXT, role TEXT)
cpsc_recall_hazards (recall_id FK, hazard_type_id, name)
cpsc_recall_retailers (recall_id FK, raw_name TEXT, raw_company_id TEXT)
cpsc_recall_remedies (recall_id FK, name)
cpsc_recall_images (recall_id FK, url)
cpsc_manufacturer_aliases (alias_text TEXT PRIMARY KEY, manufacturer_id FK, role TEXT)

-- Phase 2 (v2, optional)
cpsc_incidents (
  incident_report_number TEXT PRIMARY KEY,
  incident_date DATE,
  publication_date DATE,
  locale TEXT,
  incident_description TEXT,  -- truncated to ~2K chars, full in raw_json
  manufacturer_id FK NULLABLE,
  manufacturer_raw_name TEXT,
  manufacturer_notification_date DATE,
  manufacturer_comments TEXT,  -- truncated to ~2K chars
  product_brand TEXT,
  product_model TEXT,
  product_description TEXT,
  raw_json JSONB,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3 (v3, optional, aggregate only)
neiss_product_injury_estimates_yearly (
  year INTEGER,
  product_code INTEGER,
  product_name TEXT,
  estimated_national_total INTEGER,
  age_bucket TEXT,
  sex CHAR(1),
  PRIMARY KEY (year, product_code, age_bucket, sex)
)
```

**NLP / narrative considerations:**

- **Recall `Description`** is moderate (500–2000 chars, sometimes 5K+ for complex multi-product recalls). Worth keeping in full. Useful for downstream LLM-based hazard categorization.
- **Incident `Description`** is consumer-written, typically short (100–800 chars), often phonetic/colloquial. Truncate to 2,000 chars for safety; preserve full in `raw_json`.
- **Manufacturer `Comments`** can include legal hedging and "materially inaccurate" claim language. For tort signal, flag any comment containing `"materially inaccurate"` for analyst review.
- **NEISS narratives** are very short (≤400 chars post-2019, ≤142 pre-2019). Not worth dedicated NLP infrastructure.

-----

## 6. Known issues, gotchas, biases, deprecations

**Bottom-line:** Three structural restrictions, one big political risk, and several data-quality gotchas. Plan for them from day one or they'll bite later.

### Section 6(b) of the CPSA — structural disclosure delay

- **Statutory authority:** 15 U.S.C. § 2055(b); implementing regulation 16 CFR Part 1101.
- Before CPSC discloses any product-related information that allows the public to "readily ascertain" a manufacturer's identity, CPSC must give the manufacturer **notice and opportunity to comment** (10-day initial notice + 5-day final notice = 15 days total, reduced from 30 days by CPSIA 2008).
- Manufacturers can file lawsuits to enjoin disclosure (15 U.S.C. § 2055(b)(3)) — rare but possible.
- **Practical effect:** every record in the public APIs is structurally older than the underlying CPSC knowledge by ≥15 days. MAUDE doesn't have this constraint, which is why MAUDE provides more "real-time" leading-indicator signal than CPSC.
- The CPSC v. GTE Sylvania ruling (1980) extended §6(b) to FOIA releases.

### Section 6(b)(5) — Section 15 reports confidential

- 15 U.S.C. § 2055(b)(5) prohibits CPSC from publicly disclosing information reported under Section 15 of the CPSA (manufacturer's mandatory pre-recall hazard reports) unless:
  - CPSC has filed a legal complaint alleging a substantial product hazard, OR
  - CPSC has entered into a remedial settlement agreement, OR
  - CPSC has published a public health/safety finding, OR
  - The manufacturer consents.
- **The most legally significant pre-recall data — the Section 15(b) reports manufacturers MUST file when they have actual knowledge of a defect — is NOT in any public API.** These become public only post-recall (or via litigation discovery).

### 2019 unauthorized-disclosure incident

- April 1, 2019: CPSC learned that ~11,000 manufacturers' confidential incident data had been improperly disclosed through the Information Clearinghouse 2017–2019, including to Consumer Reports.
- CPSC immediately rerouted all such requests through the FOIA Office with two-step verification.
- Practical effect: post-2019 data flow through the public APIs may be slightly more restricted than 2017–2019 baselines suggested. Don't anchor expected volumes on the pre-incident period.

### Voluntary recall model + Urgent Warnings gap

- Virtually all CPSC recalls are **voluntary** — manufacturers' agreement is required. Per the U.S. PIRG 2024 report: *"Virtually all recalls announced by the Consumer Product Safety Commission are voluntary by the company."*
- When manufacturers refuse to recall (common with Chinese e-bike / battery firms), CPSC issues **Urgent Warnings** at `cpsc.gov/Warnings/YYYY/` instead of formal recalls at `cpsc.gov/Recalls/YYYY/`. These warnings carry tort-signal weight but **may not flow through the Recalls API** — verify on first pull and plan for a separate ingest path if missing.
- Recent examples (2024–2026): Unit Pack Power batteries (April 2024), FENGQS e-bikes (Aug 2025), Rad Power Bikes batteries (Nov 2025). All warnings-only; all litigation-relevant.

### CPSC organizational risk (FY2026 — the AEMS analogue)

This is the structural equivalent to the AEMS migration risk for FAERS/MAUDE. Timeline as of May 2026:

- **April 10, 2025:** Leaked OMB Passback memo signals CPSC absorption into HHS.
- **May 9, 2025:** Trump fires the three Democratic commissioners (Hoehn-Saric, Boyle, Trumka) without cause.
- **May 30, 2025:** FY2026 budget request formally proposes CPSC reorganization into HHS as the **Assistant Secretary for Consumer Product Safety (ASCPS)** under Secretary Kennedy. Budget cut from $151M to $135M; FTE from 569 to 459.
- **June 13, 2025:** D. Md. court rules the commissioner firings "contrary to law" and enjoins enforcement.
- **June 16, 2025:** Trump appeals; Fourth Circuit affirms; **July 2025:** Supreme Court reverses, remands to Fourth Circuit (litigation ongoing).
- **October 27, 2025:** Commissioner Dziak's term expires.
- **Late 2025:** Commissioner Dziak resigns. CPSC now operating with **a single commissioner** (Acting Chairman Feldman) via delegated authority under 15 U.S.C. § 2053(d).
- **As of May 2026:** Full HHS reorganization requires an act of Congress; closely divided Congress has not acted. CPSC continues as a standalone agency under delegated authority.

**Practical risk to the pipeline:**

- Endpoint domains may change (saferproducts.gov → some hhs.gov domain) if reorg happens late 2026/2027.
- Data refresh cadence may slow under reduced staffing (459 vs. 569 FTE).
- New regulations (e.g., proposed lithium-ion battery testing standards, still in 60-day public comment limbo) are stalled, which affects what gets recalled and at what cadence.
- API maintenance may degrade.

**Mitigation:** wrap endpoint URLs in a config-driven adapter from day one (the same pattern recommended for MAUDE/FAERS AEMS handling).

### Other quality gotchas

- **Fake-recall fraud:** CPSC launched a national anti-fraud initiative in early 2026 targeting scammers using fake recall notices. Real recalls may be co-mingled with fraud-warning press releases on the recalls list page. Filter on URL pattern (`/Recalls/YYYY/` confirmed legit; `/Newsroom/News-Releases/YYYY/` is mixed).
- **Re-announced recalls:** Same `RecallID` gets `LastPublishDate` updates years after the original recall. Handle as upserts on `recall_id`.
- **`NumberOfUnits` is free text:** Values like `"About 8.2 million"`, `"Approximately 250"`, `"About 34,000 (in addition to 9,450 in Canada)"`. Parse best-effort to integer; preserve original.
- **Empty `Manufacturers[]`:** Common in older recalls and Amazon-listed products. Backstop via `Importers[]`/`Distributors[]`.
- **CompanyID = "0":** Placeholder, not a foreign key. Don't try to use it as a join column.
- **CategoryID, HazardTypeID:** Numeric IDs *are* stable across recalls; build dimension tables on first ingest.
- **CPSC Recalls App vs API mismatch:** The mobile app sometimes shows recalls before they're in the public API (anecdotal); verify weekly cadence on first month.

-----

## 7. Famous CPSC-as-leading-indicator examples

These are the canonical cases the tort-signal model should be backtested against.

### Peloton Tread+ (2018 → 2021 recall → 2023 settlement)

- **Dec 2018:** First injury report received by Peloton (pull-under entrapment).
- **Dec 2018 – early 2021:** 150+ reports accumulated; Peloton **did not** file the required Section 15(b) report.
- **April 17, 2021:** CPSC issues unilateral Urgent Warning (39 incidents known to CPSC, including one child death).
- **May 5, 2021:** Voluntary recall of 125,000 Tread+ units (70+ incidents, one death at recall time).
- **May 2023:** Cumulative incidents reach 351; injury reports reach 90.
- **Jan 2023:** Peloton pays $19,065,000 civil penalty for failing to immediately report under §15(b).
- **Leading-indicator window:** ~28 months between first incident and recall; ~4 months between CPSC's unilateral warning and recall.

### Fisher-Price Rock 'n Play Sleeper (2009 → 2019 recall → 2025 settlement)

- **October 2009:** Product launched.
- **2011–2018:** 32 infant fatalities accumulate, with reports filed sporadically to CPSC.
- **April 2017:** CPSC issues report citing 657 inclined-sleeper incidents and 14 deaths (across all inclined sleepers, not RNPS-specific).
- **May 31, 2018:** First CPSC inclined-sleeper warning.
- **April 8, 2019:** Consumer Reports publishes investigation (32 deaths confirmed).
- **April 12, 2019:** Voluntary recall of 4.7 million units.
- **Aug 1, 2019:** JPML creates MDL 2903 in W.D.N.Y.
- **June 2021:** House Oversight Committee report concludes Fisher-Price did not adequately vet for safety and "intentionally ignored warnings."
- **June 2022:** CPSC issues new mandatory infant-sleep-product standard (sleep angle ≤10°).
- **August 2023:** Safe Sleep for Babies Act bans inclined sleepers federally.
- **January 2023:** Recall re-announced after 8 additional post-recall deaths.
- **July 2024:** $19M class settlement reached.
- **Feb 28, 2025:** Settlement approved by court.
- **Cumulative:** 73+ deaths, 1,000+ incidents.
- **Leading-indicator window:** ~8 years between first death report and recall; would have been detectable in CPSC incident data ~5–6 years earlier with appropriate volume thresholding.

### Lithium-ion battery / micromobility fires (2023–present, ACTIVELY EMERGING)

The current canonical example of CPSC-as-leading-indicator before MDL formation:

- **April 2024:** Unit Pack Power (UPP) urgent warning (13 reports, 7 fires) — manufacturer refused recall.
- **May 2024–Dec 2024:** FENGQS sold ~180 e-bikes on Amazon; 9–13 fires reported (FENGQS warning Aug 2025, formal recall later).
- **Nov 2025:** Rad Power Bikes urgent warning (31 reports, 12 property damage events, ~$734,500 in damages) — manufacturer refused recall, citing financial inability.
- **Jan 2025:** First Rad Power fatality (Dr. Stephens), litigation filed May 2026.
- **No MDL yet** as of May 2026, but multiple plaintiff firms tracking the space.
- **Tort signal posture:** the lithium-ion battery space is the single most active emerging CPSC tort category, comparable to Philips CPAP in MAUDE 2019–2021.

### IKEA Malm dresser tip-overs (2014 → 2016 recall → STURDY Act 2022)

- **2002–2014:** 14+ toddler deaths from dresser tip-overs across multiple brands.
- **July 2015:** First IKEA Malm recall (29 million units, repair kit offered).
- **June 2016:** Re-recall after additional death.
- **2017:** Third death; IKEA settles three lawsuits for $50M combined.
- **2020:** CPSC issues final rule on clothing storage unit stability (16 CFR Part 1261).
- **December 2022:** STURDY Act passed, federal mandatory standard for clothing storage units.
- **Leading indicator:** the dresser tip-over signal was visible in CPSC incident data and NEISS narratives for 5+ years before the recall.

### False-positive / noise cases worth knowing

- **Generator deaths during hurricanes:** NEISS spikes after hurricanes are driven by post-disaster CO poisoning, not product defects. Filter generator-related signal against weather event data before drawing tort conclusions.
- **Reese's Law (button battery) recalls 2023–2026:** Hundreds of small-importer recalls for button-battery products triggered by the new federal mandatory standard, not by accumulated injury signal. Volume-based spike detectors will fire false positives here. Filter on `Hazard.Name LIKE 'Battery Ingestion%'` AND `Source = 'Regulatory'` to separate.
- **Anti-fraud sweep (early 2026):** CPSC's announced national recall-fraud crackdown is generating warning press releases that look like recalls but aren't. URL pattern filter (above) handles this.

-----

## 8. Architecture recommendation

### Phased build, ranked by value-to-effort ratio

**Phase 1 (v1, MUST-HAVE, ~1–2 engineer-days):** CPSC Recalls API

- Endpoint: `https://www.saferproducts.gov/RestWebServices/Recall?format=json`
- No auth, weekly refresh, ~10K records total
- New table set: `cpsc_recalls` + 6 child tables (see §5)
- Cron: weekly, aligned with existing `recall-watchlist-weekly.yml` Mon 12:00 UTC. Either add as a new job step in that workflow or split out as `cpsc-recalls-weekly.yml` (recommend new workflow — different upstream, different failure modes shouldn't block FDA recalls).
- Manufacturer normalization: incremental alias table maintained from first ingest.
- Severity tier (A/B/C/D) computed at ingest.
- Surface in the existing Recall Watchlist with a source filter (FDA / CPSC).

**Phase 2 (v2, OPTIONAL, ~2–3 engineer-days):** SaferProducts.gov Incident Reports OData

- Endpoint: `https://www.saferproducts.gov/WebApi/Cpsc.Cpsrms.Web.Api.svc/IncidentDetails`
- API key required (free signup, 5 minutes)
- OData v3 — different paradigm from REST; will need a thin OData client (the `pyodata` library or hand-rolled `$top`/`$skip` pagination)
- Daily refresh recommended (leading-indicator value)
- Handle the 10-day manufacturer review window: pull last 30 days on each run to catch newly published reports + amendments to already-published reports
- New table: `cpsc_incidents` (see §5)
- Spike detection: rolling 90-day count per `(normalized_manufacturer, hazard_keyword)` vs. 180-day baseline (mirror the MAUDE pattern from the MAUDE report §8). Threshold: surface manufacturer if rolling 90-day serious-injury-incident count exceeds 2× the 180-day mean AND has ≥5 reports.

**Phase 3 (v3, DEFERRED, ~1–2 engineer-days):** NEISS aggregate data

- Endpoint: `https://api.cpsc.gov/opendataApi/neissdata/list`
- API key required (api.data.gov)
- For population-level injury rate estimates only; NOT individual leading-indicator signal
- Better path: download the annual XLSX/SAS datasets from `https://www.cpsc.gov/Research--Statistics/NEISS-Injury-Data` once a year and ETL into `neiss_product_injury_estimates_yearly`
- Use as context layer for product categories (e.g., when surfacing a recall in toy category, show NEISS-estimated annual toy-related ED visits as denominator).

### Shared infrastructure with openFDA pipelines

**Share:**

- `pipeline/lib/pipeline.py` `_get`, `_bulk_insert` (chunked upsert with 5xx retry) — proven pattern from the openFDA recalls work.
- Manufacturer normalization function (alias table pattern).
- The AEMS-adapter pattern (URL + field-map config) — same pattern, different agency.

**Don't share:**

- Tables: CPSC entities and `RecallNumber` namespaces are different. Separate schemas.
- HTTP client: CPSC Recalls API doesn't need rate limiting (no documented quota); OData needs different client; OpenData needs api.data.gov key handling. Three different patterns.

### Workflow layout

```
.github/workflows/cpsc-recalls-weekly.yml       (Phase 1, Mon 12:00 UTC)
.github/workflows/cpsc-incidents-daily.yml      (Phase 2, daily 13:00 UTC — after FDA stuff)
scripts/load_neiss_annual.py                    (Phase 3, manual run April each year)
```

Tort-signal integration:

- Extend the existing 5-stage thermometer model to accept CPSC signal as input.
- `Warming` eligibility expanded: Class I FDA recall OR sustained MAUDE spike OR (CPSC Tier-A recall AND ≥1 confirmed death).
- New `Watching` tier potentially for CPSC Tier-B/C without deaths but high unit count.

### Effort comparison

|Source                             |v1 build effort vs. recalls pipeline|Why                                                                                                       |
|-----------------------------------|------------------------------------|----------------------------------------------------------------------------------------------------------|
|openFDA recalls (existing baseline)|1.0×                                |reference                                                                                                 |
|CPSC Recalls (Phase 1)             |0.5–1.0×                            |smaller volume, no auth, simpler schema, but free-text manufacturers add work                             |
|CPSC Incident Reports (Phase 2)    |1.5–2.0×                            |OData (new paradigm), narrative storage, manufacturer normalization across two surfaces, deletion handling|
|CPSC NEISS (Phase 3)               |0.5×                                |aggregate-only, annual run, no individual records, no normalization                                       |

### AEMS-analogue risk (do this from day one)

CPSC's proposed FY2026 move to HHS is structurally similar to FDA's AEMS migration — political/structural rather than technical, but same risk profile:

1. Endpoint URLs may change (saferproducts.gov → some hhs.gov domain).
1. API maintenance may slow during transition.
1. Data refresh cadence may slow under reduced staffing (459 vs. 569 FTE).
1. Build with URL/field-map adapter pattern from the first commit.

```python
# pipeline/lib/cpsc_endpoints.py — illustrative adapter pattern
CPSC_RECALLS_BASE = os.getenv("CPSC_RECALLS_BASE", "https://www.saferproducts.gov/RestWebServices/Recall")
CPSC_INCIDENTS_BASE = os.getenv("CPSC_INCIDENTS_BASE", "https://www.saferproducts.gov/WebApi/Cpsc.Cpsrms.Web.Api.svc/IncidentDetails")
CPSC_NEISS_BASE = os.getenv("CPSC_NEISS_BASE", "https://api.cpsc.gov/opendataApi/neissdata/list")
```

If reorg happens late 2026, flip env vars without code changes.

-----

## Summary table

|Surface               |URL                                           |Auth                         |Volume                   |Cadence    |v1 priority|AEMS-analogue risk |
|----------------------|----------------------------------------------|-----------------------------|-------------------------|-----------|-----------|-------------------|
|Recalls API           |`saferproducts.gov/RestWebServices/Recall`    |None                         |~10K records, ~300/yr new|Weekly     |**YES**    |Medium (URL change)|
|Incident Reports OData|`saferproducts.gov/WebApi/.../IncidentDetails`|API key (Basic Auth username)|~100Ks published/yr      |Daily      |Optional v2|Medium             |
|Violations & NEISS    |`api.cpsc.gov/opendataApi/`                   |api.data.gov key             |~350K/yr ER sample       |Annual XLSX|Deferred v3|Low                |

**TL;DR:** Phase 1 is high-leverage and cheap. Phase 2 is the real leading-indicator value (analogous to MAUDE for devices) but costs 1.5–2× more due to OData. Phase 3 is contextual color, not signal. The single biggest non-technical risk is CPSC's pending HHS reorganization — mitigate with adapter pattern from day one.
