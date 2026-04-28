-- Add canonical_url and visible columns to mass_torts.
-- Backfill canonical_url for all existing rows, add 3 new entries,
-- and hide 2 alias entries (ozempic-mounjaro, social-media-youth-harm).
--
-- All operations are idempotent (IF NOT EXISTS, ON CONFLICT).

BEGIN;

-- ============================================================================
-- Part A: Add columns
-- ============================================================================

ALTER TABLE public.mass_torts
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================================
-- Part B: Backfill canonical_url for existing 20 entries
-- ============================================================================

-- Pattern 1: Rich pages at /advertising/torts/{slug}
UPDATE mass_torts SET canonical_url = '/advertising/torts/depo-provera'         WHERE slug = 'depo-provera'         AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/roundup'              WHERE slug = 'roundup'              AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/hair-relaxer'         WHERE slug = 'hair-relaxer'         AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/talcum-powder'        WHERE slug = 'talcum-powder'        AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/paraquat'             WHERE slug = 'paraquat'             AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/afff-firefighting-foam' WHERE slug = 'afff-firefighting-foam' AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/bard-powerport'       WHERE slug = 'bard-powerport'       AND canonical_url IS NULL;

-- Pattern 1 (slug != URL slug)
UPDATE mass_torts SET canonical_url = '/advertising/torts/olympus-scopes'       WHERE slug = 'olympus-duodenoscope' AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/ai-suicide'           WHERE slug = 'ai-suicide-self-harm' AND canonical_url IS NULL;

-- Pattern 2: Rich pages at /advertising/{slug}
UPDATE mass_torts SET canonical_url = '/advertising/social-media-addiction'     WHERE slug = 'social-media-addiction' AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/roblox-abuse'              WHERE slug = 'roblox-abuse'            AND canonical_url IS NULL;

-- Pattern 3: Rich pages at /mdl-tracker/{slug}
UPDATE mass_torts SET canonical_url = '/mdl-tracker/uber-sexual-assault'       WHERE slug = 'uber-sexual-assault'   AND canonical_url IS NULL;

-- Torts with no rich page yet — canonical stays at the dynamic route
UPDATE mass_torts SET canonical_url = '/advertising/torts/camp-lejeune'         WHERE slug = 'camp-lejeune'         AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/hernia-mesh'          WHERE slug = 'hernia-mesh'          AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/zantac'               WHERE slug = 'zantac'               AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/cpap'                 WHERE slug = 'cpap'                 AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/3m-earplugs'          WHERE slug = '3m-earplugs'          AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/tylenol-acetaminophen' WHERE slug = 'tylenol-acetaminophen' AND canonical_url IS NULL;
UPDATE mass_torts SET canonical_url = '/advertising/torts/nec-baby-formula'     WHERE slug = 'nec-baby-formula'     AND canonical_url IS NULL;

-- ============================================================================
-- Part C: Hide alias entries
-- ============================================================================

UPDATE mass_torts SET visible = FALSE WHERE slug = 'ozempic-mounjaro';
UPDATE mass_torts SET visible = FALSE WHERE slug = 'social-media-youth-harm';

-- ============================================================================
-- Part D: Add 3 new entries
-- ============================================================================

INSERT INTO mass_torts (name, slug, category, status, canonical_url, visible)
VALUES
  ('GLP-1 Gastroparesis',
   'glp1-gastroparesis',
   'pharma',
   'active',
   '/advertising/glp1-gastroparesis',
   TRUE),

  ('GLP-1 Vision Loss (NAION)',
   'glp1-vision-loss',
   'pharma',
   'active',
   '/advertising/glp1-vision-loss',
   TRUE),

  ('Lyft Sexual Assault',
   'lyft-sexual-assault',
   'product_liability',
   'active',
   '/mdl-tracker/lyft-sexual-assault',
   TRUE)
ON CONFLICT (slug) DO UPDATE SET
  canonical_url = EXCLUDED.canonical_url,
  visible = EXCLUDED.visible;

COMMIT;
