-- Migration: Create national_id_records table to store looked-up National IDs
-- Created: 2026-08-03

CREATE TABLE IF NOT EXISTS national_id_records (
    id BIGSERIAL PRIMARY KEY,
    national_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(national_id, user_id)
);

-- Index for fast lookups by national_id
CREATE INDEX IF NOT EXISTS idx_national_id_records_national_id ON national_id_records(national_id);

-- Enable Row Level Security
ALTER TABLE national_id_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent runs)
DROP POLICY IF EXISTS "Anyone authenticated can view national_id_records" ON national_id_records;
DROP POLICY IF EXISTS "Anyone authenticated can insert national_id_records" ON national_id_records;
DROP POLICY IF EXISTS "Anyone authenticated can update national_id_records" ON national_id_records;

-- Policy: Authenticated users can view records
CREATE POLICY "Anyone authenticated can view national_id_records"
  ON national_id_records FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert records
CREATE POLICY "Anyone authenticated can insert national_id_records"
  ON national_id_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update records
CREATE POLICY "Anyone authenticated can update national_id_records"
  ON national_id_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
