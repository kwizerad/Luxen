"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Hand,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ExamInstructionsViewProps {
  totalQuestions: number;
  durationMinutes: number;
  onStartQuestions: () => void;
  examTitle?: string;
  categoryName?: string;
}

export function ExamInstructionsView({
  totalQuestions,
  durationMinutes,
  onStartQuestions,
  examTitle,
  categoryName,
}: ExamInstructionsViewProps) {
  const { language } = useLanguage();
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Keyboard navigation: Right Arrow, Enter, Space to begin immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onStartQuestions();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStartQuestions]);

  // Swipe left to start exam
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;

    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && deltaX > 45) {
      onStartQuestions();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const contentByLang = {
    rw: {
      badge: "Amabwiriza y'Ikizamini",
      title: "Uko Wimura Ibibazo",
      subtitle: "Uburyo bworoshye bwo gusubiza no kwimura ibibazo:",
      mobileTitle: "Kuri Telefoni",
      mobileAction: "Nyerereza Ibumoso ➔ Kujya imbere",
      desktopTitle: "Kuri Mudasobwa",
      desktopAction: "Koresha Imyambi ← na → kuri clavier",
      answerTitle: "Guhitamo Igisubizo",
      answerAction: "Kanda A, B, C, D cyangwa kanda ku gisubizo",
      durationLabel: "Igihe cy'Ikizamini",
      questionsLabel: "Umubare w'Ibibazo",
      cta: "Tangira Ibibazo",
      hint: "Nyerereza ibumoso cyangwa ukande buto yo gutangira",
    },
    fr: {
      badge: "Instructions de l'Examen",
      title: "Navigation Rapide",
      subtitle: "Raccourcis simples pour naviguer et répondre :",
      mobileTitle: "Sur Mobile",
      mobileAction: "Glissez à gauche ➔ Suivant",
      desktopTitle: "Sur Ordinateur",
      desktopAction: "Touches fléchées ← et → du clavier",
      answerTitle: "Sélectionner une Réponse",
      answerAction: "Touches A, B, C, D ou cliquez sur l'option",
      durationLabel: "Durée",
      questionsLabel: "Questions",
      cta: "Commencer l'Examen",
      hint: "Glissez à gauche ou cliquez sur le bouton pour commencer",
    },
    en: {
      badge: "Exam Instructions",
      title: "Quick Navigation",
      subtitle: "Simple shortcuts to navigate and answer your questions:",
      mobileTitle: "On Mobile",
      mobileAction: "Swipe left ➔ Next question",
      desktopTitle: "On Computer",
      desktopAction: "Keyboard Arrow keys ← and → to switch",
      answerTitle: "Select Answer",
      answerAction: "Press A, B, C, D keys or click option",
      durationLabel: "Duration",
      questionsLabel: "Total Questions",
      cta: "Start Questions",
      hint: "Swipe left or click the button below to start",
    },
  };

  const text = contentByLang[language as keyof typeof contentByLang] || contentByLang.en;
  const displayTitle = examTitle || categoryName || "Exam";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 select-none"
    >
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/90 dark:bg-card/80 backdrop-blur-xl p-5 sm:p-8 text-center shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mb-2.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{text.badge}</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {displayTitle}
        </h1>

        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
          {text.subtitle}
        </p>

        {/* Exam Metrics Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{text.durationLabel}: <strong className="font-bold">{durationMinutes}m</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-medium text-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>{text.questionsLabel}: <strong className="font-bold">{totalQuestions}</strong></span>
          </div>
        </div>
      </div>

      {/* Modern Feature Guides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Mobile Swipe Navigation */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/70 dark:bg-card/50 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                <Smartphone className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{text.mobileTitle}</h3>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border/40">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </div>
              <motion.div
                animate={{ x: [-6, 6, -6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]"
              >
                <Hand className="h-3 w-3" />
              </motion.div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">
            {text.mobileAction}
          </p>
        </div>

        {/* Desktop Keyboard Navigation */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/70 dark:bg-card/50 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                <Laptop className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{text.desktopTitle}</h3>
            </div>
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/40">
              <kbd className="px-2.5 py-1 rounded-md bg-background border border-border font-mono font-bold text-xs text-foreground shadow-xs">
                ←
              </kbd>
              <kbd className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground border border-primary/40 font-mono font-bold text-xs shadow-xs">
                →
              </kbd>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">
            {text.desktopAction}
          </p>
        </div>

        {/* Answering Shortcut */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/70 dark:bg-card/50 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{text.answerTitle}</h3>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-muted/50 border border-border/40">
              {["A", "B", "C", "D"].map((key) => (
                <kbd
                  key={key}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-background border border-border font-mono font-bold text-xs text-foreground shadow-xs"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">
            {text.answerAction}
          </p>
        </div>
      </div>

      {/* Start Exam CTA Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-md">
        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left font-medium">
          {text.hint}
        </div>
        <Button
          onClick={onStartQuestions}
          size="lg"
          className="w-full sm:w-auto min-w-[220px] font-bold rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 text-sm"
        >
          <span>{text.cta}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
