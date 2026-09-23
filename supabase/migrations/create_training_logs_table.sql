-- Migration: Create training_logs table (digital version of paper-based training log)
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS training_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES driver_bookings(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INT,
    skills_practiced TEXT,
    location TEXT,
    notes TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_logs_driver_id ON training_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_student_id ON training_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_session_date ON training_logs(session_date);

ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view own logs" ON training_logs;
DROP POLICY IF EXISTS "Students can view own logs" ON training_logs;
DROP POLICY IF EXISTS "Drivers can manage own logs" ON training_logs;

CREATE POLICY "Drivers can view own logs"
  ON training_logs FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Students can view own logs"
  ON training_logs FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Drivers can manage own logs"
  ON training_logs FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

COMMENT ON TABLE training_logs IS 'Daily practical training session logs created by drivers';
