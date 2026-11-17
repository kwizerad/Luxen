"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import { SmartImage, preloadImages } from "@/components/smart-image";
import { ExamStartVerificationCard } from "@/components/exam-start-verification-card";
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
  HelpCircle,
  Play,
  LogOut,
  Monitor,
  Shield,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useExamSecurity } from "@/hooks/use-exam-security";
import { QuestionTTSButton } from "@/components/course/question-tts-button";
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
  nextCourseTitle?: string;
  onNextCourse?: () => void;
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
  nextCourseTitle,
  onNextCourse,
  midtermModuleIds,
  midtermQuestionCount = 30,
  midtermDurationMinutes = 30,
  finalModuleIds,
  finalQuestionCount = 50,
  finalDurationMinutes = 45,
  onComplete,
  onExit,
}: ModuleExamRunnerProps) {
  const { t, language } = useLanguage();
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
  const [showVerificationCard, setShowVerificationCard] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [retakeInfo, setRetakeInfo] = useState<{ canRetake: boolean; needsApproval: boolean; reason?: string } | null>(null);
  const [showRetakeRequest, setShowRetakeRequest] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const showResultsRef = useRef(false);
  const examActiveRef = useRef(false);
  const handleSubmitExamRef = useRef<((isAutoSubmit?: boolean) => Promise<void>) | null>(null);
  const handleSelectAnswerRef = useRef<((answer: "A" | "B" | "C" | "D") => void) | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const midtermModuleIdsRef = useRef(midtermModuleIds);
  midtermModuleIdsRef.current = midtermModuleIds;
  const finalModuleIdsRef = useRef(finalModuleIds);
  finalModuleIdsRef.current = finalModuleIds;
  const tRef = useRef(t);
  tRef.current = t;
  const loadSeqRef = useRef(0);

  const midtermKey = (midtermModuleIds || []).join(",");
  const finalKey = (finalModuleIds || []).join(",");

  const fullscreenEnabled = securitySettings.violationMeasuresEnabled && securitySettings.fullscreenEnabled;

  const handleAutoSubmit = useCallback(() => {
    handleSubmitExamRef.current?.(true);
  }, []);

  const security = useExamSecurity({
    settings: securitySettings,
    isActive: examActiveRef.current && !showResultsRef.current,
    onAutoSubmit: handleAutoSubmit,
  });

  // Ensure exam-active flag is removed and event dispatched on unmount
  useEffect(() => {
    return () => {
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    };
  }, []);

  // Auto-dismiss cheating warning for minor violations (not fullscreen/tabswitch)
  useEffect(() => {
    if (!security.showCheatingWarning) return;
    if (security.violationType === "fullscreen" || security.violationType === "tabswitch" || security.violationType === "ai_detection") return;
    if (security.fullscreenRetryCount >= securitySettings.maxViolations || security.cheatingAttempts >= securitySettings.maxViolations) return;

    const timer = setTimeout(() => {
      security.dismissCheatingWarning();
    }, 3000);

    return () => clearTimeout(timer);
  }, [security.showCheatingWarning, security.violationType, security.fullscreenRetryCount, security.cheatingAttempts, securitySettings.maxViolations, security]);

  const loadExamData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const secSettings = await getSecuritySettings("course");
      if (seq !== loadSeqRef.current) return;
      setSecuritySettings(secSettings);

      let loadedQuestions: ModuleExamQuestion[] = [];

      if (examType === "module" && moduleId) {
        const data = await getModuleExamForTaking(moduleId, language);
        if (seq !== loadSeqRef.current) return;
        loadedQuestions = data.questions || [];
        setSettings(data.settings);
        setDurationMinutes(data.settings?.duration_minutes || 20);
      } else if (examType === "midterm") {
        const data = await getMidtermExamForTaking(
          midtermModuleIdsRef.current || [],
          midtermQuestionCount,
          midtermDurationMinutes,
          language
        );
        if (seq !== loadSeqRef.current) return;
        loadedQuestions = data.questions || [];
        setDurationMinutes(data.durationMinutes || midtermDurationMinutes);
      } else if (examType === "final") {
        const data = await getFinalExamForTaking(
          finalModuleIdsRef.current || [],
          finalQuestionCount,
          finalDurationMinutes,
          language
        );
        if (seq !== loadSeqRef.current) return;
        loadedQuestions = data.questions || [];
        setDurationMinutes(data.durationMinutes || finalDurationMinutes);
      } else {
        throw new Error(tRef.current("failedToLoadExam") || "Failed to load exam");
      }

      if (loadedQuestions.length === 0) {
        throw new Error(tRef.current("noQuestionsReturned") || "No questions available for this exam right now.");
      }

      setQuestions(loadedQuestions);
      setCurrentIndex(0);
      setShowVerificationCard(true);
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      const msg =
        (error instanceof Error ? error.message : String(error)) ||
        tRef.current("failedToLoadExam") ||
        "Failed to load exam";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    examType,
    moduleId,
    midtermKey,
    finalKey,
    midtermQuestionCount,
    midtermDurationMinutes,
    finalQuestionCount,
    finalDurationMinutes,
    language,
  ]);

  // Load exam data (never wipes or reloads an already-active exam or results view)
  useEffect(() => {
    if (examActiveRef.current || showResultsRef.current) return;
    void loadExamData();
  }, [loadExamData]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null || showResults) return;
    if (secondsLeft <= 0) {
      handleSubmitExamRef.current?.(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, showResults]);

  const safeIndex = questions.length > 0 ? Math.min(Math.max(0, currentIndex), questions.length - 1) : 0;

  const activeQuestion = useMemo(() => {
    if (!questions.length) return null;
    return questions[safeIndex] ?? null;
  }, [questions, safeIndex]);

  const isExamActiveNow = questions.length > 0 && secondsLeft !== null && !showResults;

  // Arrow key navigation & option selection on desktop
  useEffect(() => {
    if (!isExamActiveNow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (activeQuestion) {
        if (["a", "A", "1"].includes(e.key)) {
          handleSelectAnswerRef.current?.("A");
        } else if (["b", "B", "2"].includes(e.key)) {
          handleSelectAnswerRef.current?.("B");
        } else if (["c", "C", "3"].includes(e.key)) {
          handleSelectAnswerRef.current?.("C");
        } else if (["d", "D", "4"].includes(e.key)) {
          handleSelectAnswerRef.current?.("D");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExamActiveNow, questions.length, activeQuestion]);

  const startExam = async () => {
    setShowVerificationCard(false);
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

  const handleSelectAnswer = useCallback((answer: "A" | "B" | "C" | "D") => {
    if (!activeQuestion) return;
    setUserAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        questionId: activeQuestion.id,
        selectedAnswer: answer,
        timeStarted: prev[activeQuestion.id]?.timeStarted || Date.now(),
      },
    }));
  }, [activeQuestion]);
  handleSelectAnswerRef.current = handleSelectAnswer;

  // Swipe for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const minSwipeDistance = 75;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };
  const onTouchEnd = useCallback(() => {
    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) return;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Only swipe if horizontal movement is clearly dominant over vertical scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && currentIndex < questions.length - 1) {
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      }
      if (deltaX < 0 && currentIndex > 0) {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchEndX(null);
    setTouchEndY(null);
  }, [touchStartX, touchEndX, touchStartY, touchEndY, currentIndex, questions.length]);

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
      if (isAutoSubmit) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("exam-active");
          window.dispatchEvent(new CustomEvent("exam-state-change"));
        }
        if (fullscreenEnabled) {
          await security.exitFullscreen().catch(() => {});
        }
        onExit();
      } else {
        toast.error(`${t("failedToSubmitExam") || "Failed to submit exam"}: ${message}`);
        examActiveRef.current = true;
        showResultsRef.current = false;
        submittingRef.current = false;
      }
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
    setShowVerificationCard(true);
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
    setShowVerificationCard(false);
    security.resetSecurity();
    sessionStorage.removeItem("exam-active");
    window.dispatchEvent(new CustomEvent("exam-state-change"));
    onExit();
  };

  const answeredCount = Object.keys(userAnswers).length;
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const isExamActive = questions.length > 0 && secondsLeft !== null && !showResults;
  const totalViolations = security.cheatingAttempts + security.fullscreenRetryCount;

  const getViolationLabel = (type: string) => {
    switch (type) {
      case "fullscreen":
        return t("violationLabels.fullscreen") || "Fullscreen exited";
      case "tabswitch":
        return t("violationLabels.tabswitch") || "Tab switch detected";
      case "copy":
        return t("violationLabels.copy") || "Copy attempt";
      case "paste":
        return t("violationLabels.paste") || "Paste attempt";
      case "backnavigation":
        return t("violationLabels.backnavigation") || "Back navigation attempt";
      case "ai_detection":
        return t("violationLabels.ai_detection") || "AI Assistant detected";
      case "aishortcut":
        return t("violationLabels.aishortcut") || "Restricted shortcut / AI tool";
      case "blur":
        return t("violationLabels.blur") || "Window focus lost";
      case "resize":
        return t("violationLabels.resize") || "AI assistant detected";
      default:
        return t("violationLabels.other") || "Security violation";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (loadError || (!isExamActive && !showResults && questions.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl border-border/80">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t("failedToLoadExam") || "Could Not Load Exam Questions"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {loadError || t("noQuestionsReturned") || "No questions were available for this quiz."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              onClick={() => void loadExamData()}
              className="flex-1 rounded-xl"
            >
              {t("tryAgain") || "Try Again"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onExitRef.current()}
              className="flex-1 rounded-xl"
            >
              {t("back") || "Back to Course"}
            </Button>
          </CardContent>
        </Card>
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
            <div className="grid grid-cols-4 gap-1.5 sm:gap-4 w-full">
              <div className="text-center p-1.5 sm:p-4 bg-secondary rounded-[8px] sm:rounded-lg min-w-0">
                <div className="text-sm sm:text-3xl font-bold text-primary-readable leading-tight truncate">
                  {examResult.score_percentage}%
                </div>
                <div className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t("score") || "Score"}
                </div>
              </div>
              <div className="text-center p-1.5 sm:p-4 bg-secondary rounded-[8px] sm:rounded-lg min-w-0">
                <div className="text-sm sm:text-3xl font-bold text-green-600 leading-tight truncate">
                  {examResult.correct_answers}
                </div>
                <div className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t("correct") || "Correct"}
                </div>
              </div>
              <div className="text-center p-1.5 sm:p-4 bg-secondary rounded-[8px] sm:rounded-lg min-w-0">
                <div className="text-sm sm:text-3xl font-bold text-red-600 leading-tight truncate">
                  {examResult.total_questions - examResult.correct_answers}
                </div>
                <div className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t("incorrect") || "Incorrect"}
                </div>
              </div>
              <div className="text-center p-1.5 sm:p-4 bg-secondary rounded-[8px] sm:rounded-lg min-w-0">
                <div className="text-sm sm:text-3xl font-bold leading-tight truncate">
                  {formatTime(examResult.duration_seconds)}
                </div>
                <div className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {t("time") || "Time"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
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

              {onNextCourse && (
                <Button
                  size="sm"
                  onClick={onNextCourse}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold rounded-xl shadow-sm"
                >
                  <span>
                    {nextCourseTitle
                      ? `${t("continueToNextCourse") || "Continue to Next Course"}: ${nextCourseTitle}`
                      : (t("continueToNextCourse") || "Continue to Next Course")}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {onNextCourse && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    {t("nextUp") || "Next Up"}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {nextCourseTitle || (t("continueToNextCourse") || "Next Course")}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={onNextCourse}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 font-semibold rounded-lg shrink-0"
                >
                  <span>{t("continueToNextCourse") || "Continue to Next Course"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

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
    <div
      className="bg-transparent select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <main className={isExamActive ? "relative mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-5 md:px-6 md:py-6" : "student-page student-page-no-nav !mx-auto max-w-5xl"}>
        <Watermark />

        {/* Sticky Time & Progress Bar - Compact & Slim */}
        {isExamActive && (
          <div className="sticky top-0 z-30 -mx-4 sm:-mx-5 md:-mx-6 px-3 sm:px-4 py-1.5 sm:py-2 bg-background/85 backdrop-blur-md border-b select-none shadow-xs">
            <div className="flex items-center justify-between gap-3 sm:gap-5 max-w-5xl mx-auto">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-0.5">
                  <span className="font-semibold">{t("progress") || "Progress"}</span>
                  <span className="text-muted-foreground tabular-nums font-medium">{answeredCount} / {questions.length}</span>
                </div>
                <div className="relative h-1.5 sm:h-2 rounded-full overflow-hidden bg-muted/60">
                  <div className="h-full bg-primary rounded-full transition-all duration-300 shadow-xs" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-none mb-0.5">{t("timeLeft") || "Time Left"}</div>
                <div className={`text-base sm:text-lg font-bold tabular-nums leading-tight ${secondsLeft !== null && secondsLeft < 60 ? "text-red-600 animate-pulse" : ""}`}>
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
              <div className="flex items-center gap-2 min-w-0">
                {totalViolations > 0 && (
                  <div
                    id="module-exam-cheating-violations-counter"
                    className="inline-flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-300 text-xs shadow-sm animate-in fade-in slide-in-from-left-2 duration-300 max-w-full"
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 font-semibold text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {t("cheatingViolations") || "Violations"}:{" "}
                        <span className="font-bold tabular-nums">
                          {totalViolations}
                          {securitySettings?.maxViolations ? ` / ${securitySettings.maxViolations}` : ""}
                        </span>
                      </span>
                    </div>
                    <span className="text-red-300 dark:text-red-700 select-none">|</span>
                    <div className="flex items-center gap-1 min-w-0 truncate text-[11px] sm:text-xs">
                      <span className="text-muted-foreground shrink-0 font-medium">
                        {t("lastViolation") || "Last"}:
                      </span>
                      <span className="font-medium truncate text-red-800 dark:text-red-200">
                        {getViolationLabel(security.violationType)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuitConfirm(true)}
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
            </div>

            <Card
              className="navo-card-brand select-none rounded-[14px] sm:rounded-[24px] touch-pan-y"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm sm:text-base">
                    {t("question") || "Question"} {safeIndex + 1} {t("of") || "of"} {questions.length}
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
                      const isCurrent = i === safeIndex;
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
                      <SmartImage src={activeQuestion.question_image} alt={t("question") || "Question"} priority className="w-full h-[260px] sm:h-[380px] lg:h-[440px] object-contain rounded-[10px] sm:rounded-lg border bg-muted/15" />
                    )}
                    {activeQuestion.question && (
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm sm:text-base font-medium flex-1">{activeQuestion.question}</div>
                        <QuestionTTSButton
                          entityId={activeQuestion.id}
                          text={activeQuestion.question}
                          className="shrink-0 mt-0.5"
                        />
                      </div>
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
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                                    <SmartImage src={img} alt={`${t("option") || "Option"} ${opt}`} className="w-full h-40 sm:h-52 object-contain rounded-md border mb-2 bg-muted/15 cursor-zoom-in" />
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
                                    {img && <SmartImage src={img} alt={`${t("option") || "Option"} ${opt}`} className="w-full h-36 sm:h-48 object-contain rounded-md border mb-2 bg-muted/15" />}
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
                      <Button variant="outline" size="sm" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={safeIndex === 0}>
                        {t("previous") || "Previous"}
                      </Button>
                      <Button size="sm" onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={safeIndex >= questions.length - 1}>
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

        {!isExamActive && !showResults && showVerificationCard && questions.length > 0 && (
          <div className="min-h-[70vh] flex items-center justify-center py-6">
            <ExamStartVerificationCard
              examTitle={
                moduleTitle ||
                (examType === "final"
                  ? t("finalExam") || "Final Exam"
                  : examType === "midterm"
                  ? t("midtermTest") || "Midterm Test"
                  : t("moduleExam") || "Module Exam")
              }
              durationMinutes={durationMinutes}
              totalQuestions={questions.length}
              examLanguage={language}
              onConfirmStart={() => {
                void startExam();
              }}
              onCancel={reset}
            />
          </div>
        )}
      </main>

      {/* Quit Confirm Dialog */}
      <Dialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {t("quitExamTitle") || "Quit Exam?"}
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">
              {t("quitExamMessage") || "Are you sure you want to quit? Your exam will be submitted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowQuitConfirm(false)}
              className="flex-1 rounded-xl"
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowQuitConfirm(false);
                void handleSubmitExam(true);
              }}
              className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              {t("confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image preview lightbox */}
      <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle className="sr-only">{t("preview") || "Preview"}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <SmartImage
              src={previewImage}
              alt={t("preview") || "Preview"}
              priority
              className="w-full h-[60vh] max-h-[640px] object-contain rounded-lg"
            />
          )}
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
      <Dialog open={security.showCheatingWarning} onOpenChange={(open) => {
        // Prevent closing by clicking outside or pressing Escape for ALL violation types
        if (!open) {
          // Only allow closing if fullscreen is restored for fullscreen violations
          if (security.violationType === "fullscreen" && document.fullscreenElement) {
            security.dismissCheatingWarning();
          }
          return;
        }
        security.dismissCheatingWarning();
      }}>
        <DialogContent
          className="max-w-md border-red-500 border-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {security.violationType === "fullscreen" || security.violationType === "tabswitch"
                ? t("cheatingViolationDetected") || "Exam Warning"
                : security.violationType === "ai_detection"
                ? t("aiDetectionDetected") || "AI Detected"
                : t("prohibitedActionDetected") || "Exam Warning"}
            </DialogTitle>
            <DialogDescription className="text-red-600 font-medium whitespace-pre-line text-sm sm:text-base">
              {security.cheatingWarningMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            {security.violationType === "ai_detection" ? (
              <Button
                onClick={() => {
                  const stillPresent = document.querySelectorAll(
                    '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="Bard" i], [aria-label*="ChatGPT" i], [aria-label*="Claude" i], [aria-label*="Perplexity" i]'
                  );
                  if (stillPresent.length > 0) {
                    toast.error(t("closeAiTabFirst") || "Please close AI to continue your exam.");
                  } else {
                    security.dismissCheatingWarning();
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                {t("iveClosedAiTab") || "I've closed AI"}
              </Button>
            ) : security.violationType === "fullscreen" && security.fullscreenRetryCount < securitySettings.maxViolations ? (
              <Button onClick={security.requestFullscreen} className="w-full bg-red-600 hover:bg-red-700 text-white" size="sm">
                <Monitor className="h-4 w-4 mr-2" />
                {t("reEnterFullscreenNow") || "Re-enter Fullscreen"}
              </Button>
            ) : (
              <div className="w-full text-center py-2 space-y-2">
                {security.countdownSeconds !== null && security.countdownSeconds > 0 ? (
                  <>
                    <p className="text-sm font-medium text-red-600">
                      {t("examAutoSubmitCountdown") || "Exam will be auto-submitted in:"}
                    </p>
                    <div className="text-3xl font-bold text-red-600 tabular-nums">
                      {security.countdownSeconds}s
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-medium text-red-600">
                    {security.fullscreenRetryCount >= securitySettings.maxViolations || security.cheatingAttempts >= securitySettings.maxViolations
                      ? t("examBeingSubmitted") || "Exam is being submitted..."
                      : t("warningWillCloseAutomatically") || "This warning will close automatically."}
                  </p>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
