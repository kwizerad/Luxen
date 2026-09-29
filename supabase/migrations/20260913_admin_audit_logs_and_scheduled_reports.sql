-- Migration: 20260913_admin_audit_logs_and_scheduled_reports.sql
-- Purpose: Audit logging for administrative actions (including secondary admin tracking) and scheduled weekly exam performance reports

-- 1. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_role TEXT DEFAULT 'Admin',
    is_primary_admin BOOLEAN DEFAULT FALSE,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    action_label TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    target_label TEXT,
    details TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT
);

-- Indexes for lightning fast queries and filtering by other admins vs all
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_is_primary ON public.admin_audit_logs (is_primary_admin);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON public.admin_audit_logs (admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category ON public.admin_audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs (action);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view audit logs (or service role)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 2. Create scheduled_report_logs table
CREATE TABLE IF NOT EXISTS public.scheduled_report_logs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    report_type TEXT NOT NULL DEFAULT 'WEEKLY_EXAM_PERFORMANCE',
    recipient_email TEXT NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    metrics_summary JSONB DEFAULT '{}'::jsonb,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatch_mode TEXT DEFAULT 'smtp_sent',
    triggered_by TEXT DEFAULT 'CRON_AUTOMATION',
    status TEXT DEFAULT 'SUCCESS',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_dispatched_at ON public.scheduled_report_logs (dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_logs_report_type ON public.scheduled_report_logs (report_type);

ALTER TABLE public.scheduled_report_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view scheduled reports" ON public.scheduled_report_logs;
CREATE POLICY "Admins can view scheduled reports"
    ON public.scheduled_report_logs
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can insert scheduled reports" ON public.scheduled_report_logs;
CREATE POLICY "Admins can insert scheduled reports"
    ON public.scheduled_report_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
