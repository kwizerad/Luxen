"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Calendar,
  Clock,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Sparkles,
  FileText,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  getReportScheduleConfig,
  updateReportScheduleConfig,
  triggerWeeklyReportNow,
  getWeeklyReportPreviewHTML,
  getPastReportDispatches,
  ReportScheduleConfig,
  ReportDispatchRecord,
} from "@/app/Admin/actions/scheduler";

export function WeeklyReportSchedulerCard() {
  const [config, setConfig] = useState<ReportScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pastDispatches, setPastDispatches] = useState<ReportDispatchRecord[]>([]);

  // Load config & history
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [loadedConfig, history] = await Promise.all([
          getReportScheduleConfig(),
          getPastReportDispatches(),
        ]);
        setConfig(loadedConfig);
        setPastDispatches(history);
      } catch (err) {
        console.error("Failed to load report scheduler config:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleEnable = async () => {
    if (!config) return;
    const newEnabled = !config.enabled;
    setSaving(true);
    try {
      const res = await updateReportScheduleConfig({ enabled: newEnabled });
      if (res.success) {
        setConfig(res.config);
        toast.success(
          newEnabled
            ? "Weekly exam summary email schedule activated (Mondays at 08:00 AM UTC)"
            : "Weekly exam report schedule paused"
        );
      } else {
        toast.error(res.error || "Failed to update schedule");
      }
    } catch {
      toast.error("Failed to update schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRecipient = async (email: string) => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await updateReportScheduleConfig({ recipientEmail: email });
      if (res.success) {
        setConfig(res.config);
        toast.success(`Recipient email updated to ${email}`);
      } else {
        toast.error(res.error || "Failed to update email");
      }
    } catch {
      toast.error("Failed to update email");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!config) return;
    setDispatching(true);
    try {
      toast.loading("Compiling weekly exam performance metrics and sending email...", { id: "send-report" });
      const res = await triggerWeeklyReportNow();
      if (res.success) {
        toast.success(
          `Weekly performance summary successfully generated and dispatched to ${res.recipient}!`,
          { id: "send-report" }
        );
        // Refresh history
        const updatedHistory = await getPastReportDispatches();
        setPastDispatches(updatedHistory);
      } else {
        toast.error(res.error || "Failed to dispatch report", { id: "send-report" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to trigger report", { id: "send-report" });
    } finally {
      setDispatching(false);
    }
  };

  const handleOpenPreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await getWeeklyReportPreviewHTML();
      setPreviewHtml(res.html);
    } catch (err) {
      console.error("Preview failed:", err);
      toast.error("Failed to render report preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] flex items-center justify-center gap-3 text-sm text-[var(--admin-muted)]">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
        <span>Loading automated reporting scheduler...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. MAIN SCHEDULER CONTROLS CARD */}
      <div className="p-6 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--admin-border)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--admin-text)]">
                  Automated Weekly Exam Performance Reports
                </h3>
                {config?.enabled ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Active Schedule
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-1 max-w-2xl">
                Automatically analyzes the past 7 days of exam attempts, calculates category pass rates, top learner honor rolls, and emails an executive summary to the primary administrator every Monday.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenPreview}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] transition-all active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Preview HTML Email</span>
            </button>
            <button
              onClick={handleSendNow}
              disabled={dispatching}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {dispatching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Report Now</span>
            </button>
          </div>
        </div>

        {/* Configuration Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {/* Tile 1: Status & Recipient */}
          <div className="p-4 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--admin-muted)] uppercase tracking-wider">
                Schedule Status
              </span>
              <button
                onClick={handleToggleEnable}
                disabled={saving}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config?.enabled ? "bg-indigo-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config?.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div>
              <div className="text-xs text-[var(--admin-muted)] mb-1 font-medium">Primary Administrator Email</div>
              <input
                type="email"
                defaultValue={config?.recipientEmail || ""}
                onBlur={(e) => {
                  if (e.target.value !== config?.recipientEmail) {
                    handleUpdateRecipient(e.target.value);
                  }
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--admin-card-bg)] border border-[var(--admin-border)] text-xs text-[var(--admin-text)] focus:outline-none focus:border-indigo-500"
                placeholder="primary.admin@luxen.rw"
              />
            </div>
          </div>

          {/* Tile 2: Frequency & Timing */}
          <div className="p-4 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] space-y-3">
            <span className="text-xs font-bold text-[var(--admin-muted)] uppercase tracking-wider block">
              Cadence & Timing
            </span>
            <div className="flex items-center gap-2 text-xs text-[var(--admin-text)] font-semibold">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Every Monday Morning</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>08:00 AM UTC (10:00 AM CAT)</span>
            </div>
            {config?.nextScheduledAt && (
              <div className="text-[11px] text-emerald-400/90 font-medium">
                Next run: {new Date(config.nextScheduledAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Tile 3: Included Intelligence */}
          <div className="p-4 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] space-y-2">
            <span className="text-xs font-bold text-[var(--admin-muted)] uppercase tracking-wider block">
              Included Telemetry
            </span>
            <div className="space-y-1.5 text-xs text-[var(--admin-muted)]">
              <div className="flex items-center gap-1.5 text-[var(--admin-text)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Overall Pass Rate & Avg Scores</span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--admin-text)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Category Breakdown (A, B, Special)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--admin-text)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Top Scorers & Support Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECENT DISPATCHES AUDIT TABLE */}
      <div className="p-6 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-[var(--admin-text)]">
              Weekly Report Execution History
            </h4>
            <p className="text-xs text-[var(--admin-muted)]">
              Record of all automated and manual weekly summary dispatches to primary administration
            </p>
          </div>
          <span className="text-xs text-[var(--admin-muted)]">
            Showing last {pastDispatches.length} cycles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)] uppercase tracking-wider font-semibold">
                <th className="pb-3 px-2">Dispatched At</th>
                <th className="pb-3 px-2">Reporting Period</th>
                <th className="pb-3 px-2">Recipient</th>
                <th className="pb-3 px-2 text-center">Attempts</th>
                <th className="pb-3 px-2 text-center">Pass Rate</th>
                <th className="pb-3 px-2 text-center">Avg Score</th>
                <th className="pb-3 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {pastDispatches.map((record) => (
                <tr key={record.id} className="hover:bg-[var(--admin-hover-bg)] transition-colors">
                  <td className="py-3 px-2 font-medium text-[var(--admin-text)] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{new Date(record.dispatchedAt).toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-2 text-[var(--admin-muted)]">{record.period}</td>
                  <td className="py-3 px-2 font-mono text-[var(--admin-text)]">{record.recipientEmail}</td>
                  <td className="py-3 px-2 text-center font-bold text-[var(--admin-text)]">
                    {record.totalAttempts}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {record.passRate}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold text-sky-400">
                    {record.averageScore}%
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. HTML PREVIEW MODAL */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-[var(--admin-border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)] bg-[#131B2E]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">
                  Executive Weekly Summary Email Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendNow}
                  disabled={dispatching}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Primary Admin</span>
                </button>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {previewLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>Compiling live email template...</span>
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  title="Weekly Report Email Preview"
                  className="w-full h-[650px] rounded-xl border border-zinc-800 bg-[#0B0F19]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
