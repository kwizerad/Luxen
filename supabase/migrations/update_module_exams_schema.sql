-- Update module exam schema to support full exam studio requirements
-- and soft deletes for courses/modules/lessons.

-- ============================================================================
-- COURSE LANGUAGES: soft delete, status, allow multiple courses per language
-- ============================================================================
ALTER TABLE course_languages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

-- Remove the unique constraint on language so admins can register multiple courses per language.
ALTER TABLE course_languages
  DROP CONSTRAINT IF EXISTS course_languages_language_key;
DROP INDEX IF EXISTS course_languages_language_key;

-- Migrate existing is_published values to status
UPDATE course_languages SET status = 'published' WHERE is_published = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_course_languages_status ON course_languages(status);
CREATE INDEX IF NOT EXISTS idx_course_languages_deleted_at ON course_languages(deleted_at);

-- ============================================================================
-- COURSE MODULES: soft delete, status
-- ============================================================================
ALTER TABLE course_modules
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

UPDATE course_modules SET status = 'published' WHERE is_published = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_course_modules_status ON course_modules(status);
CREATE INDEX IF NOT EXISTS idx_course_modules_deleted_at ON course_modules(deleted_at);

-- ============================================================================
-- COURSE LESSONS: soft delete, status, marks support
-- ============================================================================
ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

UPDATE course_lessons SET status = 'published' WHERE is_published = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS idx_course_lessons_status ON course_lessons(status);
CREATE INDEX IF NOT EXISTS idx_course_lessons_deleted_at ON course_lessons(deleted_at);

-- ============================================================================
-- MODULE EXAM SETTINGS: more config options
-- ============================================================================
ALTER TABLE module_exam_settings
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Module Exam',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS passing_percentage INTEGER NOT NULL DEFAULT 70 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
  ALTER COLUMN max_attempts DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS show_results_immediately BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_explanations BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_review BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migrate old passing_score values if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'module_exam_settings' AND column_name = 'passing_score'
  ) THEN
    UPDATE module_exam_settings SET passing_percentage = COALESCE(passing_score, 70) WHERE passing_score IS NOT NULL;
  END IF;
END $$;

ALTER TABLE module_exam_settings
  DROP COLUMN IF EXISTS passing_score;

CREATE INDEX IF NOT EXISTS idx_module_exam_settings_status ON module_exam_settings(status);
CREATE INDEX IF NOT EXISTS idx_module_exam_settings_deleted_at ON module_exam_settings(deleted_at);

-- ============================================================================
-- MODULE EXAM QUESTIONS: type, points, soft delete
-- ============================================================================
ALTER TABLE module_exam_questions
  DROP CONSTRAINT IF EXISTS module_exam_questions_type_check,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (type IN ('multiple_choice', 'multiple_select', 'true_false', 'matching', 'short_answer')),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS randomize_answer_order BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS points NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (points >= 0),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_module_exam_questions_type ON module_exam_questions(type);
CREATE INDEX IF NOT EXISTS idx_module_exam_questions_deleted_at ON module_exam_questions(deleted_at);

-- ============================================================================
-- LESSON ATTACHMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson ON lesson_attachments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_deleted_at ON lesson_attachments(deleted_at);

ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR LESSON ATTACHMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all lesson attachments" ON lesson_attachments;
CREATE POLICY "Admins can view all lesson attachments" ON lesson_attachments
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

DROP POLICY IF EXISTS "Admins can insert lesson attachments" ON lesson_attachments;
CREATE POLICY "Admins can insert lesson attachments" ON lesson_attachments
  FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

DROP POLICY IF EXISTS "Admins can update lesson attachments" ON lesson_attachments;
CREATE POLICY "Admins can update lesson attachments" ON lesson_attachments
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

DROP POLICY IF EXISTS "Admins can delete lesson attachments" ON lesson_attachments;
CREATE POLICY "Admins can delete lesson attachments" ON lesson_attachments
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

DROP POLICY IF EXISTS "Students can view lesson attachments from published lessons" ON lesson_attachments;
CREATE POLICY "Students can view lesson attachments from published lessons" ON lesson_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_lessons
      WHERE course_lessons.id = lesson_attachments.lesson_id
      AND course_lessons.status = 'published'
      AND course_lessons.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM course_modules
        WHERE course_modules.id = course_lessons.module_id
        AND course_modules.status = 'published'
        AND course_modules.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM course_languages
          WHERE course_languages.id = course_modules.language_id
          AND course_languages.status = 'published'
          AND course_languages.deleted_at IS NULL
        )
      )
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- TRIGGER FUNCTION: update_updated_at_column (reusable)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to new/updated tables
DROP TRIGGER IF EXISTS update_module_exam_settings_updated_at ON module_exam_settings;
CREATE TRIGGER update_module_exam_settings_updated_at
  BEFORE UPDATE ON module_exam_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_module_exam_questions_updated_at ON module_exam_questions;
CREATE TRIGGER update_module_exam_questions_updated_at
  BEFORE UPDATE ON module_exam_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_attachments_updated_at ON lesson_attachments;
CREATE TRIGGER update_lesson_attachments_updated_at
  BEFORE UPDATE ON lesson_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: enforce single exam per module using status/deleted_at
-- ============================================================================
CREATE OR REPLACE FUNCTION check_single_module_exam()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM module_exam_settings
    WHERE module_id = NEW.module_id
    AND id <> NEW.id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A module can only have one exam';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_single_module_exam ON module_exam_settings;
CREATE TRIGGER trg_check_single_module_exam
  BEFORE INSERT OR UPDATE ON module_exam_settings
  FOR EACH ROW
  EXECUTE FUNCTION check_single_module_exam();

-- ============================================================================
-- STORAGE BUCKET FOR COURSE ASSETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-assets',
  'course-assets',
  true,
  52428800,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to read public course assets
DROP POLICY IF EXISTS "Anyone can read course assets" ON storage.objects;
CREATE POLICY "Anyone can read course assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-assets');

-- Only admins can upload to course assets
DROP POLICY IF EXISTS "Admins can upload course assets" ON storage.objects;
CREATE POLICY "Admins can upload course assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-assets' AND
    (
      auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'Navo@admin.jn'
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update course assets" ON storage.objects;
CREATE POLICY "Admins can update course assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'course-assets' AND
    (
      auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'Navo@admin.jn'
      )
    )
  );

DROP POLICY IF EXISTS "Admins can delete course assets" ON storage.objects;
CREATE POLICY "Admins can delete course assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-assets' AND
    (
      auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'Navo@admin.jn'
      )
    )
  );

-- ============================================================================
-- UPDATE RLS POLICIES TO RESPECT SOFT DELETE AND STATUS
-- ============================================================================

-- Course languages
DROP POLICY IF EXISTS "Students can view published language courses" ON course_languages;
CREATE POLICY "Students can view published language courses" ON course_languages
  FOR SELECT USING (
    status = 'published' AND deleted_at IS NULL AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- Course modules
DROP POLICY IF EXISTS "Students can view published modules from published languages" ON course_modules;
CREATE POLICY "Students can view published modules from published languages" ON course_modules
  FOR SELECT USING (
    status = 'published' AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM course_languages
      WHERE course_languages.id = course_modules.language_id
      AND course_languages.status = 'published'
      AND course_languages.deleted_at IS NULL
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- Course lessons
DROP POLICY IF EXISTS "Students can view lessons from published modules and languages" ON course_lessons;
CREATE POLICY "Students can view lessons from published modules and languages" ON course_lessons
  FOR SELECT USING (
    status = 'published' AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = course_lessons.module_id
      AND course_modules.status = 'published'
      AND course_modules.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM course_languages
        WHERE course_languages.id = course_modules.language_id
        AND course_languages.status = 'published'
        AND course_languages.deleted_at IS NULL
      )
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- Module exam settings
DROP POLICY IF EXISTS "Students can view module exam settings for published modules" ON module_exam_settings;
CREATE POLICY "Students can view module exam settings for published modules" ON module_exam_settings
  FOR SELECT USING (
    status = 'published' AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = module_exam_settings.module_id
      AND course_modules.status = 'published'
      AND course_modules.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM course_languages
        WHERE course_languages.id = course_modules.language_id
        AND course_languages.status = 'published'
        AND course_languages.deleted_at IS NULL
      )
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- Module exam questions
DROP POLICY IF EXISTS "Students can view published module exam questions" ON module_exam_questions;
CREATE POLICY "Students can view published module exam questions" ON module_exam_questions
  FOR SELECT USING (
    module_exam_questions.deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM module_exam_settings
      WHERE module_exam_settings.module_id = module_exam_questions.module_id
      AND module_exam_settings.status = 'published'
      AND module_exam_settings.deleted_at IS NULL
    ) AND
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = module_exam_questions.module_id
      AND course_modules.status = 'published'
      AND course_modules.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM course_languages
        WHERE course_languages.id = course_modules.language_id
        AND course_languages.status = 'published'
        AND course_languages.deleted_at IS NULL
      )
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );
