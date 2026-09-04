-- Migration: Add is_limited toggle to user_exam_limits table
-- Created: 2026-05-02

-- Add is_limited column to control whether limits are enforced
ALTER TABLE user_exam_limits 
ADD COLUMN IF NOT EXISTS is_limited BOOLEAN NOT NULL DEFAULT true;

-- Update comments
COMMENT ON COLUMN user_exam_limits.is_limited IS 'Whether exam limits are enforced for this user (true=limited, false=unlimited)';

-- Update existing rows to have is_limited = true by default
UPDATE user_exam_limits 
SET is_limited = true 
WHERE is_limited IS NULL;
