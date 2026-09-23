-- Migration: Create system_config table for app-wide settings
-- Created: 2026-07-16

CREATE TABLE IF NOT EXISTS system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Enable Row Level Security
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent runs)
DROP POLICY IF EXISTS "Admins can manage system config" ON system_config;
DROP POLICY IF EXISTS "All users can read system config" ON system_config;

-- Policy: All authenticated users can read system config (for theme, etc.)
CREATE POLICY "All users can read system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can write system config
CREATE POLICY "Admins can manage system config"
  ON system_config FOR ALL
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('admin@example.com')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER('admin@example.com')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- Insert default values
INSERT INTO system_config (key, value, description)
VALUES
  ('universal_exam_limit', '5', 'Universal daily exam limit applied to all users'),
  ('violation_measures_enabled', 'true', 'Enable/disable exam security violation measures (fullscreen, copy/paste prevention, tab switching detection)'),
  ('theme_config', '{"light":{"primaryColor":"#22C55E","hoverBorderColor":"#22C55E"},"dark":{"primaryColor":"#22C55E","hoverBorderColor":"#22C55E"},"glowIntensity":30}', 'Global theme configuration applied to all users'),
  ('branding_config', '{"systemName":"Navo","logoUrl":null,"logoText":"N","adminEmail":"admin@example.com"}', 'Global branding configuration for system name and logo')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_config IS 'Application-wide configuration key-value store';
