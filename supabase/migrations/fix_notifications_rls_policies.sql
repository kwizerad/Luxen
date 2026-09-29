-- Migration: Fix RLS policies for notifications to avoid auth.users access
-- Created: 2026-07-18
-- Reason: auth.users table is not accessible to regular users, causing permission denied errors

-- Drop existing policies that reference auth.users
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their notification reads" ON notification_reads;

-- Helper function to check admin status from JWT (avoids auth.users permission issues)
CREATE OR REPLACE FUNCTION is_admin_from_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Users can view notifications targeted to them
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    -- Direct target
    target_user_id = auth.uid()
    -- Role-based target (check user's role from JWT)
    OR (target_role = 'all')
    OR (target_role = 'student' AND LOWER(auth.jwt()->'user_metadata'->>'role') <> 'admin')
    OR (target_role = 'admin' AND is_admin_from_jwt())
    -- Admins can see all
    OR is_admin_from_jwt()
  );

-- Policy: Only admins can create notifications
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_from_jwt());

-- Policy: Only admins can update/delete notifications
CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (is_admin_from_jwt());

-- Policy: Users can only read their own notification_reads
CREATE POLICY "Users can manage their notification reads"
  ON notification_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to get unread notification count for a user (updated to avoid auth.users)
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_role TEXT;
  count_result INTEGER;
BEGIN
  -- Get user role from JWT instead of auth.users
  user_role := auth.jwt()->'user_metadata'->>'role';
  
  -- Count unread notifications
  SELECT COUNT(*) INTO count_result
  FROM notifications n
  WHERE (
    -- Direct target
    n.target_user_id = user_uuid
    -- Role-based
    OR (n.target_role = 'all')
    OR (n.target_role = 'student' AND user_role IS DISTINCT FROM 'Admin')
    OR (n.target_role = 'admin' AND (user_role = 'Admin' OR auth.jwt()->>'email' = 'Navo@admin.jn'))
  )
  -- Not expired
  AND (n.expires_at IS NULL OR n.expires_at > NOW())
  -- Not read
  AND NOT EXISTS (
    SELECT 1 FROM notification_reads nr 
    WHERE nr.notification_id = n.id AND nr.user_id = user_uuid
  );
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
