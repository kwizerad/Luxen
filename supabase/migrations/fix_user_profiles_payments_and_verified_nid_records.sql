-- Migration: Fix user_profiles schema, create exam_request_payments if missing,
--            and upgrade national_id_records to store verified IDs, belonging info,
--            and deduplicated multi-account verification history.
-- Target Database: Internal DB (Primary Supabase)

BEGIN;

-- ============================================================================
-- 1. FIX public.user_profiles SCHEMA TO MATCH ADMIN DASHBOARD QUERIES
-- ============================================================================

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_verified BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_category TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_verified_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS learning_language TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS security_question TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS security_answer_clean TEXT;

-- Backfill phone_number and id_verified from auth.users metadata when missing
UPDATE public.user_profiles up
SET
  phone_number = COALESCE(
    NULLIF(up.phone_number, ''),
    NULLIF(au.raw_user_meta_data->>'phone_number', ''),
    NULLIF(au.phone, '')
  ),
  phone_verified = COALESCE(
    up.phone_verified,
    COALESCE((au.raw_user_meta_data->>'phone_verified')::boolean, false),
    (au.phone_confirmed_at IS NOT NULL)
  ),
  id_verified = CASE
    WHEN up.id_verified IS TRUE THEN true
    WHEN COALESCE((au.raw_user_meta_data->>'is_id_verified')::boolean, false) = true
      OR COALESCE((au.raw_user_meta_data->>'verified')::boolean, false) = true
      OR COALESCE((au.raw_user_meta_data->>'id_verified')::boolean, false) = true
    THEN true
    ELSE COALESCE(up.id_verified, false)
  END,
  updated_at = NOW()
FROM auth.users au
WHERE up.id = au.id;

-- Keep sync_user_to_profile() trigger in sync with the expanded columns
CREATE OR REPLACE FUNCTION public.sync_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    "role",
    username,
    full_name,
    first_name,
    last_name,
    avatar_url,
    gender,
    nationality,
    birthdate,
    phone_number,
    phone_verified,
    national_id,
    id_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'Student')) = 'admin' THEN 'Admin'
      ELSE 'Student'
    END,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'gender', '')) IN ('male', 'female', 'other')
        THEN LOWER(NEW.raw_user_meta_data->>'gender')
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'nationality',
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'birthdate', '') ~ '^\d{4}-\d{2}-\d{2}$'
        THEN (NEW.raw_user_meta_data->>'birthdate')::DATE
      ELSE NULL
    END,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone_number', ''), NULLIF(NEW.phone, '')),
    COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, NEW.phone_confirmed_at IS NOT NULL, false),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'national_id', '')), ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'is_id_verified')::boolean,
      (NEW.raw_user_meta_data->>'id_verified')::boolean,
      (NEW.raw_user_meta_data->>'verified')::boolean,
      false
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    "role" = COALESCE(public.user_profiles."role", EXCLUDED."role"),
    username = COALESCE(EXCLUDED.username, public.user_profiles.username),
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    gender = COALESCE(EXCLUDED.gender, public.user_profiles.gender),
    nationality = COALESCE(EXCLUDED.nationality, public.user_profiles.nationality),
    birthdate = COALESCE(EXCLUDED.birthdate, public.user_profiles.birthdate),
    phone_number = COALESCE(EXCLUDED.phone_number, public.user_profiles.phone_number),
    phone_verified = COALESCE(public.user_profiles.phone_verified, false) OR COALESCE(EXCLUDED.phone_verified, false),
    national_id = COALESCE(EXCLUDED.national_id, public.user_profiles.national_id),
    id_verified = COALESCE(public.user_profiles.id_verified, false) OR COALESCE(EXCLUDED.id_verified, false),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE public.exam_request_payments IF MISSING (RESOLVES 42P01 ERRORS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exam_request_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type TEXT CHECK (exam_type IN ('theory', 'practical')),
  national_id TEXT NOT NULL,
  amount NUMERIC(10, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  irembo_verified BOOLEAN DEFAULT false,
  irembo_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_request_payments_user_id
  ON public.exam_request_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_request_payments_exam_type
  ON public.exam_request_payments(exam_type);
CREATE INDEX IF NOT EXISTS idx_exam_request_payments_payment_status
  ON public.exam_request_payments(payment_status);

ALTER TABLE public.exam_request_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.exam_request_payments;
DROP POLICY IF EXISTS "Users can create own payments" ON public.exam_request_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.exam_request_payments;

CREATE POLICY "Users can view own payments"
  ON public.exam_request_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own payments"
  ON public.exam_request_payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all payments"
  ON public.exam_request_payments FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- ============================================================================
-- 3. UPGRADE public.national_id_records FOR VERIFIED IDs + BELONGING INFO
--    AND DEDUPLICATED MULTI-ACCOUNT VERIFICATION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.national_id_records (
  id BIGSERIAL PRIMARY KEY,
  national_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_id_records_national_id
  ON public.national_id_records(national_id);

ALTER TABLE public.national_id_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.national_id_records
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS verified_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS checked_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS verified_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS check_count INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS first_checked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS public.national_id_records
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Belonging citizen information columns stored canonically per National ID
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS civil_status TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS spouse TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS father_names TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS mother_names TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS place_of_issue TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS cell TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS vehicle_class TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS license_status TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS date_of_issue TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS date_of_expiry TEXT;
ALTER TABLE IF EXISTS public.national_id_records ADD COLUMN IF NOT EXISTS citizen_info JSONB DEFAULT '{}'::jsonb;

-- Clean up whitespace on national_id values
UPDATE public.national_id_records
SET national_id = TRIM(national_id)
WHERE national_id IS NOT NULL AND national_id <> TRIM(national_id);

-- Merge and deduplicate any duplicate national_id rows before enforcing UNIQUE(national_id)
DO $$
DECLARE
  dup RECORD;
  keep_id BIGINT;
  merged_checked JSONB;
  merged_verified JSONB;
BEGIN
  FOR dup IN
    SELECT national_id
    FROM public.national_id_records
    WHERE national_id IS NOT NULL
    GROUP BY national_id
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.national_id_records
    WHERE national_id = dup.national_id
    ORDER BY
      COALESCE(is_verified, false) DESC,
      COALESCE(verified, false) DESC,
      (verified_user_id IS NOT NULL) DESC,
      id ASC
    LIMIT 1;

    -- Aggregate distinct checked accounts
    SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) INTO merged_checked
    FROM (
      SELECT jsonb_array_elements(COALESCE(checked_accounts, '[]'::jsonb)) AS elem
      FROM public.national_id_records
      WHERE national_id = dup.national_id
    ) s;

    -- Aggregate distinct verified accounts
    SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) INTO merged_verified
    FROM (
      SELECT jsonb_array_elements(COALESCE(verified_accounts, '[]'::jsonb)) AS elem
      FROM public.national_id_records
      WHERE national_id = dup.national_id
    ) s;

    UPDATE public.national_id_records k
    SET
      checked_accounts = merged_checked,
      verified_accounts = merged_verified,
      verified_user_id = COALESCE(k.verified_user_id, (
        SELECT r.verified_user_id FROM public.national_id_records r
        WHERE r.national_id = dup.national_id AND r.verified_user_id IS NOT NULL
        ORDER BY r.id ASC LIMIT 1
      )),
      is_verified = EXISTS (
        SELECT 1 FROM public.national_id_records r
        WHERE r.national_id = dup.national_id AND (r.is_verified = true OR r.verified = true OR r.verified_user_id IS NOT NULL)
      ),
      verified = EXISTS (
        SELECT 1 FROM public.national_id_records r
        WHERE r.national_id = dup.national_id AND (r.is_verified = true OR r.verified = true OR r.verified_user_id IS NOT NULL)
      ),
      check_count = GREATEST(COALESCE(k.check_count, 1), (
        SELECT COALESCE(SUM(COALESCE(r.check_count, 1)), 1)
        FROM public.national_id_records r WHERE r.national_id = dup.national_id
      )),
      updated_at = NOW()
    WHERE k.id = keep_id;

    DELETE FROM public.national_id_records
    WHERE national_id = dup.national_id AND id <> keep_id;
  END LOOP;
END $$;

ALTER TABLE public.national_id_records DROP CONSTRAINT IF EXISTS national_id_records_national_id_user_id_key;
ALTER TABLE public.national_id_records DROP CONSTRAINT IF EXISTS national_id_records_national_id_key;
ALTER TABLE public.national_id_records ADD CONSTRAINT national_id_records_national_id_key UNIQUE (national_id);

-- Backfill any verified users from user_profiles into canonical national_id_records
-- (Grouped strictly to 1 row per TRIM(national_id) while aggregating all accounts
--  that verified that National ID so ON CONFLICT DO UPDATE never hits a row twice)
WITH eligible_profiles AS (
  SELECT
    TRIM(up.national_id) AS nid,
    up.id,
    up.email,
    up.username,
    up.full_name,
    up.first_name,
    up.last_name,
    up.birthdate,
    up.gender,
    up.nationality,
    up.avatar_url,
    up.phone_number,
    up.created_at,
    up.updated_at,
    up.provision_verified_at
  FROM public.user_profiles up
  WHERE LENGTH(TRIM(COALESCE(up.national_id, ''))) = 16
    AND (up.id_verified = true OR up.provision_verified = true)
    AND LOWER(COALESCE(up."role", 'Student')) <> 'admin'
),
primary_per_nid AS (
  SELECT DISTINCT ON (nid)
    nid,
    id,
    email,
    username,
    full_name,
    first_name,
    last_name,
    birthdate,
    gender,
    nationality,
    avatar_url,
    created_at,
    updated_at,
    provision_verified_at
  FROM eligible_profiles
  ORDER BY nid, COALESCE(provision_verified_at, updated_at, created_at, NOW()) ASC, id ASC
),
agg_per_nid AS (
  SELECT
    nid,
    COUNT(*)::INTEGER AS acct_count,
    MIN(COALESCE(created_at, NOW())) AS first_checked_at,
    MAX(COALESCE(updated_at, NOW())) AS last_checked_at,
    MAX(COALESCE(provision_verified_at, updated_at, created_at, NOW())) AS last_verified_at,
    jsonb_agg(
      jsonb_build_object(
        'user_id', id::TEXT,
        'email', email,
        'full_name', COALESCE(full_name, NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), username),
        'username', username,
        'avatar_url', avatar_url,
        'phone_number', phone_number,
        'checked_at', COALESCE(updated_at, created_at, NOW()),
        'verified_at', COALESCE(provision_verified_at, updated_at, created_at, NOW()),
        'is_verified', true
      )
      ORDER BY COALESCE(provision_verified_at, updated_at, created_at, NOW()) ASC, id ASC
    ) AS checked_accounts,
    jsonb_agg(
      jsonb_build_object(
        'user_id', id::TEXT,
        'email', email,
        'full_name', COALESCE(full_name, NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), username),
        'username', username,
        'avatar_url', avatar_url,
        'phone_number', phone_number,
        'verified_at', COALESCE(provision_verified_at, updated_at, created_at, NOW()),
        'verification_count', 1
      )
      ORDER BY COALESCE(provision_verified_at, updated_at, created_at, NOW()) ASC, id ASC
    ) AS verified_accounts
  FROM eligible_profiles
  GROUP BY nid
)
INSERT INTO public.national_id_records (
  national_id,
  user_id,
  verified_user_id,
  verified,
  is_verified,
  user_name,
  user_email,
  full_name,
  first_name,
  last_name,
  date_of_birth,
  gender,
  nationality,
  photo_url,
  checked_accounts,
  verified_accounts,
  check_count,
  verification_count,
  first_checked_at,
  last_checked_at,
  last_verified_at,
  created_at,
  updated_at
)
SELECT
  p.nid,
  p.id,
  p.id,
  true,
  true,
  COALESCE(p.full_name, NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''), p.username, p.email),
  p.email,
  COALESCE(p.full_name, NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')),
  p.first_name,
  p.last_name,
  p.birthdate::TEXT,
  p.gender,
  p.nationality,
  p.avatar_url,
  a.checked_accounts,
  a.verified_accounts,
  a.acct_count,
  a.acct_count,
  a.first_checked_at,
  a.last_checked_at,
  a.last_verified_at,
  a.first_checked_at,
  NOW()
FROM primary_per_nid p
JOIN agg_per_nid a ON a.nid = p.nid
ON CONFLICT (national_id) DO UPDATE SET
  verified = true,
  is_verified = true,
  verified_user_id = COALESCE(public.national_id_records.verified_user_id, EXCLUDED.verified_user_id),
  full_name = COALESCE(public.national_id_records.full_name, EXCLUDED.full_name),
  first_name = COALESCE(public.national_id_records.first_name, EXCLUDED.first_name),
  last_name = COALESCE(public.national_id_records.last_name, EXCLUDED.last_name),
  date_of_birth = COALESCE(public.national_id_records.date_of_birth, EXCLUDED.date_of_birth),
  gender = COALESCE(public.national_id_records.gender, EXCLUDED.gender),
  nationality = COALESCE(public.national_id_records.nationality, EXCLUDED.nationality),
  photo_url = COALESCE(public.national_id_records.photo_url, EXCLUDED.photo_url),
  checked_accounts = COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(COALESCE(public.national_id_records.checked_accounts, '[]'::jsonb)) elem
        UNION ALL
        SELECT elem
        FROM jsonb_array_elements(COALESCE(EXCLUDED.checked_accounts, '[]'::jsonb)) elem
        WHERE NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(public.national_id_records.checked_accounts, '[]'::jsonb)) existing_elem
          WHERE existing_elem->>'user_id' = elem->>'user_id'
        )
      ) merged
    ),
    '[]'::jsonb
  ),
  verified_accounts = COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(COALESCE(public.national_id_records.verified_accounts, '[]'::jsonb)) elem
        UNION ALL
        SELECT elem
        FROM jsonb_array_elements(COALESCE(EXCLUDED.verified_accounts, '[]'::jsonb)) elem
        WHERE NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(public.national_id_records.verified_accounts, '[]'::jsonb)) existing_elem
          WHERE existing_elem->>'user_id' = elem->>'user_id'
        )
      ) merged
    ),
    '[]'::jsonb
  ),
  check_count = GREATEST(COALESCE(public.national_id_records.check_count, 1), EXCLUDED.check_count),
  verification_count = GREATEST(COALESCE(public.national_id_records.verification_count, 0), EXCLUDED.verification_count),
  last_verified_at = GREATEST(COALESCE(public.national_id_records.last_verified_at, EXCLUDED.last_verified_at), EXCLUDED.last_verified_at),
  updated_at = NOW();

-- Sync verified and is_verified columns everywhere
UPDATE public.national_id_records
SET
  verified = COALESCE(verified, false) OR COALESCE(is_verified, false) OR (verified_user_id IS NOT NULL),
  is_verified = COALESCE(verified, false) OR COALESCE(is_verified, false) OR (verified_user_id IS NOT NULL);

-- Lock RLS so regular users only view their own linked ID records while primary admin reads all via service role
DROP POLICY IF EXISTS "Anyone authenticated can view national_id_records" ON public.national_id_records;
DROP POLICY IF EXISTS "Anyone authenticated can insert national_id_records" ON public.national_id_records;
DROP POLICY IF EXISTS "Anyone authenticated can update national_id_records" ON public.national_id_records;
DROP POLICY IF EXISTS "Primary admin or owner can view national_id_records" ON public.national_id_records;
DROP POLICY IF EXISTS "Service role and owner insert national_id_records" ON public.national_id_records;
DROP POLICY IF EXISTS "Service role and owner update national_id_records" ON public.national_id_records;

CREATE POLICY "Primary admin or owner can view national_id_records"
  ON public.national_id_records FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR user_id = auth.uid()
    OR verified_user_id = auth.uid()
  );

CREATE POLICY "Service role and owner insert national_id_records"
  ON public.national_id_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn'));

CREATE POLICY "Service role and owner update national_id_records"
  ON public.national_id_records FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR verified_user_id = auth.uid() OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn'))
  WITH CHECK (user_id = auth.uid() OR verified_user_id = auth.uid() OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn'));

-- ============================================================================
-- 4. ENSURE public.exam_challenges STORES GROUP EXAM LANGUAGE
-- ============================================================================

ALTER TABLE IF EXISTS public.exam_challenges
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Kinyarwanda';

COMMIT;
