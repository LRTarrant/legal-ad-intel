-- PR F: persistent firm logos for watermark + landing page reuse.
-- Adds logo_url (public URL served from brand-assets bucket) and
-- logo_path (storage path used for cleanup/replacement) to firms.
--
-- The brand-assets bucket already exists (see 20260419000001) — this
-- migration only adds the columns that persist a firm's chosen logo
-- across sessions so the campaign builder no longer needs to re-upload
-- on every render.

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

COMMENT ON COLUMN public.firms.logo_url IS
  'Public URL of the firm''s brand logo (served from brand-assets bucket). Used as default watermark on rendered videos and as logo on generated landing pages.';

COMMENT ON COLUMN public.firms.logo_path IS
  'Storage path inside the brand-assets bucket. Used to delete/replace the previous logo when a new one is uploaded.';
