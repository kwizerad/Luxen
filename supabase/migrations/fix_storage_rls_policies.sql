-- Migration: Fix storage RLS policies
-- Purpose: Allow authenticated users to upload images without owner validation at INSERT time
-- Supabase automatically sets the owner field, so we only need to check owner on UPDATE/DELETE

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public view" ON storage.objects;

-- New INSERT policy: Allow authenticated users to upload (owner will be auto-set)
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- UPDATE policy: Allow authenticated users to update their own images
CREATE POLICY "Allow authenticated updates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'images' AND owner = auth.uid());

-- DELETE policy: Allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND owner = auth.uid());

-- SELECT policy: Allow public access to view images
CREATE POLICY "Allow public view"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');
