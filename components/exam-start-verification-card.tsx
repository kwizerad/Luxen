"use client";

import { Clock, HelpCircle, Play, ShieldCheck, ArrowLeft, Globe, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ExamStartVerificationCardProps {
  examTitle: string;
  durationMinutes: number;
  totalQuestions: number;
  examLanguage?: string;
  loading?: boolean;
  onConfirmStart: () => void;
  onCancel?: () => void;
}

export function ExamStartVerificationCard({
  examTitle,
  durationMinutes,
  totalQuestions,
  examLanguage,
  loading = false,
  onConfirmStart,
  onCancel,
}: ExamStartVerificationCardProps) {
  const { language } = useLanguage();
  const activeLang = String(examLanguage || language || "").toLowerCase();

  const langCode =
    activeLang === "kinyarwanda" || activeLang === "rw"
      ? "rw"
      : activeLang === "french" || activeLang === "fr" || activeLang === "français"
      ? "fr"
      : "en";

  const copy = {
    rw: {
      confirmTitle: "Uremeza ko ushaka gutangira iki kizamini?",
      confirmSubtitle: "Reba igihe n'umubare w'ibibazo mbere yo gutangira.",
      timeLabel: "Igihe Ikizamini Kimara",
      minutesUnit: "iminota",
      questionsLabel: "Umubare w'Ibibazo",
      questionsUnit: "ibibazo",
      mainInstructionsTitle: "Amabwiriza y'Ingenzi",
      instructions: [
        "Hitamo igisubizo cy'ukuri kuri buri kibazo mbere yo gukomeza.",
        "Igihe gitangira kubarwa ako kanya kandi ikizamini cyoherezwa iyo kirangiye.",
        "Kora ikizamini utavuye muri iyi paji kugeza ugisoje.",
      ],
      startBtn: "Yego, Tangira Ikizamini",
      startingBtn: "Gutegura...",
      cancelBtn: "Subira inyuma",
    },
    fr: {
      confirmTitle: "Êtes-vous sûr de vouloir commencer l'examen ?",
      confirmSubtitle: "Vérifiez la durée et le nombre de questions avant de démarrer.",
      timeLabel: "Durée de l'examen",
      minutesUnit: "minutes",
      questionsLabel: "Nombre de questions",
      questionsUnit: "questions",
      mainInstructionsTitle: "Instructions principales",
      instructions: [
        "Sélectionnez la meilleure réponse pour chaque question.",
        "Le chronomètre démarre immédiatement et soumet l'examen à la fin du temps.",
        "Restez dans la fenêtre d'examen jusqu'à la soumission finale.",
      ],
      startBtn: "Oui, commencer l'examen",
      startingBtn: "Démarrage...",
      cancelBtn: "Annuler",
    },
    en: {
      confirmTitle: "Are you sure you want to start the exam?",
      confirmSubtitle: "Confirm the duration and question count before you begin.",
      timeLabel: "Time It Will Take",
      minutesUnit: "minutes",
      questionsLabel: "Number of Questions",
      questionsUnit: "questions",
      mainInstructionsTitle: "Main Instructions",
      instructions: [
        "Select the best answer for each question before submitting.",
        "The timer starts right away and auto-submits when time runs out.",
        "Complete the exam in one sitting without leaving the exam window.",
      ],
      startBtn: "Yes, Start Exam",
      startingBtn: "Starting...",
      cancelBtn: "Go Back",
    },
  }[langCode];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto p-4 sm:p-6 flex-1 flex flex-col justify-center"
    >
      <div className="rounded-2xl border border-border/80 bg-card/95 dark:bg-zinc-900/90 backdrop-blur-xl p-5 sm:p-7 space-y-5 shadow-sm">
        {/* Verification Title */}
        <div className="space-y-2 text-center">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {copy.confirmTitle}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">
            {examTitle}
            {examLanguage ? (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-semibold">
                <Globe className="w-3 h-3 text-primary" />
                {examLanguage}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{copy.confirmSubtitle}</p>
        </div>

        {/* Time & Number of Questions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight">{copy.timeLabel}</p>
              <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
                {durationMinutes} {copy.minutesUnit}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-tight">{copy.questionsLabel}</p>
              <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
                {totalQuestions} {copy.questionsUnit}
              </p>
            </div>
          </div>
        </div>

        {/* Main Instructions Only */}
        <div className="rounded-xl border border-border/60 bg-background/60 dark:bg-zinc-950/50 p-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {copy.mainInstructionsTitle}
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-foreground/90">
            {copy.instructions.map((line, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirm / Cancel Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl h-11 text-xs sm:text-sm font-medium gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>{copy.cancelBtn}</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={onConfirmStart}
            disabled={loading}
            className="flex-1 rounded-xl h-11 text-xs sm:text-sm font-bold gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{copy.startingBtn}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>{copy.startBtn}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
