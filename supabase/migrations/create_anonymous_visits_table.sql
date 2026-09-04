-- Migration: Create anonymous_visits table for tracking every website visitor
-- Created: 2026-08-11

CREATE TABLE IF NOT EXISTS anonymous_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    screen_width INTEGER,
    screen_height INTEGER,
    device_type TEXT,
    os TEXT,
    browser TEXT,
    browser_version TEXT,
    language TEXT,
    timezone TEXT,
    referrer TEXT,
    landing_page TEXT,
    touch_support BOOLEAN DEFAULT FALSE,
    cookies_enabled BOOLEAN DEFAULT TRUE,
    visit_count INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_anonymous_visits_fingerprint ON anonymous_visits(fingerprint);
CREATE INDEX IF NOT EXISTS idx_anonymous_visits_linked_user_id ON anonymous_visits(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_visits_last_seen ON anonymous_visits(last_seen);
CREATE INDEX IF NOT EXISTS idx_anonymous_visits_first_seen ON anonymous_visits(first_seen);

-- Enable Row Level Security
ALTER TABLE anonymous_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Admins can view anonymous visits" ON anonymous_visits;
DROP POLICY IF EXISTS "Service can upsert anonymous visits" ON anonymous_visits;
DROP POLICY IF EXISTS "Users can view linked anonymous visits" ON anonymous_visits;

-- Admin read-only policy
CREATE POLICY "Admins can view anonymous visits"
  ON anonymous_visits FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('admin@example.com')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- Allow the service role / edge functions to upsert anonymously tracked visits
CREATE POLICY "Service can upsert anonymous visits"
  ON anonymous_visits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE anonymous_visits IS 'Tracks every website visitor, anonymous and linked, with device/geolocation info';
