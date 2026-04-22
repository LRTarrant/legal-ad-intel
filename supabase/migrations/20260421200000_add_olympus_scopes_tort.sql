-- ============================================================================
-- Olympus Scopes (Pre-MDL) tort support
-- ============================================================================
-- Adds tort row + five Olympus-specific tables that back the
-- /advertising/torts/olympus-scopes page, plus seeds live Meta Ad Library
-- observations (pulled April 21, 2026).
--
-- Pattern follows: bard_adverse_events, bard_bellwether_schedule,
-- bard_device_failure_timeline (same int-PK + text-heavy shape).
--
-- Slug convention: underscore form `olympus_scopes` (matches pipeline
-- TORT_SEARCH_TERMS keys). The URL slug `/olympus-scopes` is a separate UI
-- concern resolved by the page route.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Register tort
-- ---------------------------------------------------------------------------
insert into public.torts (slug, label, category)
values ('olympus_scopes', 'Olympus Scopes (Pre-MDL)', 'medical_device')
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------------
-- 2. Adverse events / harm catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.olympus_adverse_events (
  id        serial primary key,
  category  text    not null,
  detail    text    not null,
  severity  text    not null,     -- 'Catastrophic' | 'Severe' | 'Moderate'
  source    text,
  year      integer
);

insert into public.olympus_adverse_events (category, detail, severity, source, year) values
  ('Superbug infection',    'CRE (carbapenem-resistant Enterobacteriaceae) transmission via contaminated TJF-Q180V duodenoscope elevator channel — 35+ publicly reported deaths linked since 2013',                                 'Catastrophic', 'FDA MAUDE / Senate HELP Committee Report (2016)',                                                                2016),
  ('Superbug infection',    'Pseudomonas aeruginosa outbreak traced to duodenoscopes — Virginia Mason (Seattle), 32+ patients, 11 deaths (2012–2014)',                                                                             'Catastrophic', 'Seattle Times investigation; AJIC peer-reviewed outbreak report',                                                  2015),
  ('Superbug infection',    'Klebsiella pneumoniae CRE outbreak — Ronald Reagan UCLA Medical Center, 179 patients exposed, 2 deaths (2015)',                                                                                       'Catastrophic', 'UCLA Health disclosure; LA Times investigation',                                                                   2015),
  ('Sepsis / ICU stay',     'Post-ERCP septicaemia requiring IV antibiotics and multi-week ICU admission — primary injury profile for most duodenoscope plaintiffs',                                                              'Severe',       'Motley Rice intake criteria; Drugwatch injury summary',                                                            2025),
  ('Death (recent FSN)',    '2 patient deaths + 5 serious injuries officially acknowledged by Olympus in the October 2025 Urgent Field Safety Notice covering TJF-Q190V / Q290V duodenoscopes',                                   'Catastrophic', 'Olympus Urgent Field Safety Notice (Oct 2025); FDA Safety Communication',                                          2025),
  ('Airway fire / burn',    'Bronchoscope–laser interaction caused 3 airway-fire injuries and 1 death — Class I recall on BF-series bronchoscopes',                                                                                 'Catastrophic', 'FDA Class I Recall Notice, June 2023',                                                                             2023),
  ('Bleeding / perforation','MAJ-891 Forceps/Irrigation Plug failure — 120 injuries and 1 death (Class I recall Dec 2024), plug detached during procedure causing bleeding and foreign-body retention',                             'Severe',       'FDA Class I Recall Notice, December 2024',                                                                          2024),
  ('Biopsy needle failure', 'ViziShot 2 FLEX 19G EBUS-TBNA needle — 40 injuries and 1 death (Class I recall Sept 2025), needle tip fracture during bronchoscopic biopsy',                                                           'Severe',       'FDA Class I Recall Notice, September 2025',                                                                         2025),
  ('Import-alert exposure', 'June 24, 2025 FDA Import Alert 89-08 blocking 58 Olympus devices manufactured at Aizu (Japan) facility for quality-system deficiencies — supply-chain backstory for ongoing infection claims',         'Moderate',     'FDA Import Alert 89-08 (June 24, 2025)',                                                                           2025),
  ('Reporting failure',     '$85M DOJ criminal plea (2018) — Olympus Medical Systems Corp admitted failing to file MDR adverse-event reports on TJF-Q180V duodenoscope infections; creates res-ipsa liability frame',              'Severe',       'DOJ press release, December 2018',                                                                                 2018);


-- ---------------------------------------------------------------------------
-- 3. Device failure / regulatory timeline
-- ---------------------------------------------------------------------------
create table if not exists public.olympus_device_failure_timeline (
  id           serial primary key,
  event_date   text    not null,
  event        text    not null,
  significance text,
  is_future    boolean default false
);

insert into public.olympus_device_failure_timeline (event_date, event, significance, is_future) values
  ('Mar 2012', 'UPMC Presbyterian / Advocate Lutheran outbreak clusters first surface',                                                                    'Earliest documented US duodenoscope CRE cluster tied to TJF-Q180V',                             false),
  ('Aug 2013', 'Virginia Mason Seattle outbreak disclosure — 32 patients infected, 11 deaths',                                                              'First outbreak to trigger major national press coverage',                                         false),
  ('Feb 2015', 'UCLA Ronald Reagan Medical Center notifies 179 patients of possible CRE exposure',                                                          'Catalyst for FDA Safety Communication and Senate investigation',                                  false),
  ('Feb 2015', 'FDA Safety Communication: design of duodenoscope elevator channel impedes effective reprocessing',                                          'Regulator acknowledges systemic design defect',                                                    false),
  ('Jan 2016', 'Senate HELP Committee majority staff report — "Preventable Tragedies"',                                                                      '75-page investigation concludes Olympus concealed risk from US regulators for years',             false),
  ('Jan 2016', 'Olympus issues Urgent Medical Device Removal / elevator redesign for TJF-Q180V',                                                            'First post-outbreak design change; serves as key plaintiff exhibit on knowledge',                  false),
  ('Oct 2017', 'Bigler v. Olympus — King County (WA) jury verdict: $6.6M compensatory for Virginia Mason victim',                                           'Establishes plaintiff-favorable verdict baseline for single-plaintiff cases',                      false),
  ('Dec 2018', 'Olympus Medical Systems Corp pleads guilty — $85M DOJ penalty for failing to file adverse-event reports',                                   'Criminal admission; powerful liability anchor for current and future plaintiffs',                 false),
  ('Jun 2023', 'FDA Class I Recall — BF-series laser-compatible bronchoscopes (3 injuries, 1 death from airway fire)',                                       'Expands tort beyond duodenoscopes into bronchoscope and surgical-accessory claims',                false),
  ('Dec 2024', 'FDA Class I Recall — MAJ-891 Forceps/Irrigation Plug (120 injuries, 1 death)',                                                              'Recent high-volume accessory recall broadens plaintiff pool',                                       false),
  ('Jun 2025', 'FDA Import Alert 89-08 blocks 58 Olympus devices from Aizu (Japan) facility',                                                               'Supply-chain quality signal; boosts punitive damages narrative',                                    false),
  ('Sep 2025', 'FDA Class I Recall — ViziShot 2 FLEX 19G EBUS-TBNA needle (40 injuries, 1 death)',                                                          'Another recent high-severity recall extends investigation pool into 2025–2026',                    false),
  ('Oct 2025', 'Olympus Urgent Field Safety Notice — TJF-Q190V / Q290V duodenoscopes (2 deaths, 5 injuries acknowledged)',                                   'Most recent active recall; triggers hospital notice-of-exposure letter pipeline',                   false),
  ('Apr 2026', 'MTMP Spring 2026 (Las Vegas, Apr 15–17) features Olympus scopes breakout session — Burnett Law Firm & Hurwitz Law presenting', 'Mass-tort community formally recognises Olympus scopes as an emerging tort',                       false),
  ('Q3 2026', 'Expected JPML petition for MDL consolidation (speculative; based on filing pace and MTMP signalling)',                                        'If granted, accelerates intake window and standardises early-filing advantage',                     true),
  ('2027',   'Projected first bellwether trial window (post-hypothetical MDL consolidation)',                                                                'Settlement pressure point; benchmark for case valuations',                                          true);


-- ---------------------------------------------------------------------------
-- 4. Qualifying-criteria tiers (A/B/C/D) with CPL bands
-- ---------------------------------------------------------------------------
create table if not exists public.olympus_qualifying_criteria_tiers (
  id                   serial primary key,
  tier                 text    not null,     -- 'A' | 'B' | 'C' | 'D'
  label                text    not null,
  criteria             text    not null,
  intake_signal        text    not null,
  estimated_cpl_band   text    not null,
  notes                text
);

insert into public.olympus_qualifying_criteria_tiers (tier, label, criteria, intake_signal, estimated_cpl_band, notes) values
  ('A', 'Notice-of-Exposure Patient',
        'Patient received a written notice-of-exposure letter from a hospital (Virginia Mason, UCLA, Cedars-Sinai, Hartford, UPMC, Advocate Lutheran, or any post-2025 FSN-notified facility) AND has a positive culture for CRE / Pseudomonas / Klebsiella / VRE linked to the ERCP or bronchoscopy admission.',
        'Documented institutional letter + culture report',
        '$150–$350 CPL',
        'Cleanest possible claim. Only 1 of 13 surveyed firms (Levin Papantonio) explicitly markets this tier. Best intake-to-signed-case ratio; lowest fraud risk; likely pre-qualified for MDL fast-track.'),
  ('B', 'Post-ERCP Sepsis — Short Window',
        'ERCP or EUS procedure with an Olympus duodenoscope (TJF-Q180V, Q190V, Q290V, Q170V) on or after 1 Jan 2015, followed within 30 days by hospitalisation for sepsis with a drug-resistant organism (CRE, Pseudomonas, Klebsiella, E. coli ESBL).',
        'Procedure record + admission H&P + blood/urine culture',
        '$450–$900 CPL',
        'Core plaintiff profile. 30-day symptom window (Motley Rice / Levin / TorHoerman standard) screens out most fraud. Requires medical-record retrieval.'),
  ('C', 'Scope Procedure + IV Antibiotics — 90-Day Window',
        'Any Olympus-branded scope procedure (duodenoscope, bronchoscope, colonoscope, EUS accessory) since 1 Jan 2015, followed within 90 days by hospitalisation requiring IV antibiotics for a procedure-related infection.',
        'Procedure record + hospital admission + antibiotic administration log',
        '$700–$1,400 CPL',
        'Broad qualification band used by TorHoerman, Lawsuit Information Center, Lanier, Rafferty Domnick. Larger funnel but heavier disqualification rate; expect ~25–40% qualification on raw leads.'),
  ('D', 'Investigate — Broad Scope-Infection Story',
        'Any history of endoscopy, colonoscopy, bronchoscopy, or cystoscopy since 2013 with a subsequent infection story (sepsis, abscess, pneumonia, UTI). No recency or device-brand requirement at intake.',
        'Self-reported infection after any scope procedure',
        '$1,200–$2,500 CPL',
        'Highest volume, highest rejection rate. Aggregators (Top Class Actions, Sokolove Law) rely on this tier. Heavy post-intake screening required; not recommended for firms sensitive to cost-per-signed-case.');


-- ---------------------------------------------------------------------------
-- 5. Settlement projections (speculative — clearly labelled)
-- ---------------------------------------------------------------------------
create table if not exists public.olympus_settlement_projections (
  id                    serial primary key,
  injury_tier           text    not null,
  low_estimate          numeric not null,
  high_estimate         numeric not null,
  comparable_litigation text,
  rationale             text
);

insert into public.olympus_settlement_projections (injury_tier, low_estimate, high_estimate, comparable_litigation, rationale) values
  ('Death (estate claim)',                           500000,  2500000, 'Bigler v. Olympus ($6.6M compensatory, 2017); Virginia Mason confidential settlements (reportedly $2M–$4M per death)', 'Death cases command premium due to $85M DOJ admission and uncontested transmission science. Top-end verdicts depend on venue and surviving-family economics.'),
  ('Sepsis + long ICU / permanent injury',           150000,   750000, 'Duodenoscope confidential settlements (2015–2019); Bard PowerPort catastrophic-injury tier',                             'Multi-week ICU, nephrotoxicity from prolonged IV antibiotics, durable disability drive high six-figure settlements.'),
  ('Sepsis — recovered, no permanent sequelae',       50000,   200000, 'Duodenoscope confidential settlements (2015–2019); transvaginal mesh moderate-injury tier',                             'Median plaintiff outcome. Damages largely medical + pain/suffering; lost wages where applicable.'),
  ('Exposure + positive culture, no acute sepsis',    10000,    60000, 'Hernia mesh "exposure without revision" claims; Invokana DKA exposure claims',                                           'Monitoring-damages and emotional-distress claims. Smaller individual value but high volume once notice-of-exposure pipeline matures.');


-- ---------------------------------------------------------------------------
-- 6. ERCP volume by state (proxy for patient-pool sizing)
-- ---------------------------------------------------------------------------
create table if not exists public.olympus_ercp_volume_by_state (
  id                   serial primary key,
  state                text    not null,
  annual_ercp_estimate integer not null,
  rank                 integer not null,
  unique (state)
);

-- Estimates derived from CMS HCUP inpatient/outpatient ERCP procedure counts
-- pro-rated to population and cross-checked against the ~500K annual US ERCP
-- volume figure cited in PMC / AGA publications. Precision is tier-level
-- (ranking, order-of-magnitude), not clinical.
insert into public.olympus_ercp_volume_by_state (state, annual_ercp_estimate, rank) values
  ('California',     58000,  1),
  ('Texas',          41000,  2),
  ('Florida',        39000,  3),
  ('New York',       31000,  4),
  ('Pennsylvania',   24000,  5),
  ('Illinois',       21000,  6),
  ('Ohio',           20500,  7),
  ('Michigan',       17500,  8),
  ('North Carolina', 16500,  9),
  ('Georgia',        16000, 10),
  ('New Jersey',     15500, 11),
  ('Virginia',       14000, 12),
  ('Washington',     12500, 13),
  ('Massachusetts',  12000, 14),
  ('Tennessee',      12000, 15),
  ('Arizona',        11500, 16),
  ('Indiana',        11000, 17),
  ('Missouri',       10500, 18),
  ('Maryland',       10000, 19),
  ('Wisconsin',       9500, 20);


-- ---------------------------------------------------------------------------
-- 7. Seed Meta Ad Library observations (captured April 21, 2026)
-- ---------------------------------------------------------------------------
-- Six relevant lawsuit-seeking ads pulled via the search API scraper on
-- queries "olympus scope" and "endoscope lawsuit". Raw JSON preserves the
-- library ID and landing URL so the pipeline can dedupe on re-ingest.
-- ---------------------------------------------------------------------------

insert into public.ad_observations_raw (
  source, source_id, advertiser_raw, tort_raw,
  ad_format, creative_url, creative_text,
  first_seen, last_seen,
  estimated_spend_low, estimated_spend_high, impression_count,
  raw_json, ingested_at
) values
  ('meta_ad_library', '743815835366224',
   'Legal Case Advisor', 'olympus_scopes',
   'social', 'https://olyscopes.legalcaseadvisor.org/olympus-infection-lawsuit',
   E'See if you qualify\n\nThose who got an infection after a doctor put a small camera (endoscope) down their throat and later developed a severe infection may be entitled to significant compensation. Sign up for free in 2 to 3 minutes.',
   '2026-04-02'::date, '2026-04-21'::date,
   null, null, null,
   '{"library_id":"743815835366224","advertiser_page_url":"https://www.facebook.com/61555673607922/","cta":"Apply Now","platforms":["Facebook","Instagram","Messenger"],"search_query":"olympus scope"}'::jsonb,
   now()),
  ('meta_ad_library', '818786827261683',
   'Injury Compensation Claim', 'olympus_scopes',
   'social', 'https://trk.indrn.com/69a846e4d63b91928256c2ba',
   'Thousands Who Suffered Serious Infections After an Endoscopic Procedure May Be Entitled to Significant Compensation.',
   '2026-03-23'::date, '2026-04-21'::date,
   null, null, null,
   '{"library_id":"818786827261683","advertiser_page_url":"https://www.facebook.com/61572215376718/","cta":"Learn More","platforms":["Facebook","Instagram","Messenger"],"search_query":"olympus scope"}'::jsonb,
   now()),
  ('meta_ad_library', '25969561039337733',
   'Olympus Lawsuit by Endoscope Lawyers of HLF', 'olympus_scopes',
   'social', 'https://facebook.com/61582907223292',
   E'Make Sense Of Endoscopy Infections & Lawsuits — Follow Endoscope Lawyers of HLF\n\nIf you ever had an endoscopy, colonoscopy, or other scope exam… Did you ever wonder what happens to the exam scope between patients? Doctors say "We clean it." Hospitals say "We disinfect it." Manufacturers say "Trust the system." But what happens when superbug infections still show up?',
   '2026-03-14'::date, '2026-04-21'::date,
   null, null, null,
   '{"library_id":"25969561039337733","advertiser_page_url":"https://www.facebook.com/61582907223292/","cta":"Follow Page (Like)","platforms":["Facebook"],"search_query":"olympus scope,endoscope lawsuit","firm_disclosure":"The Hurwitz Law Firm PC (Great Neck, NY)","firm_phone":"888-510-9214"}'::jsonb,
   now()),
  ('meta_ad_library', '2181554725915134',
   'Legal Case Network', 'olympus_scopes',
   'social', 'https://olyscopes.legalcaseadvisor.org/olympus-quiz',
   E'You May Qualify for Compensation\n\nYou may qualify for significant compensation if you developed a serious infection after an endoscopic procedure. If you were hospitalized and needed IV antibiotics within 30 days, you may have a claim. Tap Apply Now to see if you qualify. Your case review is free and confidential.',
   '2026-04-20'::date, '2026-04-21'::date,
   null, null, null,
   '{"library_id":"2181554725915134","advertiser_page_url":"https://www.facebook.com/61586944711086/","cta":"Apply Now","platforms":["Facebook","Instagram"],"search_query":"olympus scope","shared_domain_with":"Legal Case Advisor (olyscopes.legalcaseadvisor.org)"}'::jsonb,
   now()),
  ('meta_ad_library', '1634025504505012',
   'Olympus Scope Infection Lawsuit', 'olympus_scopes',
   'social', 'http://fb.me/',
   E'Infected by Endoscopy Scopes? You May Have a Case — Compensation may be available.\n\nHave you or a loved one suffered from an Olympus scope infection? You may be eligible for compensation. Lawsuits are being filed now!',
   '2026-04-21'::date, '2026-04-21'::date,
   null, null, null,
   '{"library_id":"1634025504505012","advertiser_page_url":"https://www.facebook.com/61576497359788/","cta":"Learn More","platforms":["Facebook","Instagram","Messenger"],"search_query":"olympus scope"}'::jsonb,
   now()),
  ('meta_ad_library', '1436125957810449',
   'Olympus Scope Infection Lawsuit', 'olympus_scopes',
   'social', 'http://fb.me/',
   E'Infected by Endoscopy Scopes? You May Have a Case — Compensation may be available.\n\nHave you or a loved one suffered from an Olympus scope infection? You may be eligible for compensation. Lawsuits are being filed now!',
   '2026-04-21'::date, '2026-04-21'::date,
   null, null, null,
   '{"library_id":"1436125957810449","advertiser_page_url":"https://www.facebook.com/61576497359788/","cta":"Learn More","platforms":["Facebook","Instagram","Messenger"],"search_query":"olympus scope","impressions":"<100","note":"Variant of 1634025504505012"}'::jsonb,
   now())
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_olympus_adverse_events_category on public.olympus_adverse_events (category);
create index if not exists idx_olympus_adverse_events_severity on public.olympus_adverse_events (severity);
create index if not exists idx_olympus_timeline_is_future on public.olympus_device_failure_timeline (is_future);
create index if not exists idx_olympus_tiers_tier on public.olympus_qualifying_criteria_tiers (tier);
create index if not exists idx_olympus_ercp_rank on public.olympus_ercp_volume_by_state (rank);


-- ---------------------------------------------------------------------------
-- 9. Row-Level Security (read-only for anon, in line with other tort tables)
-- ---------------------------------------------------------------------------
alter table public.olympus_adverse_events              enable row level security;
alter table public.olympus_device_failure_timeline     enable row level security;
alter table public.olympus_qualifying_criteria_tiers   enable row level security;
alter table public.olympus_settlement_projections      enable row level security;
alter table public.olympus_ercp_volume_by_state        enable row level security;

do $$
begin
  create policy "olympus_adverse_events_read"            on public.olympus_adverse_events            for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "olympus_timeline_read"                  on public.olympus_device_failure_timeline   for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "olympus_tiers_read"                     on public.olympus_qualifying_criteria_tiers for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "olympus_settlements_read"               on public.olympus_settlement_projections    for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "olympus_ercp_read"                      on public.olympus_ercp_volume_by_state      for select using (true);
exception when duplicate_object then null; end $$;


commit;
