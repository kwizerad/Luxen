-- Module Journey & Exam System Overhaul
-- Adds: exam_retake_requests table, exam_type on attempts, midterm config on course_languages,
-- time_spent_seconds on student_module_progress, retake_limit on module_exam_settings

-- ============================================================================
-- 1. NEW TABLE: exam_retake_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_retake_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('module', 'midterm', 'final')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_retake_requests_user ON exam_retake_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_retake_requests_module ON exam_retake_requests(module_id);
CREATE INDEX IF NOT EXISTS idx_exam_retake_requests_status ON exam_retake_requests(status);
CREATE INDEX IF NOT EXISTS idx_exam_retake_requests_exam_type ON exam_retake_requests(exam_type);

ALTER TABLE exam_retake_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own retake requests
CREATE POLICY "Students can view own retake requests" ON exam_retake_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all retake requests
CREATE POLICY "Admins can view all retake requests" ON exam_retake_requests
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Students can insert their own retake requests
CREATE POLICY "Students can insert own retake requests" ON exam_retake_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Students can update their own retake requests (e.g., cancel)
CREATE POLICY "Students can update own retake requests" ON exam_retake_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can update all retake requests (approve/deny)
CREATE POLICY "Admins can update all retake requests" ON exam_retake_requests
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Admins can delete retake requests
CREATE POLICY "Admins can delete retake requests" ON exam_retake_requests
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_exam_retake_requests_updated_at ON exam_retake_requests;
CREATE TRIGGER update_exam_retake_requests_updated_at
  BEFORE UPDATE ON exam_retake_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ALTER module_exam_attempts: add exam_type, make module_id nullable
-- ============================================================================
ALTER TABLE module_exam_attempts
  ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL DEFAULT 'module' CHECK (exam_type IN ('module', 'midterm', 'final'));

-- Make module_id nullable for final exam attempts (no single module)
ALTER TABLE module_exam_attempts ALTER COLUMN module_id DROP NOT NULL;

-- Make module_title nullable for final exam attempts
ALTER TABLE module_exam_attempts ALTER COLUMN module_title DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_module_exam_attempts_exam_type ON module_exam_attempts(exam_type);

-- ============================================================================
-- 3. ALTER student_module_progress: add time_spent_seconds
-- ============================================================================
ALTER TABLE student_module_progress
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- 4. ALTER module_exam_settings: add retake_limit
-- ============================================================================
ALTER TABLE module_exam_settings
  ADD COLUMN IF NOT EXISTS retake_limit INTEGER;

-- ============================================================================
-- 5. ALTER course_languages: add midterm config columns
-- ============================================================================
ALTER TABLE course_languages
  ADD COLUMN IF NOT EXISTS midterm_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS midterm_interval INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS midterm_question_count INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS midterm_duration_minutes INTEGER NOT NULL DEFAULT 30;

-- Add CHECK constraint for midterm_interval (minimum 2)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'midterm_interval_check'
    AND table_name = 'course_languages'
  ) THEN
    ALTER TABLE course_languages
      ADD CONSTRAINT midterm_interval_check CHECK (midterm_interval >= 2);
  END IF;
END $$;
