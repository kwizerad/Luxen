-- ============================================================================
-- LUXEN / NAVO: MASTER SYSTEM OPTIMIZATION, INDEXES & RLS HARDENING
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- This script is 100% safe and idempotent.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 2. SYSTEM CONFIGURATION & REALTIME SYNC
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(key);

-- Seed critical system config defaults
INSERT INTO public.system_config (key, value, description)
VALUES 
  ('save_individual_exams_enabled', 'true', 'Allow or disallow saving individual exam attempts to database and user history'),
  ('save_group_exams_enabled', 'true', 'Allow or disallow saving group exam challenges and results to database and history'),
  ('standalone_exam_enabled', 'true', 'Enable standalone take exam page for all users'),
  ('services_page_enabled', 'true', 'Enable or disable the services page'),
  ('service_driver-hub_enabled', 'true', 'Enable or disable the driver hub service'),
  ('service_traffic-assistant_enabled', 'true', 'Enable or disable the AI traffic assistant & gazette search'),
  ('service_live-exam_enabled', 'true', 'Enable or disable the live exam service'),
  ('service_group-exam_enabled', 'true', 'Enable or disable the group exam service'),
  ('universal_exam_limit', '5', 'Universal daily exam limit applied to all students'),
  ('universal_passing_percentage', '60', 'Default passing percentage for exams'),
  ('security_violation_measures_enabled', 'true', 'Enable cheating detection measures during exams'),
  ('security_max_violations', '3', 'Maximum cheating violations before auto-submission'),
  ('security_fullscreen_enabled', 'true', 'Enforce fullscreen during exams'),
  ('security_tab_switch_enabled', 'true', 'Detect tab switching during exams'),
  ('theme_config', '{"light":{"primaryColor":"#2563eb","hoverBorderColor":"#1d4ed8"},"dark":{"primaryColor":"#3b82f6","hoverBorderColor":"#2563eb"},"glowIntensity":30}', 'Global theme primary colors applied to all users'),
  ('branding_config', '{"systemName":"Navo","logoUrl":null,"logoText":"N","adminEmail":"kwizeradiementwari@gmail.com"}', 'Global branding configuration for system name and logo'),
  ('official_gazette_articles', '[]', 'Official Gazette of Rwanda Traffic Code articles extracted from uploaded PDF')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

-- Enable RLS on system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow ALL users to read config
DROP POLICY IF EXISTS "Public and users can read system config" ON public.system_config;
DROP POLICY IF EXISTS "All users can read system config" ON public.system_config;
CREATE POLICY "Public and users can read system config"
  ON public.system_config FOR SELECT
  TO public
  USING (true);

-- Allow service_role to manage system config
DROP POLICY IF EXISTS "Service role can manage system config" ON public.system_config;
CREATE POLICY "Service role can manage system config"
  ON public.system_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admins to manage system config
DROP POLICY IF EXISTS "Admins can manage system config" ON public.system_config;
CREATE POLICY "Admins can manage system config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('kwizeradiementwari@gmail.com')
    OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER('kwizeradiementwari@gmail.com')
    OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- Enable Realtime publication for system_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'system_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
  END IF;
END $$;

-- ============================================================================
-- 3. EXAM ATTEMPTS TABLE COLUMNS & PERFORMANCE INDEXES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_attempts') THEN
    ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS submission_reason TEXT DEFAULT 'manual';
    ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS violation_summary TEXT;
    ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS hidden_from_user BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS soft_deleted BOOLEAN DEFAULT FALSE;

    CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_status_date ON public.exam_attempts(user_id, status, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_category_id ON public.exam_attempts(category_id);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_started_at ON public.exam_attempts(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_hidden ON public.exam_attempts(user_id) WHERE hidden_from_user = FALSE;

    DROP POLICY IF EXISTS "Users can soft delete own exam attempts" ON public.exam_attempts;
    CREATE POLICY "Users can soft delete own exam attempts"
      ON public.exam_attempts FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 4. EXAM QUESTIONS PERFORMANCE & SEARCH OPTIMIZATIONS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_questions') THEN
    CREATE INDEX IF NOT EXISTS idx_exam_questions_category_id ON public.exam_questions(category_id);
    CREATE INDEX IF NOT EXISTS idx_exam_questions_created_at ON public.exam_questions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_exam_questions_trgm_question ON public.exam_questions USING gin (question gin_trgm_ops);
  END IF;
END $$;

-- ============================================================================
-- 5. COURSE MODULES & LESSONS OPTIMIZATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_lessons') THEN
    CREATE INDEX IF NOT EXISTS idx_course_lessons_module_order ON public.course_lessons(module_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_course_lessons_created_at ON public.course_lessons(created_at);
    CREATE INDEX IF NOT EXISTS idx_course_lessons_trgm_title ON public.course_lessons USING gin (title gin_trgm_ops);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_lesson_progress') THEN
    CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_user_lesson ON public.student_lesson_progress(user_id, lesson_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_module_progress') THEN
    CREATE INDEX IF NOT EXISTS idx_student_module_progress_user_module ON public.student_module_progress(user_id, module_id);
  END IF;
END $$;

-- ============================================================================
-- 6. NOTIFICATIONS & ANNOUNCEMENT WIDGET FIXES
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_name TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_entity_id TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

    -- Drop constraints on notifications.type
    FOR r IN (
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.notifications'::regclass
        AND contype = 'c'
        AND (conname LIKE '%type%' OR pg_get_constraintdef(oid) LIKE '%type%')
    ) LOOP
      EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- Normalize invalid type values
    UPDATE public.notifications
    SET type = 'info'
    WHERE type IS NULL OR type NOT IN (
      'info', 'success', 'warning', 'error', 'exam', 'system', 'user_joined',
      'exam_submitted', 'admin_update', 'announcement', 'admin_message',
      'language_published', 'module_published', 'lesson_published', 'exam_result',
      'exam_available', 'course_updated', 'reminder', 'exam_challenge_invite', 'friend_request'
    );

    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (
        type IN (
          'info', 'success', 'warning', 'error', 'exam', 'system', 'user_joined',
          'exam_submitted', 'admin_update', 'announcement', 'admin_message',
          'language_published', 'module_published', 'lesson_published', 'exam_result',
          'exam_available', 'course_updated', 'reminder', 'exam_challenge_invite', 'friend_request'
        )
      );

    -- Drop constraints on notifications.priority
    FOR r IN (
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.notifications'::regclass
        AND contype = 'c'
        AND (conname LIKE '%priority%' OR pg_get_constraintdef(oid) LIKE '%priority%')
    ) LOOP
      EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    UPDATE public.notifications
    SET priority = 'normal'
    WHERE priority IS NULL OR priority NOT IN ('urgent', 'normal', 'low');

    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_priority_check
      CHECK (priority IN ('urgent', 'normal', 'low'));

    CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_announcements ON public.notifications(type, created_at DESC) WHERE type = 'announcement';

    DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
    CREATE POLICY "Service role can insert notifications"
      ON public.notifications FOR INSERT
      TO service_role
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON public.notifications;
    CREATE POLICY "Users can view notifications targeted to them"
      ON public.notifications FOR SELECT
      TO authenticated
      USING (
        target_user_id = auth.uid()
        OR target_role = 'all'
        OR (target_role = 'student' AND LOWER(auth.jwt()->'user_metadata'->>'role') <> 'admin')
        OR (target_role = 'admin')
      );

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 7. CHAT, USER DEVICES & DRIVER SERVICES INDEXES (CONDITIONAL)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id, created_at ASC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_devices') THEN
    CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'driver_bookings') THEN
    CREATE INDEX IF NOT EXISTS idx_driver_bookings_user_id ON public.driver_bookings(user_id, status);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'driver_ratings') THEN
    CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON public.driver_ratings(driver_id);
  END IF;
END $$;

-- ============================================================================
-- 8. REALTIME REPLICATION VERIFICATION
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['exam_challenges', 'exam_challenge_participants', 'chat_messages', 'notifications', 'system_config'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
