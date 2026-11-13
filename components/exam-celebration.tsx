"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

interface ExamCelebrationProps {
  passed: boolean;
  scorePercentage: number;
  title?: string;
  subtitle?: string;
  badges?: React.ReactNode;
  variant?: "individual" | "group";
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-500";
  if (percentage >= 50) return "text-orange-500";
  return "text-red-500";
}

function AnimatedScoreCircle({ percentage, passed }: { percentage: number; passed: boolean }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="text-muted/30"
          stroke="currentColor"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          stroke="currentColor"
          strokeLinecap="round"
          className={cn(passed ? "text-green-500" : "text-red-500")}
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: passed ? 1.5 : 2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
      >
        <span className={cn("text-2xl sm:text-3xl font-bold", getScoreColor(percentage))}>
          {percentage}%
        </span>
      </motion.div>
    </div>
  );
}

export function ExamCelebration({
  passed,
  scorePercentage,
  title,
  subtitle,
  badges,
  variant = "individual",
}: ExamCelebrationProps) {
  const { t } = useLanguage();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    if (passed) {
      const duration = 2500;
      const end = Date.now() + duration;

      const colors = ["#10b981", "#fbbf24", "#3b82f6", "#a855f7", "#ef4444"];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.7 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.7 },
          colors,
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.4 },
          colors,
          startVelocity: 45,
        });
      }, 600);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 120,
          origin: { y: 0.5 },
          colors,
          startVelocity: 35,
        });
      }, 1200);
    }
  }, [passed]);

  return (
    <div className="relative py-3 sm:py-4 border-b border-border/50">
      <div className="flex items-center gap-3.5 sm:gap-5 relative z-10">
        <AnimatedScoreCircle percentage={scorePercentage} passed={passed} />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {passed && (
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0" />
            )}
            <h2
              className={cn(
                "text-base sm:text-xl font-semibold tracking-tight",
                passed
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {title || (passed ? t("congratulations") : t("examNotPassed"))}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {subtitle || (passed ? t("passedModuleExam") : t("keepTrying"))}
          </p>
          {badges && (
            <div className="pt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              {badges}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
