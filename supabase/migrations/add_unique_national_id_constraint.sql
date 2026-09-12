-- Remove duplicate national_id entries from user_profiles before adding unique constraint
-- Keep only the earliest registration for each national_id, null out duplicates
UPDATE user_profiles
SET national_id = NULL
WHERE id NOT IN (
  SELECT MIN(id)
  FROM user_profiles
  WHERE national_id IS NOT NULL
  GROUP BY national_id
)
AND national_id IS NOT NULL;

-- Add unique constraint on national_id column
-- This ensures no two users can have the same national_id
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_national_id_unique
UNIQUE (national_id);
