-- Migration: Create chat_conversations table for student-driver direct messaging
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_driver_id ON chat_conversations(driver_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_student_id ON chat_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations(last_message_at DESC);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Participants can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Participants can update own conversations" ON chat_conversations;

CREATE POLICY "Participants can view own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Participants can create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Participants can update own conversations"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() OR student_id = auth.uid())
  WITH CHECK (driver_id = auth.uid() OR student_id = auth.uid());

COMMENT ON TABLE chat_conversations IS 'Direct chat conversations between students and drivers';
