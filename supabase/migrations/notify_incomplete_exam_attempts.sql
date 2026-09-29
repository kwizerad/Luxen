-- Migration: Add server-side PostgreSQL function to notify students with incomplete in-progress exam attempts (> 45 minutes)
-- Created: 2026-08-31

CREATE OR REPLACE FUNCTION notify_incomplete_exam_attempts(threshold_minutes INTEGER DEFAULT 45)
RETURNS TABLE (
  notified_count INTEGER,
  skipped_count INTEGER
) AS $$
DECLARE
  v_cutoff_time TIMESTAMPTZ := NOW() - (threshold_minutes || ' minutes')::INTERVAL;
  v_max_age_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
  v_attempt RECORD;
  v_notified_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_exists BOOLEAN;
  v_exam_label TEXT;
  v_msg TEXT;
  v_action_url TEXT;
BEGIN
  -- 1. Loop through standard in-progress exam attempts older than 45 minutes
  FOR v_attempt IN
    SELECT 
      ea.id,
      ea.user_id,
      ea.category_name,
      ea.started_at,
      ea.created_at,
      COALESCE(ea.updated_at, ea.started_at, ea.created_at) AS last_activity
    FROM exam_attempts ea
    WHERE ea.status = 'in_progress'
      AND ea.user_id IS NOT NULL
      AND COALESCE(ea.updated_at, ea.started_at, ea.created_at) <= v_cutoff_time
      AND COALESCE(ea.updated_at, ea.started_at, ea.created_at) >= v_max_age_cutoff
  LOOP
    -- Check if notification was already sent for this attempt
    SELECT EXISTS (
      SELECT 1 
      FROM notifications n 
      WHERE n.related_entity_id = v_attempt.id::TEXT
        AND n.type = 'reminder'
    ) INTO v_exists;

    IF v_exists THEN
      v_skipped_count := v_skipped_count + 1;
    ELSE
      v_exam_label := COALESCE('"' || v_attempt.category_name || '"', 'your current practice exam');
      v_msg := 'You have an exam attempt (' || v_exam_label || ') in progress that started over ' || threshold_minutes || ' minutes ago. Please return to complete and submit your answers, or quit if you are finished.';
      v_action_url := '/dashboard/exam';

      INSERT INTO notifications (
        title,
        message,
        type,
        priority,
        target_user_id,
        target_role,
        sender_id,
        sender_name,
        action_url,
        related_entity_type,
        related_entity_id,
        data,
        created_at
      ) VALUES (
        'Incomplete Exam Reminder / Wibuke Kurangiza Ikizamini',
        v_msg,
        'reminder',
        'urgent',
        v_attempt.user_id,
        NULL,
        NULL,
        'System',
        v_action_url,
        'exam_attempt',
        v_attempt.id::TEXT,
        jsonb_build_object(
          'attempt_id', v_attempt.id,
          'category_name', COALESCE(v_attempt.category_name, 'General Exam'),
          'exam_type', 'standard',
          'started_at', COALESCE(v_attempt.started_at, v_attempt.created_at),
          'reminder_type', 'incomplete_exam_45m'
        ),
        NOW()
      );

      v_notified_count := v_notified_count + 1;
    END IF;
  END LOOP;

  -- 2. Loop through module in-progress exam attempts if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_exam_attempts') THEN
    FOR v_attempt IN
      SELECT 
        mea.id,
        mea.user_id,
        mea.module_title,
        mea.created_at,
        COALESCE(mea.updated_at, mea.created_at) AS last_activity
      FROM module_exam_attempts mea
      WHERE mea.status = 'in_progress'
        AND mea.user_id IS NOT NULL
        AND COALESCE(mea.updated_at, mea.created_at) <= v_cutoff_time
        AND COALESCE(mea.updated_at, mea.created_at) >= v_max_age_cutoff
    LOOP
      SELECT EXISTS (
        SELECT 1 
        FROM notifications n 
        WHERE n.related_entity_id = v_attempt.id::TEXT
          AND n.type = 'reminder'
      ) INTO v_exists;

      IF v_exists THEN
        v_skipped_count := v_skipped_count + 1;
      ELSE
        v_exam_label := COALESCE('"' || v_attempt.module_title || '"', 'your module exam');
        v_msg := 'You have a module exam (' || v_exam_label || ') in progress that started over ' || threshold_minutes || ' minutes ago. Please return to complete and submit your answers, or quit if you are finished.';
        v_action_url := '/module-journey';

        INSERT INTO notifications (
          title,
          message,
          type,
          priority,
          target_user_id,
          target_role,
          sender_id,
          sender_name,
          action_url,
          related_entity_type,
          related_entity_id,
          data,
          created_at
        ) VALUES (
          'Incomplete Exam Reminder / Wibuke Kurangiza Ikizamini',
          v_msg,
          'reminder',
          'urgent',
          v_attempt.user_id,
          NULL,
          NULL,
          'System',
          v_action_url,
          'module_exam_attempt',
          v_attempt.id::TEXT,
          jsonb_build_object(
            'attempt_id', v_attempt.id,
            'category_name', COALESCE(v_attempt.module_title, 'Module Exam'),
            'exam_type', 'module',
            'started_at', v_attempt.created_at,
            'reminder_type', 'incomplete_exam_45m'
          ),
          NOW()
        );

        v_notified_count := v_notified_count + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_notified_count, v_skipped_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_incomplete_exam_attempts(INTEGER) IS
  'Sends a reminder notification to students who have in-progress exam attempts older than threshold_minutes (default 45m).';
