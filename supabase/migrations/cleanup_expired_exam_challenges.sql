-- ========================================================================
-- Migration: Automatic Cleanup for Expired / Unstarted Group Exam Challenges
-- ========================================================================
-- This migration provides:
-- 1. Updated notifications check constraints for challenge cancellation events
-- 2. PostgreSQL stored function `cleanup_expired_exam_challenges` that:
--    - Identifies pending challenges older than the waiting window (default 60s)
--    - Verifies that NO participant has joined or taken the exam (0 started/completed)
--    - Inserts persistent notification rows for all participants & creator with exact timestamp ("Done at [time]")
--    - Deletes empty/unstarted participant and challenge rows
-- ========================================================================

-- 1. Ensure notification type constraint includes challenge notifications
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND contype = 'c'
    AND conname LIKE '%type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'info',
      'success',
      'warning',
      'error',
      'exam',
      'system',
      'user_joined',
      'exam_submitted',
      'admin_update',
      'announcement',
      'admin_message',
      'language_published',
      'module_published',
      'lesson_published',
      'exam_result',
      'exam_available',
      'course_updated',
      'reminder',
      'exam_challenge_invite',
      'exam_challenge_cancelled',
      'friend_request',
      'friend_request_accepted',
      'friend_request_rejected'
    )
  );

-- 2. Cleanup Function for Expired Unstarted Group Exams
CREATE OR REPLACE FUNCTION cleanup_expired_exam_challenges(p_waiting_seconds INT DEFAULT 60)
RETURNS TABLE (
  deleted_challenges INT,
  deleted_participants INT,
  notifications_sent INT,
  cleaned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_challenge RECORD;
  v_participant RECORD;
  v_has_active BOOLEAN;
  v_done_at_str TEXT;
  v_deleted_ch_count INT := 0;
  v_deleted_pt_count INT := 0;
  v_notif_count INT := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_cutoff := v_now - (p_waiting_seconds || ' seconds')::INTERVAL;
  v_done_at_str := TO_CHAR(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS "UTC"');

  -- Loop through pending challenges created before the cutoff
  FOR v_challenge IN
    SELECT id, creator_id, category_name, created_at
    FROM exam_challenges
    WHERE status = 'pending'
      AND created_at < v_cutoff
  LOOP
    -- Check if any participant took/started or scored on the exam
    SELECT EXISTS (
      SELECT 1
      FROM exam_challenge_participants
      WHERE challenge_id = v_challenge.id
        AND (status IN ('in_progress', 'completed') OR exam_attempt_id IS NOT NULL)
    ) INTO v_has_active;

    -- If no active takers, clean up and notify
    IF NOT v_has_active THEN
      -- 1. Notify creator
      INSERT INTO notifications (
        target_user_id,
        type,
        title,
        message,
        data,
        sender_name,
        action_url,
        created_at
      ) VALUES (
        v_challenge.creator_id,
        'warning',
        'Group Exam Cancelled',
        'The group exam for "' || COALESCE(v_challenge.category_name, 'Driving Knowledge') || '" was automatically cancelled and removed because no participants joined or took the exam before the waiting time expired. Done at ' || v_done_at_str || '.',
        jsonb_build_object(
          'challenge_id', v_challenge.id,
          'category_name', v_challenge.category_name,
          'action', 'auto_deleted_expired_exam',
          'done_at', v_done_at_str
        ),
        'System',
        '/dashboard#classmates',
        v_now
      );
      v_notif_count := v_notif_count + 1;

      -- 2. Notify all invited participants
      FOR v_participant IN
        SELECT user_id
        FROM exam_challenge_participants
        WHERE challenge_id = v_challenge.id
          AND user_id <> v_challenge.creator_id
      LOOP
        INSERT INTO notifications (
          target_user_id,
          type,
          title,
          message,
          data,
          sender_name,
          action_url,
          created_at
        ) VALUES (
          v_participant.user_id,
          'warning',
          'Group Exam Cancelled',
          'The group exam for "' || COALESCE(v_challenge.category_name, 'Driving Knowledge') || '" was automatically cancelled because no one took the exam before the waiting time expired. Done at ' || v_done_at_str || '.',
          jsonb_build_object(
            'challenge_id', v_challenge.id,
            'category_name', v_challenge.category_name,
            'action', 'auto_deleted_expired_exam',
            'done_at', v_done_at_str
          ),
          'System',
          '/dashboard#classmates',
          v_now
        );
        v_notif_count := v_notif_count + 1;
      END LOOP;

      -- 3. Delete participants and challenge
      DELETE FROM exam_challenge_participants WHERE challenge_id = v_challenge.id;
      GET DIAGNOSTICS v_deleted_pt_count = ROW_COUNT;

      DELETE FROM exam_challenges WHERE id = v_challenge.id;
      v_deleted_ch_count := v_deleted_ch_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_deleted_ch_count, v_deleted_pt_count, v_notif_count, v_now;
END;
$$;
