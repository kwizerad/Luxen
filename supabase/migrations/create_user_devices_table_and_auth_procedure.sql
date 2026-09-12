-- Migration: Create/Update user_devices table with columns (user_id, ip_address, device_name, browser_info, etc.)
-- and stored procedure for automatic device linking during user authentication.

-- 1. Create table user_devices if not exists
CREATE TABLE IF NOT EXISTS user_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    ip_address TEXT,
    device_name TEXT,
    browser_info TEXT,
    device_type TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    cpu_architecture TEXT,
    screen_resolution TEXT,
    viewport_size TEXT,
    device_pixel_ratio REAL,
    language TEXT,
    timezone TEXT,
    touch_support BOOLEAN DEFAULT FALSE,
    cookies_enabled BOOLEAN DEFAULT TRUE,
    is_trusted BOOLEAN DEFAULT FALSE,
    first_seen_ip TEXT,
    last_seen_ip TEXT,
    country TEXT,
    country_code TEXT,
    region TEXT,
    city TEXT,
    latitude REAL,
    longitude REAL,
    ip_history TEXT[] DEFAULT ARRAY[]::TEXT[],
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_devices_user_fingerprint_key UNIQUE (user_id, fingerprint)
);

-- Ensure newly added columns exist if the table was created earlier
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS browser_info TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS first_seen_ip TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS last_seen_ip TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS ip_history TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_devices_ip_address ON user_devices(ip_address);

-- 2. Enable Row Level Security
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can update own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON user_devices;

CREATE POLICY "Users can view own devices"
  ON user_devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own devices"
  ON user_devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devices"
  ON user_devices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own devices"
  ON user_devices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Stored Procedure to automatically link or update device records during authentication
CREATE OR REPLACE FUNCTION link_user_device(
    p_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL,
    p_browser_info TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_fingerprint TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_screen_resolution TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_language TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device_id BIGINT;
    v_fingerprint TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_clean_ip TEXT;
BEGIN
    -- Fallback fingerprint if none provided
    v_fingerprint := COALESCE(NULLIF(TRIM(p_fingerprint), ''), 'fp_' || MD5(COALESCE(p_user_id::TEXT, '') || '_' || COALESCE(p_ip_address, '') || '_' || COALESCE(p_device_name, 'unknown')));
    
    -- Normalize IP
    v_clean_ip := NULLIF(TRIM(p_ip_address), '');
    IF v_clean_ip = 'unknown' OR v_clean_ip = '127.0.0.1' OR v_clean_ip = '::1' THEN
        v_clean_ip := NULL;
    END IF;

    -- Upsert user device record
    INSERT INTO user_devices (
        user_id,
        fingerprint,
        ip_address,
        device_name,
        browser_info,
        device_type,
        os,
        screen_resolution,
        country,
        city,
        timezone,
        language,
        first_seen_ip,
        last_seen_ip,
        ip_history,
        last_seen,
        updated_at
    )
    VALUES (
        p_user_id,
        v_fingerprint,
        COALESCE(v_clean_ip, p_ip_address),
        p_device_name,
        p_browser_info,
        p_device_type,
        p_os,
        p_screen_resolution,
        p_country,
        p_city,
        p_timezone,
        p_language,
        COALESCE(v_clean_ip, p_ip_address),
        COALESCE(v_clean_ip, p_ip_address),
        CASE WHEN v_clean_ip IS NOT NULL THEN ARRAY[v_clean_ip] ELSE ARRAY[]::TEXT[] END,
        v_now,
        v_now
    )
    ON CONFLICT (user_id, fingerprint) DO UPDATE SET
        ip_address = COALESCE(EXCLUDED.ip_address, user_devices.ip_address),
        device_name = COALESCE(EXCLUDED.device_name, user_devices.device_name),
        browser_info = COALESCE(EXCLUDED.browser_info, user_devices.browser_info),
        device_type = COALESCE(EXCLUDED.device_type, user_devices.device_type),
        os = COALESCE(EXCLUDED.os, user_devices.os),
        screen_resolution = COALESCE(EXCLUDED.screen_resolution, user_devices.screen_resolution),
        country = COALESCE(EXCLUDED.country, user_devices.country),
        city = COALESCE(EXCLUDED.city, user_devices.city),
        timezone = COALESCE(EXCLUDED.timezone, user_devices.timezone),
        language = COALESCE(EXCLUDED.language, user_devices.language),
        last_seen_ip = COALESCE(EXCLUDED.last_seen_ip, user_devices.last_seen_ip),
        last_seen = v_now,
        updated_at = v_now,
        ip_history = CASE 
            WHEN EXCLUDED.last_seen_ip IS NOT NULL AND NOT (user_devices.ip_history @> ARRAY[EXCLUDED.last_seen_ip])
            THEN array_append(user_devices.ip_history, EXCLUDED.last_seen_ip)
            ELSE user_devices.ip_history
        END
    RETURNING id INTO v_device_id;

    -- Update user profile last_seen & last_ip
    UPDATE user_profiles
    SET 
        last_seen = v_now,
        last_ip = COALESCE(v_clean_ip, last_ip),
        device_type = COALESCE(p_device_type, device_type),
        os = COALESCE(p_os, os),
        updated_at = v_now
    WHERE id = p_user_id;

    RETURN v_device_id;
END;
$$;
