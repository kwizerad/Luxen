"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import { SmartImage, preloadImages } from "@/components/smart-image";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import {
  CheckCircle,
  XCircle,
  Trophy,
  ArrowRight,
  Home,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Play,
  LogOut,
  Monitor,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useExamSecurity } from "@/hooks/use-exam-security";
import {
  getModuleExamForTaking,
  getMidtermExamForTaking,
  getFinalExamForTaking,
  createModuleExamAttempt,
  canRetakeExam,
  requestExamRetake,
} from "@/lib/supabase/queries";
import { getSecuritySettings, DEFAULT_SECURITY_SETTINGS, type SecuritySettings } from "@/lib/security-config";
import type { ModuleExamQuestion, ModuleExamSettings, ModuleExamAttempt, ModuleExamAnswer } from "@/lib/database.types";

export type ExamType = "module" | "midterm" | "final";

interface ModuleExamRunnerProps {
  examType: ExamType;
  moduleId?: string;
  moduleTitle?: string;
  midtermModuleIds?: string[];
  midtermQuestionCount?: number;
  midtermDurationMinutes?: number;
  finalModuleIds?: string[];
  finalQuestionCount?: number;
  finalDurationMinutes?: number;
  onComplete: (result: { passed: boolean; score: number; taken: boolean }) => void;
  onExit: () => void;
}

type UserAnswer = {
  questionId: string;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  timeStarted: number;
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ModuleExamRunner({
  examType,
  moduleId,
  moduleTitle,
  midtermModuleIds,
  midtermQuestionCount = 30,
  midtermDurationMinutes = 30,
  finalModuleIds,
  finalQuestionCount = 50,
  finalDurationMinutes = 45,
  onComplete,
  onExit,
}: ModuleExamRunnerProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<ModuleExamQuestion[]>([]);
  const [settings, setSettings] = useState<ModuleExamSettings | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<ModuleExamAttempt | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [retakeInfo, setRetakeInfo] = useState<{ canRetake: boolean; needsApproval: boolean; reason?: string } | null>(null);
  const [showRetakeRequest, setShowRetakeRequest] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);

  const showResultsRef = useRef(false);
  const examActiveRef = useRef(false);
  const handleSubmitExamRef = useRef<((isAutoSubmit?: boolean) => Promise<void>) | null>(null);

  const fullscreenEnabled = examType === "final" && securitySettings.violationMeasuresEnabled && securitySettings.fullscreenEnabled;

  const handleAutoSubmit = useCallback(() => {
    handleSubmitExamRef.current?.(true);
  }, []);

  const security = useExamSecurity({
    settings: securitySettings,
    isActive: examActiveRef.current && !showResultsRef.current,
    onAutoSubmit: handleAutoSubmit,
  });

  // Auto-dismiss cheating warning for minor violations (not fullscreen/tabswitch)
  useEffect(() => {
    if (!security.showCheatingWarning) return;
    if (security.violationType === "fullscreen" || security.violationType === "tabswitch") return;
    if (security.fullscreenRetryCount >= securitySettings.maxViolations || security.cheatingAttempts >= securitySettings.maxViolations) return;

    const timer = setTimeout(() => {
      security.dismissCheatingWarning();
    }, 3000);

    return () => clearTimeout(timer);
  }, [security.showCheatingWarning, security.violationType, security.fullscreenRetryCount, security.cheatingAttempts, securitySettings.maxViolations, security]);

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      setLoading(true);
      try {
        const settings = await getSecuritySettings();
        setSecuritySettings(settings);

        if (examType === "module" && moduleId) {
          const data = await getModuleExamForTaking(moduleId);
          setQuestions(data.questions);
          setSettings(data.settings);
          setDurationMinutes(data.settings.duration_minutes || 20);
        } else if (examType === "midterm" && midtermModuleIds) {
          const data = await getMidtermExamForTaking(
            midtermModuleIds,
            midtermQuestionCount,
            midtermDurationMinutes
          );
          setQuestions(data.questions);
          setDurationMinutes(data.durationMinutes);
        } else if (examType === "final" && finalModuleIds) {
          const data = await getFinalExamForTaking(
            finalModuleIds,
            finalQuestionCount,
            finalDurationMinutes
          );
          setQuestions(data.questions);
          setDurationMinutes(data.durationMinutes);
        }
        setShowInstructions(true);
      } catch (error) {
        toast.error((error instanceof Error ? error.message : String(error)) || t("failedToLoadExam") || "Failed to load exam");
        onExit();
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [examType, moduleId, midtermModuleIds, finalModuleIds, midtermQuestionCount, midtermDurationMinutes, finalQuestionCount, finalDurationMinutes, onExit, t]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmitExamRef.current?.(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Arrow key navigation
  useEffect(() => {
    if (!examActiveRef.current || showResultsRef.current) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [questions.length]);

  const activeQuestion = useMemo(() => {
    if (!questions.length) return null;
    return questions[currentIndex] ?? null;
  }, [questions, currentIndex]);

  const startExam = async () => {
    if (!instructionsAccepted) {
      toast.error(t("pleaseAcceptExamInstructions") || "Please accept the instructions");
      return;
    }
    setShowInstructions(false);
    setCurrentIndex(0);
    setSecondsLeft(durationMinutes * 60);
    setExamStartTime(Date.now());
    setUserAnswers({});
    setShowResults(false);
    setExamResult(null);
    security.resetSecurity();

    // Preload all question + option images so navigation feels instant
    const allImageUrls = questions.flatMap((q) => [
      q.question_image,
      q.option_a_image,
      q.option_b_image,
      q.option_c_image,
      q.option_d_image,
    ]).filter(Boolean) as string[];
    preloadImages(allImageUrls);

    showResultsRef.current = false;
    examActiveRef.current = true;

    if (fullscreenEnabled) {
      await security.requestFullscreen();
    }

    sessionStorage.setItem("exam-active", "true");
    window.dispatchEvent(new CustomEvent("exam-state-change"));

    // Trap back button
    if (typeof window !== "undefined") {
      for (let i = 0; i < 3; i++) {
        window.history.pushState({ exam: true, index: i }, "", window.location.href);
      }
    }
  };

  const handleSelectAnswer = (answer: "A" | "B" | "C" | "D") => {
    if (!activeQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        questionId: activeQuestion.id,
        selectedAnswer: answer,
        timeStarted: prev[activeQuestion.id]?.timeStarted || Date.now(),
      },
    }));
  };

  // Swipe for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && currentIndex < questions.length - 1) {
      setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setCurrentIndex((i) => Math.max(0, i - 1));
    }
  }, [touchStart, touchEnd, currentIndex, questions.length]);

  const submittingRef = useRef(false);

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!examStartTime || !questions.length) return;
    if (submittingRef.current || showResultsRef.current) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount === 0 && !isAutoSubmit) {
      toast.error(t("noAnswersSelected") || "Please select at least one answer");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    showResultsRef.current = true;
    examActiveRef.current = false;

    try {
      const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);
      const passingPercentage = settings?.passing_percentage ?? 70;

      const answers = questions.map((q) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer?.selectedAnswer === q.correct_answer;
        return {
          question_id: q.id,
          selected_answer: userAnswer?.selectedAnswer || null,
          is_correct: isCorrect,
          time_spent_seconds: userAnswer ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000) : 0,
        };
      });

      const correctCount = answers.filter((a) => a.is_correct).length;
      const scorePercentage = Math.round((correctCount / questions.length) * 100);
      const passed = scorePercentage >= passingPercentage;

      const attempt = await createModuleExamAttempt({
        module_id: moduleId || null,
        module_title: moduleTitle || null,
        exam_type: examType,
        total_questions: questions.length,
        correct_answers: correctCount,
        score_percentage: scorePercentage,
        passed,
        duration_seconds: durationSeconds,
        answers,
        status: answeredCount > 0 ? "completed" : "abandoned",
      });

      setExamResult(attempt);
      setShowResults(true);

      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));

      if (fullscreenEnabled) {
        await security.exitFullscreen();
      }

      toast.success(t("examSubmittedSuccess") || "Exam submitted successfully");

      // Check retake eligibility for module exams
      if (examType === "module" && moduleId) {
        const retake = await canRetakeExam(moduleId, "module");
        setRetakeInfo(retake);
      }

      onComplete({ passed, score: scorePercentage, taken: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t("failedToSubmitExam") || "Failed to submit exam"}: ${message}`);
      examActiveRef.current = true;
      showResultsRef.current = false;
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };
  handleSubmitExamRef.current = handleSubmitExam;

  const handleRetake = () => {
    setShowResults(false);
    setExamResult(null);
    setCurrentIndex(0);
    setSecondsLeft(null);
    setExamStartTime(null);
    setUserAnswers({});
    setRetakeInfo(null);
    showResultsRef.current = false;
    examActiveRef.current = false;
    submittingRef.current = false;
    security.resetSecurity();
    setShowInstructions(true);
    setInstructionsAccepted(false);
  };

  const handleRequestRetake = async () => {
    if (!retakeReason.trim()) {
      toast.error(t("retakeReason") || "Please provide a reason");
      return;
    }
    setSubmittingRetake(true);
    try {
      await requestExamRetake(moduleId || null, examType, retakeReason);
      toast.success(t("retakeRequestSubmitted") || "Retake request submitted");
      setShowRetakeRequest(false);
      setRetakeReason("");
      setRetakeInfo({ canRetake: false, needsApproval: true, reason: "pending" });
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || "Failed to submit retake request");
    } finally {
      setSubmittingRetake(false);
    }
  };

  const reset = () => {
    examActiveRef.current = false;
    showResultsRef.current = false;
    submittingRef.current = false;
    setQuestions([]);
    setSettings(null);
    setCurrentIndex(0);
    setSecondsLeft(null);
    setExamStartTime(null);
    setUserAnswers({});
    setShowResults(false);
    setExamResult(null);
    setShowInstructions(false);
    setInstructionsAccepted(false);
    security.resetSecurity();
    sessionStorage.removeItem("exam-active");
    window.dispatchEvent(new CustomEvent("exam-state-change"));
    onExit();
  };

  const answeredCount = Object.keys(userAnswers).length;
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const isExamActive = questions.length > 0 && secondsLeft !== null && !showResults;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Results view
  if (showResults && examResult) {
    return (
      <main className="student-page student-page-no-nav relative !mx-auto max-w-5xl">
        <Watermark />
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold brand-protected">
              {t("examResults") || "Exam Results"}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              {t("yourPerformanceSummary") || "Your performance summary"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {t("backToExams") || "Back"}
          </Button>
        </div>

        <Card className="border-primary/20 navo-card-brand rounded-[14px] sm:rounded-[24px]">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-primary-readable" />
              {moduleTitle || (examType === "midterm" ? t("midtermTest") : examType === "final" ? t("finalExam") : "Module Exam")}
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              {t("completedOn") || "Completed on"} {examResult.completed_at ? new Date(examResult.completed_at).toLocaleString() : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-primary-readable leading-tight">
                  {examResult.score_percentage}%
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                  {t("score") || "Score"}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-green-600 leading-tight">
                  {examResult.correct_answers}
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                  {t("correct") || "Correct"}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-red-600 leading-tight">
                  {examResult.total_questions - examResult.correct_answers}
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                  {t("incorrect") || "Incorrect"}
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold leading-tight">
                  {formatTime(examResult.duration_seconds)}
                </div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                  {t("time") || "Time"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={examResult.passed ? "default" : "destructive"}>
                {examResult.passed ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> {t("passed") || "Passed"}</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> {t("failed") || "Failed"}</>
                )}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {t("passingScore") || "Passing score"}: {settings?.passing_percentage ?? 70}%
              </span>
            </div>

            {/* Answer breakdown */}
            {settings?.show_results_immediately !== false && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="font-semibold text-sm sm:text-base">
                  {t("answerBreakdown") || "Answer Breakdown"}
                </h3>
                {examResult.answers.map((answer: ModuleExamAnswer, idx: number) => {
                  const question = questions.find((q) => q.id === answer.question_id);
                  if (!question) return null;
                  return (
                    <div key={answer.question_id} className="p-2.5 sm:p-4 border rounded-[10px] sm:rounded-lg">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                            <Badge variant={answer.is_correct ? "default" : "destructive"} className="text-[10px] sm:text-xs">
                              {answer.is_correct ? (
                                <><CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> {t("correct") || "Correct"}</>
                              ) : (
                                <><XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" /> {t("incorrect") || "Incorrect"}</>
                              )}
                            </Badge>
                            <span className="text-[11px] sm:text-sm text-muted-foreground">
                              {t("question") || "Question"} {idx + 1}
                            </span>
                          </div>
                          {question.question && (
                            <p className="text-xs sm:text-sm mb-1.5 sm:mb-2">{question.question}</p>
                          )}
                          <div className="text-xs sm:text-sm">
                            <span className="text-muted-foreground">{t("yourAnswer") || "Your answer"}: </span>
                            <span className={answer.is_correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {answer.selected_answer || t("notAnswered") || "Not answered"}
                            </span>
                            {!answer.is_correct && (
                              <span className="text-muted-foreground ml-2">
                                ({t("correctColon") || "Correct:"} {question.correct_answer})
                              </span>
                            )}
                          </div>
                          {question.explanation && settings?.show_explanations && (
                            <div className="mt-1.5 sm:mt-2 p-2 bg-secondary rounded text-xs sm:text-sm">
                              <span className="font-medium">{t("explanationColon") || "Explanation:"} </span>
                              {question.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Retake / Request Retake buttons */}
            {examType === "module" && retakeInfo && (
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                {retakeInfo.canRetake && (
                  <Button onClick={handleRetake} className="w-full sm:w-auto">
                    <Play className="h-4 w-4 mr-2" />
                    {t("retakeExam") || "Retake Exam"}
                  </Button>
                )}
                {retakeInfo.needsApproval && retakeInfo.reason === "over_limit" && (
                  <Button onClick={() => setShowRetakeRequest(true)} variant="outline" className="w-full sm:w-auto">
                    <Shield className="h-4 w-4 mr-2" />
                    {t("requestRetake") || "Request Retake"}
                  </Button>
                )}
                {retakeInfo.needsApproval && retakeInfo.reason === "pending" && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    {t("retakePending") || "Retake request pending approval"}
                  </div>
                )}
              </div>
            )}

            {examType === "midterm" && (
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleRetake} className="w-full sm:w-auto">
                  <Play className="h-4 w-4 mr-2" />
                  {t("retakeExam") || "Retake Exam"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retake Request Dialog */}
        <Dialog open={showRetakeRequest} onOpenChange={setShowRetakeRequest}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("requestRetake") || "Request Retake"}
              </DialogTitle>
              <DialogDescription>
                {t("retakeLimitReached") || "You have reached the retake limit. Please provide a reason for your retake request."}
              </DialogDescription>
            </DialogHeader>
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-lg resize-y bg-background"
              placeholder={t("retakeReason") || "Enter your reason..."}
              value={retakeReason}
              onChange={(e) => setRetakeReason(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRetakeRequest(false)}>
                {t("cancel") || "Cancel"}
              </Button>
              <Button onClick={handleRequestRetake} disabled={submittingRetake || !retakeReason.trim()}>
                {submittingRetake ? t("submitting") || "Submitting..." : t("submit") || "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  return (
    <div className={`bg-transparent ${isExamActive ? "select-none" : ""}`}>
      <main className={isExamActive ? "relative mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-5 md:px-6 md:py-6" : "student-page student-page-no-nav !mx-auto max-w-5xl"}>
        <Watermark />

        {/* Sticky Time & Progress Bar */}
        {isExamActive && (
          <div className="sticky top-0 z-30 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-background/80 backdrop-blur-md border-b select-none">
            <div className="flex items-center justify-between gap-3 sm:gap-6 max-w-5xl mx-auto">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] sm:text-sm mb-1 sm:mb-1.5">
                  <span className="font-medium">{t("progress") || "Progress"}</span>
                  <span className="text-muted-foreground tabular-nums">{answeredCount} / {questions.length}</span>
                </div>
                <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] sm:text-xs text-muted-foreground leading-none mb-0.5">{t("timeLeft") || "Time Left"}</div>
                <div className={`text-lg sm:text-2xl font-bold tabular-nums leading-tight ${secondsLeft !== null && secondsLeft < 60 ? "text-red-600 animate-pulse" : ""}`}>
                  {formatTime(secondsLeft || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {isExamActive && (
          <>
            {/* Top action bar */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(t("quitExamMessage") || "Are you sure you want to quit? Your exam will be submitted.")) {
                    handleSubmitExam(true);
                  }
                }}
                className="gap-2"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t("quit") || "Quit"}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmitExam()}
                disabled={submitting || answeredCount === 0}
                className="min-w-[100px] sm:min-w-[120px]"
              >
                {submitting ? (t("submitting") || "Submitting...") : (
                  <>{t("submit") || "Submit"} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2" /></>
                )}
              </Button>
            </div>

            <Card
              className="navo-card-brand select-none rounded-[14px] sm:rounded-[24px]"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm sm:text-base">
                    {t("question") || "Question"} {currentIndex + 1} {t("of") || "of"} {questions.length}
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setShowQuestionPalette((v) => !v)}
                    className="md:hidden flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>{answeredCount}/{questions.length}</span>
                  </button>
                </div>
                <CardDescription className="text-[11px] sm:text-sm">
                  {examType === "final" ? t("finalExam") || "Final Exam" : examType === "midterm" ? t("midtermTest") || "Midterm Test" : t("moduleExam") || "Module Exam"}
                  <span className="md:hidden text-xs text-muted-foreground ml-2">{t("swipeToNavigate") || "Swipe to navigate"}</span>
                </CardDescription>

                {/* Question palette */}
                <div className={`${showQuestionPalette ? "block" : "hidden"} md:block mt-3 sm:mt-4`}>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {questions.map((q, i) => {
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
                              ? "bg-primary/15 text-primary-readable hover:bg-primary/25"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                {activeQuestion ? (
                  <>
                    {activeQuestion.question_image && (
                      <SmartImage src={activeQuestion.question_image} alt={t("question") || "Question"} className="w-full max-h-[240px] sm:max-h-[320px] object-contain rounded-[10px] sm:rounded-lg border" />
                    )}
                    {activeQuestion.question && (
                      <div className="text-sm sm:text-base font-medium">{activeQuestion.question}</div>
                    )}

                    {(() => {
                      const opts = (["A", "B", "C", "D"] as const).map((opt) => ({
                        opt,
                        text: activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}`],
                        img: activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}_image` as keyof ModuleExamQuestion] as string | undefined,
                      }));
                      const hasImageOptions = opts.some((o) => o.img);

                      if (hasImageOptions) {
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                            {opts.map(({ opt, text, img }) => {
                              const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                              return (
                                <div
                                  key={opt}
                                  className={`relative rounded-[10px] sm:rounded-lg border p-2 cursor-pointer transition-all select-none flex flex-col ${
                                    isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => handleSelectAnswer(opt)}
                                >
                                  <div className={`absolute top-1.5 left-1.5 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-sm font-medium shrink-0 ${
                                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                                  }`}>
                                    {opt}
                                  </div>
                                  {img && (
                                    <SmartImage src={img} alt={`${t("option") || "Option"} ${opt}`} className="w-full h-24 sm:h-32 object-cover rounded-md border mb-2 cursor-zoom-in" />
                                  )}
                                  {text && <div className="text-xs sm:text-sm text-center">{text}</div>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <div className="grid gap-2 sm:gap-3">
                          {opts.map(({ opt, text, img }) => {
                            const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                            return (
                              <div
                                key={opt}
                                className={`rounded-[10px] sm:rounded-lg border p-2.5 sm:p-3 cursor-pointer transition-all select-none ${
                                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => handleSelectAnswer(opt)}
                              >
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-sm font-medium shrink-0 ${
                                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                                  }`}>
                                    {opt}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {img && <SmartImage src={img} alt={`${t("option") || "Option"} ${opt}`} className="w-full max-h-[180px] sm:max-h-[240px] object-contain rounded-md border mb-2" />}
                                    {text && <div className="text-xs sm:text-sm">{text}</div>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between pt-1.5 sm:pt-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}>
                        {t("previous") || "Previous"}
                      </Button>
                      <Button size="sm" onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={currentIndex >= questions.length - 1}>
                        {t("next") || "Next"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">{t("noQuestionsReturned") || "No questions available"}</div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Image preview lightbox */}
      <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle className="sr-only">{t("preview") || "Preview"}</DialogTitle>
          </DialogHeader>
          {previewImage && <img src={previewImage} alt={t("preview") || "Preview"} className="w-full h-auto rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions && !isExamActive} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-2xl">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary-readable" />
              {t("examInstructions") || "Exam Instructions"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("readInstructionsCarefully") || "Please read the instructions carefully"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-6 py-2 sm:py-4">
            <div className="bg-primary/5 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                <HelpCircle className="h-4 w-4 text-primary-readable" />
                {t("examOverview") || "Exam Overview"}
              </h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <p>• {t("examInstruction.multipleChoice") || "Multiple choice questions"}</p>
                <p>• {t("examInstruction.limitedTime") || "Limited time exam"}</p>
                <p>• {t("examInstruction.fourAnswers") || "Four answer options per question"}</p>
                <p>• {t("examInstruction.navigateButtons") || "Navigate using buttons or arrow keys"}</p>
                <p>• {t("examInstruction.answersAutoSaved") || "Answers are auto-saved"}</p>
              </div>
            </div>

            {fullscreenEnabled && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-red-700 dark:text-red-400">
                  <Shield className="h-4 w-4" />
                  {t("examSecurity.title") || "Security Restrictions"}
                </h3>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-red-700 dark:text-red-300">
                  <p>• {t("examSecurity.copyPasteCutDisabled") || "Copy, paste, and cut are disabled"}</p>
                  <p>• {t("examSecurity.rightClickDisabled") || "Right-click is disabled"}</p>
                  <p>• {t("examSecurity.stayFullscreen") || "You must stay in fullscreen mode"}</p>
                  <p>• {t("examSecurity.noTabSwitch") || "Tab switching is detected and penalized"}</p>
                  <p>• {t("examSecurity.noAISidebars") || "AI sidebars and extensions are blocked"}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 sm:gap-3 pt-2 border-t">
              <Checkbox
                id="accept-exam"
                checked={instructionsAccepted}
                onCheckedChange={(checked) => setInstructionsAccepted(checked as boolean)}
              />
              <label htmlFor="accept-exam" className="text-xs sm:text-sm font-medium leading-none cursor-pointer">
                {t("acceptExamInstructions") || "I accept the exam instructions"}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" onClick={reset} className="w-full sm:w-auto">
              {t("cancel") || "Cancel"}
            </Button>
            <Button onClick={startExam} disabled={!instructionsAccepted} className="w-full sm:w-auto sm:min-w-[120px]">
              {t("beginExam") || "Begin Exam"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Warning Dialog */}
      <Dialog open={security.fullscreenWarning} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {t("fullscreenRequiredTitle") || "Fullscreen Required"}
            </DialogTitle>
            <DialogDescription className="text-red-600 font-medium">
              {t("fullscreenRequiredDesc") || "You must remain in fullscreen mode during the exam."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={security.requestFullscreen} className="w-full bg-red-600 hover:bg-red-700 text-white" size="sm">
              <Monitor className="h-4 w-4 mr-2" />
              {t("reEnterFullscreenButton") || "Re-enter Fullscreen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cheating Warning Dialog */}
      <Dialog open={security.showCheatingWarning} onOpenChange={() => security.dismissCheatingWarning()}>
        <DialogContent
          className="max-w-md border-red-500 border-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {security.violationType === "fullscreen" || security.violationType === "tabswitch"
                ? t("cheatingViolationDetected") || "Violation Detected"
                : t("prohibitedActionDetected") || "Prohibited Action"}
            </DialogTitle>
            <DialogDescription className="text-red-600 font-medium whitespace-pre-line">
              {security.cheatingWarningMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
                {t("violationCount.title") || "Violation Count"}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                • {t("violationCount.fullscreen") || "Fullscreen"}: {security.fullscreenRetryCount}/{securitySettings.maxViolations}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                • {t("violationCount.tabSwitch") || "Tab switch"}: {security.cheatingAttempts}/{securitySettings.maxViolations}
              </p>
              <p className="text-xs text-red-600 mt-2">
                {t("violationCount.autoSubmitWarning") || `Exam will auto-submit after ${securitySettings.maxViolations} violations.`}
              </p>
            </div>
          </div>
          <DialogFooter>
            {security.violationType === "fullscreen" && security.fullscreenRetryCount < securitySettings.maxViolations ? (
              <Button onClick={security.requestFullscreen} className="w-full bg-red-600 hover:bg-red-700 text-white" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                {t("reEnterFullscreenNow") || "Re-enter Fullscreen Now"}
              </Button>
            ) : (
              <div className="w-full text-center py-2">
                <p className="text-sm font-medium text-red-600">
                  {security.fullscreenRetryCount >= securitySettings.maxViolations || security.cheatingAttempts >= securitySettings.maxViolations
                    ? t("examBeingSubmitted") || "Exam is being submitted..."
                    : t("warningWillCloseAutomatically") || "Warning will close automatically..."}
                </p>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
