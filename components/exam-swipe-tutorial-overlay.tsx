"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  Sparkles,
  Check,
  ArrowRight,
  HelpCircle,
  MoveHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ExamSwipeTutorialOverlayProps {
  questionIndex: number;
  totalQuestions?: number;
  onDismiss?: () => void;
  forceShow?: boolean;
}

export function ExamSwipeTutorialOverlay({
  questionIndex,
  totalQuestions = 20,
  onDismiss,
  forceShow = false,
}: ExamSwipeTutorialOverlayProps) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [gestureTested, setGestureTested] = useState<"left" | "right" | null>(null);
  const hasTriggeredForIndex0Ref = useRef(false);
  
  const touchStartXRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Show every time on the very first question (index 0)
    if (questionIndex === 0 || forceShow) {
      if (!hasTriggeredForIndex0Ref.current || forceShow) {
        hasTriggeredForIndex0Ref.current = true;
        setCountdown(5);
        setIsOpen(true);

        // Countdown interval every 1 second
        let currentCount = 5;
        intervalRef.current = setInterval(() => {
          currentCount -= 1;
          setCountdown(Math.max(0, currentCount));
          if (currentCount <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }, 1000);

        // Auto dismiss after 5 seconds
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, 5200);

        return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
        };
      }
    } else {
      // Reset ref if user navigated away from question 0
      hasTriggeredForIndex0Ref.current = false;
      setIsOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [questionIndex, forceShow, handleDismiss]);

  // Touch handlers for interactive try zone
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -40) {
      setGestureTested("left");
      setTimeout(() => handleDismiss(), 700);
    } else if (diff > 40) {
      setGestureTested("right");
      setTimeout(() => handleDismiss(), 700);
    }
    touchStartXRef.current = null;
  };

  const texts = {
    title:
      language === "rw"
        ? "Uko wimura ibibazo (Swipe Navigation)"
        : language === "fr"
        ? "Navigation par Balayage (Swipe Gestures)"
        : "Swipe to Navigate Questions",
    subtitle:
      language === "rw"
        ? "Koresha urutoki unyerereza kuri ecran kugira ngo ujye ku kibazo gikurikira cyangwa ubanzirize."
        : language === "fr"
        ? "Faites glisser votre doigt sur l'écran pour passer à la question suivante ou précédente."
        : "Swipe left or right anywhere on the card to quickly switch between questions.",
    swipeLeftTitle:
      language === "rw" ? "Nyerereza Ibumoso ➔" : language === "fr" ? "Glisser à Gauche ➔" : "Swipe Left ➔",
    swipeLeftDesc:
      language === "rw" ? "Kujya ku kibazo gikurikira" : language === "fr" ? "Question suivante" : "Next Question",
    swipeRightTitle:
      language === "rw" ? "⬅ Nyerereza Iburyo" : language === "fr" ? "⬅ Glisser à Droite" : "⬅ Swipe Right",
    swipeRightDesc:
      language === "rw" ? "Gusubira ku kibazo kibanza" : language === "fr" ? "Question précédente" : "Previous Question",
    tryHere:
      language === "rw"
        ? "Gerageza hano: Nyerereza urutoki iburyo cyangwa ibumoso"
        : language === "fr"
        ? "Essayez ici : Faites glisser votre doigt à gauche ou droite"
        : "Interactive practice: Swipe left or right inside this box",
    testedSuccess:
      language === "rw" ? "Birakora neza! Bitangiye..." : language === "fr" ? "Parfait ! Démarrage..." : "Great job! Starting...",
    gotIt:
      language === "rw" ? "Nabyumvise, Tangira!" : language === "fr" ? "J'ai compris, Commencer !" : "Got it, Start Exam!",
    autoClose:
      language === "rw"
        ? `Iri somo ririfunga mu masegonda ${countdown}s`
        : language === "fr"
        ? `Se fermera automatiquement dans ${countdown}s`
        : `Auto-dismissing in ${countdown}s...`,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg my-auto rounded-3xl border-2 border-primary/40 bg-card p-5 sm:p-7 shadow-2xl text-card-foreground overflow-hidden"
        >
          {/* Top Progress countdown line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted overflow-hidden">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-full bg-primary"
            />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shrink-0 shadow-sm">
                <MoveHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    Tutorial (5s)
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {texts.autoClose}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                  {texts.title}
                </h2>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mb-5 leading-relaxed">
            {texts.subtitle}
          </p>

          {/* Demonstration Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* Swipe Left = Next */}
            <div className="relative p-3.5 rounded-2xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 flex flex-col items-center text-center overflow-hidden">
              <span className="text-xs font-bold text-primary mb-1">
                {texts.swipeLeftTitle}
              </span>
              <p className="text-[11px] text-muted-foreground mb-3">
                {texts.swipeLeftDesc}
              </p>
              {/* Animation */}
              <div className="relative flex h-12 w-full items-center justify-between px-4 rounded-xl bg-background/80 border border-primary/20 overflow-hidden">
                <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />
                <motion.div
                  animate={{
                    x: [24, -24, 24],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                >
                  <Hand className="h-4 w-4" />
                </motion.div>
                <ChevronRight className="h-4 w-4 text-primary font-bold animate-pulse" />
              </div>
            </div>

            {/* Swipe Right = Previous */}
            <div className="relative p-3.5 rounded-2xl border-2 border-border bg-muted/40 flex flex-col items-center text-center overflow-hidden">
              <span className="text-xs font-bold text-foreground mb-1">
                {texts.swipeRightTitle}
              </span>
              <p className="text-[11px] text-muted-foreground mb-3">
                {texts.swipeRightDesc}
              </p>
              {/* Animation */}
              <div className="relative flex h-12 w-full items-center justify-between px-4 rounded-xl bg-background/80 border border-border overflow-hidden">
                <ChevronLeft className="h-4 w-4 text-primary font-bold animate-pulse" />
                <motion.div
                  animate={{
                    x: [-24, 24, -24],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-md"
                >
                  <Hand className="h-4 w-4" />
                </motion.div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>

          {/* Interactive Test / Practice Swipe Box */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`relative mb-5 p-4 rounded-2xl border-2 border-dashed transition-all text-center select-none cursor-grab active:cursor-grabbing ${
              gestureTested
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-primary/50 bg-primary/5 hover:bg-primary/10 text-foreground"
            }`}
          >
            {gestureTested ? (
              <div className="flex items-center justify-center gap-2 font-bold text-xs sm:text-sm animate-bounce">
                <Check className="h-5 w-5 stroke-[3]" />
                <span>{texts.testedSuccess}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex items-center justify-center gap-2 text-primary font-bold text-xs sm:text-sm">
                  <Hand className="h-4 w-4 animate-pulse" />
                  <span>{texts.tryHere}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  (Touch or drag here left/right to practice)
                </p>
              </div>
            )}
          </div>

          {/* Dismiss Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-4 w-4 text-primary shrink-0" />
              <span>Question 1 of {totalQuestions}</span>
            </div>
            
            <Button
              onClick={handleDismiss}
              className="w-full sm:w-auto min-w-[150px] font-bold shadow-md rounded-xl"
              size="lg"
            >
              {texts.gotIt}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
