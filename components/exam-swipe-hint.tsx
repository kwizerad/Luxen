"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Hand, X, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface ExamSwipeHintProps {
  onDismiss?: () => void;
  forceShow?: boolean;
}

export function ExamSwipeHint({ onDismiss, forceShow = false }: ExamSwipeHintProps) {
  const { t, language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("has_seen_exam_swipe_tutorial", "true");
    }
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (forceShow) {
      setIsVisible(true);
      return;
    }

    const seen = localStorage.getItem("has_seen_exam_swipe_tutorial");
    if (!seen) {
      // Delay slightly so exam card loads first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 700);

      // Auto-dismiss after 8 seconds
      const autoDismissTimer = setTimeout(() => {
        handleDismiss();
      }, 8700);

      return () => {
        clearTimeout(timer);
        clearTimeout(autoDismissTimer);
      };
    }
  }, [forceShow, handleDismiss]);

  const getLocalizedTitle = () => {
    if (language === "rw") return "Koresha gukubita iburyo cyangwa ibumoso";
    if (language === "fr") return "Glissez pour changer de question";
    return "Swipe to Navigate Questions";
  };

  const getLocalizedDesc = () => {
    if (language === "rw") {
      return "Nyerereza ibumoso kujya ku kibazo gikurikira, cyangwa iburyo gusubira inyuma.";
    }
    if (language === "fr") {
      return "Balayez vers la gauche pour la question suivante, ou vers la droite pour la précédente.";
    }
    return "Swipe left for next question, or swipe right to return to previous question.";
  };

  const getLocalizedGotIt = () => {
    if (language === "rw") return "Nabyumvise";
    if (language === "fr") return "Compris";
    return "Got it";
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-30 mb-4 overflow-hidden rounded-2xl border border-primary/25 bg-linear-to-r from-primary/10 via-background to-primary/10 p-3.5 sm:p-4 shadow-lg backdrop-blur-md"
        >
          {/* Subtle animated background beam */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/5 to-transparent pointer-events-none animate-pulse" />

          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            {/* Gesture Animation Graphic */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-24 sm:w-28 items-center justify-between px-2 rounded-xl bg-primary/15 border border-primary/20 shrink-0 overflow-hidden shadow-inner">
                <ChevronLeft className="h-4 w-4 text-primary/60 animate-pulse" />
                
                {/* Gliding animated finger / hand */}
                <motion.div
                  animate={{
                    x: [-14, 14, -14],
                    rotate: [-8, 8, -8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                >
                  <Hand className="h-4 w-4" />
                </motion.div>

                <ChevronRight className="h-4 w-4 text-primary/60 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{getLocalizedTitle()}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">
                  {getLocalizedDesc()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                {getLocalizedGotIt()}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                aria-label="Close swipe hint"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
