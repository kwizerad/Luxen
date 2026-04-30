-- Create exam_settings table to store exam configuration per category
CREATE TABLE IF NOT EXISTS exam_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL UNIQUE REFERENCES exam_categories(id) ON DELETE CASCADE,
  question_count INTEGER NOT NULL DEFAULT 20 CHECK (question_count >= 1 AND question_count <= 200),
  duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (duration_minutes >= 1 AND duration_minutes <= 300),
  sorting_mode TEXT NOT NULL DEFAULT 'RANDOM' CHECK (sorting_mode IN ('RANDOM', 'TEXT_ONLY', 'WITH_PICTURE', 'MIXED_50')),
  available_from TIMESTAMP WITH TIME ZONE,
  available_to TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_settings_category_id ON exam_settings(category_id);

-- Enable Row Level Security
ALTER TABLE exam_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view exam settings (needed to start exams)
CREATE POLICY "Users can view exam settings"
  ON exam_settings FOR SELECT
  USING (true);

-- Policy: Admins can insert/update exam settings
CREATE POLICY "Admins can manage exam settings"
  ON exam_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'Navo@admin.jn'
        OR auth.users.raw_user_meta_data->>'role' = 'Admin'
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exam_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_exam_settings_updated_at
  BEFORE UPDATE ON exam_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_exam_settings_updated_at();
