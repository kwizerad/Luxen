-- Migration: create the system_config table used by admin system settings and by
-- the exam-taking flow (universal exam limit, violation measures). The table was
-- referenced by the application but never existed, causing 404s on
-- /rest/v1/system_config and breaking admin settings + exam start.

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read config (students need universal_exam_limit and
-- violation_measures_enabled when starting an exam).
DROP POLICY IF EXISTS "Authenticated can read system config" ON system_config;
CREATE POLICY "Authenticated can read system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

-- Only admins may create/update/delete config.
DROP POLICY IF EXISTS "Admins can manage system config" ON system_config;
CREATE POLICY "Admins can manage system config"
  ON system_config FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

INSERT INTO system_config (key, value, description) VALUES
  ('universal_exam_limit', '5', 'Default daily exam attempt limit applied to all users'),
  ('violation_measures_enabled', 'true', 'Whether anti-cheating violation measures are enforced')
ON CONFLICT (key) DO NOTHING;
