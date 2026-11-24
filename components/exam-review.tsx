"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { canViewUserAvatar } from "@/lib/avatar-helper";
import { ExamCelebration } from "@/components/exam-celebration";
import { SmartImage } from "@/components/smart-image";
import {
  CheckCircle2,
  XCircle,
  Home,
  Clock,
  Target,
  RotateCcw,
  ShieldAlert,
  Users,
  Award,
  Crown,
  BarChart3,
  UserPlus,
  LogIn,
  AlertTriangle,
  Info,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ExamAttempt, ExamAnswer, ExamQuestion } from "@/lib/database.types";
import { getExamResultLanguageName } from "@/lib/exam-settings";
import { cn } from "@/lib/utils";

export interface ExamReviewProps {
  examResult: ExamAttempt;
  questions: ExamQuestion[];
  onReset: () => void;
  onRetake: () => void;
  challengeId?: string;
  passingPercentage?: number;
  canRetake?: boolean;
  quotaExhausted?: boolean;
  quotaMaxAllowed?: number;
  quotaResetValue?: number;
  quotaResetUnit?: "hours" | "days";
  quotaResetAt?: string;
  quotaResetInSeconds?: number;
  onSignUp?: () => void;
  onSignIn?: () => void;
}

type FilterType = "all" | "correct" | "incorrect" | "unanswered";

function formatTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) {
    return "00:00";
  }
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatResetDuration(totalSeconds: number, isFr = false): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(safe / 86400);
  const h = Math.floor((safe % 86400) / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const hms = `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return d > 0 ? `${d}${isFr ? "j" : "d"} ${hms}` : hms;
}

export function ExamReview({
  examResult,
  questions,
  onReset,
  onRetake,
  challengeId,
  passingPercentage = 60,
  canRetake = true,
  quotaExhausted = false,
  quotaMaxAllowed = 3,
  quotaResetValue = 1,
  quotaResetUnit = "days",
  quotaResetAt,
  quotaResetInSeconds,
  onSignUp,
  onSignIn,
}: ExamReviewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";
  const resultDisplayName = getExamResultLanguageName(examResult);

  const [filter, setFilter] = useState<FilterType>("all");
  const [groupData, setGroupData] = useState<{
    challenge: any;
    leaderboard: any[];
    is_solo_attempt?: boolean;
  } | null>(null);
  const [showSummaryPopout, setShowSummaryPopout] = useState(false);
  const [resetSecondsLeft, setResetSecondsLeft] = useState<number | null>(() => {
    if (quotaResetAt) {
      return Math.max(0, Math.ceil((new Date(quotaResetAt).getTime() - Date.now()) / 1000));
    }
    return typeof quotaResetInSeconds === "number" ? Math.max(0, quotaResetInSeconds) : null;
  });

  useEffect(() => {
    if (!quotaExhausted) return;
    const compute = () => {
      if (quotaResetAt) {
        return Math.max(0, Math.ceil((new Date(quotaResetAt).getTime() - Date.now()) / 1000));
      }
      return typeof quotaResetInSeconds === "number" ? Math.max(0, quotaResetInSeconds) : null;
    };
    setResetSecondsLeft(compute());
    const id = setInterval(() => {
      setResetSecondsLeft((prev) => {
        if (quotaResetAt) return compute();
        return prev === null ? null : Math.max(0, prev - 1);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [quotaExhausted, quotaResetAt, quotaResetInSeconds]);

  const effectiveChallengeId =
    challengeId ||
    examResult.challenge_id ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("challenge_id") || undefined
      : undefined);

  // Guarantee exam-active flag is removed and event dispatched when viewing report
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }
  }, []);

  useEffect(() => {
    if (!effectiveChallengeId) return;
    let isMounted = true;
    const fetchGroupResults = async () => {
      try {
        const res = await fetch(`/api/exam-challenges/${effectiveChallengeId}/results`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setGroupData(data);
        }
      } catch (err) {
        console.error("Failed to fetch group exam results:", err);
      }
    };
    fetchGroupResults();
    return () => {
      isMounted = false;
    };
  }, [effectiveChallengeId]);

  const totalQuestions = examResult.total_questions || questions.length || 20;
  const answeredCount = (examResult.answers || []).filter(
    (a: ExamAnswer) => Boolean(a.selected_answer)
  ).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const accuracy =
    answeredCount > 0
      ? Math.round((examResult.correct_answers / answeredCount) * 100)
      : 0;
  const avgTimePerQuestion =
    totalQuestions > 0
      ? Math.round((examResult.duration_seconds || 0) / totalQuestions)
      : 0;

  const isPassed = (examResult.score_percentage ?? 0) >= passingPercentage;
  const isAbandoned = examResult.status === "abandoned" || answeredCount === 0;
  const isCheating = examResult.submission_reason === "cheating_violation";
  const hasNoAnswers = answeredCount === 0;

  const filteredAnswers = useMemo(() => {
    return (examResult.answers || [])
      .map((answer: ExamAnswer, idx: number) => ({ answer, idx }))
      .filter(({ answer }: { answer: ExamAnswer; idx: number }) => {
        switch (filter) {
          case "correct":
            return answer.is_correct;
          case "incorrect":
            return !answer.is_correct && Boolean(answer.selected_answer);
          case "unanswered":
            return !answer.selected_answer;
          default:
            return true;
        }
      });
  }, [examResult.answers, filter]);

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    {
      key: "all",
      label: isRw ? "Byose" : isFr ? "Tous" : "All",
      count: totalQuestions,
    },
    {
      key: "correct",
      label: isRw ? "Iby'ukuri (Watsinze)" : isFr ? "Corrects (Réussi)" : "Correct",
      count: examResult.correct_answers || 0,
    },
    {
      key: "incorrect",
      label: isRw ? "Ibyo watsinzwe" : isFr ? "Incorrects (Échoué)" : "Incorrect",
      count: Math.max(0, totalQuestions - (examResult.correct_answers || 0) - unansweredCount),
    },
    {
      key: "unanswered",
      label: isRw ? "Ibitasubijwe" : isFr ? "Sans réponse" : "Unanswered",
      count: unansweredCount,
    },
  ];

  const getOptionText = (question: ExamQuestion | undefined, option: "A" | "B" | "C" | "D") => {
    if (!question) return "";
    switch (option) {
      case "A":
        return question.option_a || "";
      case "B":
        return question.option_b || "";
      case "C":
        return question.option_c || "";
      case "D":
        return question.option_d || "";
    }
  };

  const getOptionImage = (question: ExamQuestion | undefined, option: "A" | "B" | "C" | "D") => {
    if (!question) return undefined;
    switch (option) {
      case "A":
        return question.option_a_image;
      case "B":
        return question.option_b_image;
      case "C":
        return question.option_c_image;
      case "D":
        return question.option_d_image;
    }
  };

  const options: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  const handleGoToRegister = () => {
    if (onSignUp) onSignUp();
    else router.push("/?auth=register");
  };

  const handleGoToLogin = () => {
    if (onSignIn) onSignIn();
    else router.push("/?auth=login");
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 pb-20 select-none">
      {/* OS Sleek Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-wide">
            <span>Navo OS</span>
            <span aria-hidden="true">·</span>
            <span>
              {isRw
                ? "Icyegeranyo cy'Ikizamini"
                : isFr
                ? "Relevé d'examen"
                : "Exam Transcript"}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {resultDisplayName || t("examResults") || "Exam Results"}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowSummaryPopout(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/70 hover:bg-muted/60 text-foreground transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{isRw ? "Incamake" : isFr ? "Résumé" : "Summary"}</span>
          </button>

          {!effectiveChallengeId && canRetake && !quotaExhausted && (
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>{isRw ? "Subiramo" : isFr ? "Repasser" : "Retake"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/70 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>{isRw ? "Subira ku Bizamini" : isFr ? "Retour" : "Back to Exams"}</span>
          </button>
        </div>
      </div>

      {/* Guest Free Exam Restriction Banner */}
      {quotaExhausted && (
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.08] dark:bg-emerald-500/12 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {isRw
                  ? `Wasoje ibizamini ${quotaMaxAllowed} by'ubuntu! Iyandikishe ku buntu ukomeze`
                  : isFr
                  ? `Vos ${quotaMaxAllowed} examen(s) gratuit(s) sont terminés !`
                  : `You've completed your ${quotaMaxAllowed} free practice exam${quotaMaxAllowed === 1 ? "" : "s"}!`}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {isRw
                  ? `Wakoze neza kwimenyereza! Utarinjira muri konti wemerewe ibizamini ${quotaMaxAllowed} ${quotaResetUnit === "hours" ? `mu masaha ${quotaResetValue}` : quotaResetValue === 1 ? "ku munsi" : `mu minsi ${quotaResetValue}`}. Iyandikishe ku buntu kugira ngo ubike aya manota kandi ukomeze kwimenyereza igihe cyose.`
                  : isFr
                  ? `Beau travail ! Sans compte, vous disposez de ${quotaMaxAllowed} examen(s) gratuit(s) par ${quotaResetValue} ${quotaResetUnit === "hours" ? (quotaResetValue === 1 ? "heure" : "heures") : (quotaResetValue === 1 ? "jour" : "jours")}. Inscrivez-vous gratuitement pour sauvegarder vos résultats et continuer à pratiquer librement.`
                  : `Great job practicing! Visitors can take ${quotaMaxAllowed} free exam${quotaMaxAllowed === 1 ? "" : "s"} every ${quotaResetValue} ${quotaResetUnit === "hours" ? (quotaResetValue === 1 ? "hour" : "hours") : (quotaResetValue === 1 ? "day" : "days")}. Sign up for free to save your results and keep practicing anytime.`}
              </p>
              {resetSecondsLeft !== null && resetSecondsLeft > 0 && quotaMaxAllowed > 0 && (
                <div className="inline-flex items-center gap-1.5 pt-1 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isRw
                      ? `Amahirwe mashya azafunguka mu gihe cya: ${formatResetDuration(resetSecondsLeft, false)}`
                      : isFr
                      ? `Nouveaux examens gratuits dans : ${formatResetDuration(resetSecondsLeft, true)}`
                      : `Free exams reset in: ${formatResetDuration(resetSecondsLeft, false)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleGoToRegister}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isRw ? "Iyandikishe ku buntu" : isFr ? "S'inscrire gratuitement" : "Sign Up for Free"}</span>
            </button>
            <button
              type="button"
              onClick={handleGoToLogin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-border/80 hover:bg-muted text-foreground transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isRw ? "Injira" : isFr ? "Connexion" : "Log In"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Performance Telemetry Strip (Flat, unboxed hairline layout matching Navo OS) */}
      {!isAbandoned && !isCheating && (
        <ExamCelebration
          passed={isPassed}
          scorePercentage={examResult.score_percentage || 0}
          title={
            isPassed
              ? isRw
                ? "Watsinze Ikizamini!"
                : isFr
                ? "Examen Réussi !"
                : t("congratulations") || "Exam Passed!"
              : isRw
              ? "Watsinzwe Ikizamini"
              : isFr
              ? "Examen Non Réussi"
              : t("examNotPassed") || "Exam Not Passed"
          }
          subtitle={
            isPassed
              ? isRw
                ? `Watsinze: wabonye ${examResult.correct_answers} kuri ${totalQuestions} (${examResult.score_percentage}%). Umurongo wo gutsinda ni ${passingPercentage}%.`
                : isFr
                ? `Vous avez réussi : score ${examResult.correct_answers} sur ${totalQuestions} (${examResult.score_percentage}%). Le seuil de réussite est ${passingPercentage}%.`
                : `You scored ${examResult.correct_answers} of ${totalQuestions} (${examResult.score_percentage}%). Passing mark is ${passingPercentage}%.`
              : isRw
              ? `Watsinzwe: wabonye ${examResult.correct_answers} kuri ${totalQuestions} (${examResult.score_percentage}%). Ukeneye nibura ${passingPercentage}% kugira ngo utsinde.`
              : isFr
              ? `Échoué : score ${examResult.correct_answers} sur ${totalQuestions} (${examResult.score_percentage}%). Vous avez besoin d'au moins ${passingPercentage}% pour réussir.`
              : `You scored ${examResult.correct_answers} of ${totalQuestions} (${examResult.score_percentage}%). Required pass mark is ${passingPercentage}%.`
          }
          badges={
            <>
              <span className="font-mono text-xs">{resultDisplayName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs">{formatTime(examResult.duration_seconds)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs">{totalQuestions} {isRw ? "Ibibazo" : isFr ? "Questions" : "Questions"}</span>
            </>
          }
        />
      )}

      {/* Navo OS Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-xl border border-border/60 bg-card/40 dark:bg-zinc-900/40">
          <span className="text-[10px] font-mono uppercase text-muted-foreground block">
            {isRw ? "Amanota" : isFr ? "Points & Score" : "Marks & Score"}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={cn(
                "text-lg sm:text-xl font-bold font-mono tabular-nums",
                isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {examResult.correct_answers}/{totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ({examResult.score_percentage ?? 0}%)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border/60 bg-card/40 dark:bg-zinc-900/40">
          <span className="text-[10px] font-mono uppercase text-muted-foreground block">
            {isRw ? "Imiterere" : isFr ? "Statut" : "Status"}
          </span>
          <span
            className={cn(
              "text-xs sm:text-sm font-semibold block mt-1.5 truncate",
              isCheating
                ? "text-orange-600 dark:text-orange-400"
                : isPassed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {isCheating
              ? isRw
                ? "Cyahagaritswe (Security)"
                : isFr
                ? "Interrompu (Sécurité)"
                : "Terminated (Security)"
              : isPassed
              ? isRw
                ? "Watsinze"
                : isFr
                ? "Réussi"
                : "Passed"
              : isRw
              ? "Watsinzwe"
              : isFr
              ? "Échoué"
              : "Failed"}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-border/60 bg-card/40 dark:bg-zinc-900/40">
          <span className="text-[10px] font-mono uppercase text-muted-foreground block">
            {isRw ? "Igihe Cyakoreshejwe" : isFr ? "Temps écoulé" : "Time Spent"}
          </span>
          <span className="text-xs sm:text-sm font-mono font-semibold text-foreground block mt-1.5 tabular-nums">
            {formatTime(examResult.duration_seconds)}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-border/60 bg-card/40 dark:bg-zinc-900/40">
          <span className="text-[10px] font-mono uppercase text-muted-foreground block">
            {isRw ? "Ibyasubijwe" : isFr ? "Répondu" : "Answered"}
          </span>
          <span className="text-xs sm:text-sm font-mono font-semibold text-foreground block mt-1.5 tabular-nums">
            {answeredCount}/{totalQuestions} ({accuracy}%)
          </span>
        </div>
      </div>

      {/* Zero Questions Answered or Security Termination Diagnostic Panel */}
      {hasNoAnswers ? (
        <div className="rounded-2xl border border-orange-500/35 bg-orange-500/[0.04] dark:bg-orange-500/10 p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {isCheating
                  ? isRw
                    ? "Ikizamini cyahagaritswe kubera gukopera"
                    : isFr
                    ? "Examen interrompu pour violations de sécurité"
                    : "Exam Terminated Due to Security Violations"
                  : isRw
                  ? `Ikizamini cyarangiye nta kibazo gisubijwe (0 / ${totalQuestions})`
                  : isFr
                  ? `Examen incomplet — 0 / ${totalQuestions} questions répondues`
                  : "Exam Incomplete — 0 Questions Answered"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {isCheating
                  ? isRw
                    ? "Iki kizamini cyoherejwe ako kanya na sisitemu yo kurinda gukopera kubera kurenga ku mabwiriza y'umutekano mbere y'uko hagira ikibazo gisubizwa."
                    : isFr
                    ? "Cet examen a été automatiquement soumis par le système de surveillance en raison d'un dépassement des limites de sécurité."
                    : "This exam was terminated by the proctoring engine because security thresholds were exceeded before questions were answered."
                  : isRw
                  ? "Urupapuro rw'ikizamini rwafunzwe cyangwa igihe cyagenwe cyarangiye mbere y'uko uhitamo igisubizo na kimwe."
                  : isFr
                  ? "La fenêtre d'examen a été fermée ou le temps imparti s'est écoulé avant qu'aucune réponse ne soit sélectionnée."
                  : "The exam window was closed or the time expired before any answers were selected."}
              </p>
            </div>
          </div>

          {/* Clean diagnostic list of reasons */}
          <div className="pt-2 border-t border-orange-500/20 space-y-2">
            <span className="text-[11px] font-mono uppercase text-muted-foreground tracking-wide block">
              {isRw
                ? "Impamvu yatumye ikizamini gihagarara:"
                : isFr
                ? "Détails du diagnostic :"
                : "Diagnostic details:"}
            </span>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span>
                  {isRw
                    ? "Guta urupapuro rw'ikizamini cyangwa guhindura urupapuro mu buryo butemewe"
                    : isFr
                    ? "Changement d'onglet ou sortie de la fenêtre d'examen active"
                    : "Switching tabs or leaving the active exam window"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span>
                  {isRw
                    ? "Gusohoka mu buryo bw'idirishya ryuzuye (Full-screen) mbere yo gusoza ikizamini"
                    : isFr
                    ? "Sortie du mode plein écran obligatoire pendant l'examen"
                    : "Exiting mandatory full-screen mode during the exam"}
                </span>
              </li>
            </ul>

            <div className="mt-3 p-3 rounded-xl bg-background/50 border border-border/50 text-xs text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                {isRw
                  ? "Kugira ngo ukore ikizamini neza, kanda 'Subiramo Ikizamini' hasi kandi ugume ku rupapuro rw'ikizamini kugeza urangije."
                  : isFr
                  ? "Pour réussir votre examen, cliquez sur « Repasser l'examen » ci-dessous et restez en plein écran jusqu'à la soumission."
                  : "To complete the exam successfully, stay on the exam screen in full-screen until you submit."}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Segmented Filter Control */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
            <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-zinc-900/70 p-1 rounded-xl border border-border/50">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                    filter === tab.key
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums",
                      filter === tab.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground font-mono">
              {filteredAnswers.length} / {totalQuestions}
            </span>
          </div>

          {/* Minimalist Question Review List */}
          <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/40 dark:bg-zinc-900/30 divide-y divide-border/50">
            {filteredAnswers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                {isRw
                  ? "Nta bibazo bibonetse muri iki cyiciro."
                  : isFr
                  ? "Aucune question dans ce filtre."
                  : "No questions in this filter."}
              </div>
            ) : (
              filteredAnswers.map(({ answer, idx }) => {
                const question = questions.find((q) => q.id === answer.question_id);
                if (!question) return null;

                const isCorrect = answer.is_correct;
                const isUnanswered = !answer.selected_answer;

                return (
                  <div key={answer.question_id || idx} className="p-4 sm:p-5 space-y-3.5">
                    {/* Question Header Strip */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs font-bold",
                            isCorrect
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : isUnanswered
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "text-rose-600 bg-rose-500/15 dark:text-rose-400"
                          )}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : isUnanswered ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-xs font-mono font-semibold text-foreground">
                          {isRw ? "Ikibazo" : isFr ? "Question" : "Question"} {idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            isCorrect
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isUnanswered
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {isCorrect
                            ? isRw
                              ? "Watsinze"
                              : isFr
                              ? "Réussi"
                              : "Correct"
                            : isUnanswered
                            ? isRw
                              ? "Ntiwasubije"
                              : isFr
                              ? "Sans réponse"
                              : "Not answered"
                            : isRw
                            ? "Watsinzwe"
                            : isFr
                            ? "Échoué"
                            : "Incorrect"}
                        </span>
                      </div>

                      {answer.time_spent_seconds != null && answer.time_spent_seconds > 0 && (
                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(answer.time_spent_seconds)}</span>
                        </span>
                      )}
                    </div>

                    {/* Question Prompt */}
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {question.question}
                    </p>

                    {/* Question Diagram Image */}
                    {question.question_image && (
                      <div className="rounded-xl border border-border/50 bg-muted/20 p-2 sm:p-3 w-full max-w-2xl">
                        <SmartImage
                          src={question.question_image}
                          alt="Question diagram"
                          className="w-full min-h-[200px] sm:min-h-[260px] h-[280px] sm:h-[360px] object-contain rounded-lg mx-auto"
                        />
                      </div>
                    )}

                    {/* Options Grid */}
                    <div className="space-y-2 pt-1">
                      {options.map((opt) => {
                        const optText = getOptionText(question, opt);
                        const optImg = getOptionImage(question, opt);
                        if (!optText && !optImg) return null;

                        const isCorrectOption = question.correct_answer === opt;
                        const isStudentAnswer = answer.selected_answer === opt;

                        return (
                          <div
                            key={opt}
                            className={cn(
                              "flex items-start gap-2.5 p-3 rounded-xl border text-xs sm:text-sm transition-all",
                              isCorrectOption
                                ? "border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/15 text-foreground font-medium"
                                : isStudentAnswer && !isCorrectOption
                                ? "border-rose-500/60 bg-rose-500/10 dark:bg-rose-500/15 text-foreground"
                                : "border-border/60 bg-transparent text-muted-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 border mt-0.5",
                                isCorrectOption
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : isStudentAnswer
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-muted text-muted-foreground border-border/70"
                              )}
                            >
                              {opt}
                            </span>

                            <div className="flex-1 min-w-0">
                              {optImg && (
                                <SmartImage
                                  src={optImg}
                                  alt={`Option ${opt}`}
                                  width={640}
                                  className="h-40 sm:h-48 w-full max-w-md object-contain rounded-md mb-1.5"
                                />
                              )}
                              {optText && <span className="leading-snug block">{optText}</span>}
                            </div>

                            {isCorrectOption && (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 pt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                  {isRw ? "Igisubizo cy'ukuri" : isFr ? "Bonne réponse" : "Correct answer"}
                                </span>
                              </span>
                            )}
                            {isStudentAnswer && !isCorrectOption && (
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 shrink-0 pt-0.5">
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                  {isRw ? "Icyo wahisemo (Watsinzwe)" : isFr ? "Votre choix (Échoué)" : "Your choice (Incorrect)"}
                                </span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation if provided */}
                    {question.explanation && (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs text-foreground/90 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-primary">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {isRw
                              ? "Ibisobanuro:"
                              : isFr
                              ? "Explication :"
                              : "Explanation:"}
                          </span>
                        </div>
                        <p className="leading-relaxed pl-5">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Bottom Single Navo OS Action Bar */}
      <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
        {quotaExhausted ? (
          <>
            <button
              type="button"
              onClick={handleGoToRegister}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isRw
                  ? "Iyandikishe ku buntu ukomeze"
                  : isFr
                  ? "S'inscrire gratuitement pour continuer"
                  : "Sign Up for Free to Continue"}
              </span>
            </button>
            <button
              type="button"
              onClick={onReset}
              className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium border border-border/70 hover:bg-muted text-foreground flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>
                {isRw
                  ? "Subira ahabanza"
                  : isFr
                  ? "Retour à l'accueil"
                  : "Back to Home"}
              </span>
            </button>
          </>
        ) : (
          <>
            {!effectiveChallengeId && canRetake && (
              <button
                type="button"
                onClick={onRetake}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isRw ? "Subiramo Ikizamini" : isFr ? "Repasser l'examen" : "Retake Exam"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium border border-border/70 hover:bg-muted text-foreground flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{isRw ? "Subira ku Bizamini" : isFr ? "Retour aux examens" : "Back to Exams"}</span>
            </button>
          </>
        )}
      </div>

      {/* Popout Dialog for Detailed Stats */}
      <Dialog open={showSummaryPopout} onOpenChange={setShowSummaryPopout}>
        <DialogContent className="max-w-md p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>
                {isRw
                  ? "Incamake y'Ikizamini"
                  : isFr
                  ? "Détails du résumé de l'examen"
                  : "Exam Summary Details"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {resultDisplayName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                  {isRw ? "Amanota" : isFr ? "Score" : "Score"}
                </span>
                <span className="text-sm font-bold font-mono text-foreground">
                  {examResult.correct_answers}/{totalQuestions} ({examResult.score_percentage ?? 0}%)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                  {isRw ? "Igihe" : isFr ? "Durée" : "Duration"}
                </span>
                <span className="text-sm font-bold font-mono text-foreground">
                  {formatTime(examResult.duration_seconds)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                  {isRw ? "Icyo ku kibazo" : isFr ? "Moy. par question" : "Avg Per Question"}
                </span>
                <span className="text-sm font-bold font-mono text-foreground">
                  {formatTime(avgTimePerQuestion)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block text-[10px] uppercase font-mono">
                  {isRw ? "Gutsinda" : isFr ? "Seuil de réussite" : "Pass Requirement"}
                </span>
                <span className="text-sm font-bold font-mono text-foreground">
                  {passingPercentage}%
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExamReview;
