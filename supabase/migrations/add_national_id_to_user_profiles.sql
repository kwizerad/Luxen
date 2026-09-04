-- Migration: Add national_id column to user_profiles
-- Created: 2026-08-02

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS national_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_national_id ON user_profiles(national_id);

-- Drop existing policies if they exist (for idempotent runs)
DROP POLICY IF EXISTS "Users can update own national_id" ON user_profiles;

-- Policy: Users can update their own national_id
CREATE POLICY "Users can update own national_id"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
