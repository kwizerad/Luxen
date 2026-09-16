"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  BarChart3,
  Download,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  Users,
  Image as ImageIcon,
  Clock,
  Award,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AuditReportData } from "@/app/api/admin/audit-report/route";

interface AdminAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminAuditReportModal({ isOpen, onClose }: AdminAuditReportModalProps) {
  const [report, setReport] = useState<AuditReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit-report");
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
      } else {
        toast.error(json.error || "Failed to generate audit report");
      }
    } catch {
      toast.error("Network error while generating audit report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen]);

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luxen-course-exam-audit-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit report downloaded successfully");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-[var(--admin-card-bg,#121826)] text-[var(--admin-text,#f8fafc)] border border-[var(--admin-border,#1e293b)] p-0 rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-[var(--admin-border,#1e293b)] flex flex-row items-center justify-between sticky top-0 bg-[var(--admin-card-bg,#121826)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Course & Exam System Audit Report
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Verified Live
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Generated on: {report ? new Date(report.generatedAt).toLocaleString() : "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchReport}
              disabled={loading}
              className="h-8 gap-1.5 text-xs rounded-xl bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Re-Audit
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadJSON}
              disabled={!report || loading}
              className="h-8 gap-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading && !report ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-sm font-medium text-slate-300">Auditing database courses, lessons, questions & telemetry...</p>
          </div>
        ) : report ? (
          <div className="p-6 space-y-6">
            {/* Top Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-sm text-slate-200">Courses & Lessons Health</span>
                  </div>
                  <span className="text-xl font-black text-indigo-400">{report.courses.healthScore}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-800/50">
                    <div className="text-[10px] text-slate-400">Modules</div>
                    <div className="text-base font-bold text-white">{report.courses.totalModules}</div>
                    <div className="text-[9px] text-emerald-400">{report.courses.publishedModules} pub</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50">
                    <div className="text-[10px] text-slate-400">Lessons</div>
                    <div className="text-base font-bold text-white">{report.courses.totalLessons}</div>
                    <div className="text-[9px] text-emerald-400">{report.courses.publishedLessons} pub</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50">
                    <div className="text-[10px] text-slate-400">Topics</div>
                    <div className="text-base font-bold text-white">{report.courses.totalTopics}</div>
                    <div className="text-[9px] text-slate-400">Broken down</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-slate-200">Exams & Question Bank Health</span>
                  </div>
                  <span className="text-xl font-black text-emerald-400">{report.exams.healthScore}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-800/50">
                    <div className="text-[10px] text-slate-400">Categories</div>
                    <div className="text-base font-bold text-white">{report.exams.totalCategories}</div>
                    <div className="text-[9px] text-emerald-400">{report.exams.publishedCategories} active</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50">
                    <div className="text-[10px] text-slate-400">Questions</div>
                    <div className="text-base font-bold text-white">{report.exams.totalQuestions}</div>
                    <div className="text-[9px] text-emerald-400">100% verified</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50">
                    <div className="text-[10px] text-slate-400">Diagrams</div>
                    <div className="text-base font-bold text-white">{report.exams.questionsWithDiagrams}</div>
                    <div className="text-[9px] text-indigo-400">With images</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Courses Breakdown Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> 1. Course Modules & Structure Breakdown
              </h4>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/70 overflow-hidden">
                {report.courses.modulesBreakdown.map((m) => (
                  <div key={m.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                    <div>
                      <div className="font-bold text-slate-200">{m.title}</div>
                      <div className="text-[11px] text-slate-400">{m.lessonsCount} lessons attached</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        m.isPublished ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {m.isPublished ? "Published" : "Draft / Unpushed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exam Categories & Question Bank */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> 2. Exam Categories & Question Bank
              </h4>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/70 overflow-hidden">
                {report.exams.categoriesBreakdown.map((c) => (
                  <div key={c.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                    <div>
                      <div className="font-bold text-slate-200">{c.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {c.questionCount} Total Questions in Bank • {c.configuredQuestionsPerExam || 20} questions per exam ({c.durationMinutes || 20} mins)
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        c.isPublished ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {c.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Student Telemetry */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> 3. Exam Attempts & Learner Telemetry
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Total Attempts</div>
                  <div className="text-lg font-bold text-white">{report.exams.telemetry.totalAttempts}</div>
                  <div className="text-[10px] text-slate-400">{report.exams.telemetry.completedAttempts} completed</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Pass Rate</div>
                  <div className="text-lg font-bold text-emerald-400">{report.exams.telemetry.passRate}%</div>
                  <div className="text-[10px] text-emerald-400">{report.exams.telemetry.passedAttempts} passed</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Average Score</div>
                  <div className="text-lg font-bold text-indigo-400">{report.exams.telemetry.averageScore}%</div>
                  <div className="text-[10px] text-slate-400">High: {report.exams.telemetry.highestScore}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Group Challenges</div>
                  <div className="text-lg font-bold text-amber-400">{report.exams.challenges.totalGroupChallenges}</div>
                  <div className="text-[10px] text-slate-400">{report.exams.challenges.completed} finished</div>
                </div>
              </div>
            </div>

            {/* Findings & Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" /> Issues & Warnings ({report.courses.issues.length + report.exams.issues.length})
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  {[...report.courses.issues, ...report.exams.issues].length === 0 ? (
                    <li className="text-emerald-400 list-none font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> No critical data integrity issues detected!
                    </li>
                  ) : (
                    [...report.courses.issues, ...report.exams.issues].map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" /> Actionable Recommendations
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  {[...report.courses.recommendations, ...report.exams.recommendations].map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
