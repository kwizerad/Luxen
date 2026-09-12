-- Migration: Fix RLS policies for course management tables to avoid auth.users access
-- Created: 2026-07-18
-- Reason: auth.users table is not accessible to regular users, causing permission denied errors

-- Helper function to check admin status from JWT (avoids auth.users permission issues)
CREATE OR REPLACE FUNCTION is_admin_from_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COURSE MODULES
-- ============================================================================

-- Drop all existing policies for course_modules
DROP POLICY IF EXISTS "Admins can view all modules" ON course_modules;
DROP POLICY IF EXISTS "Admins can insert modules" ON course_modules;
DROP POLICY IF EXISTS "Admins can update modules" ON course_modules;
DROP POLICY IF EXISTS "Admins can delete modules" ON course_modules;
DROP POLICY IF EXISTS "Students can view published modules from published languages" ON course_modules;
DROP POLICY IF EXISTS "Students can view published modules" ON course_modules;

CREATE POLICY "Admins can view all modules" ON course_modules
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can insert modules" ON course_modules
  FOR INSERT WITH CHECK (is_admin_from_jwt());

CREATE POLICY "Admins can update modules" ON course_modules
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Admins can delete modules" ON course_modules
  FOR DELETE USING (is_admin_from_jwt());

CREATE POLICY "Students can view published modules from published languages" ON course_modules
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM course_languages
      WHERE course_languages.id = course_modules.language_id
      AND course_languages.is_published = true
    ) AND
    LOWER(auth.jwt()->'user_metadata'->>'role') = 'student'
  );

-- ============================================================================
-- COURSE LESSONS
-- ============================================================================

-- Drop all existing policies for course_lessons
DROP POLICY IF EXISTS "Admins can view all lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can insert lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON course_lessons;
DROP POLICY IF EXISTS "Students can view lessons from published modules and languages" ON course_lessons;
DROP POLICY IF EXISTS "Students can view published lessons" ON course_lessons;

CREATE POLICY "Admins can view all lessons" ON course_lessons
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can insert lessons" ON course_lessons
  FOR INSERT WITH CHECK (is_admin_from_jwt());

CREATE POLICY "Admins can update lessons" ON course_lessons
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Admins can delete lessons" ON course_lessons
  FOR DELETE USING (is_admin_from_jwt());

CREATE POLICY "Students can view lessons from published modules and languages" ON course_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = course_lessons.module_id
      AND course_modules.is_published = true
      AND EXISTS (
        SELECT 1 FROM course_languages
        WHERE course_languages.id = course_modules.language_id
        AND course_languages.is_published = true
      )
    ) AND
    LOWER(auth.jwt()->'user_metadata'->>'role') = 'student'
  );

-- ============================================================================
-- MODULE EXAM SETTINGS
-- ============================================================================

-- Drop all existing policies for module_exam_settings
DROP POLICY IF EXISTS "Admins can view all module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Admins can insert module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Admins can update module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Admins can delete module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Students can view module exam settings for published modules" ON module_exam_settings;
DROP POLICY IF EXISTS "Students can view module exam settings" ON module_exam_settings;

CREATE POLICY "Admins can view all module exam settings" ON module_exam_settings
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can insert module exam settings" ON module_exam_settings
  FOR INSERT WITH CHECK (is_admin_from_jwt());

CREATE POLICY "Admins can update module exam settings" ON module_exam_settings
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Admins can delete module exam settings" ON module_exam_settings
  FOR DELETE USING (is_admin_from_jwt());

CREATE POLICY "Students can view module exam settings for published modules" ON module_exam_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = module_exam_settings.module_id
      AND course_modules.is_published = true
      AND EXISTS (
        SELECT 1 FROM course_languages
        WHERE course_languages.id = course_modules.language_id
        AND course_languages.is_published = true
      )
    ) AND
    LOWER(auth.jwt()->'user_metadata'->>'role') = 'student'
  );

-- ============================================================================
-- MODULE EXAM QUESTIONS
-- ============================================================================

-- Drop all existing policies for module_exam_questions
DROP POLICY IF EXISTS "Admins can view all module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Admins can insert module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Admins can update module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Admins can delete module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Students can view published module exam questions" ON module_exam_questions;

CREATE POLICY "Admins can view all module exam questions" ON module_exam_questions
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can insert module exam questions" ON module_exam_questions
  FOR INSERT WITH CHECK (is_admin_from_jwt());

CREATE POLICY "Admins can update module exam questions" ON module_exam_questions
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Admins can delete module exam questions" ON module_exam_questions
  FOR DELETE USING (is_admin_from_jwt());

-- Students can view published module exam questions
CREATE POLICY "Students can view published module exam questions" ON module_exam_questions
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = module_exam_questions.module_id
      AND course_modules.is_published = true
      AND EXISTS (
        SELECT 1 FROM course_languages
        WHERE course_languages.id = course_modules.language_id
        AND course_languages.is_published = true
      )
    ) AND
    LOWER(auth.jwt()->'user_metadata'->>'role') = 'student'
  );

-- ============================================================================
-- STUDENT MODULE PROGRESS
-- ============================================================================

-- Drop all existing policies for student_module_progress
DROP POLICY IF EXISTS "Admins can view all module progress" ON student_module_progress;
DROP POLICY IF EXISTS "Admins can update all module progress" ON student_module_progress;
DROP POLICY IF EXISTS "Students can view own module progress" ON student_module_progress;
DROP POLICY IF EXISTS "Students can insert own module progress" ON student_module_progress;
DROP POLICY IF EXISTS "Students can update own module progress" ON student_module_progress;

CREATE POLICY "Admins can view all module progress" ON student_module_progress
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can update all module progress" ON student_module_progress
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Students can view own module progress" ON student_module_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can insert own module progress" ON student_module_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own module progress" ON student_module_progress
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STUDENT LESSON PROGRESS
-- ============================================================================

-- Drop all existing policies for student_lesson_progress
DROP POLICY IF EXISTS "Admins can view all lesson progress" ON student_lesson_progress;
DROP POLICY IF EXISTS "Admins can update all lesson progress" ON student_lesson_progress;
DROP POLICY IF EXISTS "Students can view own lesson progress" ON student_lesson_progress;
DROP POLICY IF EXISTS "Students can insert own lesson progress" ON student_lesson_progress;
DROP POLICY IF EXISTS "Students can update own lesson progress" ON student_lesson_progress;

CREATE POLICY "Admins can view all lesson progress" ON student_lesson_progress
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can update all lesson progress" ON student_lesson_progress
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Students can view own lesson progress" ON student_lesson_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can insert own lesson progress" ON student_lesson_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own lesson progress" ON student_lesson_progress
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MODULE EXAM ATTEMPTS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all module exam attempts" ON module_exam_attempts;
DROP POLICY IF EXISTS "Admins can update all module exam attempts" ON module_exam_attempts;
DROP POLICY IF EXISTS "Students can view own exam attempts" ON module_exam_attempts;
DROP POLICY IF EXISTS "Students can create own exam attempts" ON module_exam_attempts;

CREATE POLICY "Admins can view all module exam attempts" ON module_exam_attempts
  FOR SELECT USING (is_admin_from_jwt());

CREATE POLICY "Admins can update all module exam attempts" ON module_exam_attempts
  FOR UPDATE USING (is_admin_from_jwt());

CREATE POLICY "Students can view own exam attempts" ON module_exam_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can create own exam attempts" ON module_exam_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());
