-- Migration: Add submission_reason and violation_summary columns to exam_attempts
-- Created: 2026-08-15

ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS submission_reason TEXT DEFAULT 'manual'
  CHECK (submission_reason IN ('manual', 'page_closed', 'cheating_violation', 'time_expired'));

ALTER TABLE exam_attempts
ADD COLUMN IF NOT EXISTS violation_summary TEXT;

COMMENT ON COLUMN exam_attempts.submission_reason IS 'How the exam was submitted: manual, page_closed, cheating_violation, or time_expired';
COMMENT ON COLUMN exam_attempts.violation_summary IS 'Summary of cheating violations detected during the exam';
