-- Add participant result sharing privacy preference for Group Exams
ALTER TABLE public.exam_challenge_participants
  ADD COLUMN IF NOT EXISTS share_results BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.exam_challenge_participants.share_results IS
  'Whether the participant chooses to share their exam score and answers with other group members (default true, toggleable before submit and anytime afterward)';
