"use client";

import { ArrowLeft, Clock, HelpCircle, Loader2, Play } from "lucide-react";
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
      timeLabel: "Igihe kimara",
      minutesUnit: "iminota",
      questionsLabel: "Ibibazo",
      questionsUnit: "ibibazo",
      mainInstructionsTitle: "Amabwiriza y'ingenzi",
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
      confirmTitle: "Voulez-vous vraiment commencer cet examen ?",
      confirmSubtitle: "Vérifiez la durée et le nombre de questions avant de démarrer.",
      timeLabel: "Durée",
      minutesUnit: "minutes",
      questionsLabel: "Questions",
      questionsUnit: "questions",
      mainInstructionsTitle: "Règles de l'épreuve",
      instructions: [
        "Sélectionnez la meilleure réponse pour chaque question.",
        "Le chronomètre démarre immédiatement et l'examen est soumis à la fin du temps.",
        "Restez dans la fenêtre d'examen jusqu'à la soumission finale.",
      ],
      startBtn: "Commencer l'examen",
      startingBtn: "Démarrage...",
      cancelBtn: "Retour",
    },
    en: {
      confirmTitle: "Ready to start your exam?",
      confirmSubtitle: "Check the timing and question count below before you begin.",
      timeLabel: "Duration",
      minutesUnit: "minutes",
      questionsLabel: "Questions",
      questionsUnit: "questions",
      mainInstructionsTitle: "Before you begin",
      instructions: [
        "Select the best answer for each question before submitting.",
        "The timer starts immediately and auto-submits when time runs out.",
        "Complete the session in one sitting without leaving the exam window.",
      ],
      startBtn: "Start Exam",
      startingBtn: "Preparing...",
      cancelBtn: "Go Back",
    },
  }[langCode];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto px-4 py-6 flex-1 flex flex-col justify-center"
    >
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6 sm:p-8 space-y-6">
        {/* Natural left-aligned header */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {examTitle}
            {examLanguage ? ` · ${examLanguage}` : ""}
          </p>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-snug">
            {copy.confirmTitle}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.confirmSubtitle}
          </p>
        </div>

        {/* Clean hairline metric strip */}
        <div className="grid grid-cols-2 divide-x divide-border border-y border-border py-4">
          <div className="pr-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{copy.timeLabel}</span>
            </div>
            <p className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
              {durationMinutes} {copy.minutesUnit}
            </p>
          </div>

          <div className="pl-5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{copy.questionsLabel}</span>
            </div>
            <p className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
              {totalQuestions} {copy.questionsUnit}
            </p>
          </div>
        </div>

        {/* Unboxed numbered instructions */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-foreground">
            {copy.mainInstructionsTitle}
          </h3>
          <ol className="space-y-2">
            {copy.instructions.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
              >
                <span className="text-xs font-mono tabular-nums text-foreground/60 pt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <span className="text-foreground/85">{line}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Grounded actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
              className="h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>{copy.cancelBtn}</span>
            </Button>
          ) : (
            <span />
          )}

          <Button
            type="button"
            onClick={onConfirmStart}
            disabled={loading}
            className="h-10 px-5 rounded-xl text-sm font-semibold gap-2 sm:min-w-[190px] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{copy.startingBtn}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>{copy.startBtn}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
