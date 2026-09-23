-- Add Language Courses Support
-- This migration separates the course into three language-specific courses
-- with publish/draft capabilities at language and module levels

-- ============================================================================
-- COURSE LANGUAGES (Separate courses for each language - Dynamic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_languages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_languages_language ON course_languages(language);
CREATE INDEX IF NOT EXISTS idx_course_languages_published ON course_languages(is_published);
CREATE INDEX IF NOT EXISTS idx_course_languages_order ON course_languages(order_index);

-- Enable RLS
ALTER TABLE course_languages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_languages
-- Admins can do everything
CREATE POLICY "Admins can view all language courses" ON course_languages
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can insert language courses" ON course_languages
  FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can update language courses" ON course_languages
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can delete language courses" ON course_languages
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Students can only view published language courses
CREATE POLICY "Students can view published language courses" ON course_languages
  FOR SELECT USING (
    is_published = true AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- UPDATE COURSE MODULES TO ASSOCIATE WITH LANGUAGE COURSES
-- ============================================================================
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES course_languages(id) ON DELETE CASCADE;

-- Create index for language_id
CREATE INDEX IF NOT EXISTS idx_course_modules_language ON course_modules(language_id);

-- Update RLS policies for course_modules to check language publish status
-- Drop existing policies
DROP POLICY IF EXISTS "Students can view published modules" ON course_modules;

-- Create new policy that checks both language and module publish status
CREATE POLICY "Students can view published modules from published languages" ON course_modules
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM course_languages
      WHERE course_languages.id = course_modules.language_id
      AND course_languages.is_published = true
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- UPDATE COURSE LESSONS RLS POLICIES
-- ============================================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Students can view published lessons" ON course_lessons;

-- Create new policy that checks language and module publish status
-- Lessons don't have is_published check - they're visible if module is published
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
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- UPDATE MODULE EXAM SETTINGS RLS POLICIES
-- ============================================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Students can view module exam settings" ON module_exam_settings;

-- Create new policy that checks language and module publish status
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
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- INSERT DEFAULT LANGUAGE COURSES
-- ============================================================================
INSERT INTO course_languages (language, title, description, is_published, order_index) VALUES
  ('English', 'English Course', 'Traffic school course in English', false, 0),
  ('Kinyarwanda', 'Kinyarwanda Course', 'Traffic school course in Kinyarwanda', false, 1),
  ('French', 'French Course', 'Traffic school course in French', false, 2)
ON CONFLICT (language) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_published = EXCLUDED.is_published,
  order_index = EXCLUDED.order_index;

-- ============================================================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to course_languages
DROP TRIGGER IF EXISTS update_course_languages_updated_at ON course_languages;
CREATE TRIGGER update_course_languages_updated_at
  BEFORE UPDATE ON course_languages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
