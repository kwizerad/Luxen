-- Enable realtime for classmate_requests and user_profiles tables
-- so friend requests, accept/reject events, and online status updates are pushed live

-- Add classmate_requests to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'classmate_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE classmate_requests;
  END IF;
END $$;

-- Add user_profiles to realtime publication (for last_seen / online status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'user_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  END IF;
END $$;

-- Use FULL replica identity so old row values (e.g. previous status) are available in updates
ALTER TABLE classmate_requests REPLICA IDENTITY FULL;
ALTER TABLE user_profiles REPLICA IDENTITY FULL;

-- Add new notification types for friend request accepted/rejected
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'info','success','warning','error','exam','system','user_joined','exam_submitted',
    'admin_update','announcement','admin_message','language_published','module_published',
    'lesson_published','exam_result','exam_available','course_updated','reminder',
    'exam_challenge_invite','friend_request','friend_request_accepted','friend_request_rejected'
  ));
