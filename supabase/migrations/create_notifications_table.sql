-- Migration: Create notifications system for admin and students
-- Created: 2026-05-02

-- Table to store notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'exam', 'system')),
    
    -- Target audience
    target_role TEXT CHECK (target_role IN ('all', 'student', 'admin', 'teacher')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast to role/all
    
    -- Sender info
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name TEXT,
    
    -- Read status (stored as separate table for per-user tracking)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = never expires
    
    -- Related entity (optional)
    related_entity_type TEXT, -- 'exam', 'category', 'user', etc.
    related_entity_id UUID
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role) WHERE target_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Table to track which users have read which notifications
CREATE TABLE IF NOT EXISTS notification_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one read record per user per notification
    CONSTRAINT unique_user_notification_read UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification ON notification_reads(notification_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications targeted to them
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    -- Direct target
    target_user_id = auth.uid()
    -- Role-based target (check user's role from JWT)
    OR (target_role = 'all')
    OR (target_role = 'student' AND EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IS DISTINCT FROM 'Admin'
      AND auth.users.raw_user_meta_data->>'role' IS DISTINCT FROM 'Teacher'
    ))
    OR (target_role = 'admin' AND EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() 
      AND (auth.users.email = 'Navo@admin.jn' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    ))
    OR (target_role = 'teacher' AND EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'Teacher'
    ))
    -- Admins can see all
    OR EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() 
      AND (auth.users.email = 'Navo@admin.jn' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

-- Policy: Only admins can create notifications
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() 
      AND (auth.users.email = 'Navo@admin.jn' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

-- Policy: Only admins can update/delete notifications
CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() 
      AND (auth.users.email = 'Navo@admin.jn' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
    )
  );

-- Policy: Users can only read their own notification_reads
CREATE POLICY "Users can manage their notification reads"
  ON notification_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_role TEXT;
  count_result INTEGER;
BEGIN
  -- Get user role
  SELECT raw_user_meta_data->>'role' INTO user_role 
  FROM auth.users 
  WHERE id = user_uuid;
  
  -- Count unread notifications
  SELECT COUNT(*) INTO count_result
  FROM notifications n
  WHERE (
    -- Direct target
    n.target_user_id = user_uuid
    -- Role-based
    OR (n.target_role = 'all')
    OR (n.target_role = 'student' AND user_role IS DISTINCT FROM 'Admin' AND user_role IS DISTINCT FROM 'Teacher')
    OR (n.target_role = 'admin' AND (user_role = 'Admin' OR EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid AND email = 'Navo@admin.jn')))
    OR (n.target_role = 'teacher' AND user_role = 'Teacher')
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

COMMENT ON TABLE notifications IS 'System notifications for users, targeted by role or individual user';
COMMENT ON TABLE notification_reads IS 'Tracks which users have read which notifications';
