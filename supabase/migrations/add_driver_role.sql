-- Migration: Add Driver role and provision columns to user_profiles
-- Created: 2026-08-08

-- Update role CHECK constraint to include 'Driver'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK ("role" IN ('Student', 'Admin', 'Driver'));

-- Add provision-related columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS provision_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS provision_category TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS provision_verified_at TIMESTAMPTZ;

-- Add warned flag for report system
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS warned BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS warned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_provision_verified ON user_profiles(provision_verified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_driver ON user_profiles("role") WHERE "role" = 'Driver';
