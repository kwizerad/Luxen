-- Migration: Add updated_at column to exam_categories table
-- Created: 2026-05-04

-- Add updated_at column for tracking when categories are modified
ALTER TABLE exam_categories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have updated_at match created_at initially
UPDATE exam_categories 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add comment
COMMENT ON COLUMN exam_categories.updated_at IS 'Timestamp when the category was last updated';
