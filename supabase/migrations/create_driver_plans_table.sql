-- Migration: Create driver_plans table
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS driver_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_type TEXT CHECK (duration_type IN ('day', 'week', 'month')),
    price NUMERIC(10,2) NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_plans_driver_id ON driver_plans(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_plans_is_active ON driver_plans(is_active);

ALTER TABLE driver_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON driver_plans;
DROP POLICY IF EXISTS "Drivers can manage own plans" ON driver_plans;

CREATE POLICY "Anyone can view active plans"
  ON driver_plans FOR SELECT
  TO authenticated
  USING (is_active = true OR driver_id = auth.uid());

CREATE POLICY "Drivers can manage own plans"
  ON driver_plans FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

COMMENT ON TABLE driver_plans IS 'Training plans created by drivers for students to choose';
