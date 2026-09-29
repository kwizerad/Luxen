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
    <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
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

  if (passed) {
    return (
      <div className="relative mb-4 sm:mb-6 rounded-[14px] sm:rounded-[24px] p-4 sm:p-6 border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent overflow-hidden">
        <div className="flex items-center gap-4 sm:gap-6 relative z-10">
          <AnimatedScoreCircle percentage={scorePercentage} passed={passed} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    filter: [
                      "drop-shadow(0 0 8px rgba(250, 204, 21, 0.5))",
                      "drop-shadow(0 0 16px rgba(250, 204, 21, 0.8))",
                      "drop-shadow(0 0 8px rgba(250, 204, 21, 0.5))",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-yellow-500" />
                </motion.div>
              </motion.div>
              <motion.h2
                className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
              >
                {title || t("congratulations")}
              </motion.h2>
            </div>
            <motion.p
              className="text-xs sm:text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {subtitle || t("passedModuleExam")}
            </motion.p>
            {badges && (
              <motion.div
                className="mt-2 flex items-center gap-2 flex-wrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {badges}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-4 sm:mb-6 rounded-[14px] sm:rounded-[24px] p-4 sm:p-6 border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent overflow-hidden">
      <div className="flex items-center gap-4 sm:gap-6 relative z-10">
        <AnimatedScoreCircle percentage={scorePercentage} passed={passed} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Sad emoji */}
            <motion.div
              initial={{ y: -100, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: [0, -10, 10, -5, 0] }}
              transition={{
                y: { type: "spring", stiffness: 200, delay: 0.2 },
                opacity: { delay: 0.2 },
                rotate: { delay: 0.8, duration: 0.8 },
              }}
              className="text-3xl sm:text-4xl"
            >
              😢
            </motion.div>
            <motion.h2
              className="text-lg sm:text-2xl font-bold text-red-600"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              {title || t("examNotPassed")}
            </motion.h2>
          </div>
          <motion.p
            className="text-xs sm:text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {subtitle || t("keepTrying")}
          </motion.p>
          {badges && (
            <motion.div
              className="mt-2 flex items-center gap-2 flex-wrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              {badges}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
