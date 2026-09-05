-- Migration: Create chat_messages table for real-time student-driver chat
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Senders can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can update read status" ON chat_messages;

-- Users can view messages if they are a participant in the conversation
CREATE POLICY "Participants can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.driver_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Senders can insert their own messages
CREATE POLICY "Senders can insert messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.driver_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Participants can update read status of messages in their conversations
CREATE POLICY "Participants can update read status"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.driver_id = auth.uid() OR c.student_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.driver_id = auth.uid() OR c.student_id = auth.uid())
    )
  );

-- Enable realtime for live chat
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

COMMENT ON TABLE chat_messages IS 'Individual messages in student-driver chat conversations';
