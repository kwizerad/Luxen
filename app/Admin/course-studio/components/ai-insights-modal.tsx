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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background dark:bg-[#0c1120] text-foreground dark:text-slate-100 border border-border dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground dark:text-slate-100">
                  AI Course &amp; Student Performance Intelligence
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground dark:text-slate-400 mt-0.5">
                  Gemini analysis of your platform exam results, student pass rates, and curriculum efficacy.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={loading}
              className="h-8 text-xs gap-1.5 shrink-0 bg-background dark:bg-slate-800/80 border-border dark:border-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin]">
          {loading && !data ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Analyzing exam attempts and student performance...</p>
            </div>
          ) : data ? (
            <>
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3.5 rounded-xl border border-border/80 dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 shadow-xs">
                  <div className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Total Attempts</div>
                  <div className="text-xl font-bold text-foreground dark:text-slate-100 mt-1">
                    {data.stats.totalAttempts}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/80 dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 shadow-xs">
                  <div className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Pass Rate</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {data.stats.passRate}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/80 dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 shadow-xs">
                  <div className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Average Score</div>
                  <div className="text-xl font-bold text-primary mt-1">
                    {data.stats.avgScore}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border/80 dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 shadow-xs">
                  <div className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">AI Health Score</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    <span>{data.insights.performanceScore || 85}/100</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {data.insights.summary && (
                <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 text-xs sm:text-[13px] text-foreground dark:text-slate-200 leading-relaxed shadow-xs">
                  <span className="font-bold text-primary mr-1.5">Overview:</span>
                  {data.insights.summary}
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {data.insights.strengths?.length > 0 && (
                  <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-2.5 shadow-xs">
                    <h5 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs sm:text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Platform Strengths</span>
                    </h5>
                    <ul className="space-y-1.5 text-[12px] text-foreground/80 dark:text-slate-300 list-disc pl-4 leading-normal">
                      {data.insights.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.insights.weaknesses?.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 space-y-2.5 shadow-xs">
                    <h5 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-xs sm:text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Areas for Improvement</span>
                    </h5>
                    <ul className="space-y-1.5 text-[12px] text-foreground/80 dark:text-slate-300 list-disc pl-4 leading-normal">
                      {data.insights.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {data.insights.recommendations?.length > 0 && (
                <div className="p-4 rounded-xl border border-border/80 dark:border-slate-800 bg-muted/30 dark:bg-slate-900/60 space-y-2.5 text-xs shadow-xs">
                  <h5 className="font-bold text-foreground dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Recommended Actions</span>
                  </h5>
                  <ul className="space-y-2 text-[12px] text-foreground/80 dark:text-slate-300">
                    {data.insights.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-normal">
                        <span className="text-primary font-bold mt-0.5">•</span>
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
