-- Migration: Fix RLS policies for course_languages to avoid auth.users access
-- Created: 2026-07-18
-- Reason: auth.users table is not accessible to regular users, causing permission denied errors

-- Drop all existing policies for course_languages
DROP POLICY IF EXISTS "Admins can view all language courses" ON course_languages;
DROP POLICY IF EXISTS "Admins can insert language courses" ON course_languages;
DROP POLICY IF EXISTS "Admins can update language courses" ON course_languages;
DROP POLICY IF EXISTS "Admins can delete language courses" ON course_languages;
DROP POLICY IF EXISTS "Students can view published language courses" ON course_languages;
DROP POLICY IF EXISTS "Students can view language courses" ON course_languages;

-- Helper function to check admin status from JWT (avoids auth.users permission issues)
CREATE OR REPLACE FUNCTION is_admin_from_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can view all language courses
CREATE POLICY "Admins can view all language courses" ON course_languages
  FOR SELECT USING (is_admin_from_jwt());

-- Admins can insert language courses
CREATE POLICY "Admins can insert language courses" ON course_languages
  FOR INSERT WITH CHECK (is_admin_from_jwt());

-- Admins can update language courses
CREATE POLICY "Admins can update language courses" ON course_languages
  FOR UPDATE USING (is_admin_from_jwt());

-- Admins can delete language courses
CREATE POLICY "Admins can delete language courses" ON course_languages
  FOR DELETE USING (is_admin_from_jwt());

-- Students can only view published language courses
CREATE POLICY "Students can view published language courses" ON course_languages
  FOR SELECT USING (
    is_published = true AND
    LOWER(auth.jwt()->'user_metadata'->>'role') = 'student'
  );
