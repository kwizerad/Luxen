-- Add exam_type column to module_exam_settings
-- Stores which question types are included in the exam (comma-separated)
-- e.g. "multiple_choice,true_false,short_answer"
-- Empty string means all types included
ALTER TABLE module_exam_settings
  ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL DEFAULT '';

-- Update existing rows to empty string (meaning all types included)
UPDATE module_exam_settings SET exam_type = '' WHERE exam_type IS NULL;

-- Set defaults: max_attempts = 2, duration_minutes = 20, passing_percentage = 70, question_count = 20
UPDATE module_exam_settings SET max_attempts = 2 WHERE max_attempts IS NULL OR max_attempts = 3;
UPDATE module_exam_settings SET duration_minutes = 20 WHERE duration_minutes IS NULL;
UPDATE module_exam_settings SET passing_percentage = 70 WHERE passing_percentage IS NULL;
UPDATE module_exam_settings SET question_count = 20 WHERE question_count IS NULL;

-- Drop time_limit_minutes (merged into duration_minutes)
ALTER TABLE module_exam_settings DROP COLUMN IF EXISTS time_limit_minutes;
