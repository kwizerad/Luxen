-- Migration: Create drivers table
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    training_location TEXT,
    training_address TEXT,
    bio TEXT,
    avatar_url TEXT,
    vehicle_type TEXT,
    license_number TEXT,
    years_experience INT,
    certifications TEXT,
    languages_spoken TEXT[],
    specialties TEXT[],
    training_approach TEXT,
    scheduling_mode TEXT DEFAULT 'queue' CHECK (scheduling_mode IN ('scheduled', 'queue')),
    cancel_enabled BOOLEAN DEFAULT true,
    cancel_window_minutes INT DEFAULT 30,
    price_per_day NUMERIC(10,2),
    price_per_week NUMERIC(10,2),
    price_per_month NUMERIC(10,2),
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_training_location ON drivers(training_location);
CREATE INDEX IF NOT EXISTS idx_drivers_is_approved ON drivers(is_approved);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active drivers" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own profile" ON drivers;
DROP POLICY IF EXISTS "Admins can manage drivers" ON drivers;

CREATE POLICY "Anyone can view active drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (is_active = true OR id = auth.uid() OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin');

CREATE POLICY "Drivers can update own profile"
  ON drivers FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Drivers can insert own profile"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage drivers"
  ON drivers FOR ALL
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

COMMENT ON TABLE drivers IS 'Driver profiles for practical driving training';
