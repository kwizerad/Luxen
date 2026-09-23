-- Migration: Create anonymous_exam_attempts table
-- Tracks free practice-exam attempts for anonymous (not logged in) visitors,
-- keyed primarily by device fingerprint (localStorage-based UUID), with the
-- requesting IP address recorded as a secondary anti-abuse signal.
-- Created: 2026-08-12

CREATE TABLE IF NOT EXISTS anonymous_exam_attempts (
    id BIGSERIAL PRIMARY KEY,
    fingerprint TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_exam_attempts_ip ON anonymous_exam_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_anonymous_exam_attempts_fingerprint ON anonymous_exam_attempts(fingerprint);

-- Enable Row Level Security. Intentionally no public policies are defined —
-- this table is only ever read/written via the service-role (admin) client
-- inside server actions, so anonymous/authenticated clients cannot tamper
-- with their own attempt counts directly.
ALTER TABLE anonymous_exam_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE anonymous_exam_attempts IS 'Tracks free practice-exam attempts for anonymous (not logged in) visitors, keyed by device fingerprint.';
COMMENT ON COLUMN anonymous_exam_attempts.attempt_count IS 'Number of free practice exams started by this fingerprint. Login is required once this reaches the configured free limit.';
