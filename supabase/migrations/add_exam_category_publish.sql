-- Migration: Add published status to exam_categories table
-- Created: 2026-05-02

-- Add is_published column to control visibility to users
ALTER TABLE exam_categories 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Update existing categories to be published by default (backward compatibility)
UPDATE exam_categories 
SET is_published = true 
WHERE is_published IS NULL;

-- Add comment
COMMENT ON COLUMN exam_categories.is_published IS 'Whether the exam category is visible and accessible to users (admin control)';

-- Update RLS policies to only show published categories to non-admin users
-- First, drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view exam categories" ON exam_categories;

-- Create new policy: Users can only view published categories
CREATE POLICY "Users can view published exam categories"
  ON exam_categories FOR SELECT
  TO authenticated
  USING (
    is_published = true 
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'Navo@admin.jn'
        OR auth.users.raw_user_meta_data->>'role' = 'Admin'
      )
    )
  );

-- Keep admin policy for all operations
DROP POLICY IF EXISTS "Admins can manage exam categories" ON exam_categories;

CREATE POLICY "Admins can manage exam categories"
  ON exam_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'Navo@admin.jn'
        OR auth.users.raw_user_meta_data->>'role' = 'Admin'
      )
    )
  );
