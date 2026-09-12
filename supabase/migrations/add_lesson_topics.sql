-- Add topics column to course_lessons table
-- Stores lesson topics as jsonb array: [{ "id": "...", "title": "...", "content": "<tiptap json>" }]

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS topics jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN course_lessons.topics IS 'JSON array of lesson topics, each with id, title, and content (Tiptap JSON string)';
