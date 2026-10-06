"use client";

import React from "react";
import { ChevronLeft, ShieldAlert, Flag, Send } from "lucide-react";
import { AdminAuditLogViewer } from "@/components/admin/admin-audit-log-viewer";
import { useAdminSpa } from "@/lib/admin-spa-router";

export default function AdminAuditStandalonePage() {
  const { navigateAdmin } = useAdminSpa();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-24">
      {/* Header bar */}
      <div className="admin-card flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 border border-[var(--admin-border)]">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin?tab=operations")}
            className="p-2.5 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--admin-text)]">
                Administrative Audit & Activity Ledger
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                Governance SPA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              Comprehensive chronological audit trail of all actions performed across the platform by administrators and sub-admins.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/reports")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>Incident Reports</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/notifications")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>Push Notifications</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin?tab=reports")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
          >
            Weekly Exam Reports →
          </button>
        </div>
      </div>

      {/* Main Audit Viewer */}
      <AdminAuditLogViewer />
    </div>
  );
}
