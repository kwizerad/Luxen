-- Add exceeded_time_seconds column to track time spent beyond admin-set estimated time
-- This is for reporting only and does not count toward module/course completion time
ALTER TABLE student_lesson_progress
  ADD COLUMN IF NOT EXISTS exceeded_time_seconds INTEGER NOT NULL DEFAULT 0;

-- Add exceeded_time_seconds to student_module_progress for module-level reporting
ALTER TABLE student_module_progress
  ADD COLUMN IF NOT EXISTS exceeded_time_seconds INTEGER NOT NULL DEFAULT 0;
