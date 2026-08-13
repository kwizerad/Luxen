-- ============ is_public on user_profiles ============
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN user_profiles.is_public IS 'Whether this user is visible on the Classmates tab';

-- ============ classmate_requests (friend system) ============
CREATE TABLE IF NOT EXISTS classmate_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_classmate_requests_receiver ON classmate_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_classmate_requests_sender ON classmate_requests(sender_id, status);
ALTER TABLE classmate_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own classmate requests" ON classmate_requests FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can create classmate requests" ON classmate_requests FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND receiver_id <> auth.uid());
CREATE POLICY "Users can update own classmate requests" ON classmate_requests FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can delete own classmate requests" ON classmate_requests FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- ============ exam_challenges (group exams) ============
CREATE TABLE IF NOT EXISTS exam_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_challenges_creator ON exam_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_exam_challenges_status ON exam_challenges(status);

-- ============ exam_challenge_participants ============
-- Created BEFORE exam_challenges RLS policies because the SELECT policy references this table
CREATE TABLE IF NOT EXISTS exam_challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES exam_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'ready', 'rejected', 'completed')),
  exam_attempt_id UUID REFERENCES exam_attempts(id) ON DELETE SET NULL,
  reminded_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_challenge_participants_challenge ON exam_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_exam_challenge_participants_user ON exam_challenge_participants(user_id);

-- Now enable RLS and create policies for exam_challenges (can reference exam_challenge_participants)
ALTER TABLE exam_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own challenges" ON exam_challenges FOR SELECT TO authenticated
  USING (creator_id = auth.uid()
    OR id IN (SELECT challenge_id FROM exam_challenge_participants WHERE user_id = auth.uid()));
CREATE POLICY "Creators can create challenges" ON exam_challenges FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators can update own challenges" ON exam_challenges FOR UPDATE TO authenticated
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- RLS policies for exam_challenge_participants
ALTER TABLE exam_challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view own participation" ON exam_challenge_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR challenge_id IN (SELECT id FROM exam_challenges WHERE creator_id = auth.uid()));
CREATE POLICY "Creators can add participants" ON exam_challenge_participants FOR INSERT TO authenticated
  WITH CHECK (challenge_id IN (SELECT id FROM exam_challenges WHERE creator_id = auth.uid()));
CREATE POLICY "Users can update own participation" ON exam_challenge_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR challenge_id IN (SELECT id FROM exam_challenges WHERE creator_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR challenge_id IN (SELECT id FROM exam_challenges WHERE creator_id = auth.uid()));
CREATE POLICY "Creators can delete participants" ON exam_challenge_participants FOR DELETE TO authenticated
  USING (challenge_id IN (SELECT id FROM exam_challenges WHERE creator_id = auth.uid()));

-- Enable realtime for live updates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'exam_challenges') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE exam_challenges;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'exam_challenge_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE exam_challenge_participants;
  END IF;
END $$;

-- Add 'exam_challenge_invite' to the notifications type check constraint
DO $$ DECLARE constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass AND contype = 'c' AND conname LIKE '%type%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'info','success','warning','error','exam','system','user_joined','exam_submitted',
    'admin_update','announcement','admin_message','language_published','module_published',
    'lesson_published','exam_result','exam_available','course_updated','reminder',
    'exam_challenge_invite'
  ));
