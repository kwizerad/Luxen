-- ============================================================================
-- LUXEN / NAVO: COMPREHENSIVE SUPABASE DATABASE FIX & MIGRATION
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- This ensures all individual and group exams, classmate requests, attempts,
-- system configurations, and notifications are saved and loaded correctly.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. SYSTEM CONFIGURATION TABLE & DEFAULT SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed all necessary config keys (including Individual & Group Exam Saving Toggles)
INSERT INTO public.system_config (key, value, description)
VALUES 
  ('save_individual_exams_enabled', 'true', 'Allow or disallow saving individual exam attempts to database and user history'),
  ('save_group_exams_enabled', 'true', 'Allow or disallow saving group exam challenges and results to database and history'),
  ('group_exam_enabled', 'true', 'Enable or disable group exam functionality'),
  ('group_exam_join_window_seconds', '120', 'Time window in seconds during which invited students can enter the group exam room'),
  ('universal_exam_limit', '5', 'Universal daily exam limit for students'),
  ('universal_passing_percentage', '60', 'Default passing percentage for exams'),
  ('standalone_exam_enabled', 'true', 'Enable standalone take exam page'),
  ('services_page_enabled', 'true', 'Enable or disable the services page'),
  ('service_live-exam_enabled', 'true', 'Enable or disable the live exam service'),
  ('service_group-exam_enabled', 'true', 'Enable or disable the group exam service'),
  ('service_driver-hub_enabled', 'true', 'Enable or disable the driver hub service'),
  ('security_violation_measures_enabled', 'true', 'Enable cheat detection measures during exams'),
  ('security_max_violations', '3', 'Maximum cheating violations before auto-submission'),
  ('security_fullscreen_enabled', 'true', 'Enforce fullscreen during exams'),
  ('security_tab_switch_enabled', 'true', 'Detect tab switching'),
  ('security_copy_paste_enabled', 'true', 'Disable copy paste'),
  ('security_right_click_enabled', 'true', 'Disable right click'),
  ('security_text_selection_enabled', 'true', 'Disable text selection'),
  ('security_drag_drop_enabled', 'true', 'Disable drag and drop'),
  ('security_ai_detection_enabled', 'true', 'Detect AI assistant sidebars')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

-- ============================================================================
-- 3. EXAM ATTEMPTS TABLE (INDIVIDUAL & GROUP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  score_percentage INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  submission_reason TEXT DEFAULT 'manual' CHECK (submission_reason IN ('manual', 'page_closed', 'cheating_violation', 'time_expired')),
  violation_summary TEXT,
  soft_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist on exam_attempts if already created
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS submission_reason TEXT DEFAULT 'manual';
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS violation_summary TEXT;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS soft_deleted BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_category_id ON public.exam_attempts(category_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_started_at ON public.exam_attempts(started_at DESC);

-- ============================================================================
-- 4. GROUP EXAM CHALLENGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exam_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_challenges_creator_id ON public.exam_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_exam_challenges_status ON public.exam_challenges(status);
CREATE INDEX IF NOT EXISTS idx_exam_challenges_created_at ON public.exam_challenges(created_at DESC);

-- ============================================================================
-- 5. GROUP EXAM PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exam_challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.exam_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'ready', 'in_progress', 'completed', 'declined', 'abandoned')),
  exam_attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE,
  ready_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_challenge_participants_challenge_id ON public.exam_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_exam_challenge_participants_user_id ON public.exam_challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_challenge_participants_status ON public.exam_challenge_participants(status);

-- ============================================================================
-- 6. CLASSMATE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.classmate_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_classmate_requests_sender ON public.classmate_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_classmate_requests_receiver ON public.classmate_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_classmate_requests_status ON public.classmate_requests(status);

-- ============================================================================
-- 7. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  action_url TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- 8. USER PROFILES COLUMNS
-- ============================================================================
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_category TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS provision_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 9. HELPER FUNCTIONS TO PREVENT RLS INFINITE RECURSION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_challenge_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT challenge_id FROM public.exam_challenge_participants WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_challenge_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.exam_challenges WHERE creator_id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_challenge_ids(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_creator_challenge_ids(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_challenge_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_challenge_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_challenge_ids(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_creator_challenge_ids(UUID) TO service_role;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- SYSTEM CONFIG RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can modify system config" ON public.system_config;

CREATE POLICY "Public can read system config" ON public.system_config
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can modify system config" ON public.system_config
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
    OR auth.jwt()->>'role' = 'service_role'
  );

-- EXAM ATTEMPTS RLS
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Admins can view all exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can insert own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can update own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Admins can insert exam attempts" ON public.exam_attempts;

CREATE POLICY "Users can view own exam attempts" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exam attempts" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
    OR auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "Users can insert own exam attempts" ON public.exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam attempts" ON public.exam_attempts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert exam attempts" ON public.exam_attempts
  FOR ALL TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
    OR auth.jwt()->>'role' = 'service_role'
  );

-- EXAM CHALLENGES RLS
ALTER TABLE public.exam_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own challenges" ON public.exam_challenges;
DROP POLICY IF EXISTS "Creators can create challenges" ON public.exam_challenges;
DROP POLICY IF EXISTS "Creators can update own challenges" ON public.exam_challenges;
DROP POLICY IF EXISTS "Service role full access challenges" ON public.exam_challenges;

CREATE POLICY "Users can view own challenges" ON public.exam_challenges
  FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR id IN (SELECT public.get_user_challenge_ids(auth.uid()))
  );

CREATE POLICY "Creators can create challenges" ON public.exam_challenges
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own challenges" ON public.exam_challenges
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- EXAM CHALLENGE PARTICIPANTS RLS
ALTER TABLE public.exam_challenge_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can view own participation" ON public.exam_challenge_participants;
DROP POLICY IF EXISTS "Creators can add participants" ON public.exam_challenge_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON public.exam_challenge_participants;
DROP POLICY IF EXISTS "Creators can delete participants" ON public.exam_challenge_participants;

CREATE POLICY "Participants can view own participation" ON public.exam_challenge_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR challenge_id IN (SELECT public.get_creator_challenge_ids(auth.uid()))
    OR challenge_id IN (SELECT public.get_user_challenge_ids(auth.uid()))
  );

CREATE POLICY "Creators can add participants" ON public.exam_challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    challenge_id IN (SELECT public.get_creator_challenge_ids(auth.uid()))
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update own participation" ON public.exam_challenge_participants
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR challenge_id IN (SELECT public.get_creator_challenge_ids(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR challenge_id IN (SELECT public.get_creator_challenge_ids(auth.uid()))
  );

CREATE POLICY "Creators can delete participants" ON public.exam_challenge_participants
  FOR DELETE TO authenticated
  USING (challenge_id IN (SELECT public.get_creator_challenge_ids(auth.uid())));

-- CLASSMATE REQUESTS RLS
ALTER TABLE public.classmate_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their classmate requests" ON public.classmate_requests;
DROP POLICY IF EXISTS "Users can send classmate requests" ON public.classmate_requests;
DROP POLICY IF EXISTS "Users can update their received requests" ON public.classmate_requests;
DROP POLICY IF EXISTS "Users can delete their classmate requests" ON public.classmate_requests;

CREATE POLICY "Users can view their classmate requests" ON public.classmate_requests
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send classmate requests" ON public.classmate_requests
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received requests" ON public.classmate_requests
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid() OR sender_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Users can delete their classmate requests" ON public.classmate_requests
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- NOTIFICATIONS RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 11. SUPABASE REALTIME REPLICATION (For Live Challenges, Lobbies & Notifications)
-- ============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_challenges;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_challenge_participants;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classmate_requests;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
