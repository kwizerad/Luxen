-- Migration: Create admin_setup_status table to track initial admin creation
-- Created: 2026-05-06

CREATE TABLE IF NOT EXISTS admin_setup_status (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row allowed
    admin_exists BOOLEAN DEFAULT false,
    setup_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_setup_status_singleton ON admin_setup_status((true));

-- Insert default row
INSERT INTO admin_setup_status (id, admin_exists, setup_completed_at)
VALUES (1, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE admin_setup_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent runs)
DROP POLICY IF EXISTS "Anyone can read setup status" ON admin_setup_status;
DROP POLICY IF EXISTS "Anyone can update setup status" ON admin_setup_status;
DROP POLICY IF EXISTS "Anyone can insert setup status" ON admin_setup_status;

-- Policy: Anyone can read setup status (needed for initial setup page)
CREATE POLICY "Anyone can read setup status"
  ON admin_setup_status FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Anyone can update setup status (needed during initial setup)
-- In production with existing admin, you might want to restrict this
CREATE POLICY "Anyone can update setup status"
  ON admin_setup_status FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can insert (for initial setup)
CREATE POLICY "Anyone can insert setup status"
  ON admin_setup_status FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

COMMENT ON TABLE admin_setup_status IS 'Tracks whether initial admin user has been created';
