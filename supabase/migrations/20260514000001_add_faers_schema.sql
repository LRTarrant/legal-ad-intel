-- ============================================================================
-- FAERS Adverse Event Reports — Phase 2 of the CPSC -> FAERS -> MAUDE arc.
-- Adds tables for openFDA's FAERS endpoint (https://api.fda.gov/drug/event.json).
-- Schema only. PR-3 builds the pipeline; PR-4/PR-5 build the API + UI.
--
-- Reference: docs/data-sources/faers.md (full scoping report including
-- volumes, pagination, MedDRA constraints, manufacturer-normalization plan).
--
-- Design notes:
--
--   * No RLS — matches public.recalls / public.recall_manufacturers and
--     public.cpsc_recalls precedent. FAERS is public reference data; reads
--     happen via service role today; tort-signal surfaces are public-tier
--     intelligence. Intentional, symmetric with the existing FDA siblings.
--
--   * Parent fact key is uuid id; FAERS safetyreportid is preserved as a
--     separate UNIQUE column for stable upserts. openFDA serves only the
--     latest version of each safetyreportid (faers.md §7), so one row per
--     report is correct. safetyreportversion is stored as text for audit
--     but is NOT part of the natural key. We use text (not integer) because
--     openFDA emits the version as a string and we shouldn't pre-judge with
--     type coercion when audit fidelity matters.
--
--   * Drugs and reactions are sibling arrays in the FAERS source (faers.md
--     §1): there is no per-drug-per-reaction linkage. We model them as two
--     independent child tables, each FK'd to drug_adverse_events with
--     ON DELETE CASCADE so the pipeline's delete-then-insert refresh for a
--     re-versioned report is trivial.
--
--   * drug_seq / reaction_seq preserve the source array order. By FAERS
--     convention the first drug entry is the primary suspect, but
--     drugcharacterization (1=Suspect, 2=Concomitant, 3=Interacting) is the
--     authoritative classifier — order is preserved for audit only.
--
--   * openfda_* columns on drug_adverse_event_drugs are text[]. The FAERS
--     openfda enrichment block emits each field as a JSON array because the
--     harmonizer can match a single reported drug to multiple SPLs (e.g.
--     authorized generics, repackagers); preserving native array shape lets
--     PR-3 join on any element via GIN indexes without exploding rows here.
--     The block is best-effort and frequently empty (faers.md §3).
--
--   * primarysource_qualification is preserved as smallint with a CHECK
--     constraint (1..5 per openFDA YAML: 1=Physician, 2=Pharmacist,
--     3=Other HCP, 4=Lawyer, 5=Consumer). Code 4 is the operationally
--     significant "lawyer-flood" filter: mass-tort intake firms file
--     MedWatch reports in bulk after MDL formation, creating a
--     litigation→signal→litigation feedback loop on already-torted drugs
--     (faers.md §4, §7). The schema PRESERVES the qualification so
--     downstream code can filter; ENFORCEMENT lives in PR-3 (pipeline
--     dual-computation: all-reporter vs non-lawyer signal) and PR-4/PR-5
--     (UI surfaces both views). Do not drop or repurpose this column.
--
--   * drugstartdate / drugenddate are stored as text. FAERS emits
--     inconsistent partial dates (e.g. "200807" for "July 2008", "2008"
--     for "unspecified day in 2008", full "20080715" for known day) and
--     coercing to DATE forces an arbitrary day-pick that loses precision.
--     If range queries on drug-exposure timelines become a requirement,
--     add normalized DATE columns plus a precision flag in a follow-up
--     migration; the text columns remain source of truth.
--
--   * meddra_terms is intentionally minimal in this PR. The refresh
--     strategy (populate from observed reactionmeddrapt values; quarterly
--     review against MSSO release notes per faers.md §5) is deferred to
--     PR-3. SOC / HLT / LLT mappings require a MedDRA license and are
--     out of scope.
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- drug_adverse_events (parent fact)
-- One row per FAERS safetyreportid. openFDA serves only the latest version,
-- so re-fetching a report just updates this row (and refreshes its child
-- rows via the CASCADE delete-then-insert pattern in PR-3).
-- ----------------------------------------------------------------------------
create table if not exists public.drug_adverse_events (
  id uuid primary key default gen_random_uuid(),
  safetyreportid text not null unique,
  safetyreportversion text,

  -- Dates (openFDA emits YYYYMMDD strings; pipeline parses to DATE).
  receivedate date,
  receiptdate date,
  transmissiondate date,

  -- Top-level severity flag plus the six independent boolean sub-flags.
  -- A serious=true report has >=1 sub-flag = true. seriousness_other is
  -- the catch-all "medically important" bucket (faers.md §4 — too permissive
  -- on its own for tort-grade signal).
  serious boolean,
  seriousness_death boolean,
  seriousness_hospitalization boolean,
  seriousness_lifethreatening boolean,
  seriousness_disabling boolean,
  seriousness_congenital boolean,
  seriousness_other boolean,

  -- Primary source (the reporter). One per report — denormalized onto parent.
  -- qualification: 1=Physician, 2=Pharmacist, 3=Other HCP, 4=Lawyer, 5=Consumer.
  -- See lawyer-flood filter note in header.
  primarysource_qualification smallint
    check (primarysource_qualification between 1 and 5),
  primarysource_reportercountry text,
  occurcountry text,

  -- Sender (the organization transmitting to FDA — manufacturer, regulator, etc.).
  -- sender_type: 1=Pharma, 2=Regulatory, 3=HCP, 4=Regional Pharma, 5=Study, 6=Other.
  sender_type smallint,
  sender_organization text,
  companynumb text,

  -- Patient demographics.
  patient_onset_age numeric,
  patient_onset_age_unit smallint,
  patient_sex smallint,
  patient_weight numeric,
  patient_died boolean,
  patient_death_date text,

  reporttype smallint,
  fulfillexpeditecriteria smallint,
  duplicate boolean,

  raw_payload jsonb,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_drug_adverse_events_receivedate
  on public.drug_adverse_events (receivedate desc);
create index if not exists idx_drug_adverse_events_serious_receivedate
  on public.drug_adverse_events (serious, receivedate desc);
create index if not exists idx_drug_adverse_events_qualification
  on public.drug_adverse_events (primarysource_qualification, receivedate desc);
create index if not exists idx_drug_adverse_events_occurcountry
  on public.drug_adverse_events (occurcountry);

-- ----------------------------------------------------------------------------
-- drug_adverse_event_drugs (child)
-- One row per drug per report. drug_seq preserves source array position.
-- drugcharacterization is the authoritative drug-role classifier; filter
-- on drugcharacterization=1 (Suspect) for tort-signal queries to avoid
-- background noise from concomitant medications (faers.md §1).
--
-- The openfda_* columns are best-effort enrichment from openFDA's harmonizer
-- (NDC -> SPL labeler -> generic/brand/UNII/RxCUI). The block is frequently
-- empty for foreign reports, older reports, and OTC products. PR-3 will add
-- a normalized `drugs` dimension and `manufacturer_aliases` lookup; until
-- then we preserve everything we receive so backfill is just a join, not a
-- re-fetch.
-- ----------------------------------------------------------------------------
create table if not exists public.drug_adverse_event_drugs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.drug_adverse_events(id) on delete cascade,
  drug_seq smallint not null,

  drugcharacterization smallint
    check (drugcharacterization between 1 and 3),
  medicinalproduct text,
  activesubstance_name text,
  drugindication text,
  drugadministrationroute text,
  drugdosagetext text,
  drugdosageform text,
  drugstartdate text,                       -- partial-date text; see header.
  drugenddate text,
  actiondrug smallint,
  drugadditional smallint,
  drugauthorizationnumb text,

  -- openFDA enrichment block (best-effort, frequently absent).
  openfda_brand_name text[],
  openfda_generic_name text[],
  openfda_substance_name text[],
  openfda_manufacturer_name text[],
  openfda_product_ndc text[],
  openfda_spl_id text[],
  openfda_spl_set_id text[],
  openfda_application_number text[],
  openfda_rxcui text[],
  openfda_unii text[],
  openfda_pharm_class_epc text[],
  openfda_pharm_class_moa text[],
  openfda_pharm_class_pe text[],
  openfda_pharm_class_cs text[],
  openfda_route text[],
  openfda_product_type text[],

  created_at timestamptz not null default now(),

  unique (report_id, drug_seq)
);
create index if not exists idx_drug_adverse_event_drugs_report
  on public.drug_adverse_event_drugs (report_id);
create index if not exists idx_drug_adverse_event_drugs_medicinalproduct
  on public.drug_adverse_event_drugs (medicinalproduct);
create index if not exists idx_drug_adverse_event_drugs_characterization
  on public.drug_adverse_event_drugs (drugcharacterization);
create index if not exists idx_drug_adverse_event_drugs_manufacturer_gin
  on public.drug_adverse_event_drugs using gin (openfda_manufacturer_name);
create index if not exists idx_drug_adverse_event_drugs_generic_gin
  on public.drug_adverse_event_drugs using gin (openfda_generic_name);
create index if not exists idx_drug_adverse_event_drugs_substance_gin
  on public.drug_adverse_event_drugs using gin (openfda_substance_name);

-- ----------------------------------------------------------------------------
-- drug_adverse_event_reactions (child)
-- One row per reaction per report. MedDRA exposes only Preferred Term via
-- openFDA — no SOC/HLT/LLT (faers.md §5). reactionmeddraversionpt is stamped
-- per-report because MedDRA revises terms twice a year (Mar/Sep) and openFDA
-- does NOT retroactively recode old reports; cluster keys must tolerate drift
-- (faers.md §5 GLP-1 NAION example).
-- ----------------------------------------------------------------------------
create table if not exists public.drug_adverse_event_reactions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.drug_adverse_events(id) on delete cascade,
  reaction_seq smallint not null,

  reactionmeddrapt text not null,
  reactionmeddraversionpt text,
  reactionoutcome smallint
    check (reactionoutcome between 1 and 6),

  created_at timestamptz not null default now(),

  unique (report_id, reaction_seq)
);
create index if not exists idx_drug_adverse_event_reactions_report
  on public.drug_adverse_event_reactions (report_id);
create index if not exists idx_drug_adverse_event_reactions_pt
  on public.drug_adverse_event_reactions (reactionmeddrapt);
create index if not exists idx_drug_adverse_event_reactions_outcome
  on public.drug_adverse_event_reactions (reactionoutcome);

-- ----------------------------------------------------------------------------
-- meddra_terms (dimension)
-- Minimal lookup. PR-3 populates from distinct reactionmeddrapt values as
-- reports are ingested. pt_name_canonical is the lowercased / single-spaced
-- form for joining across reports submitted with minor casing/whitespace
-- variants. SOC / HLT / LLT mappings require a MedDRA license and are
-- out of scope here.
-- ----------------------------------------------------------------------------
create table if not exists public.meddra_terms (
  id uuid primary key default gen_random_uuid(),
  pt_name text not null unique,
  pt_name_canonical text not null,
  first_seen_meddra_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_meddra_terms_canonical
  on public.meddra_terms (pt_name_canonical);

-- ----------------------------------------------------------------------------
-- updated_at triggers (reuse existing public._set_updated_at function)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_drug_adverse_events_updated') then
    create trigger trg_drug_adverse_events_updated
      before update on public.drug_adverse_events
      for each row execute function public._set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_meddra_terms_updated') then
    create trigger trg_meddra_terms_updated
      before update on public.meddra_terms
      for each row execute function public._set_updated_at();
  end if;
end$$;

comment on table public.drug_adverse_events is
  'FAERS adverse event reports from openFDA /drug/event.json. One row per safetyreportid (openFDA serves only the latest version). See docs/data-sources/faers.md.';
comment on column public.drug_adverse_events.primarysource_qualification is
  'Reporter type: 1=Physician, 2=Pharmacist, 3=Other HCP, 4=Lawyer, 5=Consumer. Code 4 = mass-tort solicitation; preserve for downstream filtering (PR-3 pipeline / PR-4-5 UI).';
comment on table public.drug_adverse_event_drugs is
  'Drugs reported in each FAERS report. drugcharacterization 1=Suspect / 2=Concomitant / 3=Interacting. openfda_* columns are best-effort enrichment, often empty.';
comment on table public.drug_adverse_event_reactions is
  'MedDRA-coded reactions per FAERS report. PT only — no SOC/HLT/LLT exposed by openFDA. reactionmeddraversionpt drifts over time; cluster keys must tolerate PT renames.';
comment on table public.meddra_terms is
  'MedDRA Preferred Term dimension. Populated by PR-3 from observed reactionmeddrapt values.';
