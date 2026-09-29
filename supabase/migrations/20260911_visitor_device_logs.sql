-- Migration: Create visitor_device_logs table for server-side edge visitor device tracking
-- Created: 2026-09-11

CREATE TABLE IF NOT EXISTS visitor_device_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    ip_address TEXT NOT NULL,
    device_type TEXT NOT NULL,
    device_model TEXT,
    device_vendor TEXT,
    browser_name TEXT NOT NULL,
    browser_version TEXT NOT NULL,
    os_name TEXT NOT NULL,
    os_version TEXT NOT NULL,
    cpu_architecture TEXT,
    is_bot BOOLEAN DEFAULT FALSE,
    country TEXT,
    country_code TEXT,
    region TEXT,
    city TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    timezone TEXT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance and analytics
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_device_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_device_type ON visitor_device_logs (device_type);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_country ON visitor_device_logs (country_code);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON visitor_device_logs (ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_path ON visitor_device_logs (path);

-- Enable RLS
ALTER TABLE visitor_device_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on visitor_device_logs" ON visitor_device_logs;
CREATE POLICY "Service role full access on visitor_device_logs"
  ON visitor_device_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to read visitor logs
DROP POLICY IF EXISTS "Admins can view visitor_device_logs" ON visitor_device_logs;
CREATE POLICY "Admins can view visitor_device_logs"
  ON visitor_device_logs FOR SELECT
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('admin@example.com')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );
