-- Fix canonical_url to use the flat /advertising/{slug} pattern.
-- All tort advertising pages now live at /advertising/{slug} (no /torts/ segment).
-- mdl-tracker entries keep their /mdl-tracker/ pattern.

BEGIN;

-- Torts that previously used /advertising/torts/{slug} where slug matches
UPDATE mass_torts SET canonical_url = '/advertising/depo-provera'          WHERE slug = 'depo-provera';
UPDATE mass_torts SET canonical_url = '/advertising/roundup'               WHERE slug = 'roundup';
UPDATE mass_torts SET canonical_url = '/advertising/hair-relaxer'          WHERE slug = 'hair-relaxer';
UPDATE mass_torts SET canonical_url = '/advertising/talcum-powder'         WHERE slug = 'talcum-powder';
UPDATE mass_torts SET canonical_url = '/advertising/paraquat'              WHERE slug = 'paraquat';
UPDATE mass_torts SET canonical_url = '/advertising/afff-firefighting-foam' WHERE slug = 'afff-firefighting-foam';
UPDATE mass_torts SET canonical_url = '/advertising/bard-powerport'        WHERE slug = 'bard-powerport';

-- Torts where page route slug differs from DB slug
UPDATE mass_torts SET canonical_url = '/advertising/olympus-scopes'        WHERE slug = 'olympus-duodenoscope';
UPDATE mass_torts SET canonical_url = '/advertising/ai-suicide'            WHERE slug = 'ai-suicide-self-harm';

-- Torts with no rich page — still use flat pattern (served by dynamic [slug] route)
UPDATE mass_torts SET canonical_url = '/advertising/camp-lejeune'          WHERE slug = 'camp-lejeune';
UPDATE mass_torts SET canonical_url = '/advertising/hernia-mesh'           WHERE slug = 'hernia-mesh';
UPDATE mass_torts SET canonical_url = '/advertising/zantac'                WHERE slug = 'zantac';
UPDATE mass_torts SET canonical_url = '/advertising/cpap'                  WHERE slug = 'cpap';
UPDATE mass_torts SET canonical_url = '/advertising/3m-earplugs'           WHERE slug = '3m-earplugs';
UPDATE mass_torts SET canonical_url = '/advertising/tylenol-acetaminophen' WHERE slug = 'tylenol-acetaminophen';
UPDATE mass_torts SET canonical_url = '/advertising/nec-baby-formula'      WHERE slug = 'nec-baby-formula';

-- These already have the correct flat pattern (no change needed, but included for completeness)
UPDATE mass_torts SET canonical_url = '/advertising/social-media-addiction' WHERE slug = 'social-media-addiction';
UPDATE mass_torts SET canonical_url = '/advertising/roblox-abuse'           WHERE slug = 'roblox-abuse';
UPDATE mass_torts SET canonical_url = '/advertising/glp1-gastroparesis'     WHERE slug = 'glp1-gastroparesis';
UPDATE mass_torts SET canonical_url = '/advertising/glp1-vision-loss'      WHERE slug = 'glp1-vision-loss';

-- mdl-tracker entries keep their pattern (no change)
-- uber-sexual-assault → /mdl-tracker/uber-sexual-assault
-- lyft-sexual-assault → /mdl-tracker/lyft-sexual-assault

COMMIT;
