ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS hidden_from_user BOOLEAN DEFAULT FALSE;

ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Add hidden_from_user column
ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS hidden_from_user BOOLEAN DEFAULT FALSE;

-- Add hidden_at timestamp
ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- Create index for filtering hidden attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_hidden_from_user 
ON exam_attempts(hidden_from_user) 
WHERE hidden_from_user = TRUE;

-- Update RLS policies to allow users to update their own attempts (for soft delete)
-- Note: Users can only mark as hidden, not delete

COMMENT ON COLUMN exam_attempts.hidden_from_user IS 'Soft delete flag - true means hidden from user view but visible to admin';
COMMENT ON COLUMN exam_attempts.hidden_at IS 'Timestamp when user soft-deleted this attempt';


