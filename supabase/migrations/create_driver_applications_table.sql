-- Migration: Create driver_applications table
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS driver_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES driver_plans(id) ON DELETE SET NULL,
    duration_type TEXT CHECK (duration_type IN ('day', 'week', 'month')),
    duration_count INT DEFAULT 1,
    total_price NUMERIC(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    student_note TEXT,
    driver_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_applications_driver_id ON driver_applications(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_student_id ON driver_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON driver_applications(status);

ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view own applications" ON driver_applications;
DROP POLICY IF EXISTS "Students can view own applications" ON driver_applications;
DROP POLICY IF EXISTS "Students can create applications" ON driver_applications;
DROP POLICY IF EXISTS "Drivers can update own applications" ON driver_applications;

CREATE POLICY "Drivers can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Students can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can create applications"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Drivers can update own applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

COMMENT ON TABLE driver_applications IS 'Applications from students to drivers for training';
