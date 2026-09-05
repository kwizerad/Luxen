-- Migration: Extend device/session tracking with detailed IP geolocation data
-- Created: 2026-08-03

-- user_devices: track current known location + IP history for each device
ALTER TABLE user_devices
  ADD COLUMN IF NOT EXISTS last_seen_ip TEXT,
  ADD COLUMN IF NOT EXISTS first_seen_ip TEXT,
  ADD COLUMN IF NOT EXISTS ip_version TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ip_history JSONB DEFAULT '[]'::jsonb;

-- login_history: richer geolocation detail per login event
ALTER TABLE login_history
  ADD COLUMN IF NOT EXISTS ip_version TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- security_events: allow new_country / new_region event types
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_type_check CHECK (event_type IN (
    'new_device',
    'new_country',
    'new_region',
    'multiple_countries',
    'failed_login',
    'suspicious_login',
    'vpn_proxy',
    'password_changed',
    'mfa_enabled',
    'mfa_disabled',
    'session_revoked',
    'trusted_device_removed'
));

-- Indexes for location-based lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_country ON user_devices(country);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen_ip ON user_devices(last_seen_ip);
CREATE INDEX IF NOT EXISTS idx_login_history_country ON login_history(country);
