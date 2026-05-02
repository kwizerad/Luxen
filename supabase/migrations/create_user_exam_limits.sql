-- Migration: Create user_exam_limits table for daily exam limits per user
-- Created: 2026-05-02

-- Table to store per-user daily exam limits
CREATE TABLE IF NOT EXISTS user_exam_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_limit INTEGER NOT NULL DEFAULT 5, -- Default 5 exams per day
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per user
    CONSTRAINT unique_user_exam_limit UNIQUE (user_id),
    -- Ensure limit is positive
    CONSTRAINT positive_daily_limit CHECK (daily_limit > 0)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_exam_limits_user_id ON user_exam_limits(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_exam_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_exam_limits_updated_at ON user_exam_limits;
CREATE TRIGGER trigger_update_user_exam_limits_updated_at
    BEFORE UPDATE ON user_exam_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_exam_limits_updated_at();

-- Enable Row Level Security
ALTER TABLE user_exam_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own limits
CREATE POLICY "Users can view own exam limits"
    ON user_exam_limits
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Admins can view all limits
CREATE POLICY "Admins can view all exam limits"
    ON user_exam_limits
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Admins can insert/update/delete all limits
CREATE POLICY "Admins can manage all exam limits"
    ON user_exam_limits
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Insert default limits for existing users (5 exams per day)
INSERT INTO user_exam_limits (user_id, daily_limit)
SELECT id, 5
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM user_exam_limits WHERE user_exam_limits.user_id = auth.users.id
);

COMMENT ON TABLE user_exam_limits IS 'Stores daily exam attempt limits per user';
COMMENT ON COLUMN user_exam_limits.daily_limit IS 'Maximum number of exams a user can take per day';
