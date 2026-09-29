-- Migration: Create report_comments table for report discussion threads
-- Created: 2026-08-08

CREATE TABLE IF NOT EXISTS report_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES user_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_comments_report_id ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_user_id ON report_comments(user_id);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Report participants can view comments" ON report_comments;
DROP POLICY IF EXISTS "Report participants can comment" ON report_comments;
DROP POLICY IF EXISTS "Comment authors can edit own comments" ON report_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON report_comments;

-- Users can view comments if they are the reporter, reported, or admin
CREATE POLICY "Report participants can view comments"
  ON report_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_reports ur
      WHERE ur.id = report_comments.report_id
      AND (ur.reporter_id = auth.uid() OR ur.reported_id = auth.uid())
    )
    OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

-- Users can comment if they are the reporter, reported, or admin
CREATE POLICY "Report participants can comment"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM user_reports ur
        WHERE ur.id = report_comments.report_id
        AND (ur.reporter_id = auth.uid() OR ur.reported_id = auth.uid())
      )
      OR LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
      OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
    )
  );

CREATE POLICY "Comment authors can edit own comments"
  ON report_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all comments"
  ON report_comments FOR ALL
  TO authenticated
  USING (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  )
  WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER('Navo@admin.jn')
    OR LOWER(auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

COMMENT ON TABLE report_comments IS 'Discussion thread comments on user reports (reporter, reported, admin)';
