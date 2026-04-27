-- Curated tort image library
-- Images are uploaded per-tort to Supabase Storage; this table tracks metadata.
-- Campaign Builder checks here first, falls back to AI generation when empty.

-- ── Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tort_images (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tort_slug     text          NOT NULL
                              REFERENCES public.mass_torts (slug),
  storage_path  text          NOT NULL,       -- e.g. roundup/roundup_01.jpg
  public_url    text          NOT NULL,       -- cached Supabase Storage public URL
  display_order int           DEFAULT 0,
  tags          text[]        DEFAULT '{}',   -- e.g. {'salon','portrait','mature'}
  demographic_notes text,                     -- free-text: who is depicted
  source_url    text,                         -- where Lance sourced the image
  license_note  text,                         -- e.g. "Pexels free commercial"
  is_active     boolean       DEFAULT true,
  created_at    timestamptz   DEFAULT now(),
  updated_at    timestamptz   DEFAULT now()
);

COMMENT ON TABLE public.tort_images IS 'Curated image library for tort advertising creative';

-- ── Index for the primary lookup path ────────────────────────────────────

CREATE INDEX idx_tort_images_lookup
  ON public.tort_images (tort_slug, is_active, display_order);

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.tort_images ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (Campaign Builder, admin pages, etc.)
CREATE POLICY "Authenticated users can read tort images"
  ON public.tort_images FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can insert/update/delete (admin uploads go through API routes
-- that use the service-role client, not the user's JWT).

-- ── Storage bucket ───────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tort-images',
  'tort-images',
  true,
  5242880,  -- 5 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (images are embedded in ads / landing pages)
CREATE POLICY "Public read access for tort images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tort-images');

-- Service-role handles uploads, but allow authenticated admin uploads too
CREATE POLICY "Authenticated users can upload tort images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tort-images');

CREATE POLICY "Authenticated users can update tort images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tort-images')
  WITH CHECK (bucket_id = 'tort-images');

CREATE POLICY "Authenticated users can delete tort images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tort-images');

-- ── Updated-at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_tort_images_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tort_images_updated_at
  BEFORE UPDATE ON public.tort_images
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tort_images_updated_at();
