-- Migration: Create user_profiles table for querying user data without service role
-- Created: 2026-05-06

-- Table to store user profile information
-- This mirrors auth.users metadata for client-side querying
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'Student' CHECK (role IN ('Student', 'Admin', 'Teacher', 'Driver', 'Landlord')),
    username TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    nationality TEXT,
    birthdate DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent runs)
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;

-- Policy: Users can view all profiles (needed for admin dashboard)
-- In production, you might want to restrict this
CREATE POLICY "Users can view profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy: Only admins can insert/delete profiles
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- Function to sync user metadata to profile on user creation
CREATE OR REPLACE FUNCTION sync_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    role,
    username,
    full_name,
    first_name,
    last_name,
    avatar_url,
    gender,
    nationality,
    birthdate
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'nationality',
    (NEW.raw_user_meta_data->>'birthdate')::DATE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url,
    gender = EXCLUDED.gender,
    nationality = EXCLUDED.nationality,
    birthdate = EXCLUDED.birthdate,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth.users to user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_profile();

COMMENT ON TABLE user_profiles IS 'Public user profiles synced from auth.users for client-side querying';
COMMENT ON FUNCTION sync_user_to_profile() IS 'Automatically syncs auth.users metadata to user_profiles table';

-- Backfill existing users (if any)
INSERT INTO user_profiles (
  id, 
  email, 
  role,
  username,
  full_name,
  first_name,
  last_name,
  avatar_url,
  gender,
  nationality,
  birthdate
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'Student'),
  raw_user_meta_data->>'username',
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'first_name',
  raw_user_meta_data->>'last_name',
  raw_user_meta_data->>'avatar_url',
  raw_user_meta_data->>'gender',
  raw_user_meta_data->>'nationality',
  (raw_user_meta_data->>'birthdate')::DATE
FROM auth.users
ON CONFLICT (id) DO NOTHING;
