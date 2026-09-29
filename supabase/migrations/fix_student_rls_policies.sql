-- Fix RLS policies to allow students to see published content without requiring explicit role
-- This makes the policies more permissive for non-admin users
-- Simplified approach that doesn't query auth.users table

-- Drop existing student policies (both old and new names)
DROP POLICY IF EXISTS "Students can view published language courses" ON course_languages;
DROP POLICY IF EXISTS "Non-admins can view published language courses" ON course_languages;
DROP POLICY IF EXISTS "Students can view published modules from published languages" ON course_modules;
DROP POLICY IF EXISTS "Non-admins can view published modules from published languages" ON course_modules;
DROP POLICY IF EXISTS "Students can view lessons from published modules and languages" ON course_lessons;
DROP POLICY IF EXISTS "Non-admins can view lessons from published modules and languages" ON course_lessons;
DROP POLICY IF EXISTS "Students can view module exam settings for published modules" ON module_exam_settings;
DROP POLICY IF EXISTS "Non-admins can view module exam settings for published modules" ON module_exam_settings;

-- Create permissive policies for non-admin users
CREATE POLICY "Non-admins can view published language courses" ON course_languages
  FOR SELECT USING (
    is_published = true AND
    (auth.jwt()->'user_metadata'->>'role' IS NULL OR auth.jwt()->'user_metadata'->>'role' != 'Admin')
  );

CREATE POLICY "Non-admins can view published modules from published languages" ON course_modules
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM course_languages
      WHERE course_languages.id = course_modules.language_id
      AND course_languages.is_published = true
    ) AND
    (auth.jwt()->'user_metadata'->>'role' IS NULL OR auth.jwt()->'user_metadata'->>'role' != 'Admin')
  );

CREATE POLICY "Non-admins can view lessons from published modules and languages" ON course_lessons
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
    (auth.jwt()->'user_metadata'->>'role' IS NULL OR auth.jwt()->'user_metadata'->>'role' != 'Admin')
  );

CREATE POLICY "Non-admins can view module exam settings for published modules" ON module_exam_settings
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
    (auth.jwt()->'user_metadata'->>'role' IS NULL OR auth.jwt()->'user_metadata'->>'role' != 'Admin')
  );