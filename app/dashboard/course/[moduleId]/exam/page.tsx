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
      <div className="min-h-screen bg-background">
        <Watermark />
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <Link href="/dashboard/course">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToCourse")}
            </Button>
          </Link>

          <Card className={passed ? "border-green-500" : "border-red-500"}>
            <CardHeader className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                passed ? "bg-green-500/10" : "bg-red-500/10"
              }`}>
                {passed ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {passed ? t("congratulations") : t("examNotPassed")}
              </CardTitle>
              <CardDescription>
                {passed
                  ? t("passedModuleExam")
                  : t("failedModuleExam")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{examResult.correct_answers}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t("correct")}</div>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {examResult.total_questions - examResult.correct_answers}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{t("incorrect")}</div>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <div className={`text-2xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                    {examResult.score_percentage}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{t("score")}</div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {t("passingScore")}: {exam.settings.passing_score}%
                </p>
              </div>

              <Button
                onClick={() => router.push("/dashboard/course")}
                className="w-full"
              >
                {passed ? t("continueToNextModule") : t("reviewLessons")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeQuestion = exam?.questions[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <Watermark />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Link href="/dashboard/course">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCourse")}
          </Button>
        </Link>

        {!instructionsAccepted && (
          <Card>
            <CardHeader>
              <CardTitle>{t("examInstructions")}</CardTitle>
              <CardDescription>
                {t("readInstructionsBeforeExam")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p>• {t("moduleExamInstruction.questionCount").replace("{count}", exam?.settings.question_count)}</p>
                <p>• {t("moduleExamInstruction.duration").replace("{minutes}", exam?.settings.duration_minutes)}</p>
                <p>• {t("moduleExamInstruction.passingScore").replace("{score}", exam?.settings.passing_score)}</p>
                <p>• {t("moduleExamInstruction.randomized")}</p>
                <p>• {t("moduleExamInstruction.noChangeAfterSubmit")}</p>
                <p>• {t("moduleExamInstruction.retakeOnFail")}</p>
              </div>
              <Button onClick={() => { setInstructionsAccepted(true); setShowInstructions(false); }} className="w-full">
                {t("iUnderstandStartExam")}
              </Button>
            </CardContent>
          </Card>
        )}

        {instructionsAccepted && examStartTime && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-mono text-xl font-bold">
                      {formatTime(secondsLeft || 0)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("question")} {currentIndex + 1} {t("of")} {exam.questions.length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {activeQuestion.question || `(${t("imageQuestion")})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeQuestion.question_image && (
                  <img
                    src={activeQuestion.question_image}
                    alt={t("question")}
                    className="w-full max-h-[320px] object-contain rounded-lg border"
                  />
                )}

                <div className="grid gap-3">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const text = activeQuestion[`option_${opt.toLowerCase()}`];
                    const img = activeQuestion[`option_${opt.toLowerCase()}_image`];
                    const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;

                    if (!text && !img) return null;

                    return (
                      <div
                        key={opt}
                        className={`rounded-lg border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent/50"
                        }`}
                        onClick={() => handleAnswerSelect(activeQuestion.id, opt)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                          }`}>
                            {opt}
                          </div>
                          <div className="flex-1 space-y-2">
                            {text && <p>{text}</p>}
                            {img && (
                              <img
                                src={img}
                                alt={`${t("option")} ${opt}`}
                                className="max-h-[120px] object-contain rounded"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t("previous")}
                  </Button>
                  {currentIndex === exam.questions.length - 1 ? (
                    <Button onClick={handleSubmitExam} disabled={submitting}>
                      {submitting ? t("submitting") : t("submit")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                    >
                      {t("next")}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
