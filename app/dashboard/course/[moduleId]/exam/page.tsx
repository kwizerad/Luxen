"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  Clock,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";
import { getModuleExamForTaking, createModuleExamAttempt } from "@/lib/supabase/queries";

interface UserAnswer {
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  timeStarted: number;
}

export default function ModuleExamPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const moduleId = params.moduleId as string;

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);

  useEffect(() => {
    loadExam();
  }, [moduleId]);

  // Clean up exam-active flag when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('exam-active');
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Module exam component unmounted - exam-active removed');
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmitExam();
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const data = await getModuleExamForTaking(moduleId);
      setExam(data);
      setSecondsLeft(data.settings.duration_minutes * 60);
    } catch (error: any) {
      toast.error(error.message);
      router.push("/dashboard/course");
    } finally {
      setLoading(false);
    }
  };

  const startExam = () => {
    setExamStartTime(Date.now());
    setShowInstructions(false);

    // Mark exam as active in sessionStorage (for sidebar hiding)
    sessionStorage.setItem('exam-active', 'true');

    // Dispatch custom event to notify layout
    window.dispatchEvent(new CustomEvent('exam-state-change'));
    console.log('Module exam started - exam-active set');
  };

  const handleAnswerSelect = (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedAnswer: answer,
        timeStarted: prev[questionId]?.timeStarted || Date.now(),
      },
    }));
  };

  const handleSubmitExam = async () => {
    if (!exam || !examStartTime) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount === 0) {
      toast.error(t("answerAtLeastOne"));
      return;
    }

    setSubmitting(true);
    try {
      const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);

      const answers = exam.questions.map((q: any) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer?.selectedAnswer === q.correct_answer;
        return {
          question_id: q.id,
          selected_answer: userAnswer?.selectedAnswer || null,
          is_correct: isCorrect,
          time_spent_seconds: userAnswer ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000) : 0,
        };
      });

      const correctAnswers = answers.filter((a: any) => a.is_correct).length;
      const scorePercentage = Math.round((correctAnswers / exam.questions.length) * 100);
      const passed = scorePercentage >= exam.settings.passing_score;

      const data = await createModuleExamAttempt({
        module_id: moduleId,
        module_title: exam.module.title,
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        score_percentage: scorePercentage,
        passed,
      });

      setExamResult({
        ...data.attempt,
        score_percentage: scorePercentage,
        passed,
        correct_answers: correctAnswers,
      });
      setShowResults(true);

      // Remove exam-active flag
      sessionStorage.removeItem('exam-active');

      // Dispatch custom event to notify layout
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Module exam submitted - exam-active removed');
    } catch (error: any) {
      toast.error(`${t("failedToSubmitExam")}: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (showResults && examResult) {
    const passed = examResult.passed;
    return (
      <div className="bg-transparent">
        <Watermark />
        <main className="student-page-narrow !mx-auto">
          <Link href="/dashboard/course">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToCourse")}
            </Button>
          </Link>

          <Card className={`rounded-[14px] sm:rounded-[24px] ${passed ? "border-green-500" : "border-red-500"}`}>
            <CardHeader className="text-center p-4 sm:p-6">
              <div className={`mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 ${
                passed ? "bg-green-500/10" : "bg-red-500/10"
              }`}>
                {passed ? (
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                )}
              </div>
              <CardTitle className="text-xl sm:text-2xl">
                {passed ? t("congratulations") : t("examNotPassed")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {passed
                  ? t("passedModuleExam")
                  : t("failedModuleExam")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 leading-tight">{examResult.correct_answers}</div>
                  <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("correct")}</div>
                </div>
                <div className="p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 leading-tight">
                    {examResult.total_questions - examResult.correct_answers}
                  </div>
                  <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("incorrect")}</div>
                </div>
                <div className="p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                  <div className={`text-xl sm:text-2xl font-bold leading-tight ${passed ? "text-green-600" : "text-red-600"}`}>
                    {examResult.score_percentage}%
                  </div>
                  <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("score")}</div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[11px] sm:text-sm text-muted-foreground">
                  {t("passingScore")}: {exam.settings.passing_score}%
                </p>
              </div>

              <Button
                onClick={() => router.push("/dashboard/course")}
                className="w-full"
                size="sm"
              >
                {passed ? t("continueToNextModule") : t("reviewLessons")}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const activeQuestion = exam?.questions[currentIndex];

  return (
    <div className="min-h-[100dvh] bg-transparent">
      <Watermark />
      <main className="student-page-narrow !mx-auto">
        <Link href="/dashboard/course">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCourse")}
          </Button>
        </Link>

        {!instructionsAccepted && (
          <Card className="rounded-[14px] sm:rounded-[24px]">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">{t("examInstructions")}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("readInstructionsBeforeExam")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-sm">
                <p>• {t("moduleExamInstruction.questionCount").replace("{count}", exam?.settings.question_count)}</p>
                <p>• {t("moduleExamInstruction.duration").replace("{minutes}", exam?.settings.duration_minutes)}</p>
                <p>• {t("moduleExamInstruction.passingScore").replace("{score}", exam?.settings.passing_score)}</p>
                <p>• {t("moduleExamInstruction.randomized")}</p>
                <p>• {t("moduleExamInstruction.noChangeAfterSubmit")}</p>
                <p>• {t("moduleExamInstruction.retakeOnFail")}</p>
              </div>
              <Button size="sm" onClick={() => { setInstructionsAccepted(true); setShowInstructions(false); }} className="w-full">
                {t("iUnderstandStartExam")}
              </Button>
            </CardContent>
          </Card>
        )}

        {instructionsAccepted && examStartTime && (
          <>
            {/* Sticky timer + progress bar */}
            <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2.5 sm:py-0 bg-background/80 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b sm:border-0">
              <Card className="rounded-[12px] sm:rounded-[24px] sm:shadow-none">
                <CardContent className="p-2.5 sm:p-4">
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${secondsLeft !== null && secondsLeft < 60 ? "text-red-600" : "text-primary"}`} />
                      <span className={`font-mono text-base sm:text-xl font-bold tabular-nums ${secondsLeft !== null && secondsLeft < 60 ? "text-red-600" : ""}`}>
                        {formatTime(secondsLeft || 0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{t("progress")}</span>
                        <span className="text-muted-foreground tabular-nums">{Object.keys(userAnswers).length} / {exam.questions.length}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(Object.keys(userAnswers).length / exam.questions.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[11px] sm:text-sm text-muted-foreground shrink-0">
                      {t("question")} {currentIndex + 1} / {exam.questions.length}
                    </div>
                    {/* Question palette toggle (mobile only) */}
                    <button
                      type="button"
                      onClick={() => setShowQuestionPalette((v) => !v)}
                      className="sm:hidden flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
                      aria-label="Toggle question palette"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>{Object.keys(userAnswers).length}/{exam.questions.length}</span>
                    </button>
                  </div>

                  {/* Question palette — always visible on sm+, collapsible on mobile */}
                  <div className={`${showQuestionPalette ? "block" : "hidden"} sm:block mt-2.5 sm:mt-3`}>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {exam.questions.map((q: any, i: number) => {
                        const isAnswered = !!userAnswers[q.id]?.selectedAnswer;
                        const isCurrent = i === currentIndex;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setCurrentIndex(i)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                              isCurrent
                                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                                : isAnswered
                                ? "bg-primary/15 text-primary hover:bg-primary/25"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                            }`}
                            aria-label={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[14px] sm:rounded-[24px]">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-xl">
                  {activeQuestion.question || `(${t("imageQuestion")})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                {activeQuestion.question_image && (
                  <img
                    src={activeQuestion.question_image}
                    alt={t("question")}
                    className="w-full max-h-[240px] sm:max-h-[320px] object-contain rounded-[10px] sm:rounded-lg border"
                  />
                )}

                <div className="grid gap-2 sm:gap-3">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const text = activeQuestion[`option_${opt.toLowerCase()}`];
                    const img = activeQuestion[`option_${opt.toLowerCase()}_image`];
                    const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;

                    if (!text && !img) return null;

                    return (
                      <div
                        key={opt}
                        className={`rounded-[10px] sm:rounded-lg border p-2.5 sm:p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent/50"
                        }`}
                        onClick={() => handleAnswerSelect(activeQuestion.id, opt)}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                          }`}>
                            {opt}
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            {text && <p className="text-xs sm:text-sm">{text}</p>}
                            {img && (
                              <img
                                src={img}
                                alt={`${t("option")} ${opt}`}
                                className="max-h-[100px] sm:max-h-[120px] object-contain rounded"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-2 sm:pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    {t("previous")}
                  </Button>
                  {currentIndex === exam.questions.length - 1 ? (
                    <Button size="sm" onClick={handleSubmitExam} disabled={submitting}>
                      {submitting ? t("submitting") : t("submit")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                    >
                      {t("next")}
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5 sm:ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
