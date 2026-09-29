-- Migration: create_system_audit_reports_table.sql
-- Purpose: Persist course and exam system audit snapshots for historical tracking, compliance, and admin review

CREATE TABLE IF NOT EXISTS public.system_audit_reports (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    audit_type TEXT NOT NULL DEFAULT 'FULL_COURSE_EXAM_AUDIT',
    courses_health_score INTEGER NOT NULL DEFAULT 100,
    exams_health_score INTEGER NOT NULL DEFAULT 100,
    total_modules INTEGER NOT NULL DEFAULT 0,
    published_modules INTEGER NOT NULL DEFAULT 0,
    total_lessons INTEGER NOT NULL DEFAULT 0,
    published_lessons INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    total_exam_attempts INTEGER NOT NULL DEFAULT 0,
    pass_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    average_score NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    issues_count INTEGER NOT NULL DEFAULT 0,
    report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by TEXT DEFAULT 'ADMIN',
    admin_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_audit_reports_created_at ON public.system_audit_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_reports_audit_type ON public.system_audit_reports (audit_type);

ALTER TABLE public.system_audit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view system audit reports" ON public.system_audit_reports;
CREATE POLICY "Admins can view system audit reports"
    ON public.system_audit_reports
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can insert system audit reports" ON public.system_audit_reports;
CREATE POLICY "Admins can insert system audit reports"
    ON public.system_audit_reports
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
