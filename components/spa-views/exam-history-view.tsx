"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Clock, CheckCircle2, XCircle, Trophy, Loader2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ExamReview } from "@/components/exam-review";
import { ExamHistorySkeleton } from "@/components/skeletons";
import type { ExamAttempt, ExamQuestion, ExamAnswer } from "@/lib/database.types";

export interface ExamHistoryViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface ExamAttemptWithAnswers extends ExamAttempt {
  answers: ExamAnswer[];
}

export function ExamHistoryView({ navigate }: ExamHistoryViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttemptWithAnswers[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptWithAnswers | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false });

        if (error) throw error;
        setAttempts((data || []) as ExamAttemptWithAnswers[]);
      } catch (err) {
        console.error("Failed to fetch exam history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleReview = async (attempt: ExamAttemptWithAnswers) => {
    setSelectedAttempt(attempt);
    setQuestions([]);

    if (!user) return;
    const supabase = createClient();

    try {
      const questionIds = (attempt.answers || []).map((a) => a.question_id).filter(Boolean);
      if (questionIds.length === 0) return;

      const { data: questionData } = await supabase
        .from("exam_questions")
        .select("*")
        .in("id", questionIds);

      if (questionData) {
        setQuestions(questionData as ExamQuestion[]);
      }
    } catch (err) {
      console.error("Failed to fetch questions for review:", err);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds == null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return <ExamHistorySkeleton />;
  }

  if (selectedAttempt) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <button
            onClick={() => setSelectedAttempt(null)}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("examHistory")}
          </button>

          <ExamReview
            examResult={selectedAttempt}
            questions={questions}
            onReset={() => setSelectedAttempt(null)}
            onRetake={() => {
              setSelectedAttempt(null);
              navigate("exam");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate("home")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("examHistory")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("examHistoryDesc")}</p>
        </div>

        {attempts.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("noExamHistory")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("noExamHistoryHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => {
              const isPassed = attempt.score_percentage >= 50;
              return (
                <button
                  key={attempt.id}
                  onClick={() => handleReview(attempt)}
                  className="group w-full flex items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isPassed
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {attempt.category_name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(attempt.completed_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(attempt.duration_seconds)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        isPassed ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {attempt.score_percentage}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.correct_answers}/{attempt.total_questions}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
