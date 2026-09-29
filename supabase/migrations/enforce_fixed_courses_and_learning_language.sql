-- Keep the catalog limited to its three permanent learning libraries.
ALTER TABLE course_languages
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS learning_language TEXT;

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_learning_language_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_learning_language_check
  CHECK (learning_language IS NULL OR learning_language IN ('English', 'French', 'Kinyarwanda'));

CREATE OR REPLACE FUNCTION enforce_builtin_course_language()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.language NOT IN ('English', 'French', 'Kinyarwanda') THEN
    RAISE EXCEPTION 'Only English, French, and Kinyarwanda are built-in courses';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_builtin_course_language ON course_languages;
CREATE TRIGGER enforce_builtin_course_language
  BEFORE INSERT OR UPDATE OF language ON course_languages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_builtin_course_language();

CREATE UNIQUE INDEX IF NOT EXISTS course_languages_builtin_language_unique
  ON course_languages (language)
  WHERE deleted_at IS NULL AND language IN ('English', 'French', 'Kinyarwanda');

INSERT INTO course_languages (language, title, description, is_published, order_index, status)
SELECT 'English', 'English Course', 'Traffic school course in English', true, 0, 'published'
WHERE NOT EXISTS (SELECT 1 FROM course_languages WHERE language = 'English' AND deleted_at IS NULL)
UNION ALL
SELECT 'French', 'French Course', 'Traffic school course in French', true, 1, 'published'
WHERE NOT EXISTS (SELECT 1 FROM course_languages WHERE language = 'French' AND deleted_at IS NULL)
UNION ALL
SELECT 'Kinyarwanda', 'Kinyarwanda Course', 'Traffic school course in Kinyarwanda', true, 2, 'published'
WHERE NOT EXISTS (SELECT 1 FROM course_languages WHERE language = 'Kinyarwanda' AND deleted_at IS NULL);
