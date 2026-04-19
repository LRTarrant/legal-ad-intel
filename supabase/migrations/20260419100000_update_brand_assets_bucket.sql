-- Expand brand-assets bucket to support PDFs and 5MB file size limit
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf']
WHERE id = 'brand-assets';
