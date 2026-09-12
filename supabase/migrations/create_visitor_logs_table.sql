-- Migration: Create visitor_logs table
-- Created: 2026-09-11

CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT,
    device_type TEXT,
    os TEXT,
    browser TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    path TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_device_type ON visitor_logs (device_type);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_country ON visitor_logs (country);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON visitor_logs (ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_path ON visitor_logs (path);

-- Enable RLS
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on visitor_logs" ON visitor_logs;
CREATE POLICY "Service role full access on visitor_logs"
  ON visitor_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to read visitor logs
DROP POLICY IF EXISTS "Admins can view visitor_logs" ON visitor_logs;
CREATE POLICY "Admins can view visitor_logs"
  ON visitor_logs FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('admin@example.com')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );
