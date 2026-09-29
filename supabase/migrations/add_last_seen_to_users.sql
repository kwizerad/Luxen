-- Add last_seen column to user_profiles table for tracking user activity
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Add banned column to user_profiles table for tracking user status
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;

-- Create an index on last_seen for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen);

-- Add comment
COMMENT ON COLUMN user_profiles.last_seen IS 'Timestamp of when the user was last active/seen on the platform';
COMMENT ON COLUMN user_profiles.banned IS 'Whether the user account is banned or not';
