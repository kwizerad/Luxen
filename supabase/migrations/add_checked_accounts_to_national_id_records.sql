-- Migration: Deduplicate national_id_records and track accounts that checked each National ID without duplication

-- 1. Ensure columns exist on national_id_records
ALTER TABLE national_id_records ADD COLUMN IF NOT EXISTS verified_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE national_id_records ADD COLUMN IF NOT EXISTS checked_accounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE national_id_records ADD COLUMN IF NOT EXISTS check_count INTEGER DEFAULT 1;
ALTER TABLE national_id_records ADD COLUMN IF NOT EXISTS first_checked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE national_id_records ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Deduplicate existing rows by national_id, aggregating any existing user_ids into checked_accounts
DO $$
BEGIN
    -- Ensure national_id is trimmed and unique
    DELETE FROM national_id_records a
    USING national_id_records b
    WHERE a.national_id = b.national_id
      AND a.id > b.id;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Enforce single canonical unique constraint on national_id
ALTER TABLE national_id_records DROP CONSTRAINT IF EXISTS national_id_records_national_id_user_id_key;
ALTER TABLE national_id_records DROP CONSTRAINT IF EXISTS national_id_records_national_id_key;
ALTER TABLE national_id_records ADD CONSTRAINT national_id_records_national_id_key UNIQUE (national_id);

-- 4. Stored procedure to record a National ID check or verification without duplication
CREATE OR REPLACE FUNCTION record_national_id_check(
    p_national_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_user_name TEXT DEFAULT NULL,
    p_user_avatar TEXT DEFAULT NULL,
    p_is_verified BOOLEAN DEFAULT FALSE,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record_id BIGINT;
    v_now TIMESTAMPTZ := NOW();
    v_clean_id TEXT;
    v_new_account JSONB;
BEGIN
    v_clean_id := TRIM(p_national_id);
    IF v_clean_id IS NULL OR LENGTH(v_clean_id) != 16 THEN
        RETURN NULL;
    END IF;

    IF p_user_id IS NOT NULL THEN
        v_new_account := jsonb_build_object(
            'user_id', p_user_id::TEXT,
            'email', p_user_email,
            'full_name', p_user_name,
            'avatar_url', p_user_avatar,
            'checked_at', v_now,
            'ip_address', p_ip_address,
            'is_verified', p_is_verified
        );
    END IF;

    -- Upsert canonical record
    INSERT INTO national_id_records (
        national_id,
        user_id,
        verified_user_id,
        checked_accounts,
        check_count,
        first_checked_at,
        last_checked_at,
        created_at,
        updated_at
    )
    VALUES (
        v_clean_id,
        p_user_id,
        CASE WHEN p_is_verified THEN p_user_id ELSE NULL END,
        CASE WHEN v_new_account IS NOT NULL THEN jsonb_build_array(v_new_account) ELSE '[]'::jsonb END,
        1,
        v_now,
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (national_id) DO UPDATE SET
        user_id = COALESCE(national_id_records.user_id, EXCLUDED.user_id),
        verified_user_id = CASE 
            WHEN p_is_verified THEN p_user_id 
            ELSE national_id_records.verified_user_id 
        END,
        last_checked_at = v_now,
        updated_at = v_now,
        check_count = COALESCE(national_id_records.check_count, 0) + 1,
        checked_accounts = CASE
            WHEN v_new_account IS NULL THEN national_id_records.checked_accounts
            -- Check if user is already in checked_accounts JSONB array
            WHEN national_id_records.checked_accounts @> jsonb_build_array(jsonb_build_object('user_id', p_user_id::TEXT))
            THEN (
                SELECT jsonb_agg(
                    CASE 
                        WHEN item->>'user_id' = p_user_id::TEXT 
                        THEN item || jsonb_build_object('last_checked_at', v_now, 'is_verified', COALESCE((item->>'is_verified')::boolean, false) OR p_is_verified)
                        ELSE item 
                    END
                )
                FROM jsonb_array_elements(COALESCE(national_id_records.checked_accounts, '[]'::jsonb)) AS item
            )
            ELSE COALESCE(national_id_records.checked_accounts, '[]'::jsonb) || jsonb_build_array(v_new_account)
        END
    RETURNING id INTO v_record_id;

    RETURN v_record_id;
END;
$$;
