-- Seed of specialty mass-tort / PI plaintiff firms used by the Recall
-- Watchlist Five-Stage Thermometer. When a recall_cases row has a
-- plaintiff_firm_name matching any of these (case-insensitive, substring),
-- is_specialty_firm is flipped on — which feeds the "specialty_firm_count"
-- signal on the parent recall.
--
-- This is a living list: add rows as you encounter new firms in dockets.
-- Source of initial list: ATRA Judicial Hellholes report (2024), Law360
-- "Mass Tort 100", and MDL lead-counsel appointments 2022-2026.

create table if not exists public.recall_specialty_firms (
  id uuid primary key default gen_random_uuid(),
  firm_name text not null,                -- canonical name for matching
  slug text unique,
  aliases text[] default '{}',            -- alt spellings / legal names
  primary_state text,                     -- HQ state
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists recall_specialty_firms_name_idx
  on public.recall_specialty_firms using gin (to_tsvector('simple', firm_name));

-- Seed list. Keep short; easier to extend than to prune.
insert into public.recall_specialty_firms (firm_name, slug, aliases, primary_state, notes) values
  ('Beasley Allen',                'beasley-allen',       array['Beasley, Allen, Crow, Methvin, Portis & Miles'],  'AL', 'Major mass-tort leader; talc, Roundup, Zantac'),
  ('Morgan & Morgan',              'morgan-morgan',       array['Morgan and Morgan','Morgan + Morgan'],           'FL', 'Largest plaintiff firm in US; broad tort portfolio'),
  ('Weitz & Luxenberg',            'weitz-luxenberg',     array['Weitz and Luxenberg'],                            'NY', 'Asbestos, 3M, talc, hair relaxer'),
  ('Simmons Hanly Conroy',         'simmons-hanly-conroy',array['Simmons Hanly','Simmons Firm'],                   'IL', 'Opioid, asbestos, social media'),
  ('Baron & Budd',                 'baron-budd',          array['Baron and Budd'],                                  'TX', 'Opioid, PFAS, Paraquat'),
  ('Kessler Topaz Meltzer & Check','kessler-topaz',       array['Kessler Topaz','Kessler, Topaz, Meltzer'],         'PA', 'Securities + mass tort hybrid'),
  ('Lieff Cabraser',               'lieff-cabraser',      array['Lieff Cabraser Heimann & Bernstein'],             'CA', 'Roundup, JUUL, social media MDL'),
  ('Robins Kaplan',                'robins-kaplan',       array['Robins, Kaplan'],                                  'MN', 'Mass tort trial counsel'),
  ('Seeger Weiss',                 'seeger-weiss',        array['Seeger, Weiss'],                                   'NJ', 'NFL concussion, 3M, VW'),
  ('Motley Rice',                  'motley-rice',         array['Motley Rice LLC'],                                 'SC', 'Opioid, asbestos, Roundup'),
  ('Nigh Goldenberg Raso & Vaughn','nigh-goldenberg',     array['Nigh Goldenberg','Nigh, Goldenberg'],              'DC', 'Mass tort plaintiff specialist'),
  ('Fears Nachawati',              'fears-nachawati',     array['Fears | Nachawati'],                               'TX', 'Paraquat, hair relaxer, AFFF'),
  ('Clark Love & Hutson',          'clark-love-hutson',   array['Clark, Love & Hutson'],                            'TX', 'MDL lead counsel frequently'),
  ('Wagstaff Law Firm',            'wagstaff-law',        array['Wagstaff & Cartmell','Wagstaff Cartmell'],         'CO', 'Roundup, Paraquat, Zantac'),
  ('Levin Papantonio',             'levin-papantonio',    array['Levin, Papantonio','Levin Papantonio Rafferty'],   'FL', 'Opioid, 3M, Talc'),
  ('Aylstock Witkin',              'aylstock-witkin',     array['Aylstock, Witkin, Kreis & Overholtz','AWKO Law'],  'FL', '3M earplugs, hernia mesh'),
  ('Burnett Law Firm',             'burnett-law',         array['Burnett Law'],                                     'TX', 'Olympus scopes co-lead (MTMP 2026)'),
  ('Hurwitz Law PLLC',             'hurwitz-law',         array['Hurwitz Law'],                                     'NY', 'Olympus scopes co-lead (MTMP 2026)'),
  ('Watts Guerra',                 'watts-guerra',        array['Watts Guerra LLP'],                                'TX', 'Mass tort + agriculture torts'),
  ('Johnson Becker',               'johnson-becker',      array['Johnson Becker PLLC'],                             'MN', 'Recall-heavy intake firm'),
  ('Napoli Shkolnik',              'napoli-shkolnik',     array['Napoli Shkolnik PLLC'],                            'NY', 'Opioid, talc, water contamination'),
  ('Levin Sedran & Berman',        'levin-sedran-berman', array['Levin, Sedran & Berman'],                          'PA', 'Class action + MDL lead counsel'),
  ('Kirkendall Dwyer',             'kirkendall-dwyer',    array['Kirkendall Dwyer LLP'],                            'TX', 'Pharma + device tort intake'),
  ('Onder Law',                    'onder-law',           array['Onder, Shelton, OLeary & Peterson','OnderLaw'],    'MO', 'Talc, hair relaxer, Zantac'),
  ('Tracey & Fox',                 'tracey-fox',          array['Tracey Fox King & Walters','Tracey & Fox Law'],    'TX', 'Mass tort + PI trial firm')
on conflict (slug) do nothing;
