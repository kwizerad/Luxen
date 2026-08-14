-- Migration: Fix RLS policy to allow service role to insert notifications
-- Created: 2026-08-14
-- Reason: User-generated notifications (friend requests, exam challenges) were failing
-- because RLS policy only allowed admins to insert. Service role needs to bypass RLS
-- for notification inserts from API routes.

-- Drop the restrictive admin-only insert policy
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

-- Drop existing service role policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Create a policy that allows service role to insert notifications (bypasses RLS)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Keep admin insert capability for direct admin actions
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_from_jwt());
