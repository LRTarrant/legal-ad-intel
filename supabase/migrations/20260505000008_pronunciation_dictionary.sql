-- Pronunciation overrides — Phase B
--
-- Two storage layers, applied at TTS time:
--
--   1. firms.pronunciation_overrides     (JSONB, per-firm)
--      Edited by firm managers. Use case: firm name, partner names,
--      local market names ("Birmingham" → "BURR-ming-ham").
--
--   2. pronunciation_dictionary          (table, global)
--      Edited by super_admins. Use case: tort and product names that
--      every firm needs (Depo-Provera, Paraquat, Talc, etc.).
--
-- At voiceover time, firm overrides are applied first (more specific),
-- then the global dictionary fills in anything not yet covered.
-- See lib/voice/pronunciation.ts for the matching algorithm.

------------------------------------------------------------------------
-- 1. Per-firm overrides on firms.pronunciation_overrides
------------------------------------------------------------------------

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS pronunciation_overrides JSONB
    NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.firms.pronunciation_overrides IS
  'Array of {written, spoken} objects for TTS pronunciation overrides. '
  'Spoken can be either a plain respelling ("BURR-ming-ham") or IPA '
  '("ˈbɝː.mɪŋ.hæm"). Auto-detected at apply time. Capped at 50 rows by '
  'app-level validation.';

------------------------------------------------------------------------
-- 2. Global pronunciation dictionary
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pronunciation_dictionary (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  written     TEXT NOT NULL,
  spoken      TEXT NOT NULL,
  -- Free-form notes for super_admins curating the list (e.g. "common
  -- TTS error: pronounced 'deepo' instead of 'dep-o'").
  notes       TEXT,
  -- Soft tag so we can filter the dictionary in admin UI later. Keeping
  -- it free-text for now; populate consistently in seed data.
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Case-insensitive uniqueness on `written` so we don't double-load
  -- the same term with different capitalization. (Index, not constraint,
  -- because Postgres can't make a unique constraint over an expression
  -- in pre-15 migrations safely without USING — index is just as good
  -- since the planner will use it for the conflict target.)
  CONSTRAINT pronunciation_dictionary_written_chk
    CHECK (length(written) > 0 AND length(written) <= 60),
  CONSTRAINT pronunciation_dictionary_spoken_chk
    CHECK (length(spoken) > 0 AND length(spoken) <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS
  pronunciation_dictionary_written_lower_idx
  ON public.pronunciation_dictionary (lower(written));

-- updated_at maintenance via the existing helper trigger function. If
-- public.set_updated_at() doesn't exist yet (older deployments), define
-- it here — it's a one-line function and idempotent via OR REPLACE.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pronunciation_dictionary_set_updated_at
  ON public.pronunciation_dictionary;
CREATE TRIGGER pronunciation_dictionary_set_updated_at
  BEFORE UPDATE ON public.pronunciation_dictionary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

------------------------------------------------------------------------
-- 3. RLS — readable by every authenticated user, mutable only by
--    super_admins.
--
-- Reads happen during TTS for any logged-in user generating a voiceover
-- (PI or mass tort), so we grant SELECT to authenticated. Writes are
-- gated to profiles.role = 'super_admin' since this is global state.
------------------------------------------------------------------------

ALTER TABLE public.pronunciation_dictionary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pronunciation_dictionary_select_all
  ON public.pronunciation_dictionary;
CREATE POLICY pronunciation_dictionary_select_all
  ON public.pronunciation_dictionary
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS pronunciation_dictionary_super_admin_write
  ON public.pronunciation_dictionary;
CREATE POLICY pronunciation_dictionary_super_admin_write
  ON public.pronunciation_dictionary
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

------------------------------------------------------------------------
-- 4. Seed common mass-tort + PI terms.
--
-- These are the words you tend to hear mangled most often in plaintiff-
-- firm voiceovers. ON CONFLICT lets this migration re-run safely; it
-- also means a super_admin who manually edits a row WON'T get
-- overwritten on a future re-run as long as we keep the seed list keyed
-- on `written` only.
------------------------------------------------------------------------

INSERT INTO public.pronunciation_dictionary (written, spoken, category, notes) VALUES
  -- Mass tort drug + product names (most common TTS errors)
  ('Depo-Provera',  'DEP-oh proh-VEH-rah', 'mass_tort', 'Common error: ElevenLabs reads as "deepo" instead of "dep-o"'),
  ('Depo Provera',  'DEP-oh proh-VEH-rah', 'mass_tort', 'No-hyphen variant'),
  ('Paraquat',      'PAIR-uh-kwat',        'mass_tort', 'Common error: stress on wrong syllable'),
  ('Roundup',       'ROUND-up',            'mass_tort', NULL),
  ('Tylenol',       'TY-leh-nol',          'mass_tort', NULL),
  ('Talc',          'TALK',                'mass_tort', 'Common error: pronounced "talse"'),
  ('Talcum',        'TAL-kum',             'mass_tort', NULL),
  ('Hair Relaxer',  'hair ree-LAX-er',     'mass_tort', NULL),
  ('Tepezza',       'teh-PEZ-uh',          'mass_tort', NULL),
  ('Ozempic',       'oh-ZEM-pik',          'mass_tort', NULL),
  ('Mounjaro',      'mownt-JAR-oh',        'mass_tort', NULL),

  -- Acronyms that should be spelled out
  ('AFFF',          'A F F F',             'acronym',  'Spell as letters, not "aff" or "afef"'),
  ('PFAS',          'PEE-fass',            'acronym',  'Common pronunciation in mass tort comms'),
  ('MDL',           'M D L',               'acronym',  'Spell as letters, not "middle"'),
  ('TCPA',          'T C P A',             'acronym',  NULL),
  ('NHTSA',         'NIT-suh',             'acronym',  'Industry-standard pronunciation'),
  ('CTV',           'C T V',               'acronym',  NULL),
  ('LSA',           'L S A',               'acronym',  NULL),
  ('DMA',           'D M A',               'acronym',  NULL),

  -- PI / litigation general terms (less common but still mispronounced)
  ('voir dire',     'vwar DEER',           'litigation','French legal term'),
  ('plaintiff',     'PLAYN-tiff',          'litigation', NULL),
  ('subpoena',      'suh-PEE-nuh',         'litigation', NULL)
ON CONFLICT ((lower(written))) DO UPDATE
  SET spoken   = EXCLUDED.spoken,
      category = EXCLUDED.category,
      notes    = EXCLUDED.notes,
      -- Don't bump updated_at if nothing changed.
      updated_at = CASE
        WHEN public.pronunciation_dictionary.spoken = EXCLUDED.spoken
          AND public.pronunciation_dictionary.category IS NOT DISTINCT FROM EXCLUDED.category
        THEN public.pronunciation_dictionary.updated_at
        ELSE now()
      END;
