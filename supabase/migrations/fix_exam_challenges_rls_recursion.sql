-- Migration: Fix infinite recursion in exam_challenges and exam_challenge_participants RLS policies
-- The problem: exam_challenges SELECT policy references exam_challenge_participants,
-- and exam_challenge_participants SELECT policy references exam_challenges → infinite recursion.
-- Solution: Use SECURITY DEFINER functions to break the circular dependency.

-- ============ Helper functions (SECURITY DEFINER to bypass RLS) ============

-- Function to get challenge IDs where the current user is a participant
CREATE OR REPLACE FUNCTION get_user_challenge_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT challenge_id FROM exam_challenge_participants WHERE user_id = p_user_id;
$$;

-- Function to get challenge IDs created by the current user
CREATE OR REPLACE FUNCTION get_creator_challenge_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM exam_challenges WHERE creator_id = p_user_id;
$$;

-- Revoke public access, grant only authenticated
REVOKE EXECUTE ON FUNCTION get_user_challenge_ids(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_creator_challenge_ids(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_challenge_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_challenge_ids(UUID) TO authenticated;

-- ============ Fix exam_challenges RLS policies ============

ALTER TABLE exam_challenges ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own challenges" ON exam_challenges;
DROP POLICY IF EXISTS "Creators can create challenges" ON exam_challenges;
DROP POLICY IF EXISTS "Creators can update own challenges" ON exam_challenges;

-- Recreate without circular reference — use the SECURITY DEFINER function
CREATE POLICY "Users can view own challenges" ON exam_challenges FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR id IN (SELECT get_user_challenge_ids(auth.uid()))
  );

CREATE POLICY "Creators can create challenges" ON exam_challenges FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own challenges" ON exam_challenges FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ============ Fix exam_challenge_participants RLS policies ============

ALTER TABLE exam_challenge_participants ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Participants can view own participation" ON exam_challenge_participants;
DROP POLICY IF EXISTS "Creators can add participants" ON exam_challenge_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON exam_challenge_participants;
DROP POLICY IF EXISTS "Creators can delete participants" ON exam_challenge_participants;

-- Recreate without circular reference — use the SECURITY DEFINER function
CREATE POLICY "Participants can view own participation" ON exam_challenge_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR challenge_id IN (SELECT get_creator_challenge_ids(auth.uid()))
  );

CREATE POLICY "Creators can add participants" ON exam_challenge_participants FOR INSERT TO authenticated
  WITH CHECK (challenge_id IN (SELECT get_creator_challenge_ids(auth.uid())));

CREATE POLICY "Users can update own participation" ON exam_challenge_participants FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR challenge_id IN (SELECT get_creator_challenge_ids(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR challenge_id IN (SELECT get_creator_challenge_ids(auth.uid()))
  );

CREATE POLICY "Creators can delete participants" ON exam_challenge_participants FOR DELETE TO authenticated
  USING (challenge_id IN (SELECT get_creator_challenge_ids(auth.uid())));
