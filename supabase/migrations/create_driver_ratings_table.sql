-- Migration: Create driver_ratings table
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS driver_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_student_id ON driver_ratings(student_id);

ALTER TABLE driver_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ratings" ON driver_ratings;
DROP POLICY IF EXISTS "Students can rate drivers" ON driver_ratings;
DROP POLICY IF EXISTS "Students can update own ratings" ON driver_ratings;

CREATE POLICY "Anyone can view ratings"
  ON driver_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can rate drivers"
  ON driver_ratings FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() AND driver_id != auth.uid());

CREATE POLICY "Students can update own ratings"
  ON driver_ratings FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

COMMENT ON TABLE driver_ratings IS 'Student ratings for drivers (1-5 stars + review, one per student per driver)';
