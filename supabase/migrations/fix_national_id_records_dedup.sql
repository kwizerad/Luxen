-- Migration: De-duplicate national_id_records globally by National ID
-- Previously unique on (national_id, user_id), which allowed the SAME
-- National ID to be "claimed"/verified under multiple different accounts.
-- This makes national_id unique on its own: whichever account first checks
-- an ID keeps ownership of the record; later checks by other accounts (or
-- anonymous visitors) never create a duplicate row or reassign ownership.
-- Created: 2026-08-12

-- Remove duplicate rows for the same national_id, keeping the earliest one.
DELETE FROM national_id_records a
USING national_id_records b
WHERE a.national_id = b.national_id
  AND a.id > b.id;

-- Drop the old composite unique constraint (name follows Postgres' default
-- naming convention for an inline UNIQUE(national_id, user_id)).
ALTER TABLE national_id_records
  DROP CONSTRAINT IF EXISTS national_id_records_national_id_user_id_key;

-- Enforce a single canonical row per National ID.
ALTER TABLE national_id_records
  ADD CONSTRAINT national_id_records_national_id_key UNIQUE (national_id);

COMMENT ON TABLE national_id_records IS 'One canonical row per National ID (first-checked account keeps ownership); prevents duplicate verification across multiple accounts.';
