-- ============================================================================
-- AUTOMATED EXAM EXPIRATION & INVITATION SYNC MIGRATION
-- 1. Updates check constraints on exam_challenges and exam_challenge_participants
-- 2. Synchronizes invitations with exam availability and status
-- 3. Implements triggers and functions to auto-expire ongoing exams when available_to passes
-- ============================================================================

-- Step 1: Update check constraints for participant and challenge status
DO $$
BEGIN
    -- Drop old check constraint on exam_challenge_participants
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'exam_challenge_participants_status_check'
        AND table_name = 'exam_challenge_participants'
    ) THEN
        ALTER TABLE public.exam_challenge_participants 
        DROP CONSTRAINT exam_challenge_participants_status_check;
    END IF;

    -- Add comprehensive check constraint
    ALTER TABLE public.exam_challenge_participants 
    ADD CONSTRAINT exam_challenge_participants_status_check 
    CHECK (status IN ('pending', 'joined', 'ready', 'in_progress', 'completed', 'declined', 'abandoned', 'rejected', 'expired'));

    -- Drop old check constraint on exam_challenges
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'exam_challenges_status_check'
        AND table_name = 'exam_challenges'
    ) THEN
        ALTER TABLE public.exam_challenges 
        DROP CONSTRAINT exam_challenges_status_check;
    END IF;

    -- Add comprehensive check constraint on exam_challenges
    ALTER TABLE public.exam_challenges 
    ADD CONSTRAINT exam_challenges_status_check 
    CHECK (status IN ('pending', 'active', 'in_progress', 'completed', 'cancelled', 'expired'));
END $$;


-- Step 2: Create procedure to clean up and expire exams past their available_to date or waiting window
CREATE OR REPLACE FUNCTION public.sync_and_expire_exams()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_expired_challenges_count INT := 0;
    v_expired_attempts_count INT := 0;
    v_updated_participants_count INT := 0;
    v_expired_category_ids UUID[];
BEGIN
    -- 1. Find all categories whose available_to date has passed
    SELECT ARRAY_AGG(category_id)
    INTO v_expired_category_ids
    FROM public.exam_settings
    WHERE available_to IS NOT NULL 
      AND available_to < v_now;

    -- 2. If expired categories exist, expire active/pending challenges and in-progress attempts
    IF v_expired_category_ids IS NOT NULL AND array_length(v_expired_category_ids, 1) > 0 THEN
        -- Mark pending and active challenges as expired
        WITH updated_ch AS (
            UPDATE public.exam_challenges
            SET status = 'expired',
                updated_at = v_now
            WHERE category_id = ANY(v_expired_category_ids)
              AND status IN ('pending', 'active', 'in_progress')
            RETURNING id
        )
        SELECT COUNT(*) INTO v_expired_challenges_count FROM updated_ch;

        -- Mark participants in those challenges as expired if not already completed
        WITH updated_part AS (
            UPDATE public.exam_challenge_participants
            SET status = 'expired'
            WHERE challenge_id IN (
                SELECT id FROM public.exam_challenges 
                WHERE category_id = ANY(v_expired_category_ids)
            )
            AND status IN ('pending', 'joined', 'ready', 'in_progress')
            RETURNING user_id
        )
        SELECT COUNT(*) INTO v_updated_participants_count FROM updated_part;

        -- Auto-submit any lingering in-progress exam attempts in expired categories
        WITH updated_att AS (
            UPDATE public.exam_attempts
            SET status = 'completed',
                submission_reason = 'time_expired',
                completed_at = v_now,
                updated_at = v_now
            WHERE category_id = ANY(v_expired_category_ids)
              AND status = 'in_progress'
            RETURNING id
        )
        SELECT COUNT(*) INTO v_expired_attempts_count FROM updated_att;
    END IF;

    -- 3. Auto-complete active challenges that have run past standard duration (30 minutes)
    UPDATE public.exam_challenges
    SET status = 'completed',
        updated_at = v_now
    WHERE status = 'active'
      AND created_at < (v_now - INTERVAL '30 minutes');

    -- 4. Auto-expire/cancel pending challenges where lobby was abandoned (older than 2 minutes)
    UPDATE public.exam_challenges
    SET status = 'cancelled',
        updated_at = v_now
    WHERE status = 'pending'
      AND created_at < (v_now - INTERVAL '2 minutes');

    -- Also update participant statuses in old pending challenges
    UPDATE public.exam_challenge_participants
    SET status = 'expired'
    WHERE challenge_id IN (
        SELECT id FROM public.exam_challenges 
        WHERE status IN ('cancelled', 'expired')
    )
    AND status IN ('pending', 'joined', 'ready');

    RETURN jsonb_build_object(
        'success', true,
        'expired_challenges_count', v_expired_challenges_count,
        'expired_attempts_count', v_expired_attempts_count,
        'updated_participants_count', v_updated_participants_count,
        'timestamp', v_now
    );
END;
$$;


-- Step 3: Trigger on exam_settings update/insert to immediately sync and expire challenges
CREATE OR REPLACE FUNCTION public.trg_fn_exam_settings_expire_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.available_to IS NOT NULL AND NEW.available_to < NOW() THEN
        -- Expire any challenges currently in pending or active for this category
        UPDATE public.exam_challenges
        SET status = 'expired',
            updated_at = NOW()
        WHERE category_id = NEW.category_id
          AND status IN ('pending', 'active', 'in_progress');

        -- Expire participants
        UPDATE public.exam_challenge_participants
        SET status = 'expired'
        WHERE challenge_id IN (
            SELECT id FROM public.exam_challenges WHERE category_id = NEW.category_id
        )
        AND status IN ('pending', 'joined', 'ready', 'in_progress');

        -- Expire in_progress attempts
        UPDATE public.exam_attempts
        SET status = 'completed',
            submission_reason = 'time_expired',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE category_id = NEW.category_id
          AND status = 'in_progress';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exam_settings_expire_sync ON public.exam_settings;
CREATE TRIGGER trg_exam_settings_expire_sync
AFTER INSERT OR UPDATE OF available_to ON public.exam_settings
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_exam_settings_expire_sync();


-- Step 4: Trigger on exam_challenges before insert to prevent starting challenge on expired category
CREATE OR REPLACE FUNCTION public.trg_fn_prevent_expired_challenge_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_to TIMESTAMPTZ;
BEGIN
    SELECT available_to INTO v_available_to
    FROM public.exam_settings
    WHERE category_id = NEW.category_id
    LIMIT 1;

    IF v_available_to IS NOT NULL AND v_available_to < NOW() THEN
        NEW.status := 'expired';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_expired_challenge_creation ON public.exam_challenges;
CREATE TRIGGER trg_prevent_expired_challenge_creation
BEFORE INSERT ON public.exam_challenges
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_prevent_expired_challenge_creation();


-- Step 5: Grant RPC execute permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.sync_and_expire_exams() TO authenticated, service_role, anon;

-- Run initial sync
SELECT public.sync_and_expire_exams();
