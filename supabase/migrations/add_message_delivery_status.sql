-- Migration: Add delivery tracking to chat_messages for WhatsApp-style tick marks
-- Adds delivered_at to track when message was delivered to the recipient's device

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN chat_messages.delivered_at IS 'Timestamp when message was delivered to recipient device (null = not yet delivered)';

-- Ensure chat_messages is in the realtime publication (in case it was removed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

ALTER TABLE chat_messages REPLICA IDENTITY FULL;
