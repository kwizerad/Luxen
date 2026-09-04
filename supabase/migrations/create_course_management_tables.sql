-- Course Management System for Traffic School
-- This migration creates tables for modules, lessons, module exams, and student progress

-- ============================================================================
-- COURSE MODULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  title_translations JSONB DEFAULT '{}',
  description_translations JSONB DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON course_modules(order_index);
CREATE INDEX IF NOT EXISTS idx_course_modules_published ON course_modules(is_published);

-- Enable RLS
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_modules
-- Admins can do everything
CREATE POLICY "Admins can view all modules" ON course_modules
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can insert modules" ON course_modules
  FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can update modules" ON course_modules
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can delete modules" ON course_modules
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Students can only view published modules
CREATE POLICY "Students can view published modules" ON course_modules
  FOR SELECT USING (
    is_published = true AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- COURSE LESSONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  title_translations JSONB DEFAULT '{}',
  content_translations JSONB DEFAULT '{}',
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'image', 'document')),
  media_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON course_lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_lessons_published ON course_lessons(is_published);

-- Enable RLS
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_lessons
-- Admins can do everything
CREATE POLICY "Admins can view all lessons" ON course_lessons
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can insert lessons" ON course_lessons
  FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can update lessons" ON course_lessons
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can delete lessons" ON course_lessons
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Students can only view published lessons from published modules
CREATE POLICY "Students can view published lessons" ON course_lessons
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = course_lessons.module_id
      AND course_modules.is_published = true
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- MODULE EXAM SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS module_exam_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL UNIQUE REFERENCES course_modules(id) ON DELETE CASCADE,
  question_count INTEGER NOT NULL DEFAULT 20,
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  passing_score INTEGER NOT NULL DEFAULT 70,
  randomize_questions BOOLEAN NOT NULL DEFAULT true,
  randomize_answers BOOLEAN NOT NULL DEFAULT true,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_module_exam_settings_module ON module_exam_settings(module_id);

-- Enable RLS
ALTER TABLE module_exam_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_exam_settings
-- Admins can do everything
CREATE POLICY "Admins can view all module exam settings" ON module_exam_settings
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can insert module exam settings" ON module_exam_settings
  FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can update module exam settings" ON module_exam_settings
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can delete module exam settings" ON module_exam_settings
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Students can view settings for published modules
CREATE POLICY "Students can view module exam settings" ON module_exam_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = module_exam_settings.module_id
      AND course_modules.is_published = true
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- MODULE EXAM QUESTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS module_exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  question TEXT,
  question_image TEXT,
  option_a TEXT,
  option_a_image TEXT,
  option_b TEXT,
  option_b_image TEXT,
  option_c TEXT,
  option_c_image TEXT,
  option_d TEXT,
  option_d_image TEXT,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_module_exam_questions_module ON module_exam_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_exam_questions_order ON module_exam_questions(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_module_exam_questions_published ON module_exam_questions(is_published);

-- Enable RLS
ALTER TABLE module_exam_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_exam_questions
-- Admins can do everything
CREATE POLICY "Admins can view all module exam questions" ON module_exam_questions
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can insert module exam questions" ON module_exam_questions
  FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can update module exam questions" ON module_exam_questions
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

CREATE POLICY "Admins can delete module exam questions" ON module_exam_questions
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Students can view published questions from published modules
CREATE POLICY "Students can view published module exam questions" ON module_exam_questions
  FOR SELECT USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM course_modules
      WHERE course_modules.id = module_exam_questions.module_id
      AND course_modules.is_published = true
    ) AND
    auth.jwt()->'user_metadata'->>'role' = 'Student'
  );

-- ============================================================================
-- STUDENT MODULE PROGRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_module_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  exam_passed BOOLEAN NOT NULL DEFAULT false,
  exam_attempts INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_module_progress_user ON student_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_module_progress_module ON student_module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_student_module_progress_completed ON student_module_progress(exam_passed);

-- Enable RLS
ALTER TABLE student_module_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_module_progress
-- Users can view their own progress
CREATE POLICY "Users can view own module progress" ON student_module_progress
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Admins can view all progress
CREATE POLICY "Admins can view all module progress" ON student_module_progress
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Users can insert their own progress
CREATE POLICY "Users can insert own module progress" ON student_module_progress
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update their own progress
CREATE POLICY "Users can update own module progress" ON student_module_progress
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Admins can update all progress
CREATE POLICY "Admins can update all module progress" ON student_module_progress
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- ============================================================================
-- STUDENT LESSON PROGRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_user ON student_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_lesson ON student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_module ON student_lesson_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_completed ON student_lesson_progress(completed);

-- Enable RLS
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_lesson_progress
-- Users can view their own progress
CREATE POLICY "Users can view own lesson progress" ON student_lesson_progress
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Admins can view all progress
CREATE POLICY "Admins can view all lesson progress" ON student_lesson_progress
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Users can insert their own progress
CREATE POLICY "Users can insert own lesson progress" ON student_lesson_progress
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update their own progress
CREATE POLICY "Users can update own lesson progress" ON student_lesson_progress
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Admins can update all progress
CREATE POLICY "Admins can update all lesson progress" ON student_lesson_progress
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- ============================================================================
-- MODULE EXAM ATTEMPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS module_exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  module_title TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  score_percentage INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_module_exam_attempts_user ON module_exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_module_exam_attempts_module ON module_exam_attempts(module_id);
CREATE INDEX IF NOT EXISTS idx_module_exam_attempts_status ON module_exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_module_exam_attempts_passed ON module_exam_attempts(passed);

-- Enable RLS
ALTER TABLE module_exam_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_exam_attempts
-- Users can view their own attempts
CREATE POLICY "Users can view own module exam attempts" ON module_exam_attempts
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Admins can view all attempts
CREATE POLICY "Admins can view all module exam attempts" ON module_exam_attempts
  FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- Users can insert their own attempts
CREATE POLICY "Users can insert own module exam attempts" ON module_exam_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update their own attempts
CREATE POLICY "Users can update own module exam attempts" ON module_exam_attempts
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Admins can update all attempts
CREATE POLICY "Admins can update all module exam attempts" ON module_exam_attempts
  FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'Admin' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'Navo@admin.jn'
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that need updated_at
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_exam_settings_updated_at BEFORE UPDATE ON module_exam_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_exam_questions_updated_at BEFORE UPDATE ON module_exam_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_module_progress_updated_at BEFORE UPDATE ON student_module_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_lesson_progress_updated_at BEFORE UPDATE ON student_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_exam_attempts_updated_at BEFORE UPDATE ON module_exam_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MULTILINGUAL SUPPORT (English, Kinyarwanda, French)
-- ============================================================================
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS title_translations JSONB DEFAULT '{}';
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS description_translations JSONB DEFAULT '{}';
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS title_translations JSONB DEFAULT '{}';
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS content_translations JSONB DEFAULT '{}';

UPDATE course_modules SET title_translations = COALESCE(title_translations, '{}'), description_translations = COALESCE(description_translations, '{}') WHERE title_translations IS NULL OR description_translations IS NULL;
UPDATE course_lessons SET title_translations = COALESCE(title_translations, '{}'), content_translations = COALESCE(content_translations, '{}') WHERE title_translations IS NULL OR content_translations IS NULL;
