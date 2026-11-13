"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Lock,
  LogIn,
  UserPlus,
  BookmarkCheck,
  Home,
  ArrowRight,
  X,
} from "lucide-react";
import { preloadImages } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { OSWindow } from "@/components/os/os-window";
import { OSExamLauncher } from "@/components/os-exam/os-exam-launcher";
import {
  OSExamWorkspace,
  type TakeExamQuestion,
  type TakeExamResponse,
  type UserAnswer,
} from "@/components/os-exam/os-exam-workspace";
import { ExamReview } from "@/components/exam-review";
import {
  useExamAnticheat,
  type SubmissionReason,
} from "@/hooks/use-exam-anticheat";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { secureApiPost } from "@/lib/e2e-crypto";
import {
  DEFAULT_SECURITY_SETTINGS,
  getSecuritySettings,
  type SecuritySettings,
} from "@/lib/security-config";
import {
  getGuestDeviceId,
  savePendingGuestExam,
  claimPendingGuestExamIfAny,
  type PendingGuestExamPayload,
} from "@/lib/guest-exam-client";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import type {
  ExamAttempt,
  ExamCategory,
  ExamQuestion,
} from "@/lib/database.types";
import { toast } from "sonner";

interface GuestQuotaState {
  usedCount: number;
  remainingCount: number;
  maxAllowed: number;
  exhausted: boolean;
}

export function GuestExamClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [standaloneEnabled, setStandaloneEnabled] = useState(true);
  const [quota, setQuota] = useState<GuestQuotaState>({
    usedCount: 0,
    remainingCount: 3,
    maxAllowed: 3,
    exhausted: false,
  });
  const [categories, setCategories] = useState<ExamCategory[]>([
    {
      id: EXTERNAL_EXAM_CATEGORY_ID,
      name: "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda",
      description: "Official Traffic Rules & Road Signs Mock Exam",
      created_by: "system",
      is_published: true,
      duration_minutes: 20,
      question_count: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    EXTERNAL_EXAM_CATEGORY_ID
  );
  const [selectedExamLanguage, setSelectedExamLanguage] =
    useState("Kinyarwanda");

  const [loadingExam, setLoadingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [exam, setExam] = useState<TakeExamResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>(
    {}
  );
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<ExamAttempt | null>(null);
  const [pendingPayload, setPendingPayload] =
    useState<PendingGuestExamPayload | null>(null);
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    DEFAULT_SECURITY_SETTINGS
  );

  // Dialog states
  const [showPreSubmitModal, setShowPreSubmitModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<
    "info" | "warning" | "error" | "success"
  >("info");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(
    null
  );

  const submittingExamRef = useRef(false);
  const showResultsRef = useRef(false);
  const handleSubmitExamRef = useRef<
    ((isAutoSubmit?: boolean, reason?: SubmissionReason) => Promise<void>) | null
  >(null);

  // Redirect already authenticated students cleanly to dashboard exam view
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void claimPendingGuestExamIfAny().finally(() => {
      if (!cancelled) {
        router.replace("/dashboard#exam");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  // Load guest quota status, admin toggles & security settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    const loadStatus = async () => {
      try {
        const deviceId = getGuestDeviceId();
        const [statusRes, secSettings] = await Promise.all([
          fetch(`/api/guest-exam?deviceId=${encodeURIComponent(deviceId)}`, {
            cache: "no-store",
          }).then((r) => (r.ok ? r.json() : null)),
          getSecuritySettings().catch(() => DEFAULT_SECURITY_SETTINGS),
        ]);

        if (!mounted) return;
        setSecuritySettings(secSettings);
        if (statusRes) {
          setStandaloneEnabled(statusRes.standaloneEnabled !== false);
          if (statusRes.quota) {
            setQuota(statusRes.quota);
          }
          if (statusRes.examMeta?.title) {
            setCategories((prev) =>
              prev.map((c) => ({
                ...c,
                name: statusRes.examMeta.title || c.name,
                duration_minutes:
                  statusRes.examMeta.durationMinutes || c.duration_minutes,
                question_count:
                  statusRes.examMeta.questionCount || c.question_count,
              }))
            );
          }
        }
      } catch (err) {
        console.error("[GuestExam] Failed loading status:", err);
      } finally {
        if (mounted) setCheckingStatus(false);
      }
    };

    void loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const anticheat = useExamAnticheat({
    isActive: Boolean(exam && !showResults),
    showResults,
    securitySettings,
    onAutoSubmit: (reason) => {
      void handleSubmitExamRef.current?.(true, reason);
    },
  });

  // Keep sessionStorage exam-active in sync so OSWindow hides top controls cleanly
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isInProgress = Boolean(exam && !showResults);
    if (isInProgress) {
      sessionStorage.setItem("exam-active", "true");
    } else {
      sessionStorage.removeItem("exam-active");
    }
    window.dispatchEvent(new CustomEvent("exam-state-change"));
  }, [exam, showResults]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("exam-active");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
    };
  }, []);

  const activeQuestion = useMemo<TakeExamQuestion | null>(() => {
    if (!exam?.questions?.length) return null;
    return exam.questions[currentIndex] ?? null;
  }, [exam, currentIndex]);

  const handleSelectAnswer = useCallback(
    (answer: "A" | "B" | "C" | "D") => {
      if (!activeQuestion) return;
      setUserAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: {
          questionId: activeQuestion.id,
          selectedAnswer: answer,
          timeStarted: prev[activeQuestion.id]?.timeStarted || Date.now(),
        },
      }));
    },
    [activeQuestion]
  );

  // Keyboard navigation during active exam
  useEffect(() => {
    if (typeof window === "undefined" || !exam || showResults) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) =>
          Math.min((exam?.questions.length || 1) - 1, i + 1)
        );
      } else if (activeQuestion) {
        if (["a", "A", "1"].includes(e.key)) handleSelectAnswer("A");
        else if (["b", "B", "2"].includes(e.key)) handleSelectAnswer("B");
        else if (["c", "C", "3"].includes(e.key)) handleSelectAnswer("C");
        else if (["d", "D", "4"].includes(e.key)) handleSelectAnswer("D");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exam, showResults, activeQuestion, handleSelectAnswer]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || showResults) return;
    if (secondsLeft <= 0) {
      anticheat.submissionReasonRef.current = "time_expired";
      void handleSubmitExamRef.current?.(true, "time_expired");
      return;
    }
    const id = setInterval(
      () => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))),
      1000
    );
    return () => clearInterval(id);
  }, [secondsLeft, showResults, anticheat]);

  const startGuestExam = async (catId?: string, examLang?: string) => {
    if (quota.exhausted) {
      return;
    }

    if (
      securitySettings.violationMeasuresEnabled &&
      securitySettings.fullscreenEnabled
    ) {
      await anticheat.enterFullscreen();
    }

    const activeLang = examLang || selectedExamLanguage || "Kinyarwanda";
    if (examLang) setSelectedExamLanguage(examLang);

    setLoadingExam(true);
    try {
      const deviceId = getGuestDeviceId();
      const { ok, status, data } = await secureApiPost("/api/guest-exam", {
        action: "start",
        categoryId: catId || selectedCategoryId || EXTERNAL_EXAM_CATEGORY_ID,
        language: activeLang,
        deviceId,
      });

      if (status === 429 || data?.error === "LIMIT_REACHED") {
        if (data?.quota) setQuota(data.quota);
        else
          setQuota({
            usedCount: 3,
            remainingCount: 0,
            maxAllowed: 3,
            exhausted: true,
          });
        setExam(null);
        toast.error(
          isRw
            ? "Wamaze gukoresha ibizamini 3 by'ubuntu. Iyandikishe ku buntu ukomeze!"
            : isFr
            ? "Limite de 3 examens gratuits atteinte. Inscrivez-vous gratuitement !"
            : "You have used all 3 free exams. Sign up for free to continue!"
        );
        return;
      }

      if (!ok || !data?.questions || data.questions.length === 0) {
        toast.error(data?.message || data?.error || t("failedToStartExam"));
        return;
      }

      if (data.quota) {
        setQuota(data.quota);
      }

      const imageUrls = data.questions
        .flatMap((q: Record<string, unknown>) => [
          q.question_image,
          q.option_a_image,
          q.option_b_image,
          q.option_c_image,
          q.option_d_image,
        ])
        .filter(Boolean) as string[];
      preloadImages(imageUrls);

      anticheat.resetSecurity();
      setExam(data as TakeExamResponse);
      setCurrentIndex(0);
      setSecondsLeft((data.settings?.duration_minutes ?? 20) * 60);
      setExamStartTime(Date.now());
      setUserAnswers({});
      setShowResults(false);
      showResultsRef.current = false;
      setExamResult(null);
      setPendingPayload(null);
      setSavePromptDismissed(false);
      submittingExamRef.current = false;
      setShowPreSubmitModal(false);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("exam-active", "true");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("failedToStartExam"));
    } finally {
      setLoadingExam(false);
    }
  };

  const handleSubmitExam = async (
    isAutoSubmit = false,
    reasonOverride?: SubmissionReason
  ) => {
    if (!exam || !examStartTime) return;
    if (submittingExamRef.current || showResultsRef.current) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount === 0 && !isAutoSubmit) {
      setAlertTitle(t("noAnswersSelected"));
      setAlertMessage(t("noAnswersSelectedMessage"));
      setAlertType("warning");
      setShowAlert(true);
      return;
    }

    if (reasonOverride) {
      anticheat.submissionReasonRef.current = reasonOverride;
    }

    setSubmittingExam(true);
    submittingExamRef.current = true;
    anticheat.isSubmittingOnExitRef.current = true;
    anticheat.setIsSubmittingOnExit(true);
    setShowPreSubmitModal(false);

    let submitSuccess = false;
    try {
      const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);
      const answers = exam.questions.map((q) => {
        const userAnswer = userAnswers[q.id];
        return {
          question_id: q.id,
          selected_answer: userAnswer?.selectedAnswer || null,
          time_spent_seconds: userAnswer
            ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000)
            : 0,
        };
      });

      const categoryName =
        categories.find((c) => c.id === exam.categoryId)?.name ||
        "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda";
      const status: "completed" | "abandoned" =
        answeredCount > 0 ? "completed" : "abandoned";
      const violationSummary =
        anticheat.violationMessagesRef.current.length > 0
          ? anticheat.violationMessagesRef.current.join("; ")
          : undefined;

      const deviceId = getGuestDeviceId();
      const attemptPayload = {
        category_id: exam.categoryId,
        category_name: categoryName,
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        status,
        submission_reason: anticheat.submissionReasonRef.current,
        violation_summary: violationSummary,
      };

      const { ok, data } = await secureApiPost("/api/guest-exam", {
        action: "submit",
        deviceId,
        attemptData: attemptPayload,
      });

      if (!ok || !data?.attempt) {
        throw new Error(data?.error || "Failed to grade exam");
      }

      const attempt = data.attempt as ExamAttempt;
      const questionDetails: Record<
        string,
        { correct_answer: string; explanation?: string }
      > = data.questionDetails || {};

      setExam((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((q) => ({
                ...q,
                correct_answer: (questionDetails[q.id]?.correct_answer ??
                  q.correct_answer) as ExamQuestion["correct_answer"],
                explanation:
                  questionDetails[q.id]?.explanation ?? q.explanation,
              })),
            }
          : prev
      );

      if (data.quota) {
        setQuota(data.quota);
      }

      setPendingPayload({
        ...attemptPayload,
        score_percentage: attempt.score_percentage,
        savedAt: Date.now(),
      });
      setExamResult(attempt);
      setShowResults(true);
      showResultsRef.current = true;
      setSavePromptDismissed(false);
      submitSuccess = true;

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("exam-active");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
      await anticheat.exitFullscreenSafe();
      toast.success(t("examSubmittedSuccess"));
    } catch (error: any) {
      toast.error(`${t("failedToSubmitExam")}: ${error?.message || error}`);
    } finally {
      setSubmittingExam(false);
      submittingExamRef.current = false;
      if (!submitSuccess) {
        anticheat.isSubmittingOnExitRef.current = false;
        anticheat.setIsSubmittingOnExit(false);
      }
    }
  };
  handleSubmitExamRef.current = handleSubmitExam;

  const reset = () => {
    setExam(null);
    setCurrentIndex(0);
    setSecondsLeft(null);
    setExamStartTime(null);
    setUserAnswers({});
    setShowResults(false);
    showResultsRef.current = false;
    setExamResult(null);
    setPendingPayload(null);
    setSavePromptDismissed(false);
    submittingExamRef.current = false;
    setShowPreSubmitModal(false);
    setShowAlert(false);
    setShowConfirm(false);
    setConfirmCallback(null);
    anticheat.resetSecurity();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }
  };

  const handleSaveAndRedirect = (target: "login" | "register") => {
    if (pendingPayload) {
      savePendingGuestExam(pendingPayload);
    }
    router.push(`/?auth=${target}`);
  };

  const handleRetake = () => {
    if (quota.exhausted) {
      reset();
      return;
    }
    const prevCat = selectedCategoryId;
    reset();
    void startGuestExam(prevCat, selectedExamLanguage);
  };

  const footerQuotaText = isRw
    ? `Ibizamini by'ubuntu bisigaye: ${quota.remainingCount} / ${quota.maxAllowed}`
    : isFr
    ? `Examens gratuits restants : ${quota.remainingCount} / ${quota.maxAllowed}`
    : `Free exams remaining: ${quota.remainingCount} / ${quota.maxAllowed}`;

  const toolbarRight = (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground hidden xs:inline whitespace-nowrap">
        {quota.remainingCount}/{quota.maxAllowed}
      </span>
      <button
        type="button"
        onClick={() => router.push("/?auth=login")}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer whitespace-nowrap"
      >
        <LogIn className="w-3 h-3 shrink-0" />
        <span>{isRw ? "Injira" : isFr ? "Connexion" : "Sign In"}</span>
      </button>
    </div>
  );

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center bg-slate-100/80 dark:bg-zinc-950 px-2 sm:px-4 py-2 sm:py-4 overflow-x-hidden">
      {/* Navo OS Subtle Wallpaper Backdrop */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />

      <OSWindow
        title={t("examCenter") || "Exam Center"}
        subtitle="Navo OS"
        icon={FileText}
        onClose={() => router.push("/")}
        onMinimize={() => router.push("/")}
        toolbarRight={toolbarRight}
      >
        {checkingStatus ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
        ) : showResults && examResult ? (
          <div className="flex-1 flex flex-col">
            {/* Post-Exam Save History Prompt Banner (Guest mode does not save automatically) */}
            {!savePromptDismissed && (
              <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 pt-4">
                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.07] dark:bg-emerald-500/10 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <BookmarkCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">
                        {quota.exhausted
                          ? isRw
                            ? "Warangije ibizamini 3 by'ubuntu! Iyandikishe ubike aya manota"
                            : isFr
                            ? "3 examens gratuits utilisés ! Inscrivez-vous pour sauvegarder"
                            : "You completed your 3 free exams! Sign up to save your score"
                          : isRw
                          ? "Urashaka kubika amateka n'amanota y'iki kizamini?"
                          : isFr
                          ? "Voulez-vous enregistrer l'historique de cet examen ?"
                          : "Do you want to save your exam history?"}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {quota.exhausted
                          ? isRw
                            ? "Iki gikoresho na IP byagejeje ku bizamini 3 bitagira konti. Injira cyangwa wiyandikishe ku buntu ubike aya manota kandi ukomeze gukora ibindi bizamini."
                            : isFr
                            ? "Vous avez atteint la limite de 3 examens sans compte. Inscrivez-vous gratuitement pour enregistrer vos résultats et obtenir plus d'examens."
                            : "This device and IP have reached the 3-exam guest limit. Sign up for free or log in to save this score and unlock more exams."
                          : isRw
                          ? "Kuko utarinjira muri konti, aya manota ntabwo yabitswe. Niba ushaka kuyabika, injira cyangwa wiyandikishe."
                          : isFr
                          ? "Cet examen n'est pas encore enregistré car vous n'êtes pas connecté. Connectez-vous ou inscrivez-vous pour le sauvegarder."
                          : "Your results are not saved while unauthenticated. Log in or register now to save this exam to your history."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleSaveAndRedirect("register")}
                      className="rounded-xl gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {isRw
                          ? "Yego, Iyandikishe"
                          : isFr
                          ? "Oui, S'inscrire"
                          : "Yes, Sign Up"}
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveAndRedirect("login")}
                      className="rounded-xl gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>
                        {isRw
                          ? "Injira"
                          : isFr
                          ? "Se connecter"
                          : "Log In"}
                      </span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSavePromptDismissed(true)}
                      aria-label="Dismiss"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>
                        {isRw ? "Oya" : isFr ? "Non" : "No, thanks"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ExamReview
              examResult={examResult}
              questions={(exam?.questions || []) as ExamQuestion[]}
              onReset={reset}
              onRetake={handleRetake}
              passingPercentage={exam?.settings?.passing_percentage}
            />
          </div>
        ) : loadingExam ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">
              {isRw ? "Tegereza gato..." : t("starting") || "Loading exam..."}
            </p>
          </div>
        ) : exam ? (
          <OSExamWorkspace
            exam={exam}
            categoryTitle={
              categories.find((c) => c.id === exam.categoryId)?.name ||
              "Ikizamini cy'Imyitozo"
            }
            examLanguage={selectedExamLanguage}
            currentIndex={currentIndex}
            onChangeIndex={setCurrentIndex}
            secondsLeft={secondsLeft}
            userAnswers={userAnswers}
            onSelectAnswer={handleSelectAnswer}
            submittingExam={submittingExam}
            onRequestQuit={() => {
              setConfirmTitle(t("quitExamTitle") || "Quit Exam?");
              setConfirmMessage(
                t("quitExamMessage") ||
                  "Are you sure you want to finish and submit your current answers now?"
              );
              setConfirmCallback(
                () => () => void handleSubmitExamRef.current?.(true, "manual")
              );
              setShowConfirm(true);
            }}
            onInitiateSubmit={() => {
              const count = Object.keys(userAnswers).length;
              if (count === 0) {
                setAlertTitle(t("noAnswersSelected"));
                setAlertMessage(t("noAnswersSelectedMessage"));
                setAlertType("warning");
                setShowAlert(true);
                return;
              }
              setShowPreSubmitModal(true);
            }}
            onConfirmSubmit={() => {
              anticheat.submissionReasonRef.current = "manual";
              void handleSubmitExam(false, "manual");
            }}
            showPreSubmitModal={showPreSubmitModal}
            setShowPreSubmitModal={setShowPreSubmitModal}
            securitySettings={securitySettings}
            totalViolations={anticheat.totalViolations}
            cheatingAttempts={anticheat.cheatingAttempts}
            fullscreenRetryCount={anticheat.fullscreenRetryCount}
            violationType={anticheat.violationType}
            showFullscreenWarning={anticheat.showFullscreenWarning}
            setShowFullscreenWarning={anticheat.setShowFullscreenWarning}
            showCheatingWarning={anticheat.showCheatingWarning}
            setShowCheatingWarning={anticheat.setShowCheatingWarning}
            cheatingWarningMessage={anticheat.cheatingWarningMessage}
            countdownSeconds={anticheat.countdownSeconds}
            onEnterFullscreen={anticheat.enterFullscreen}
            showAlert={showAlert}
            setShowAlert={setShowAlert}
            alertTitle={alertTitle}
            alertMessage={alertMessage}
            alertType={alertType}
            showConfirm={showConfirm}
            setShowConfirm={setShowConfirm}
            confirmTitle={confirmTitle}
            confirmMessage={confirmMessage}
            onConfirmAction={() => {
              const cb = confirmCallback;
              setShowConfirm(false);
              setConfirmCallback(null);
              cb?.();
            }}
            onCancelConfirm={() => {
              setShowConfirm(false);
              setConfirmCallback(null);
            }}
          />
        ) : quota.exhausted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
            <div className="max-w-md w-full space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  {isRw
                    ? "Ibizamini 3 by'ubuntu byarangiye"
                    : isFr
                    ? "Limite de 3 examens gratuits atteinte"
                    : "You Reached the 3 Free Exam Limit"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {isRw
                    ? "Umaze gukora ibizamini 3 ku gikoresho kimwe na aderesi ya IP imwe utarinjira muri konti. Iyandikishe ku buntu kugira ngo ubone ibindi bizamini byinshi kandi ubike amateka yawe."
                    : isFr
                    ? "Vous avez déjà passé 3 examens sur cet appareil et cette adresse IP sans compte. Inscrivez-vous gratuitement pour accéder à plus d'examens."
                    : "You have already taken 3 exams from this IP address and device without an account. Sign up for free to unlock unlimited exams and track your progress."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button
                  onClick={() => router.push("/?auth=register")}
                  className="flex-1 rounded-xl gap-2 text-xs sm:text-sm font-semibold h-10 whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>
                    {isRw
                      ? "Iyandikishe ku buntu"
                      : isFr
                      ? "S'inscrire gratuitement"
                      : "Sign Up for Free"}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/?auth=login")}
                  className="flex-1 rounded-xl gap-2 text-xs sm:text-sm font-medium h-10 whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>
                    {isRw
                      ? "Injira muri konti"
                      : isFr
                      ? "Se connecter"
                      : "Log In"}
                  </span>
                </Button>
              </div>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer pt-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>
                  {isRw
                    ? "Subira ahabanza"
                    : isFr
                    ? "Retour à l'accueil"
                    : "Back to Home"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <OSExamLauncher
            standaloneEnabled={standaloneEnabled}
            groupExamEnabled={false}
            hasExamHistory={false}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            loadingCategories={false}
            loadingExam={loadingExam}
            selectedExamLanguage={selectedExamLanguage}
            onStartExam={(catId, lang) => {
              void startGuestExam(catId, lang);
            }}
            onOpenGroupChallenge={() => {}}
            navigate={(view) => {
              if (view === "home") router.push("/");
              else router.push("/?auth=login");
            }}
            footerNote={footerQuotaText}
          />
        )}
      </OSWindow>
    </div>
  );
}
