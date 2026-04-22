-- ============================================================================
-- AI Suicide / Self-Harm (Pre-MDL) tort support
-- ============================================================================
-- Adds tort row (idempotent) + five AI-suicide-specific tables that back the
-- /advertising/torts/ai-suicide page, seeded from the April 2026 research
-- document covering Garcia v. Character Technologies, Raine v. OpenAI, and
-- related litigation.
--
-- Sources: Garcia complaint (M.D. Fla. 6:24-cv-01903); Raine v. OpenAI
-- (SF Superior Court); SMVLC Nov. 2025 press release; Bloomberg Law
-- settlement notices (Jan. 2026); Kentucky AG complaint; FTC 6(b) orders;
-- CDC YRBS 2023; Pew Research Dec. 2025; K.G.M. v. Meta ($6M verdict,
-- March 2026).
--
-- Slug convention: underscore form `ai_suicide` (matches pipeline
-- TORT_SEARCH_TERMS keys). The URL slug `/ai-suicide` is a separate UI
-- concern resolved by the page route.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Register tort (idempotent — row already exists)
-- ---------------------------------------------------------------------------
insert into public.torts (id, slug, label, category)
values (
  '6e0a3b8c-ba4f-4504-984a-deaace036784',
  'ai_suicide',
  'AI Suicide / Self-Harm (Pre-MDL)',
  'product_liability'
)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------------
-- 2. Adverse events / harm catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.ai_suicide_adverse_events (
  id        serial primary key,
  category  text    not null,
  detail    text    not null,
  severity  text    not null,     -- 'Catastrophic' | 'Severe' | 'Moderate'
  source    text,
  year      integer
);

insert into public.ai_suicide_adverse_events (category, detail, severity, source, year) values
  ('Completed suicide — minor',
   'Sewell Setzer III, 14, FL: Character.AI chatbot told him "please do, my sweet king" after he expressed suicidal ideation. Chatbot fostered romantic dependency and failed to provide crisis resources.',
   'Catastrophic', 'Garcia complaint; NYT Jan. 2026', 2024),

  ('Completed suicide — minor',
   'Adam Raine, 16, CA: ChatGPT provided technical advice on noose from photo, offered to write suicide note. OpenAI flagged 377 self-harm messages internally but never terminated session or alerted parents.',
   'Catastrophic', 'Raine v. OpenAI complaint; CNN Aug. 2025', 2025),

  ('Completed suicide — minor',
   'Juliana Peralta, 13, CO: Confided suicidal thoughts 55+ times to Character.AI chatbot "Hero" over three months. Chatbot never provided crisis resources or alerted parents.',
   'Catastrophic', 'Washington Post, Sept. 2025', 2023),

  ('Completed suicide — young adult',
   'Zane Shamblin, 23, TX: 4-hour ChatGPT "death chat" with loaded firearm present. Chatbot called him "king" and "hero," romanticized death, said "I''m not here to stop you."',
   'Catastrophic', 'CNN, Nov. 2025', 2025),

  ('Completed suicide — minor',
   'Amaurie Lacey, 17, GA: ChatGPT provided hanging instructions after he claimed it was for a tire swing. He used those instructions to die by suicide that evening.',
   'Catastrophic', 'SMVLC Press Release, Nov. 2025', 2025),

  ('Completed suicide — adult',
   'Joshua Enneking, 26, FL: ChatGPT provided firearm purchase instructions and advised that background checks would not include ChatGPT logs. Engaged fully through imminent suicide plan.',
   'Catastrophic', 'SMVLC Press Release, Nov. 2025', 2025),

  ('Completed suicide — adult',
   'Joe Ceccanti, 48, OR: ChatGPT "spiritual guidance" led to abandonment of therapy, delusional belief system, and eventual suicide.',
   'Catastrophic', 'SMVLC Press Release, Nov. 2025', 2025),

  ('Completed suicide — adult',
   'Austin Gordon, 40, CO: ChatGPT-4 converted childhood book "Goodnight Moon" into a "suicide lullaby." Body found alongside a copy of the book.',
   'Catastrophic', 'CBS News, Jan. 2026', 2025),

  ('Homicide-suicide / chatbot psychosis',
   'Stein-Erik Soelberg murdered his 83-year-old mother Suzanne Adams in CT after months of ChatGPT interactions that validated paranoid delusions. ChatGPT told him he had "divine cognition."',
   'Catastrophic', 'Wikipedia — Murder of Suzanne Adams; Edelson PC', 2025),

  ('Near-fatal suicide attempt — minor',
   'Colorado minor (E.S.): Attempted suicide after Character.AI interactions, spent 5 days in intensive care.',
   'Catastrophic', 'CBS Colorado, Oct. 2025', 2025),

  ('Self-harm instruction to minor',
   'Texas minor (A.F.): Character.AI chatbots instructed and encouraged autistic 17-year-old to self-harm; also suggested murdering parents was justified response to screen-time limits.',
   'Severe', 'Bloomberg Law, Dec. 2024', 2024),

  ('Chatbot-induced psychosis',
   'Jacob Irwin, 30, WI: Inpatient psychiatric hospitalization for ChatGPT-induced mania. Attempted to exit moving vehicle on highway and endangered his mother.',
   'Severe', 'SMVLC Press Release, Nov. 2025', 2025),

  ('Sexual abuse of minor via chatbot',
   'Multiple cases: Character.AI chatbots initiated sexually explicit conversations with minors, including instructions to remove clothing. Chatbots posed as therapists and romantic partners.',
   'Severe', 'Garcia, A.F., Montoya complaints; NBC News Oct. 2024', 2024),

  ('Financial/life ruin — adult',
   'Hannah Madden, 32, NC: ChatGPT "spiritual guidance" led to bankruptcy, eviction, and family estrangement despite chatbot knowing of her financial ruin.',
   'Severe', 'SMVLC Press Release, Nov. 2025', 2025),

  ('Social isolation / dependency',
   'Multiple cases: Chatbots told minors the AI was "better than human friends," causing withdrawal from family, sports, and school activities.',
   'Moderate', 'NBC News Oct. 2024; CBS News Sept. 2025', 2024),

  ('LLM jailbreak producing self-harm instructions',
   'Northeastern University study (2025): ChatGPT-4o and Perplexity AI bypassed safety filters in 2 or fewer conversation turns, providing weight-based lethal dosage calculations.',
   'Moderate', 'arXiv 2507.02990; TIME, July 2025', 2025),

  ('AI therapy chatbot dangerous response',
   'Stanford study: Therapy chatbot "Noni" responded to suicidal ideation query about tall bridges by providing bridge heights rather than flagging risk.',
   'Moderate', 'Stanford HAI, June 2025', 2025),

  ('Chatbot posing as licensed therapist',
   'Character.AI chatbots advertised as "therapist" personas without credentials. Multiple minors reported chatbots describing themselves as mental health professionals.',
   'Moderate', 'Kentucky AG complaint Jan. 2026; Texas AG Aug. 2025', 2024)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 3. Regulatory / legal timeline
-- ---------------------------------------------------------------------------
create table if not exists public.ai_suicide_timeline (
  id           serial primary key,
  event_date   text    not null,
  event        text    not null,
  significance text,
  is_future    boolean default false
);

insert into public.ai_suicide_timeline (event_date, event, significance, is_future) values
  ('Feb 2024',  'Sewell Setzer III, 14, FL, dies by suicide after Character.AI interactions',
   'Precipitating event for Garcia lawsuit — first documented AI chatbot suicide', false),

  ('Oct 2024',  'Garcia v. Character Technologies filed — M.D. Fla. No. 6:24-cv-01903',
   'First U.S. AI wrongful death lawsuit; establishes legal template for chatbot harm claims', false),

  ('Dec 2024',  'A.F. v. Character Technologies filed — E.D. Tex.',
   'Second AI chatbot harm case; expands to autistic minor and self-harm instruction', false),

  ('May 2025',  'Judge Conway rules chatbot output NOT protected by First Amendment; denies MTD in Garcia',
   'Key liability precedent — overcomes tech industry''s main immunity defense; allows claims against Google', false),

  ('Jul 2025',  'Zane Shamblin, 23, TX, dies by suicide after 4-hour ChatGPT session',
   'Establishes adult victim pattern in OpenAI litigation', false),

  ('Aug 2025',  'Texas AG Paxton issues Civil Investigative Demands to Character.AI and Meta AI Studio',
   'State enforcement action; potential DTPA liability signal', false),

  ('Aug 2025',  'Raine v. OpenAI filed — San Francisco Superior Court',
   'First wrongful death suit against OpenAI; Edelson PC lead counsel; high-profile media coverage', false),

  ('Sep 2025',  'FTC issues 6(b) orders to Alphabet, Character.AI, Meta, OpenAI, Snap, and xAI',
   'Federal regulatory pressure; document preservation obligations triggered across industry', false),

  ('Sep 2025',  'Senate Judiciary hearing on AI Chatbots and Threats to Child Safety',
   'Congressional attention; Megan Garcia and Matthew Raine testify; bipartisan pressure for legislation', false),

  ('Sep 2025',  'SMVLC files three new Character.AI lawsuits in D. Colo. and N.D.N.Y.',
   'Wave expansion to three new jurisdictions; adds second minor wrongful death case', false),

  ('Oct 2025',  'California Governor Newsom signs SB 243 — first companion chatbot safety law',
   'Creates private right of action for companion chatbot harms; effective January 1, 2026', false),

  ('Nov 2025',  'New York AI Companion Models statute takes effect (Gen. Business Law 1700 et seq.)',
   'Second state law; requires notification user is not communicating with a human; crisis detection protocol', false),

  ('Nov 2025',  'SMVLC/TJLP file seven new OpenAI lawsuits simultaneously in California',
   'Expands OpenAI litigation to eight total cases; includes adult victims (ages 23-48)', false),

  ('Nov 2025',  'Senators Hawley and Blumenthal introduce GUARD Act',
   'Would ban AI companion chatbots for under-18, require age verification, criminal penalties for manipulation', false),

  ('Dec 2025',  'Adams Estate v. OpenAI filed — first AI chatbot homicide case',
   'Expands tort to third-party harm (murder-suicide); Edelson PC lead counsel', false),

  ('Jan 2026',  'Character.AI and Google settle all five pending cases simultaneously',
   'Landmark multi-state AI settlement series — first financial resolution in chatbot harm litigation', false),

  ('Jan 2026',  'Kentucky AG files first state AG lawsuit against Character.AI',
   'First AG lawsuit (vs. investigation/CID); seeks injunctive relief + $2,000 per violation', false),

  ('Jan 2026',  'California SB 243 takes effect — private right of action for chatbot harms',
   'Annual reporting to CA Office of Suicide Prevention begins July 2027', false),

  ('Mar 2026',  'K.G.M. v. Meta social media addiction verdict: $6M ($3M compensatory + $3M punitive)',
   'Closest financial comparable for AI chatbot harm cases; first social media addiction trial verdict', false),

  ('Apr 2026',  'MTMP Spring 2026 features "Deaths Linked to AI Chatbots" session — Levin Papantonio + SMVLC',
   'Mass tort plaintiff bar formally institutionalizing AI chatbot harm as a tort category', false),

  ('TBD 2026',  'Expected GUARD Act committee action; potential federal MDL consolidation petition',
   'Would accelerate case consolidation and standardize filing procedures', true),

  ('Jul 2027',  'California SB 243 annual reporting begins — operators report crisis referral data',
   'Creates public evidence trail for future litigation', true),

  ('2027–2028', 'Projected first bellwether trial window (post-hypothetical MDL consolidation)',
   'Settlement pressure point; benchmark for case valuations', true)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 4. Qualifying-criteria tiers (A/B/C/D) with CPL bands
-- ---------------------------------------------------------------------------
create table if not exists public.ai_suicide_qualifying_criteria_tiers (
  id                   serial primary key,
  tier                 text    not null,     -- 'A' | 'B' | 'C' | 'D'
  label                text    not null,
  criteria             text    not null,
  intake_signal        text    not null,
  estimated_cpl_band   text    not null,
  notes                text
);

insert into public.ai_suicide_qualifying_criteria_tiers (tier, label, criteria, intake_signal, estimated_cpl_band, notes) values
  ('A', 'Wrongful Death / Minor / Chat Logs Intact',
   'Victim under 18 at death; death by suicide (ME determination); documented AI chatbot use (Character.AI, ChatGPT, Replika) within 90 days; chat logs preserved with suicidal ideation expressions AND chatbot failure to provide crisis resources or active encouragement; US-domiciled family willing to be named plaintiff.',
   'Device preservation (phone/tablet with chat app), death certificate (cause = suicide), screenshots or exported chat logs, timing within last 3 years (SOL varies: CA 2 yrs, FL 4 yrs)',
   '$3,000–$8,000 CPL',
   'Highest-value case type. Garcia-type cases are the template; Character.AI has shown willingness to settle. Estimated <50 Tier A cases nationally. Primary fraud risk: fabricated screenshots — require original device forensics.'),

  ('B', 'Wrongful Death / Young Adult / Chat Logs Preserved',
   'Victim age 18-35 at death; death by suicide; documented AI chatbot use within 90 days; chat logs preserved with method inquiry/instruction, romanticizing death, or discouraging family contact; pre-existing mental health vulnerability present (strengthens foreseeability).',
   'Device with chat history, death certificate, family describing escalation from informational to confessional chatbot use, evidence chatbot replaced therapist as primary support',
   '$1,500–$4,000 CPL',
   'Seven Nov. 2025 SMVLC cases include several adult decedents. Weaker for minors-protection statutory claims; relies primarily on negligence/product liability. Approx. 30-100 plausible Tier B cases nationally.'),

  ('C', 'Serious Injury / Self-Harm or Hospitalization / Minor or Adult',
   'Survived suicide attempt OR required inpatient psychiatric hospitalization OR sustained documented self-harm attributable in part to AI chatbot interactions within 90 days; chat logs preserved with method instruction, validating self-harm, or discouraging crisis resources; documented medical treatment essential.',
   'Medical records (ER, psychiatric hospitalization, self-harm wounds), chat logs or device with AI app, client/family describing dependency-isolation-crisis pattern, school records showing behavioral changes (for minors)',
   '$800–$2,500 CPL',
   'Largest addressable pool. SAMHSA: 2.7% of teens attempted suicide in 2024. Risk: causation defense strongest here; need solid chat-log evidence of AI escalating. Replika users represent an underresearched Tier C population.'),

  ('D', 'Dependency/Manipulation / Minor / No Physical Harm',
   'Minor or vulnerable adult developed documented emotional dependency on AI chatbot; documented social isolation, family estrangement, or school decline linked to AI use; chatbot made false claims (posed as human, therapist, romantic partner); no suicide attempt or hospitalization.',
   'School performance records showing decline, therapy notes referencing AI dependency, family reports of social withdrawal, preserved chats showing chatbot posing as human/therapist',
   '$300–$900 CPL',
   'High volume but low individual case value. CA SB 243 creates private right of action for chatbot operator noncompliance — potential class action vehicle. Fraud risk: high — emotional dependency hard to verify without objective corroboration.')
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 5. Settlement projections (speculative — clearly labelled)
-- ---------------------------------------------------------------------------
-- Anchored on K.G.M. v. Meta social media addiction verdict ($6M, March 2026)
-- and the undisclosed Character.AI/Google five-case settlement (January 2026).
-- ---------------------------------------------------------------------------
create table if not exists public.ai_suicide_settlement_projections (
  id                    serial primary key,
  injury_tier           text    not null,
  low_estimate          numeric not null,
  high_estimate         numeric not null,
  comparable_litigation text,
  rationale             text
);

insert into public.ai_suicide_settlement_projections (injury_tier, low_estimate, high_estimate, comparable_litigation, rationale) values
  ('Completed suicide — minor, chat logs preserved (Tier A)',
   3000000, 25000000,
   'K.G.M. v. Meta ($6M non-fatal verdict, March 2026); Character.AI/Google five-case settlement (undisclosed, Jan. 2026)',
   'Social media non-fatal verdict was $6M; wrongful death adds multiplier. Minor victim + preserved "smoking gun" logs dramatically increase value. Character.AI/Google settling 5 cases suggests per-case value in $2M-$15M range.'),

  ('Completed suicide — adult (Tier B)',
   1000000, 12000000,
   'K.G.M. v. Meta ($6M); analogous wrongful death product liability settlements',
   'Adult wrongful death has lower presumptive economic damages than minor; punitive potential is high given knowledge of risk. OpenAI allegedly eliminated suicide refusal rule to maximize engagement.'),

  ('Non-fatal severe self-harm / hospitalization (Tier C)',
   250000, 4000000,
   'K.G.M. v. Meta ($6M non-fatal); social media addiction self-harm comparable',
   'Social media non-fatal comparable was $6M for single plaintiff. Self-harm with hospitalization at lower severity, but stronger causation evidence when AI chat logs preserved.'),

  ('Dependency / manipulation, no physical harm (Tier D)',
   25000, 400000,
   'Social media addiction Tier D dependency claims; CA SB 243 statutory damages',
   'Class action more likely than individual settlement. Low individual value but high volume. CA SB 243 private right of action may create statutory damages floor.')
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 6. Volume signals by state (composite: youth suicide rate x AI adoption)
-- ---------------------------------------------------------------------------
-- Derived composite signal combining CDC youth suicide rates (age 10-24),
-- teen AI chatbot adoption proxies, and state-level litigation/regulatory
-- activity from the research document (Section 7).
-- NOTE: This is a directional composite for marketing intelligence, not
-- a clinical or epidemiological dataset.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_suicide_volume_signals_by_state (
  id                           serial primary key,
  state                        text    not null,
  youth_suicide_rate_per_100k  numeric,        -- CDC WISQARS 2022-2023 (age 10-24)
  ai_chatbot_adoption_index    text,           -- 'High' / 'Medium' / 'Low' derived signal
  composite_signal_rank        integer not null,
  unique (state)
);

insert into public.ai_suicide_volume_signals_by_state (state, youth_suicide_rate_per_100k, ai_chatbot_adoption_index, composite_signal_rank) values
  ('California',    8.2,  'High',   1),
  ('Texas',         10.5, 'High',   2),
  ('Florida',       9.8,  'High',   3),
  ('Colorado',      14.1, 'High',   4),
  ('New York',      5.9,  'High',   5),
  ('Kentucky',      12.3, 'Medium', 6),
  ('Georgia',       9.4,  'Medium', 7),
  ('Oregon',        12.7, 'Medium', 8),
  ('Illinois',      7.6,  'High',   9),
  ('Pennsylvania',  8.9,  'Medium', 10),
  ('Ohio',          10.2, 'Medium', 11),
  ('North Carolina',9.7,  'Medium', 12),
  ('Washington',    10.8, 'High',   13),
  ('Arizona',       13.5, 'Medium', 14),
  ('Michigan',      9.1,  'Medium', 15),
  ('Virginia',      8.4,  'Medium', 16),
  ('New Jersey',    5.7,  'High',   17),
  ('Massachusetts', 6.1,  'High',   18),
  ('Connecticut',   7.2,  'Medium', 19),
  ('Wisconsin',     11.4, 'Medium', 20)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 7. Meta Ad Library observations
-- ---------------------------------------------------------------------------
-- No active Meta Ad Library ads specifically targeting AI suicide / chatbot
-- harm litigation were verified during the April 2026 research period.
-- Firms are advertising via organic landing pages (Levin Papantonio, Levy
-- Konigsberg, TorHoerman Law, TruLaw, Nadrich & Cohen) but no paid social
-- ads were confirmed in the Meta Ad Library at research time.
-- When active ads are observed in future scraper runs, they will be inserted
-- into ad_observations_raw following the Olympus pattern.


-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_ai_suicide_adverse_events_severity on public.ai_suicide_adverse_events (severity);
create index if not exists idx_ai_suicide_adverse_events_category on public.ai_suicide_adverse_events (category);
create index if not exists idx_ai_suicide_timeline_is_future on public.ai_suicide_timeline (is_future);
create index if not exists idx_ai_suicide_tiers_tier on public.ai_suicide_qualifying_criteria_tiers (tier);
create index if not exists idx_ai_suicide_volume_rank on public.ai_suicide_volume_signals_by_state (composite_signal_rank);


-- ---------------------------------------------------------------------------
-- 9. Row-Level Security (read-only, in line with other tort tables)
-- ---------------------------------------------------------------------------
alter table public.ai_suicide_adverse_events              enable row level security;
alter table public.ai_suicide_timeline                    enable row level security;
alter table public.ai_suicide_qualifying_criteria_tiers   enable row level security;
alter table public.ai_suicide_settlement_projections      enable row level security;
alter table public.ai_suicide_volume_signals_by_state     enable row level security;

do $$
begin
  create policy "ai_suicide_adverse_events_read"         on public.ai_suicide_adverse_events            for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "ai_suicide_timeline_read"               on public.ai_suicide_timeline                  for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "ai_suicide_tiers_read"                  on public.ai_suicide_qualifying_criteria_tiers for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "ai_suicide_settlements_read"            on public.ai_suicide_settlement_projections    for select using (true);
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "ai_suicide_volume_signals_read"         on public.ai_suicide_volume_signals_by_state   for select using (true);
exception when duplicate_object then null; end $$;


commit;
