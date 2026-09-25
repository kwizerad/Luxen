"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  BarChart3,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface AIInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIInsightsModal({ open, onOpenChange }: AIInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    stats: {
      totalAttempts: number;
      passedCount: number;
      passRate: string;
      avgScore: string;
      activeCoursesCount: number;
    };
    insights: {
      performanceScore: number;
      summary: string;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      curriculumTips: string[];
    };
  } | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/ai-insights");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load insights");
      }
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load AI insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !data) {
      fetchInsights();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[var(--admin-card)] text-[var(--admin-text)] border-[var(--admin-border)]">
        <DialogHeader className="p-4 sm:p-5 border-b border-[var(--admin-border)] bg-[var(--admin-card)]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--admin-primary)]/10 text-[var(--admin-primary)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  AI Course &amp; Student Performance Intelligence
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--admin-muted)]">
                  Gemini analysis of your platform exam results, student pass rates, and curriculum efficacy.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={loading}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading && !data ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--admin-muted)]">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--admin-primary)]" />
              <p className="text-xs">Analyzing exam attempts and student performance...</p>
            </div>
          ) : data ? (
            <>
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/20">
                  <div className="text-[11px] text-[var(--admin-muted)]">Total Attempts</div>
                  <div className="text-lg font-bold text-[var(--admin-text)] mt-0.5">
                    {data.stats.totalAttempts}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/20">
                  <div className="text-[11px] text-[var(--admin-muted)]">Pass Rate</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {data.stats.passRate}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/20">
                  <div className="text-[11px] text-[var(--admin-muted)]">Average Score</div>
                  <div className="text-lg font-bold text-[var(--admin-primary)] mt-0.5">
                    {data.stats.avgScore}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/20">
                  <div className="text-[11px] text-[var(--admin-muted)]">AI Health Score</div>
                  <div className="text-lg font-bold text-amber-500 mt-0.5 flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    <span>{data.insights.performanceScore || 85}/100</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {data.insights.summary && (
                <div className="p-3.5 rounded-lg border border-[var(--admin-primary)]/20 bg-[var(--admin-primary)]/5 text-xs text-[var(--admin-text)] leading-relaxed">
                  <span className="font-semibold text-[var(--admin-primary)]">Overview: </span>
                  {data.insights.summary}
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {data.insights.strengths?.length > 0 && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                    <h5 className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Platform Strengths
                    </h5>
                    <ul className="space-y-1 text-[11px] text-[var(--admin-muted)] list-disc pl-4">
                      {data.insights.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.insights.weaknesses?.length > 0 && (
                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                    <h5 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Areas for Improvement
                    </h5>
                    <ul className="space-y-1 text-[11px] text-[var(--admin-muted)] list-disc pl-4">
                      {data.insights.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {data.insights.recommendations?.length > 0 && (
                <div className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] space-y-2 text-xs">
                  <h5 className="font-semibold text-[var(--admin-text)] flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Recommended Actions
                  </h5>
                  <ul className="space-y-1.5 text-[11px] text-[var(--admin-muted)]">
                    {data.insights.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[var(--admin-primary)] font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
