-- Migration: Cleanup stale in-progress exam attempts (> 60 minutes without activity)
-- Created: 2026-08-31

-- 1. Create indexes to make in-progress queries instantaneous
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status_updated 
  ON exam_attempts(status, updated_at) 
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_exam_attempts_status_started 
  ON exam_attempts(status, started_at) 
  WHERE status = 'in_progress';

-- 2. Create PostgreSQL stored function for automated or manual invocation
CREATE OR REPLACE FUNCTION cleanup_stale_in_progress_exam_attempts(max_age_minutes INTEGER DEFAULT 60)
RETURNS TABLE (
  deleted_attempts_count INTEGER,
  deleted_module_attempts_count INTEGER,
  cutoff_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted_attempts INTEGER := 0;
  v_deleted_modules INTEGER := 0;
BEGIN
  v_cutoff := NOW() - (max_age_minutes || ' minutes')::INTERVAL;

  -- Delete standard exam_attempts in progress with no activity past cutoff
  WITH deleted AS (
    DELETE FROM exam_attempts
    WHERE status = 'in_progress'
      AND (
        (updated_at IS NOT NULL AND updated_at <= v_cutoff)
        OR (updated_at IS NULL AND started_at <= v_cutoff)
        OR (updated_at IS NULL AND started_at IS NULL AND created_at <= v_cutoff)
      )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_attempts FROM deleted;

  -- Delete module_exam_attempts in progress past cutoff if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_exam_attempts') THEN
    WITH deleted_mod AS (
      DELETE FROM module_exam_attempts
      WHERE status = 'in_progress'
        AND (
          (updated_at IS NOT NULL AND updated_at <= v_cutoff)
          OR (updated_at IS NULL AND created_at <= v_cutoff)
        )
      RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO v_deleted_modules FROM deleted_mod;
  END IF;

  RETURN QUERY SELECT v_deleted_attempts, v_deleted_modules, v_cutoff;
END;
$$;

-- Grant execution to authenticated & service_role
GRANT EXECUTE ON FUNCTION cleanup_stale_in_progress_exam_attempts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_in_progress_exam_attempts(INTEGER) TO authenticated;

COMMENT ON FUNCTION cleanup_stale_in_progress_exam_attempts(INTEGER) IS
  'Deletes any exam_attempts and module_exam_attempts that have remained in an in_progress state for longer than max_age_minutes without update.';

-- 3. Optional: If pg_cron extension is available in the Supabase project, schedule hourly execution
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-stale-in-progress-exams');
    PERFORM cron.schedule(
      'cleanup-stale-in-progress-exams',
      '*/15 * * * *', -- Every 15 minutes
      'SELECT cleanup_stale_in_progress_exam_attempts(60);'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not enabled or lacks permission, server-side Node.js / API cron handles execution seamlessly
    NULL;
END;
$$;
