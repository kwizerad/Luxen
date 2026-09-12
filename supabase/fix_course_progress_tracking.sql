-- ==============================================================================
-- Fix and Verify Course Progress Tracking Tables & Policies in Supabase
-- Run this script in the Supabase SQL Editor if course progress is not storing.
-- ==============================================================================

-- 1. Create or update student_module_progress table
CREATE TABLE IF NOT EXISTS public.student_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL,
  lessons_completed INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  exam_passed BOOLEAN DEFAULT FALSE,
  exam_score NUMERIC DEFAULT 0,
  exam_attempts INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  exceeded_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Ensure all columns exist if table was already created earlier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_module_progress' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE public.student_module_progress ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_module_progress' AND column_name = 'exceeded_time_seconds') THEN
    ALTER TABLE public.student_module_progress ADD COLUMN exceeded_time_seconds INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_module_progress' AND column_name = 'exam_passed') THEN
    ALTER TABLE public.student_module_progress ADD COLUMN exam_passed BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_module_progress' AND column_name = 'exam_score') THEN
    ALTER TABLE public.student_module_progress ADD COLUMN exam_score NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_module_progress' AND column_name = 'exam_attempts') THEN
    ALTER TABLE public.student_module_progress ADD COLUMN exam_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2. Create or update student_lesson_progress table
CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL,
  module_id UUID NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  exceeded_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Ensure all columns exist in student_lesson_progress
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_lesson_progress' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE public.student_lesson_progress ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_lesson_progress' AND column_name = 'exceeded_time_seconds') THEN
    ALTER TABLE public.student_lesson_progress ADD COLUMN exceeded_time_seconds INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_lesson_progress' AND column_name = 'completed_at') THEN
    ALTER TABLE public.student_lesson_progress ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Create indexes for high performance
CREATE INDEX IF NOT EXISTS idx_student_module_prog_user_module ON public.student_module_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_prog_user_lesson ON public.student_lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_prog_user_module ON public.student_lesson_progress(user_id, module_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.student_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can manage their own module progress" ON public.student_module_progress;
DROP POLICY IF EXISTS "Users can read their own module progress" ON public.student_module_progress;
DROP POLICY IF EXISTS "Users can insert their own module progress" ON public.student_module_progress;
DROP POLICY IF EXISTS "Users can update their own module progress" ON public.student_module_progress;
DROP POLICY IF EXISTS "Admins can view all module progress" ON public.student_module_progress;

DROP POLICY IF EXISTS "Users can manage their own lesson progress" ON public.student_lesson_progress;
DROP POLICY IF EXISTS "Users can read their own lesson progress" ON public.student_lesson_progress;
DROP POLICY IF EXISTS "Users can insert their own lesson progress" ON public.student_lesson_progress;
DROP POLICY IF EXISTS "Users can update their own lesson progress" ON public.student_lesson_progress;
DROP POLICY IF EXISTS "Admins can view all lesson progress" ON public.student_lesson_progress;

-- 6. Create robust RLS Policies for student_module_progress
CREATE POLICY "Users can manage their own module progress"
  ON public.student_module_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Create robust RLS Policies for student_lesson_progress
CREATE POLICY "Users can manage their own lesson progress"
  ON public.student_lesson_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Grant table permissions
GRANT ALL ON public.student_module_progress TO authenticated, service_role;
GRANT ALL ON public.student_lesson_progress TO authenticated, service_role;
