"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { AdminAuditLogViewer } from "@/components/admin/admin-audit-log-viewer";

export default function AdminAuditStandalonePage() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/Admin?tab=operations"
            className="p-2 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--admin-text)]">
                Administrative Audit & Activity Ledger
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              Comprehensive chronological audit trail of all actions performed across the platform by administrators and sub-admins.
            </p>
          </div>
        </div>

        <Link
          href="/Admin?tab=reports"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
        >
          Weekly Exam Reports →
        </Link>
      </div>

      {/* Main Audit Viewer */}
      <AdminAuditLogViewer />
    </div>
  );
}
