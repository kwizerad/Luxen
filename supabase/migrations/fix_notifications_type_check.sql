-- Migration: Fix notifications_type_check constraint to include all valid notification types
-- The existing check constraint was too restrictive and rejected types like 'admin_message', 'exam_available', etc.

-- 1. Find and drop the existing notifications_type_check constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND contype = 'c'
    AND conname LIKE '%type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- 2. Add the updated check constraint with all valid notification types
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'info',
      'success',
      'warning',
      'error',
      'exam',
      'system',
      'user_joined',
      'exam_submitted',
      'admin_update',
      'announcement',
      'admin_message',
      'language_published',
      'module_published',
      'lesson_published',
      'exam_result',
      'exam_available',
      'course_updated',
      'reminder'
    )
  );

-- 3. Also fix the priority check constraint if it exists
DO $$
DECLARE
  priority_constraint_name TEXT;
BEGIN
  SELECT conname INTO priority_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND contype = 'c'
    AND conname LIKE '%priority%';

  IF priority_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS %I', priority_constraint_name);
  END IF;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_priority_check
  CHECK (priority IN ('urgent', 'normal', 'low'));
