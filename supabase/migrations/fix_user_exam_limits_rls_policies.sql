-- Migration: Fix RLS policies for user_exam_limits table to avoid auth.users access
-- Created: 2026-05-06
-- Reason: auth.users table is not accessible to regular users, causing permission denied errors

-- Drop existing policies that reference auth.users
DROP POLICY IF EXISTS "Users can view own exam limits" ON user_exam_limits;
DROP POLICY IF EXISTS "Admins can view all exam limits" ON user_exam_limits;
DROP POLICY IF EXISTS "Admins can manage all exam limits" ON user_exam_limits;

-- Policy: Users can view their own limits
CREATE POLICY "Users can view own exam limits"
    ON user_exam_limits
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Admins can view all limits (using JWT metadata instead of auth.users)
CREATE POLICY "Admins can view all exam limits"
    ON user_exam_limits
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt()->>'role' = 'Admin' 
        OR auth.jwt()->>'email' = 'Navo@admin.jn'
    );

-- Policy: Admins can insert/update/delete all limits (using JWT metadata)
CREATE POLICY "Admins can manage all exam limits"
    ON user_exam_limits
    FOR ALL
    TO authenticated
    USING (
        auth.jwt()->>'role' = 'Admin' 
        OR auth.jwt()->>'email' = 'Navo@admin.jn'
    )
    WITH CHECK (
        auth.jwt()->>'role' = 'Admin' 
        OR auth.jwt()->>'email' = 'Navo@admin.jn'
    );

-- Policy: Users can insert their own limits (for initial setup)
CREATE POLICY "Users can insert own exam limits"
    ON user_exam_limits
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own limits
CREATE POLICY "Users can update own exam limits"
    ON user_exam_limits
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
