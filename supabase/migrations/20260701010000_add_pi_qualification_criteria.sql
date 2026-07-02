-- ============================================================================
-- PI QUALIFICATION CRITERIA (Strategy Engine intake/qualification layer, v1)
-- Per-case_type screening questions + disqualifiers + case-type-specific
-- factors for the PI flow, keyed to the SAME case_type union as
-- public.pi_ad_economics ('auto'|'trucking'|'motorcycle'|'boating') so the two
-- reference stores are joinable. Personal-injury intake is ~70% a shared
-- UNIVERSAL block (injury? treated? when? fault? represented? settled?) that
-- recurs verbatim across every case type, plus a thin case-type-specific delta.
--
-- Shape mirrors public.pi_ad_economics: a read-only public reference table with
-- RLS enabled + a read RPC. The universal block is stored ONCE (scope=universal)
-- and merged with the case-type delta (scope=specific) at query time in
-- lib/queries/pi-qualification-criteria.ts — NOT branched in SQL.
--
-- Seed is verbatim from the research pass pi-intake-criteria-2026-07-01.md
-- (companion to pi-ad-economics-benchmark-2026-06-30.md +
-- boating-ad-economics-benchmark-2026-07-01.md). Every criterion carries its
-- provenance: evidence (observed = seen on a live ad/intake form; inferred =
-- standard contingency-economics practice / logical inverse of what ads screen
-- FOR), scope (universal vs specific), source, and purpose. Boating role-
-- dependent questions additionally carry role/theory/*_branch tags — STORED for
-- a future branched flow, rendered FLAT in v1 (the UI only reads `theory` for a
-- "[Jones Act]" badge). Maritime / Jones Act as its own case_type key is a
-- documented deferred follow-up (see boating source_notes + the economics
-- migration): boating is seeded as a single key with the Jones Act branch
-- preserved inline, to keep criteria/economics key parity.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pi_qualification_criteria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Grain (same union as pi_ad_economics + a 'universal' merge row) ──────
  case_type     text NOT NULL
                CHECK (case_type IN ('universal', 'auto', 'trucking', 'motorcycle', 'boating')),
  scope         text NOT NULL
                CHECK (scope IN ('universal', 'specific')),

  -- ── Criteria blocks (each item carries evidence/scope/source/purpose; ────
  -- boating items also carry role/theory/*_branch tags) ────────────────────
  screening_questions        jsonb NOT NULL DEFAULT '[]'::jsonb,
  disqualifiers              jsonb NOT NULL DEFAULT '[]'::jsonb,
  case_type_specific_factors jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Intake messaging (mirrors tort-qualification-criteria.ts shape; the ──
  -- research file does not publish verbatim messages for these blocks, so they
  -- stay NULL until sourced — the UI guards on null) ───────────────────────
  disqualify_message text,
  qualify_message    text,

  -- ── SOL + provenance ─────────────────────────────────────────────────────
  sol_note      text,
  source_notes  text,
  confidence    text CHECK (confidence IN ('high', 'medium-high', 'medium', 'low', 'very_low')),

  observed_date timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (case_type)
);

CREATE INDEX IF NOT EXISTS idx_pi_qual_case_type
  ON public.pi_qualification_criteria (case_type);

COMMENT ON TABLE public.pi_qualification_criteria
  IS 'PI intake/qualification criteria per case_type (universal block stored once + case-type deltas), keyed to the pi_ad_economics case_type union. Universal+specific merge happens in TypeScript, not SQL. Boating carries Jones Act branch tags stored (not branched) in v1.';

-- ── RLS: read-only public reference data (exact mirror of pi_ad_economics) ─
ALTER TABLE public.pi_qualification_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pi_qualification_criteria read" ON public.pi_qualification_criteria;
CREATE POLICY "pi_qualification_criteria read"
  ON public.pi_qualification_criteria
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.pi_qualification_criteria TO anon, authenticated;

-- ── Seed (verbatim from pi-intake-criteria-2026-07-01.md) ─────────────────
-- Dollar-quoted JSON so the research's apostrophes stay verbatim (no doubling).
INSERT INTO public.pi_qualification_criteria (
  case_type, scope,
  screening_questions, disqualifiers, case_type_specific_factors,
  sol_note, source_notes, confidence, observed_date
) VALUES

  -- ── universal_pi_intake — stored ONCE, merged into every case_type ───────
  ('universal', 'universal',
   $j$[
     {"id":"uni-injured","question":"Were you injured? What was injured, and when did you first realize you were hurt?","purpose":"Confirm bodily injury exists — no injury = no damages = no case","type":"yes_no","disqualify_on":["No physical injury / property damage only"],"evidence":"observed","scope":"universal","source":"Sackrin & Tolchinsky intake; Eric Roy Law Meta ad ('injured...within the last 30 days')"},
     {"id":"uni-treatment","question":"Did you receive medical treatment? Which providers/hospitals?","purpose":"Injury must be documented + treated = provable damages","type":"yes_no","disqualify_on":["No treatment","Long gap between incident and care"],"evidence":"observed","scope":"universal","source":"Ryan Law Group; CASEpeer intake guide; Eric Roy Law ad ('spent thousands on medical treatment')"},
     {"id":"uni-when-where","question":"When and where did it happen?","purpose":"SOL timing screen + jurisdiction / licensing routing","type":"date","disqualify_on":["Outside the state SOL window","Firm not licensed in that state"],"evidence":"observed","scope":"universal","source":"Ads gate on 'last 12 months' / 'within 2 years'; Attorney Pish lead form (30d/3mo/1yr/2yr)"},
     {"id":"uni-fault","question":"Whose fault was it — was it caused by someone else's negligence?","purpose":"Establish a negligent, collectible third party","type":"select","disqualify_on":["Claimant sole/primary at fault","No negligent third party"],"evidence":"observed","scope":"universal","source":"Meta ads ('weren't at fault', 'caused by someone else's negligence'); Ben Crump Law"},
     {"id":"uni-represented","question":"Have you already hired an attorney for this?","purpose":"Cannot sign an already-represented claimant","type":"yes_no","disqualify_on":["Already represented on this matter"],"evidence":"observed","scope":"universal","source":"Eric Roy Law ad ('you don't have a lawyer yet'); Pond Lehocky existing-client screen"},
     {"id":"uni-settled","question":"Have you spoken to / accepted a settlement from the insurance company?","purpose":"Catch recorded statements or a signed release that caps the claim","type":"yes_no","disqualify_on":["Already signed a release / settled"],"evidence":"observed","scope":"universal","source":"Ryan Law Group; Ben Crump Law (warns against accepting initial settlement)"}
   ]$j$::jsonb,
   $j$[
     {"item":"Statute of limitations expired","evidence":"observed"},
     {"item":"Claimant at fault / no negligent third party","evidence":"observed"},
     {"item":"No injury or no medical treatment","evidence":"inferred"},
     {"item":"Already represented by other counsel","evidence":"observed"},
     {"item":"Already signed a release / accepted insurer settlement","evidence":"observed"},
     {"item":"Minimal damages (minor soft-tissue, no treatment, no lost time)","evidence":"inferred"}
   ]$j$::jsonb,
   $j$[]$j$::jsonb,
   NULL,
   $t$Recurs verbatim across auto/trucking/motorcycle/boating ads + intake forms (Eric Roy Law, Attorney Pish, Pond Lehocky, Munley, Sackrin & Tolchinsky, Morgan & Morgan). Confidence: HIGH on the screens; disqualifiers are partly inferred because firms advertise who qualifies, not who is rejected.$t$,
   'high', '2026-07-01'),

  -- ── auto (baseline) ──────────────────────────────────────────────────────
  ('auto', 'specific',
   $j$[
     {"id":"auto-police-report","question":"Did police come to the scene / was a report filed?","purpose":"Corroborates fault + documents the crash","type":"yes_no","disqualify_on":["No report weakens liability but rarely disqualifies alone"],"evidence":"observed","scope":"specific","source":"Sackrin & Tolchinsky ('Did the police come to the scene?'); Ben Crump Law"},
     {"id":"auto-insurance","question":"What insurance covered the vehicles? (your PIP, other driver's bodily-injury liability, UM/UIM limits)","purpose":"Confirm a collectible source of recovery","type":"select","disqualify_on":["No/insufficient coverage and no UM — uncollectible"],"evidence":"observed","scope":"specific","source":"Sackrin & Tolchinsky intake (asks PIP, BIL, UM + limits); CASEpeer (policy limits)"}
   ]$j$::jsonb,
   $j$[
     {"item":"No collectible insurance (uninsured at-fault driver, no UM, judgment-proof defendant)","evidence":"inferred"}
   ]$j$::jsonb,
   $j$[
     {"factor":"Fault / comparative negligence — claimant's share of fault","evidence":"observed"},
     {"factor":"Available/collectible auto insurance — PIP, bodily-injury liability, UM/UIM + policy limits","evidence":"observed"},
     {"factor":"Police report / crash documentation supporting liability","evidence":"observed"},
     {"factor":"Crash-mechanics detail (point of impact, seatbelt, multiple impacts, distraction/phone use, road conditions)","evidence":"observed"},
     {"factor":"One net captures car/truck/motorcycle/bicycle/pedestrian/rideshare variants","evidence":"observed"}
   ]$j$::jsonb,
   $t$State PI SOL, commonly ~1-3 years from accident date; varies by state and subject to tolling (minors, discovery rule). Ads operationalize with rolling windows ('last 12 months', 'within 2 years'). Do not treat any single number as universal.$t$,
   $t$Meta Ad Library ~38 advertiser pages (Eric Roy Law, GJEL, Napolin, Carter Law, aggregators). Intake forms: Sackrin & Tolchinsky (richest verbatim field list incl. PIP/BIL/UM), Ryan Law Group, Ben Crump Law, CASEpeer. Confidence: HIGH on screens; disqualifiers partly inferred.$t$,
   'high', '2026-07-01'),

  -- ── trucking ─────────────────────────────────────────────────────────────
  ('trucking', 'specific',
   $j$[
     {"id":"truck-commercial-vehicle","question":"Was a commercial truck / 18-wheeler / semi / tractor-trailer involved (not a pickup or personal vehicle)?","purpose":"Gating axis — unlocks higher policy limits, FMCSA liability, motor-carrier defendants","type":"yes_no","disqualify_on":["Non-commercial vehicle — routes to standard auto track"],"evidence":"observed","scope":"specific","source":"Eliteinlaw ad ('hit by an 18 wheeler...find out if you qualify'); Morgan & Morgan; Munley; KAASS Law"},
     {"id":"truck-injury-severity","question":"How severe are the injuries — treatment required, catastrophic, or wrongful death?","purpose":"Trucking firms screen for serious cases that justify federal-reg / multi-defendant cost","type":"select","disqualify_on":["Minor/no injury","Soft-tissue-only","Property-damage-only"],"evidence":"observed","scope":"specific","source":"Munley (Serious/Catastrophic/Fatal tiers); Beasley Allen ('catastrophic...permanent disability...wrongful death'); TruckCrashLaw"},
     {"id":"truck-carrier","question":"Who owned/operated the truck — what trucking company / motor carrier?","purpose":"Identify carrier + corporate defendants for vicarious liability and to locate the large policy","type":"text","disqualify_on":["Unidentifiable carrier or uninsured owner-operator with no recoverable policy"],"evidence":"inferred","scope":"specific","source":"Implied by 'fight the trucking company' framing (Davis Law, Bonilla); not seen verbatim as a form field"}
   ]$j$::jsonb,
   $j$[
     {"item":"Non-commercial vehicle (private car/pickup, not a CMV)","evidence":"observed"},
     {"item":"Minor / no injury — trucking specialists want serious/catastrophic/fatal","evidence":"observed"},
     {"item":"No identifiable/insured carrier or recoverable policy","evidence":"inferred"}
   ]$j$::jsonb,
   $j$[
     {"factor":"Commercial/CMV involvement is the threshold gate (18-wheeler, semi, dump/delivery/tanker/tow/garbage/cement truck, bus, commercial van)","evidence":"observed"},
     {"factor":"FMCSA regs — hours-of-service, driver logs, ELD/black-box/ECM data, GPS, maintenance records; marketed as the trucking-vs-auto expertise","evidence":"observed"},
     {"factor":"Employer / motor-carrier vicarious liability (deep-pocket defendant; 'profit over safety' framing)","evidence":"observed"},
     {"factor":"Higher injury-severity threshold than auto — serious/catastrophic/permanent-disability/wrongful-death (clearest trucking delta)","evidence":"observed"},
     {"factor":"Multiple defendants — driver, carrier, cargo loader/shipper, freight broker, maintenance, manufacturer, government","evidence":"observed"},
     {"factor":"Evidence-preservation urgency — carriers dispatch rapid-response teams; ELD data overwrites -> 'contact immediately'","evidence":"observed"}
   ]$j$::jsonb,
   $t$State PI SOL, observed ranges ~1-4 years from crash (firms cited '2 years', '2-3 years', '1 and 4 years'); much shorter ~6-month notice deadline when a government vehicle/entity is a defendant. Lead funnels often pre-screen to 'last 12 months'. Confirm per state.$t$,
   $t$Meta Ad Library: 'truck accident lawyer' (478 results) -> ~20 genuine firm ads after filtering keyword-spam (Laborde Earles, Moore Law, Bonilla, Davis, KAASS). Landing pages: HMF-law (TX checklist), Munley (visible intake form), Beasley Allen, TruckCrashLaw, Morgan & Morgan, GJEL. Confidence: HIGH on FMCSA/multi-defendant/severity; MEDIUM on exact form fields (only Munley exposed a raw form).$t$,
   'high', '2026-07-01'),

  -- ── motorcycle ───────────────────────────────────────────────────────────
  ('motorcycle', 'specific',
   $j$[
     {"id":"moto-make-type","question":"What motorcycle were you on (make/type)? Tell us what happened.","purpose":"Confirm practice-area fit + capture crash narrative for triage","type":"select","disqualify_on":["Not a motorcycle event"],"evidence":"observed","scope":"specific","source":"Shark Law lead form (Motorcycle Type/Make dropdown: Harley/Indian/Honda/Yamaha + 'Tell us what happened')"},
     {"id":"moto-rider-passenger","question":"Were you the rider/operator or a passenger?","purpose":"Passenger is almost never at fault; operator conduct is scrutinized","type":"select","disqualify_on":["Rarely disqualifying — reframes theory of the case"],"evidence":"inferred","scope":"specific","source":"Standard MC intake; Shark Law copy is rider-centric but the form doesn't split rider vs passenger"},
     {"id":"moto-helmet","question":"Were you wearing a helmet? (and does your state have a helmet law?)","purpose":"Assess comparative-fault / damages-reduction exposure the insurer will raise","type":"yes_no","disqualify_on":["NOT disqualifying — firms say non-use doesn't bar a claim; used to price the case"],"evidence":"inferred","scope":"specific","source":"Kyle Law, Simmons & Fletcher, Gallagher & Kennedy discuss helmet use as a case factor (educational content, not the observed lead forms)"}
   ]$j$::jsonb,
   $j$[
     {"item":"Rider was at fault / no negligent third party","evidence":"observed"},
     {"item":"Outside firm's licensed state (forms capture state/city; per-state pages route)","evidence":"observed"}
   ]$j$::jsonb,
   $j$[
     {"factor":"Helmet use / helmet-law status — comparative-fault damages lever, NOT an auto-disqualifier; firms stress the rider can still recover","evidence":"observed"},
     {"factor":"Comparative / rider fault probed harder (lane positioning, lane-splitting legality, speed, visibility)","evidence":"observed"},
     {"factor":"Rider / jury bias — advertisers pre-empt with 'riders who get riders' / 'understand rider bias' positioning (MC-unique tactic)","evidence":"observed"},
     {"factor":"Injury severity skews catastrophic -> some firms lean high-value/serious-injury","evidence":"observed"},
     {"factor":"Motorcycle make/type capture (Harley/Indian/Honda/Yamaha) confirms fit + segments the lead","evidence":"observed"},
     {"factor":"Rider vs passenger — passenger claims are cleaner","evidence":"inferred"}
   ]$j$::jsonb,
   $t$Follows the state's general PI SOL (~1-6 years, some measured from injury discovery); government-vehicle claims carry much shorter notice deadlines. Lead forms cap 'when did it happen' around 2 years; ad copy uses 'in the last 2 years...you may qualify'. Verify per state.$t$,
   $t$Meta Ad Library (solid volume): Shark Law (MC-exclusive lead form w/ make/type dropdown, 'rider bias' copy), Attorney Pish (when-did-it-happen SOL screen), Pond Lehocky (existing-client screen), Law Tigers (per-state MC pages), 98twins. Educational pages (helmet/comparative/severity): PARRIS, Simmons & Fletcher, Kyle Law, Gallagher & Kennedy. Confidence: HIGH on screens/disqualifiers; helmet-as-form-field and rider/passenger are inferred (discussed in content, not seen as form fields).$t$,
   'high', '2026-07-01'),

  -- ── boating (single key; Jones Act branch preserved inline, rendered flat) ─
  ('boating', 'specific',
   $j$[
     {"id":"boat-vessel-type","question":"What type of vessel was involved — recreational boat, jet ski / PWC, commercial vessel, or cruise?","purpose":"Drives which legal theory applies (state PI vs maritime vs Jones Act vs cruise contract) and defendant type","type":"select","options":["Recreational boat","Jet ski / PWC","Commercial vessel / rig / barge","Cruise ship"],"disqualify_on":["Non-motorized / land incident routes out of boating"],"evidence":"observed","scope":"specific","theory_branch":{"recreational_or_pwc":"negligence","commercial_vessel":"jones_act","cruise_ship":"cruise_contract"},"source":"Munley (recreational, jet ski/PWC, duck boat); Atkinson Law VA; Arnold & Itkin (Jones Act)"},
     {"id":"boat-role","question":"Were you the operator, a passenger, a water-skier/tuber, or a crew member / maritime worker?","purpose":"Determines legal theory: passenger/guest = negligence vs operator; injured crew/worker = Jones Act (employer liability)","type":"select","options":["Passenger","Operator","Water-skier / tuber","Crew / maritime worker"],"disqualify_on":["Claimant was the intoxicated or negligent operator who caused their own injury"],"evidence":"observed","scope":"specific","role_branch":{"passenger":{"role":"passenger","theory":"negligence"},"water_skier":{"role":"passenger","theory":"negligence"},"operator":{"role":"operator","theory":"negligence"},"crew":{"role":"crew","theory":"jones_act"}},"source":"Munley (passenger, water skier, operator/captain); Southern Injury (crew vs passenger)"},
     {"id":"boat-location","question":"Where did the accident happen — ocean/offshore, bay, navigable river, or an inland lake?","purpose":"Locus test for admiralty/maritime jurisdiction; navigable waters + maritime nexus pulls the case into federal maritime law vs pure state PI","type":"select","disqualify_on":["Not a hard DQ; purely intrastate non-navigable water shifts to a state-only theory"],"evidence":"observed","scope":"specific","source":"Munley + Atkinson (Coast Guard jurisdiction, 'navigable waters', 'federal maritime law')"},
     {"id":"boat-bui","question":"Was alcohol or drugs involved, and which party (the other operator or you)?","purpose":"Another operator's BUI = strong liability / negligence-per-se hook; claimant's own BUI = comparative fault / disqualifier","type":"select","disqualify_on":["Claimant was the boater under the influence"],"evidence":"observed","scope":"specific","source":"Morgan & Morgan FAQ (BUI as fault indicator); Atkinson Law VA (BUI liability factor)"},
     {"id":"boat-jones-act-seaman","question":"[Jones Act] Are you a seaman/crew — do you spend 30%+ of work time on a vessel in navigation, contributing to its mission?","purpose":"Seaman-status gate that unlocks a Jones Act employer-negligence claim (uncapped damages, featherweight causation) vs LHWCA/workers-comp","type":"yes_no","disqualify_on":["Longshoreman / dock / shipyard / fixed-platform worker (LHWCA, not Jones Act)","Office/admin who only occasionally boards"],"evidence":"observed","scope":"specific","role":"crew","theory":"jones_act","source":"Southern Injury (3-part test + 30% rule + exclusions); marineinjurylaw.com; forthepeople"}
   ]$j$::jsonb,
   $j$[
     {"item":"Claimant was the boater under the influence (own BUI)","evidence":"inferred"},
     {"item":"[Jones Act] Not a seaman — longshoreman/dock/shipyard/fixed-platform worker (routes to LHWCA)","evidence":"observed","theory":"jones_act"},
     {"item":"[Jones Act] <30% of work time in service of a vessel in navigation","evidence":"observed","theory":"jones_act"},
     {"item":"Incident outside the applicable limitation period (state PI vs maritime vs cruise contract)","evidence":"observed"}
   ]$j$::jsonb,
   $j$[
     {"factor":"Vessel type dictates legal theory — recreational/jet ski (state PI + maritime negligence) vs commercial/rig/barge (Jones Act, unseaworthiness) vs cruise (passenger contract-of-carriage)","evidence":"observed"},
     {"factor":"Role split is the pivot — passenger/skier = negligence vs operator; crew/worker = Jones Act vs the EMPLOYER (different defendant, different standard, uncapped damages)","evidence":"observed"},
     {"factor":"Jones Act seaman test — vessel-in-navigation assignment + duties contribute to mission + 30%+ time aboard; 'any part, even the slightest' featherweight negligence standard","evidence":"observed","theory":"jones_act"},
     {"factor":"Jones Act vs LHWCA fork — longshoremen/dock/shipyard/fixed-platform workers are NOT seamen; misclassification kills the Jones Act theory","evidence":"observed","theory":"jones_act"},
     {"factor":"Admiralty/maritime jurisdiction (locus + nexus); Coast Guard jurisdiction as the practical proxy; claims can sit under BOTH state PI and federal maritime law","evidence":"observed"},
     {"factor":"BUI is two-sided — other operator's BUI = negligence hook; claimant's own = comparative-fault disqualifier","evidence":"observed"},
     {"factor":"Recreational vs commercial context — commercial (cruise, charter, commercial fishing, offshore/duck-boat) brings corporate defendants + contractual limits + federal statutes; recreational brings individual operators + watercraft/homeowner insurance","evidence":"observed"},
     {"factor":"Injury profile skews severe/fatal — drowning, near-drowning, hypothermia/exposure, propeller strikes, TBI, spinal","evidence":"observed"}
   ]$j$::jsonb,
   $t$Jurisdiction-dependent and the single trickiest boating screen. Recreational/inland-water injury -> state PI SOL (one firm cited 2-yr PI / 2-yr wrongful death; state windows vary). General maritime/admiralty or the Jones Act (injured seaman/crew) -> a separate federal limit, commonly cited as ~3 years. Cruise passenger claims -> the ticket's contract of carriage, which frequently shortens the suit period (often ~1 year) and adds a written notice-of-claim deadline. High-seas wrongful death can fall under DOHSA with its own limit. Screen for the EARLIEST applicable clock (state PI vs maritime vs cruise contract); do not assume the standard state PI deadline. General ranges only — do not fabricate a specific figure.$t$,
   $t$Meta Ad Library is a LOW-VOLUME channel here: 'boat accident lawyer' by impressions returned mostly keyword-spam; 'Jones Act maritime injury attorney' returned only 3 ads, all from one firm (The Alfred Firm, offshore-worker campaign, minimal form: name/phone + 'describe your case'). Real screening lives on landing pages: Southern Injury (strong Jones Act seaman test / 30% / 3-yr / LHWCA), Munley, Atkinson Law VA (dual state-PI + federal-maritime framing), Morgan & Morgan (BUI/negligence/documented-injury). Confidence: HIGH on maritime-specific factors; MEDIUM on SOL (state numbers deliberately not fabricated) and on ad-side screening (thin — screening logic is landing-page-sourced, not ad-sourced).$t$,
   'medium-high', '2026-07-01')

ON CONFLICT (case_type) DO NOTHING;

-- ── Read RPC: the case-type delta + the universal block, merged in TS ──────
CREATE OR REPLACE FUNCTION public.get_pi_qualification_criteria(
  p_case_type text
)
RETURNS SETOF public.pi_qualification_criteria
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM public.pi_qualification_criteria
  WHERE case_type IN (p_case_type, 'universal')
  ORDER BY (scope = 'universal') DESC;  -- universal first, then the delta
$$;

COMMENT ON FUNCTION public.get_pi_qualification_criteria
  IS 'Returns the universal PI intake block + the case-type-specific delta for a case_type. The universal+specific merge (screening questions, disqualifiers) happens in lib/queries/pi-qualification-criteria.ts, not here.';

GRANT EXECUTE ON FUNCTION public.get_pi_qualification_criteria(text) TO anon, authenticated, service_role;
