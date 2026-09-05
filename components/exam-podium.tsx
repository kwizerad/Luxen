"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import confetti from "canvas-confetti";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

interface PodiumParticipant {
  profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  rank: number;
}

interface ExamPodiumProps {
  participants: PodiumParticipant[];
}

export function ExamPodium({ participants }: ExamPodiumProps) {
  const { t } = useLanguage();
  const firedRef = useRef(false);

  const top3 = participants.slice(0, 3);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const timer = setTimeout(() => {
      const colors = ["#fbbf24", "#cbd5e1", "#d97706", "#10b981", "#3b82f6"];
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.3 },
        colors,
        startVelocity: 50,
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 90,
          spread: 120,
          origin: { x: 0.5, y: 0.3 },
          colors,
          startVelocity: 40,
        });
      }, 400);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const rank1Config = {
    rank: 1,
    height: "h-28 sm:h-36",
    gradient: "from-yellow-400 to-amber-500",
    borderColor: "border-yellow-400/50",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-400/10",
    label: t("champion") || "Champion",
    delay: 0.1,
    medalColor: "text-yellow-500",
    isFirst: true,
  };

  const rank2Config = {
    rank: 2,
    height: "h-20 sm:h-24",
    gradient: "from-gray-300 to-gray-400",
    borderColor: "border-gray-400/40",
    textColor: "text-gray-600",
    bgColor: "bg-gray-400/10",
    label: t("secondPlace") || "2nd Place",
    delay: 0.3,
    medalColor: "text-gray-400",
    isFirst: false,
  };

  const rank3Config = {
    rank: 3,
    height: "h-16 sm:h-20",
    gradient: "from-orange-400 to-amber-600",
    borderColor: "border-orange-400/40",
    textColor: "text-orange-600",
    bgColor: "bg-orange-400/10",
    label: t("thirdPlace") || "3rd Place",
    delay: 0.5,
    medalColor: "text-orange-400",
    isFirst: false,
  };

  // Build the visual podium items:
  // If 1 participant: [ Rank 1 ]
  // If 2 participants: [ Rank 2, Rank 1 ] (so 2nd on left, 1st on right/center)
  // If 3+ participants: [ Rank 2, Rank 1, Rank 3 ]
  let podiumDisplayItems: { participant: PodiumParticipant; config: typeof rank1Config }[] = [];

  if (top3.length === 1) {
    podiumDisplayItems = [{ participant: top3[0], config: rank1Config }];
  } else if (top3.length === 2) {
    podiumDisplayItems = [
      { participant: top3[1], config: rank2Config },
      { participant: top3[0], config: rank1Config },
    ];
  } else if (top3.length >= 3) {
    podiumDisplayItems = [
      { participant: top3[1], config: rank2Config },
      { participant: top3[0], config: rank1Config },
      { participant: top3[2], config: rank3Config },
    ];
  }

  const getInitials = (p: PodiumParticipant) => {
    const name = p.profile?.full_name || p.profile?.username || "?";
    return name[0]?.toUpperCase() || "?";
  };

  const getName = (p: PodiumParticipant) => {
    return p.profile?.full_name || p.profile?.username || t("user") || "User";
  };

  return (
    <div className="mb-6">
      <motion.h2
        className="font-bold text-base sm:text-lg mb-4 text-center flex items-center justify-center gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Crown className="h-5 w-5 text-yellow-500" />
        {t("podiumTitle")}
      </motion.h2>

      <div className="flex items-end justify-center gap-2 sm:gap-4 px-2">
        {podiumDisplayItems.map((item, idx) => {
          const p = item.participant;
          const config = item.config;
          const isFirst = config.isFirst;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 max-w-[120px]">
              {/* Avatar + Crown */}
              <motion.div
                className="relative mb-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: config.delay + 0.3, type: "spring", stiffness: 200 }}
              >
                {isFirst && (
                  <motion.div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 z-10"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: config.delay + 0.6, type: "spring", stiffness: 200 }}
                  >
                    <span className="text-xl">👑</span>
                  </motion.div>
                )}
                <Avatar
                  className={cn(
                    "border-2",
                    isFirst ? "h-14 w-14 sm:h-16 sm:w-16 border-yellow-400" : "h-10 w-10 sm:h-12 sm:w-12",
                    config.rank === 2 && "border-gray-400",
                    config.rank === 3 && "border-orange-400"
                  )}
                >
                  {p.profile?.avatar_url && <AvatarImage src={p.profile.avatar_url} alt="" />}
                  <AvatarFallback
                    className={cn(
                      "font-bold text-sm",
                      isFirst ? "bg-yellow-400/20 text-yellow-600" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {getInitials(p)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Name + Score */}
              <motion.div
                className="text-center mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: config.delay + 0.4 }}
              >
                <p className="text-xs sm:text-sm font-semibold truncate max-w-[100px]">
                  {getName(p)}
                </p>
                <p className={cn("text-sm sm:text-lg font-bold", config.textColor)}>
                  {p.scorePercentage}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {p.correctAnswers}/{p.totalQuestions}
                </p>
              </motion.div>

              {/* Podium Block */}
              <motion.div
                className={cn(
                  "w-full rounded-t-lg bg-gradient-to-t border-t-2",
                  config.gradient,
                  config.borderColor,
                  config.height
                )}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: 1 }}
                transition={{ delay: config.delay, duration: 0.6, ease: "easeOut" }}
              >
                <div className="flex flex-col items-center justify-center h-full pt-2">
                  <span className="text-xs sm:text-sm font-bold text-white drop-shadow">
                    {config.rank}
                  </span>
                  <Medal className={cn("h-3 w-3 sm:h-4 sm:w-4 mt-0.5", config.medalColor)} />
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
