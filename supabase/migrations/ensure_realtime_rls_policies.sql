-- Migration: Ensure comprehensive realtime RLS policies for all realtime tables
-- Created: 2026-08-14
-- Reason: Ensure all tables with realtime subscriptions have proper RLS policies
-- that allow realtime access while maintaining security

-- Ensure REPLICA IDENTITY is set to FULL for all realtime tables
-- This is required for realtime to send UPDATE/DELETE events with full row data

ALTER TABLE classmate_requests REPLICA IDENTITY FULL;
ALTER TABLE user_profiles REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE exam_challenges REPLICA IDENTITY FULL;
ALTER TABLE exam_challenge_participants REPLICA IDENTITY FULL;

-- Ensure user_profiles has proper RLS for realtime online status updates
-- Current policy allows all authenticated users to view all profiles (USING true)
-- This is intentional for the classmates feature to work

-- Ensure classmate_requests RLS policies are optimal for realtime
DROP POLICY IF EXISTS "Users can view own classmate requests" ON classmate_requests;
CREATE POLICY "Users can view own classmate requests" ON classmate_requests FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Ensure notifications RLS policies allow realtime access
DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON notifications;
CREATE POLICY "Users can view notifications targeted to them"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR target_role = 'all'
    OR (target_role = 'student' AND LOWER(auth.jwt()->'user_metadata'->>'role') <> 'admin')
    OR (target_role = 'admin' AND is_admin_from_jwt())
    OR is_admin_from_jwt()
  );

-- Ensure exam_challenges RLS policies allow realtime access
DROP POLICY IF EXISTS "Users can view own challenges" ON exam_challenges;
CREATE POLICY "Users can view own challenges" ON exam_challenges FOR SELECT TO authenticated
  USING (creator_id = auth.uid()
    OR id IN (SELECT challenge_id FROM exam_challenge_participants WHERE user_id = auth.uid()));

-- Ensure exam_challenge_participants RLS policies allow realtime access
DROP POLICY IF EXISTS "Participants can view own participation" ON exam_challenge_participants;
CREATE POLICY "Participants can view own participation" ON exam_challenge_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR challenge_id IN (SELECT id FROM exam_challenges WHERE creator_id = auth.uid()));

-- Ensure chat_messages RLS policies allow realtime access
DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
CREATE POLICY "Participants can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.driver_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Ensure all realtime tables are in the publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'classmate_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE classmate_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'exam_challenges') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE exam_challenges;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'exam_challenge_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE exam_challenge_participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
  END IF;
END $$;
