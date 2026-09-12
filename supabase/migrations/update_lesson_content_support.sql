-- Update course_lessons table to support mixed content types (text + image)
-- This allows lessons to have both text content and images simultaneously

-- Add image_url column for lesson images
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update content_type constraint to allow 'mixed' type
ALTER TABLE course_lessons 
DROP CONSTRAINT IF EXISTS course_lessons_content_type_check;

ALTER TABLE course_lessons 
ADD CONSTRAINT course_lessons_content_type_check 
CHECK (content_type IN ('text', 'video', 'image', 'document', 'mixed'));

-- Add comments for documentation
COMMENT ON COLUMN course_lessons.image_url IS 'URL for lesson image (can be used alongside text content)';
COMMENT ON COLUMN course_lessons.content_type IS 'Type of lesson content: text, video, image, document, or mixed (text + image)';
