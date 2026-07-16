-- Migration: Fix notifications RLS + notification schema, restore exam-attempt
-- soft deletion, and stop relying on the service role for exam-limit management.
--
-- Root causes addressed:
--  * notifications RLS policies queried auth.users directly. The authenticated
--    role cannot read auth.users, and because notifications had no permissive
--    "true" policy to short-circuit the OR, every SELECT/INSERT threw
--    "permission denied for table users" (HTTP 403). Policies are rewritten to
--    read role/email from the JWT claims instead.
--  * exam_attempts was missing the hidden_from_user / hidden_at columns the app
--    uses for soft delete, and deletion depended on a service-role client.
--  * user_exam_limits admin policies only matched the primary admin's email and
--    management relied on the service role.

-- ---------------------------------------------------------------------------
-- 1. exam_attempts: soft-delete columns
-- ---------------------------------------------------------------------------
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS hidden_from_user BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_hidden_from_user
  ON exam_attempts(hidden_from_user)
  WHERE hidden_from_user = TRUE;

COMMENT ON COLUMN exam_attempts.hidden_from_user IS 'Soft delete flag - true means hidden from the student view but still visible to admins';
COMMENT ON COLUMN exam_attempts.hidden_at IS 'Timestamp when the attempt was soft-deleted';

-- ---------------------------------------------------------------------------
-- 2. Secure soft-delete RPC (runs as definer, so no broad UPDATE policy needed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hide_exam_attempt(p_attempt_id UUID)
RETURNS VOID AS $$
DECLARE
  v_owner UUID;
  v_is_admin BOOLEAN;
BEGIN
  SELECT user_id INTO v_owner FROM exam_attempts WHERE id = p_attempt_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Exam attempt not found';
  END IF;

  v_is_admin := (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

  IF auth.uid() <> v_owner AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized to delete this exam attempt';
  END IF;

  UPDATE exam_attempts
    SET hidden_from_user = TRUE,
        hidden_at = NOW()
    WHERE id = p_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION hide_exam_attempt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hide_exam_attempt(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. notifications: align schema with the application
-- ---------------------------------------------------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_priority_check
  CHECK (priority IN ('urgent', 'normal', 'low'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'info', 'success', 'warning', 'error', 'exam', 'system',
    'user_joined', 'exam_submitted', 'admin_update'
  ));

-- ---------------------------------------------------------------------------
-- 4. notifications RLS: read role/email from JWT instead of auth.users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR target_role = 'all'
    OR (
      target_role = 'student'
      AND (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'Admin'
      AND (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'Teacher'
    )
    OR (
      target_role = 'admin'
      AND (
        (auth.jwt() ->> 'email') = 'Navo@admin.jn'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
      )
    )
    OR (
      target_role = 'teacher'
      AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'Teacher'
    )
    OR (
      (auth.jwt() ->> 'email') = 'Navo@admin.jn'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
    )
  );

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

-- Recreate the unread-count helper without touching auth.users so it works even
-- if executed as the invoking role.
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
  count_result INTEGER;
BEGIN
  user_role := auth.jwt() -> 'user_metadata' ->> 'role';
  user_email := auth.jwt() ->> 'email';

  SELECT COUNT(*) INTO count_result
  FROM notifications n
  WHERE (
    n.target_user_id = user_uuid
    OR n.target_role = 'all'
    OR (n.target_role = 'student' AND user_role IS DISTINCT FROM 'Admin' AND user_role IS DISTINCT FROM 'Teacher')
    OR (n.target_role = 'admin' AND (user_role = 'Admin' OR user_email = 'Navo@admin.jn'))
    OR (n.target_role = 'teacher' AND user_role = 'Teacher')
  )
  AND (n.expires_at IS NULL OR n.expires_at > NOW())
  AND NOT EXISTS (
    SELECT 1 FROM notification_reads nr
    WHERE nr.notification_id = n.id AND nr.user_id = user_uuid
  );

  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 5. user_exam_limits: let all admins (not only the primary) manage limits via
--    RLS so the app no longer needs the service role for these operations.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all exam limits" ON user_exam_limits;
CREATE POLICY "Admins can view all exam limits"
  ON user_exam_limits FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );

DROP POLICY IF EXISTS "Admins can manage all exam limits" ON user_exam_limits;
CREATE POLICY "Admins can manage all exam limits"
  ON user_exam_limits FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'Navo@admin.jn'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
  );
