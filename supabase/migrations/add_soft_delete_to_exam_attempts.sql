-- Migration: Add soft delete columns to exam_attempts
-- Created: 2026-05-02

-- Add hidden columns for soft delete
ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS hidden_from_user BOOLEAN DEFAULT FALSE;

ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Create index for filtering hidden attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_hidden_from_user
ON exam_attempts(hidden_from_user)
WHERE hidden_from_user = TRUE;

-- Allow authenticated users to update the soft-delete flag on their own attempts
DROP POLICY IF EXISTS "Users can soft delete own exam attempts" ON exam_attempts;

CREATE POLICY "Users can soft delete own exam attempts"
  ON exam_attempts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON COLUMN exam_attempts.hidden_from_user IS 'Soft delete flag - true means hidden from user view but visible to admin';
COMMENT ON COLUMN exam_attempts.hidden_at IS 'Timestamp when user soft-deleted this attempt';
