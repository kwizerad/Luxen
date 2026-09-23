-- Migration: Add submission_reason to exam_attempts for tracking auto-submit causes
-- Tracks whether exam was submitted normally, auto-submitted on page close, or auto-submitted due to cheating

ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS submission_reason TEXT DEFAULT 'manual';
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS violation_summary TEXT;

COMMENT ON COLUMN exam_attempts.submission_reason IS 'How the exam was submitted: manual, page_closed, cheating_violation, time_expired';
COMMENT ON COLUMN exam_attempts.violation_summary IS 'Summary of violations that caused auto-submission (null if no violations)';
