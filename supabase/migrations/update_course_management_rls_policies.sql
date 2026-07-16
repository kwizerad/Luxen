-- Update RLS policies for course management tables
-- This drops existing policies and recreates them with email check

-- ============================================================================
-- COURSE MODULES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all modules" ON course_modules;
DROP POLICY IF EXISTS "Admins can insert modules" ON course_modules;
DROP POLICY IF EXISTS "Admins can update modules" ON course_modules;
DROP POLICY IF EXISTS "Admins can delete modules" ON course_modules;

CREATE POLICY "Admins can view all modules" ON course_modules
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can insert modules" ON course_modules
  FOR INSERT WITH CHECK (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update modules" ON course_modules
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can delete modules" ON course_modules
  FOR DELETE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

-- ============================================================================
-- COURSE LESSONS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can insert lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON course_lessons;

CREATE POLICY "Admins can view all lessons" ON course_lessons
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can insert lessons" ON course_lessons
  FOR INSERT WITH CHECK (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update lessons" ON course_lessons
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can delete lessons" ON course_lessons
  FOR DELETE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

-- ============================================================================
-- MODULE EXAM SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Admins can insert module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Admins can update module exam settings" ON module_exam_settings;
DROP POLICY IF EXISTS "Admins can delete module exam settings" ON module_exam_settings;

CREATE POLICY "Admins can view all module exam settings" ON module_exam_settings
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can insert module exam settings" ON module_exam_settings
  FOR INSERT WITH CHECK (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update module exam settings" ON module_exam_settings
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can delete module exam settings" ON module_exam_settings
  FOR DELETE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

-- ============================================================================
-- MODULE EXAM QUESTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Admins can insert module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Admins can update module exam questions" ON module_exam_questions;
DROP POLICY IF EXISTS "Admins can delete module exam questions" ON module_exam_questions;

CREATE POLICY "Admins can view all module exam questions" ON module_exam_questions
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can insert module exam questions" ON module_exam_questions
  FOR INSERT WITH CHECK (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update module exam questions" ON module_exam_questions
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can delete module exam questions" ON module_exam_questions
  FOR DELETE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

-- ============================================================================
-- STUDENT MODULE PROGRESS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all module progress" ON student_module_progress;
DROP POLICY IF EXISTS "Admins can update all module progress" ON student_module_progress;

CREATE POLICY "Admins can view all module progress" ON student_module_progress
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update all module progress" ON student_module_progress
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

-- ============================================================================
-- STUDENT LESSON PROGRESS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all lesson progress" ON student_lesson_progress;
DROP POLICY IF EXISTS "Admins can update all lesson progress" ON student_lesson_progress;

CREATE POLICY "Admins can view all lesson progress" ON student_lesson_progress
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update all lesson progress" ON student_lesson_progress
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

-- ============================================================================
-- MODULE EXAM ATTEMPTS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all module exam attempts" ON module_exam_attempts;
DROP POLICY IF EXISTS "Admins can update all module exam attempts" ON module_exam_attempts;

CREATE POLICY "Admins can view all module exam attempts" ON module_exam_attempts
  FOR SELECT USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );

CREATE POLICY "Admins can update all module exam attempts" ON module_exam_attempts
  FOR UPDATE USING (
    auth.jwt()::jsonb->>'email' = 'Navo@admin.jn'
  );
