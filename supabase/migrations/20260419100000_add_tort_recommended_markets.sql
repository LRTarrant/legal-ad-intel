-- Create tort_recommended_markets table for curated market recommendations
CREATE TABLE IF NOT EXISTS public.tort_recommended_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tort_name text NOT NULL,
  state text NOT NULL,
  rank integer NOT NULL,
  score integer DEFAULT 80,
  primary_signal text NOT NULL,
  signals text[] DEFAULT '{}',
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tort_name, state)
);

CREATE INDEX idx_tort_rec_markets_tort ON public.tort_recommended_markets (tort_name);

-- Seed: Hair Relaxer (heavily Southern, Black women demographic)
INSERT INTO public.tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale) VALUES
  ('Hair Relaxer', 'GA', 1, 95, 'Demographic Match', ARRAY['Demographic Match', 'Large Population'], 'Large Black women population, Atlanta hub'),
  ('Hair Relaxer', 'TX', 2, 92, 'Large Population', ARRAY['Large Population', 'Demographic Match'], 'Large population with strong demographic match'),
  ('Hair Relaxer', 'FL', 3, 90, 'Large Population', ARRAY['Large Population', 'Demographic Match'], 'Large population with strong demographic match'),
  ('Hair Relaxer', 'AL', 4, 87, 'Demographic Match', ARRAY['Demographic Match'], 'High per-capita Black women population'),
  ('Hair Relaxer', 'MS', 5, 85, 'Demographic Match', ARRAY['Demographic Match'], 'High per-capita Black women population'),
  ('Hair Relaxer', 'LA', 6, 83, 'Demographic Match', ARRAY['Demographic Match'], 'Strong demographic match'),
  ('Hair Relaxer', 'NC', 7, 81, 'Demographic Match', ARRAY['Demographic Match', 'Large Population'], 'Demographic match with large population'),
  ('Hair Relaxer', 'SC', 8, 79, 'Demographic Match', ARRAY['Demographic Match'], 'Strong demographic match'),
  ('Hair Relaxer', 'IL', 9, 77, 'Large Population', ARRAY['Large Population'], 'Large population center in Chicago'),
  ('Hair Relaxer', 'MD', 10, 75, 'Demographic Match', ARRAY['Demographic Match'], 'Baltimore/DC corridor demographic match');

-- Seed: Roundup (occupational/residential exposure, older demographic)
INSERT INTO public.tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale) VALUES
  ('Roundup', 'CA', 1, 95, 'High Incidence', ARRAY['High Incidence', 'Large Population'], 'Agriculture and landscaping exposure, large population'),
  ('Roundup', 'FL', 2, 92, 'Large Population', ARRAY['Large Population'], 'Large population with older demographic'),
  ('Roundup', 'TX', 3, 90, 'Large Population', ARRAY['Large Population'], 'Large population with agriculture exposure'),
  ('Roundup', 'IL', 4, 87, 'High Incidence', ARRAY['High Incidence'], 'Agriculture belt exposure'),
  ('Roundup', 'OH', 5, 85, 'Large Population', ARRAY['Large Population'], 'Large population with occupational exposure'),
  ('Roundup', 'PA', 6, 83, 'Large Population', ARRAY['Large Population'], 'Large population base'),
  ('Roundup', 'MO', 7, 81, 'High Incidence', ARRAY['High Incidence'], 'Agriculture exposure, plaintiff-friendly jurisdiction'),
  ('Roundup', 'IA', 8, 79, 'High Incidence', ARRAY['High Incidence'], 'Agriculture belt, high per-capita exposure'),
  ('Roundup', 'IN', 9, 77, 'High Incidence', ARRAY['High Incidence'], 'Agriculture belt exposure'),
  ('Roundup', 'WI', 10, 75, 'High Incidence', ARRAY['High Incidence'], 'Agriculture and dairy farming exposure');

-- Seed: Depo-Provera (women's health, broad geographic)
INSERT INTO public.tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale) VALUES
  ('Depo-Provera', 'CA', 1, 95, 'Large Population', ARRAY['Large Population'], 'Largest state population'),
  ('Depo-Provera', 'TX', 2, 92, 'Large Population', ARRAY['Large Population'], 'Second largest state population'),
  ('Depo-Provera', 'FL', 3, 90, 'Large Population', ARRAY['Large Population'], 'Third largest state population'),
  ('Depo-Provera', 'NY', 4, 87, 'Large Population', ARRAY['Large Population'], 'Fourth largest state population'),
  ('Depo-Provera', 'PA', 5, 85, 'Large Population', ARRAY['Large Population'], 'Large population base'),
  ('Depo-Provera', 'IL', 6, 83, 'Large Population', ARRAY['Large Population'], 'Large population base'),
  ('Depo-Provera', 'OH', 7, 81, 'Large Population', ARRAY['Large Population'], 'Large population base'),
  ('Depo-Provera', 'GA', 8, 79, 'Demographic Match', ARRAY['Demographic Match', 'Large Population'], 'Demographic match with growing population'),
  ('Depo-Provera', 'NC', 9, 77, 'Large Population', ARRAY['Large Population'], 'Large population base'),
  ('Depo-Provera', 'MI', 10, 75, 'Large Population', ARRAY['Large Population'], 'Large population base');

-- Seed: Bard PowerPort (older cancer patients)
INSERT INTO public.tort_recommended_markets (tort_name, state, rank, score, primary_signal, signals, rationale) VALUES
  ('Bard PowerPort', 'FL', 1, 95, 'High Incidence', ARRAY['High Incidence', 'Large Population'], 'Large older population, major cancer treatment centers'),
  ('Bard PowerPort', 'CA', 2, 92, 'Large Population', ARRAY['Large Population'], 'Large population with major cancer centers'),
  ('Bard PowerPort', 'TX', 3, 90, 'Large Population', ARRAY['Large Population'], 'Large population with major medical hubs'),
  ('Bard PowerPort', 'PA', 4, 87, 'Large Population', ARRAY['Large Population'], 'Large population with older demographic'),
  ('Bard PowerPort', 'NY', 5, 85, 'Large Population', ARRAY['Large Population'], 'Large population with major medical hubs'),
  ('Bard PowerPort', 'OH', 6, 83, 'Large Population', ARRAY['Large Population'], 'Large population with older demographic'),
  ('Bard PowerPort', 'NC', 7, 81, 'Demographic Match', ARRAY['Demographic Match'], 'Growing retiree population'),
  ('Bard PowerPort', 'AZ', 8, 79, 'Demographic Match', ARRAY['Demographic Match'], 'Large retiree population'),
  ('Bard PowerPort', 'MI', 9, 77, 'Demographic Match', ARRAY['Demographic Match'], 'Older demographic population'),
  ('Bard PowerPort', 'IL', 10, 75, 'Large Population', ARRAY['Large Population'], 'Large population base');
