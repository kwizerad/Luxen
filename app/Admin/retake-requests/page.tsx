"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  BookOpen,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminStats,
  resolveRetakeRequestAction,
  type RetakeRequestItem,
} from "@/app/Admin/actions/stats";
import { useAdminSpa } from "@/lib/admin-spa-router";

export default function RetakeRequestsPage() {
  const { navigateAdmin } = useAdminSpa();
  const [requests, setRequests] = useState<RetakeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "denied">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminStats();
      if (res.success && res.data) {
        setRequests(res.data.retakeRequests || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load retake requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleResolve = async (requestId: string, status: "approved" | "denied") => {
    setProcessingId(requestId);
    try {
      const res = await resolveRetakeRequestAction(
        requestId,
        status,
        status === "approved"
          ? "Approved via Retake Requests Workspace"
          : "Declined via Retake Requests Workspace"
      );
      if (!res.success) {
        toast.error(res.error || "Failed to update request");
        return;
      }
      toast.success(
        status === "approved"
          ? "Retake request approved and student notified"
          : "Retake request declined"
      );
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Error resolving request");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.student_name.toLowerCase().includes(q) ||
        (r.student_email || "").toLowerCase().includes(q) ||
        r.category_name.toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchQuery]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-24">
      {/* Header & Exam Workspace Switcher */}
      <div className="admin-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--admin-border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                Exam Retake Requests & Approvals
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                Exams SPA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              Review student requests for additional exam attempts, inspect past scores, and grant 1-click approvals.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/exams")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exam Categories</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/questions")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Question Bank</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/retake-requests")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Retake Requests ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">Total Requests</p>
            <p className="text-2xl font-bold text-[var(--admin-text)] tabular-nums mt-1">{requests.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">Approved</p>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">Declined</p>
            <p className="text-2xl font-bold text-rose-400 tabular-nums mt-1">{deniedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[var(--admin-border)]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, email, category, or reason..."
            className="w-full rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] pl-10 pr-4 py-2.5 text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
          {(["pending", "approved", "denied", "all"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Cards */}
      <div className="admin-card p-5 border border-[var(--admin-border)]">
        {loading ? (
          <div className="py-14 text-center text-xs text-[var(--admin-muted)]">
            Loading exam retake requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <FileCheck className="w-10 h-10 text-emerald-400/50 mx-auto mb-2" />
            <p className="text-sm font-bold text-[var(--admin-text)]">No matching retake requests</p>
            <p className="text-xs text-[var(--admin-muted)] mt-1">
              All student retake requests for this filter have been processed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--admin-text)]">{req.student_name}</span>
                    {req.student_email && (
                      <span className="text-xs text-[var(--admin-muted)]">({req.student_email})</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                      {req.category_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : req.status === "denied"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--admin-muted)]">
                    Reason: <span className="text-[var(--admin-text)]">{req.reason || "Standard retake request"}</span>
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--admin-muted)]">
                    <span>Requested: {new Date(req.created_at).toLocaleString()}</span>
                    {req.admin_note && <span>• Note: {req.admin_note}</span>}
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleResolve(req.id, "approved")}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Approve Retake
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleResolve(req.id, "denied")}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
