-- Migration: Create storage bucket for images
-- Created: 2026-05-07

-- Create the images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Policy: Allow authenticated users to update their own images
CREATE POLICY "Allow authenticated updates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND owner = auth.uid());

-- Policy: Allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND owner = auth.uid());

-- Policy: Allow public access to view images
CREATE POLICY "Allow public view"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');

COMMENT ON TABLE storage.objects IS 'Storage objects including exam images and profile pictures';
