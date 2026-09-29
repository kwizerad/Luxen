-- Migration: Add production mode system configuration
-- Created: 2026-08-11

INSERT INTO system_config (key, value, description)
VALUES
  ('production_mode_enabled', 'false', 'When true, non-admin users are restricted to Exam, Results, and Settings views only')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_config IS 'Application-wide configuration key-value store';
