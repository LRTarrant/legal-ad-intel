-- Storage bucket for brand assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their tenant's folder
CREATE POLICY "Authenticated users can upload brand assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-assets');

-- Public read access (logos need to be embedded in landing pages)
CREATE POLICY "Public read access for brand assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'brand-assets');

-- Users can update their own uploads
CREATE POLICY "Authenticated users can update brand assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brand-assets')
  WITH CHECK (bucket_id = 'brand-assets');

-- Users can delete their own uploads
CREATE POLICY "Authenticated users can delete brand assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brand-assets');
