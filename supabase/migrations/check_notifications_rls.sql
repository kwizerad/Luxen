-- Check and fix RLS policies for notifications table
-- Ensure users can read notifications targeted to them

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read notifications targeted to them" ON notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Create new policies that work with the existing schema
CREATE POLICY "Users can read notifications targeted to them" ON notifications FOR SELECT USING (auth.uid() = target_user_id OR target_role = 'all');

CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = target_user_id);

CREATE POLICY "Users can delete their notifications" ON notifications FOR DELETE USING (auth.uid() = target_user_id);

CREATE POLICY "Service role can insert notifications" ON notifications FOR INSERT WITH CHECK (true);