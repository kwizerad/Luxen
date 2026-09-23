-- Migration: Create driver_bookings table
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS driver_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES driver_applications(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    queue_position INT,
    status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled', 'no_show')),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_bookings_driver_id ON driver_bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_bookings_student_id ON driver_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_driver_bookings_booking_date ON driver_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_driver_bookings_status ON driver_bookings(status);

ALTER TABLE driver_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view own bookings" ON driver_bookings;
DROP POLICY IF EXISTS "Students can view own bookings" ON driver_bookings;
DROP POLICY IF EXISTS "Drivers can manage own bookings" ON driver_bookings;
DROP POLICY IF EXISTS "Students can create bookings" ON driver_bookings;
DROP POLICY IF EXISTS "Students can cancel own bookings" ON driver_bookings;

CREATE POLICY "Drivers can view own bookings"
  ON driver_bookings FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Students can view own bookings"
  ON driver_bookings FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Drivers can manage own bookings"
  ON driver_bookings FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Students can create bookings"
  ON driver_bookings FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can cancel own bookings"
  ON driver_bookings FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

COMMENT ON TABLE driver_bookings IS 'Training session bookings between drivers and students';
