-- Add translation columns to existing course management tables
-- This migration adds multilingual support for modules and lessons

-- Add translation columns to course_modules
ALTER TABLE course_modules 
ADD COLUMN IF NOT EXISTS title_translations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description_translations JSONB DEFAULT '{}';

-- Add translation columns to course_lessons
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS title_translations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_translations JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN course_modules.title_translations IS 'JSON object containing translations of title in different languages (e.g., {"Kinyarwanda": "...", "French": "..."})';
COMMENT ON COLUMN course_modules.description_translations IS 'JSON object containing translations of description in different languages';
COMMENT ON COLUMN course_lessons.title_translations IS 'JSON object containing translations of title in different languages';
COMMENT ON COLUMN course_lessons.content_translations IS 'JSON object containing translations of content in different languages';
