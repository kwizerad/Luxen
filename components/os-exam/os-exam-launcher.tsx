"use client";

import { useState } from "react";
import { ArrowRight, Users, History, Lock, BookOpen, Home } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import type { ExamCategory } from "@/lib/database.types";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import { isUUID, cn } from "@/lib/utils";

interface OSExamLauncherProps {
  standaloneEnabled: boolean;
  groupExamEnabled: boolean;
  hasExamHistory: boolean;
  categories: ExamCategory[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  loadingCategories: boolean;
  loadingExam: boolean;
  selectedExamLanguage: string;
  onStartExam: (categoryId: string, examLanguage: string) => void;
  onOpenGroupChallenge: () => void;
  navigate: (view: string, params?: Record<string, string>) => void;
  footerNote?: string;
}

const FLAG_TRACKS = [
  {
    key: "Kinyarwanda",
    label: "Kinyarwanda",
    actionText: "Tangira",
    flagSrc: "/assets/aistudio/Flag_of_Rwanda_4b2b50d1.svg",
    fallbackBg: "from-sky-500 via-amber-400 to-emerald-600",
  },
  {
    key: "English",
    label: "English",
    actionText: "Start",
    flagSrc: "/assets/aistudio/Flag_of_the_United_Kingdom__3-5_.svg_d8e9d47e.webp",
    fallbackBg: "from-blue-800 via-red-600 to-blue-900",
  },
  {
    key: "French",
    label: "Français",
    actionText: "Commencer",
    flagSrc: "/assets/aistudio/Flag_of_France__1974_2020__241dac7d.svg",
    fallbackBg: "from-blue-700 via-slate-100 to-red-600",
  },
] as const;

export function OSExamLauncher({
  standaloneEnabled,
  groupExamEnabled,
  hasExamHistory,
  categories,
  selectedCategoryId,
  onSelectCategory,
  loadingCategories,
  loadingExam,
  selectedExamLanguage,
  onStartExam,
  onOpenGroupChallenge,
  navigate,
  footerNote,
}: OSExamLauncherProps) {
  const { t } = useLanguage();
  const [failedFlags, setFailedFlags] = useState<Record<string, boolean>>({});

  if (!standaloneEnabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
        <div className="max-w-md w-full rounded-2xl border border-border/60 bg-background/70 dark:bg-zinc-900/60 backdrop-blur-xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">
              {t("examsPausedByAdmin") || "Exams Temporarily Unavailable"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("examsPausedDesc") ||
                "Practice exams are currently turned off by the administrator. You can continue studying courses or review past results."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("course")}
              className="rounded-xl whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {t("courses") || "Courses"}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("home")}
              className="rounded-xl whitespace-nowrap"
            >
              <Home className="w-4 h-4 mr-2" />
              {t("backToHome") || "Desktop"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeCategory =
    categories.find((c) => c.id === selectedCategoryId) ||
    categories.find((c) => isUUID(c.id)) ||
    categories[0];

  const targetCategoryId =
    (activeCategory && isUUID(activeCategory.id) ? activeCategory.id : null) ||
    (isUUID(selectedCategoryId) ? selectedCategoryId : null) ||
    EXTERNAL_EXAM_CATEGORY_ID;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 max-w-4xl mx-auto w-full min-h-0">
      {/* Minimal Top Action Strip (No metadata clutter) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/40">
        <h1 className="text-base sm:text-xl font-semibold tracking-tight text-foreground">
          {t("exams") || "Exam Center"}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {groupExamEnabled && (
            <button
              type="button"
              onClick={onOpenGroupChallenge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/70 text-xs font-medium text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>{t("groupChallenge") || "Group Challenge"}</span>
            </button>
          )}
          {hasExamHistory && (
            <button
              type="button"
              onClick={() => navigate("results")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-background/80 hover:bg-muted/70 text-xs font-medium text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("examHistory") || "History"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Switcher (shown only when Admin publishes multiple categories) */}
      {!loadingCategories && categories.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4">
          {categories.map((cat) => {
            const isSelected = cat.id === targetCategoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/50"
                )}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Centered Flag Language Selector Stage (Replaces old cards & metadata) */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10">
        {loadingCategories ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7 w-full max-w-2xl">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="aspect-[3/2] w-full rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-4 w-24 mx-auto rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-6">
            <p className="text-center text-xs sm:text-sm font-medium text-muted-foreground">
              {t("chooseLanguage") || "Select exam language"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7">
              {FLAG_TRACKS.map((track) => {
                const isStartingThis =
                  loadingExam && selectedExamLanguage === track.key;
                const imgFailed = !!failedFlags[track.key];

                return (
                  <motion.button
                    key={track.key}
                    type="button"
                    disabled={loadingExam}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => {
                      if (!loadingExam) {
                        onStartExam(targetCategoryId, track.key);
                      }
                    }}
                    className={cn(
                      "group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl p-2 transition-colors cursor-pointer",
                      "hover:bg-muted/40 dark:hover:bg-white/[0.04]",
                      loadingExam && !isStartingThis && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {/* Crisp Framed Flag */}
                    <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden border border-border/60 dark:border-white/10 shadow-sm bg-muted/30">
                      {!imgFailed ? (
                        <img
                          src={track.flagSrc}
                          alt={`${track.label} flag`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedFlags((prev) => ({
                              ...prev,
                              [track.key]: true,
                            }))
                          }
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-full h-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm",
                            track.fallbackBg
                          )}
                        >
                          {track.label}
                        </div>
                      )}

                      {isStartingThis && (
                        <div className="absolute inset-0 bg-background/75 dark:bg-zinc-950/75 backdrop-blur-xs flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </div>

                    {/* Clean Language Label + Start Affordance */}
                    <div className="flex items-center justify-between px-1 pt-2.5">
                      <span className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {track.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                        <span>{isStartingThis ? "..." : track.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quiet bottom hairline spacer */}
      <div className="pt-2 text-center text-[11px] text-muted-foreground/80 tabular-nums">
        {footerNote || activeCategory?.name || t("exams") || "Exam Center"}
      </div>
    </div>
  );
}
