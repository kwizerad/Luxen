"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  Loader2,
  Search,
  ChevronRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Eye,
  RefreshCw,
  Send,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { ReportThread } from "@/components/report-thread";
import { canAccess, canWrite, type User as PermUser } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { useAdminSpa } from "@/lib/admin-spa-router";

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { navigateAdmin } = useAdminSpa();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const checkPermAndFetch = async () => {
      const user = await getCurrentUser();
      if (!user || !canAccess(user as PermUser, "drivers")) {
        navigateAdmin("/Admin", { replace: true });
        return;
      }
      setReadOnly(!canWrite(user as PermUser, "drivers"));
      fetchReports();
    };
    checkPermAndFetch();
  }, [router, navigateAdmin]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/manage");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: string) => {
    if (readOnly) return;
    try {
      await fetch("/api/reports/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, status }),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    } catch {
      // ignore
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    reviewing: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dismissed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        !search ||
        r.reported?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.reporter?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  if (selectedReport) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto px-2 sm:px-4 pb-20">
        <div className="admin-card p-4 sm:p-6 border border-[var(--admin-border)]">
          <ReportThread reportId={selectedReport} onBack={() => setSelectedReport(null)} />
        </div>
      </div>
    );
  }

  const totalReports = reports.length;
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const reviewingCount = reports.filter((r) => r.status === "reviewing").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-24">
      {/* Reports & Governance Workspace Sub-Navigation */}
      <div className="admin-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--admin-border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center shrink-0">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                {t("manageReports") || "Safety & Incident Reports Center"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                Governance SPA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              Investigate user & driver safety reports, update resolution statuses, and collaborate on incident threads.
            </p>
          </div>
        </div>

        {/* Sub-workspace Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/reports")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-sm cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Incident Reports ({totalReports})</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/audit")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit Ledger</span>
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
            onClick={fetchReports}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">Total Incident Reports</p>
            <p className="text-2xl font-bold text-[var(--admin-text)] tabular-nums mt-1">{totalReports}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">{t("pending") || "Pending Triage"}</p>
            <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">{t("reviewing") || "Under Investigation"}</p>
            <p className="text-2xl font-bold text-sky-400 tabular-nums mt-1">{reviewingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">{t("resolved") || "Resolved Cases"}</p>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{resolvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="admin-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[var(--admin-border)]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search") || "Search by reported user, reporter name, or description..."}
            className="w-full rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] pl-10 pr-4 py-2.5 text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] overflow-x-auto">
          {[
            { id: "all", label: "All Cases", count: totalReports },
            { id: "pending", label: t("pending") || "Pending", count: pendingCount },
            { id: "reviewing", label: t("reviewing") || "Reviewing", count: reviewingCount },
            { id: "resolved", label: t("resolved") || "Resolved", count: resolvedCount },
            {
              id: "dismissed",
              label: t("dismissed") || "Dismissed",
              count: reports.filter((r) => r.status === "dismissed").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="admin-card py-16 flex flex-col items-center justify-center gap-3 border border-[var(--admin-border)]">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
          <p className="text-xs text-[var(--admin-muted)]">Loading safety & incident reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card py-16 text-center border border-[var(--admin-border)]">
          <Flag className="w-10 h-10 text-[var(--admin-muted)] mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold text-[var(--admin-text)]">{t("noReportsFiled") || "No reports filed"}</p>
          <p className="text-xs text-[var(--admin-muted)] mt-1">All safety & incident queues are clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((report) => (
            <div
              key={report.id}
              className="admin-card p-5 border border-[var(--admin-border)] hover:border-rose-500/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-bold text-[var(--admin-text)]">
                        {t("reportUser") || "Reported"}:{" "}
                        {report.reported?.full_name || report.reported?.username || t("user") || "User"}
                      </p>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[var(--admin-input-bg)] text-[var(--admin-muted)] border border-[var(--admin-border)]">
                        {t(`report_${report.report_type}`) || report.report_type || "Incident"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--admin-muted)] mt-0.5">
                      {t("filedBy") || "Filed by"}:{" "}
                      <span className="font-medium text-[var(--admin-text)]">
                        {report.reporter?.full_name || report.reporter?.username || t("user") || "User"}
                      </span>
                      {report.created_at && (
                        <span> • {new Date(report.created_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`self-start rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    statusColors[report.status] || statusColors.pending
                  }`}
                >
                  {t(report.status) || report.status}
                </span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-[var(--admin-text)] leading-relaxed bg-[var(--admin-input-bg)] p-3.5 rounded-xl border border-[var(--admin-border)]">
                {report.description}
              </p>

              {report.admin_note && (
                <p className="mt-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-300">
                  <span className="font-bold">{t("adminNote") || "Admin Note"}:</span> {report.admin_note}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--admin-muted)]">Status:</label>
                  <select
                    value={report.status}
                    disabled={readOnly}
                    onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-3 py-1.5 text-xs font-bold text-[var(--admin-text)] outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="pending">{t("pending") || "Pending"}</option>
                    <option value="reviewing">{t("reviewing") || "Reviewing"}</option>
                    <option value="resolved">{t("resolved") || "Resolved"}</option>
                    <option value="dismissed">{t("dismissed") || "Dismissed"}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {report.comment_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--admin-input-bg)] text-xs font-semibold text-[var(--admin-muted)]">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      {report.comment_count}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span>{t("reportDiscussion") || "Open Case Thread"}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
