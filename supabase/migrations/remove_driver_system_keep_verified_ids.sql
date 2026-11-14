-- Migration: Remove Driver system completely while preserving all verified National IDs and belonging user info
-- Safe & idempotent: executes cleanly even if some tables/columns do or do not exist.

BEGIN;

-- ============================================================================
-- 1. MIGRATE ANY EXISTING 'Driver' USERS TO 'Student' (PRESERVING ACCOUNTS,
--    VERIFIED NATIONAL IDs, PROFILE DETAILS, AND ALL BELONGING RECORDS)
-- ============================================================================

-- Migrate user_profiles.role from Driver -> Student
UPDATE public.user_profiles
SET
  "role" = 'Student',
  updated_at = NOW()
WHERE LOWER(COALESCE("role", '')) = 'driver';

-- Migrate auth.users metadata role from Driver -> Student (keeps verified IDs, metadata, and auth session valid)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"Student"'::jsonb,
  true
)
WHERE LOWER(COALESCE(raw_user_meta_data->>'role', '')) = 'driver';

-- Ensure verification columns exist on user_profiles so verified flags & belongings remain intact
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_verified BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_category TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_verified_at TIMESTAMPTZ;

-- Sync id_verified = true for any profile whose national_id is verified in national_id_records or auth.users metadata
UPDATE public.user_profiles up
SET id_verified = true
FROM auth.users au
WHERE up.id = au.id
  AND up.id_verified IS NOT TRUE
  AND (
    COALESCE((au.raw_user_meta_data->>'is_id_verified')::boolean, false) = true
    OR COALESCE((au.raw_user_meta_data->>'verified')::boolean, false) = true
    OR COALESCE((au.raw_user_meta_data->>'id_verified')::boolean, false) = true
  );

-- Also ensure national_id_records columns and deduplication exist without touching verified records
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS verified_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS checked_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS check_count INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS first_checked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill is_verified = true on national_id_records whenever verified_user_id or checked_accounts indicates verification
UPDATE public.national_id_records
SET is_verified = true
WHERE is_verified IS NOT TRUE
  AND (
    verified_user_id IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(checked_accounts, '[]'::jsonb)) AS acct
      WHERE COALESCE((acct->>'is_verified')::boolean, false) = true
         OR COALESCE((acct->>'verified')::boolean, false) = true
    )
  );

-- Sync user_profiles.id_verified = true when linked in national_id_records as verified
UPDATE public.user_profiles up
SET id_verified = true
FROM public.national_id_records nir
WHERE (nir.verified_user_id = up.id OR (nir.is_verified = true AND nir.user_id = up.id))
  AND up.id_verified IS NOT TRUE;

-- ============================================================================
-- 2. REMOVE DRIVER-ONLY TABLES, CONSTRAINTS, INDEXES & SETTINGS
-- ============================================================================

DROP TABLE IF EXISTS public.training_logs CASCADE;
DROP TABLE IF EXISTS public.driver_ratings CASCADE;
DROP TABLE IF EXISTS public.driver_bookings CASCADE;
DROP TABLE IF EXISTS public.driver_applications CASCADE;
DROP TABLE IF EXISTS public.driver_plans CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;

-- Drop partial driver role index
DROP INDEX IF EXISTS public.idx_user_profiles_role_driver;

-- Restrict user_profiles.role to Student and Admin only
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK ("role" IN ('Student', 'Admin'));

-- Drop legacy driver verification column if present
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS "driver_Verification";

-- Remove driver-specific system configuration keys
DELETE FROM public.system_config
WHERE key IN (
  'driver_cancel_window_minutes',
  'driver_cancel_enabled',
  'service_driver-hub_enabled',
  'service_drivers_enabled'
);

-- ============================================================================
-- 3. ENSURE GUEST EXAM QUOTA TABLE & INDEXES EXIST (FOR 3/DAY RESET COUNTDOWN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_exam_attempts (
  id BIGSERIAL PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_exam_attempts_ip
  ON public.anonymous_exam_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_anonymous_exam_attempts_fingerprint
  ON public.anonymous_exam_attempts(fingerprint);
CREATE INDEX IF NOT EXISTS idx_anonymous_exam_attempts_last_attempt_at
  ON public.anonymous_exam_attempts(last_attempt_at DESC);

ALTER TABLE public.anonymous_exam_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. DEFAULT GUEST FREE EXAMS QUOTA & RESET WINDOW SETTINGS (HOURS / DAYS)
-- ============================================================================
INSERT INTO public.system_config (key, value, description, updated_at)
VALUES
  ('guest_free_exam_limit', '3', 'Number of free practice exams allowed for unauthenticated visitors per reset window', NOW()),
  ('guest_exam_reset_value', '1', 'Duration value after which free guest exams reset', NOW()),
  ('guest_exam_reset_unit', 'days', 'Duration unit (hours or days) for free guest exam quota reset', NOW())
ON CONFLICT (key) DO NOTHING;

COMMIT;
