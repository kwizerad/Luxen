  -- Migration: Fix notifications schema and RLS policies
  -- Created: 2026-08-03

  -- 1. Ensure notifications table has the correct columns
  DO $$
  BEGIN
    -- Drop legacy columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
      ALTER TABLE notifications DROP COLUMN user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
      ALTER TABLE notifications DROP COLUMN is_read;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read_at') THEN
      ALTER TABLE notifications DROP COLUMN read_at;
    END IF;

    -- Add target columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_user_id') THEN
      ALTER TABLE notifications ADD COLUMN target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_role') THEN
      ALTER TABLE notifications ADD COLUMN target_role TEXT DEFAULT 'all';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sender_id') THEN
      ALTER TABLE notifications ADD COLUMN sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sender_name') THEN
      ALTER TABLE notifications ADD COLUMN sender_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
      ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'info';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
      ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
      ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
      ALTER TABLE notifications ADD COLUMN action_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_entity_type') THEN
      ALTER TABLE notifications ADD COLUMN related_entity_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_entity_id') THEN
      ALTER TABLE notifications ADD COLUMN related_entity_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data') THEN
      ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}';
    END IF;
  END $$;

  -- 2. Ensure notification_reads table exists
  CREATE TABLE IF NOT EXISTS notification_reads (
    id BIGSERIAL PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);
  CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);

  -- 3. Enable RLS on both tables
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

  -- 4. Drop existing policies to avoid conflicts
  DO $$
  DECLARE
    pol RECORD;
  BEGIN
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname);
    END LOOP;

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'notification_reads'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON notification_reads', pol.policyname);
    END LOOP;
  END $$;

  -- 5. Helper function to check admin status from JWT
  CREATE OR REPLACE FUNCTION is_admin_from_jwt()
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
      OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin';
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 6. Notifications policies
  CREATE POLICY "Users can view notifications targeted to them"
    ON notifications FOR SELECT
    TO authenticated
    USING (
      target_user_id = auth.uid()
      OR target_role = 'all'
      OR (target_role = 'student' AND LOWER(auth.jwt()->'user_metadata'->>'role') <> 'admin')
      OR (target_role = 'admin' AND is_admin_from_jwt())
      OR is_admin_from_jwt()
    );

  CREATE POLICY "Admins can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_from_jwt());

  CREATE POLICY "Admins can update notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (is_admin_from_jwt())
    WITH CHECK (is_admin_from_jwt());

  CREATE POLICY "Admins can delete notifications"
    ON notifications FOR DELETE
    TO authenticated
    USING (is_admin_from_jwt());

  -- 7. notification_reads policies
  CREATE POLICY "Users can manage their notification reads"
    ON notification_reads FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- 8. Enable realtime for notifications
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END $$;
