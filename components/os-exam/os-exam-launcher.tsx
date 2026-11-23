"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  History,
  Lock,
  BookOpen,
  Home,
  UserCheck,
  Trophy,
  Clock,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/language-context";
import type { ExamCategory } from "@/lib/database.types";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import { pickDefaultExamCategory } from "@/lib/exam-settings";
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
  onOpenGroupChallenge: (categoryId?: string, examLanguage?: string) => void;
  navigate: (view: string, params?: Record<string, string>) => void;
  footerNote?: string;
}

const FLAG_TRACKS = [
  {
    key: "Kinyarwanda",
    label: "Kinyarwanda",
    actionText: "Hitamo",
    flagSrc: "/assets/aistudio/Flag_of_Rwanda_4b2b50d1.svg",
    fallbackBg: "from-sky-500 via-amber-400 to-emerald-600",
  },
  {
    key: "English",
    label: "English",
    actionText: "Select",
    flagSrc: "/assets/aistudio/Flag_of_the_United_Kingdom__3-5_.svg_d8e9d47e.webp",
    fallbackBg: "from-blue-800 via-red-600 to-blue-900",
  },
  {
    key: "French",
    label: "Français",
    actionText: "Choisir",
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
  selectedExamLanguage: _selectedExamLanguage,
  onStartExam,
  onOpenGroupChallenge,
  navigate,
  footerNote,
}: OSExamLauncherProps) {
  const { t, language } = useLanguage();
  const [failedFlags, setFailedFlags] = useState<Record<string, boolean>>({});
  const [selectedLanguageForMode, setSelectedLanguageForMode] = useState<string | null>(null);

  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";

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
              <span className="sm:hidden">nPhone</span>
              <span className="hidden sm:inline">{t("backToHome") || "Desktop"}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeCategory =
    categories.find((c) => c.id === selectedCategoryId) ||
    pickDefaultExamCategory(categories) ||
    categories[0];

  const targetCategoryId =
    (activeCategory && isUUID(activeCategory.id) ? activeCategory.id : null) ||
    (isUUID(selectedCategoryId) ? selectedCategoryId : null) ||
    EXTERNAL_EXAM_CATEGORY_ID;

  const chosenTrack = FLAG_TRACKS.find((f) => f.key === selectedLanguageForMode);
  const categoryQuestionsCount = activeCategory?.question_count ?? 20;
  const categoryDurationMinutes = activeCategory?.duration_minutes ?? 20;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 max-w-4xl mx-auto w-full min-h-0">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          {selectedLanguageForMode && (
            <button
              type="button"
              onClick={() => setSelectedLanguageForMode(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mr-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isRw ? "Guhindura ururimi" : isFr ? "Changer de langue" : "Languages"}
              </span>
            </button>
          )}
          <h1 className="text-base sm:text-xl font-semibold tracking-tight text-foreground">
            {t("exams") || "Exam Center"}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Main Content Area: Stage 1 (Select Language) vs Stage 2 (File-style Mode Chooser) */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8">
        {loadingCategories ? (
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-44" rounded="md" />
              <Skeleton className="h-3.5 w-72 max-w-full" rounded="md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-2">
                  <Skeleton className="aspect-[3/2] w-full" rounded="xl" />
                  <div className="flex items-center justify-between px-1 pt-2.5">
                    <Skeleton className="h-4 w-24" rounded="md" />
                    <Skeleton className="h-3.5 w-14" rounded="md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !selectedLanguageForMode ? (
          /* Stage 1: Select Exam Language */
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {t("chooseLanguage") || "Select exam language"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRw
                  ? "Banza uhitemo ururimi wifuza gukoramo ikizamini"
                  : isFr
                  ? "Choisissez d'abord la langue dans laquelle vous souhaitez passer l'examen"
                  : "Choose the language in which you want to take your exam"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7">
              {FLAG_TRACKS.map((track) => {
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
                        setSelectedLanguageForMode(track.key);
                      }
                    }}
                    className={cn(
                      "group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl p-2 transition-colors cursor-pointer",
                      "hover:bg-muted/40 dark:hover:bg-white/[0.04]"
                    )}
                  >
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
                    </div>

                    <div className="flex items-center justify-between px-1 pt-2.5">
                      <span className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {track.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                        <span>{track.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Stage 2: Tactile Exam File Chooser (Individual Solo File vs Group Room File) */
          <div className="w-full max-w-2xl space-y-6 animate-in fade-in duration-200">
            {/* Quiet Editorial Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/50 pb-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {activeCategory?.name || "Rwanda PVS Exam"} · {chosenTrack?.label || selectedLanguageForMode}
                </p>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                  {isRw
                    ? "Hitamo Dosiye y'Ikizamini"
                    : isFr
                    ? "Choisissez votre dossier d'examen"
                    : "Choose Your Exam File"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLanguageForMode(null)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isRw ? "Hindura ururimi" : isFr ? "Changer de langue" : "Change language"}</span>
              </button>
            </div>

            {/* File Tiles: Individual (.exam) vs Group (.room) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* File 1: Individual Solo Exam File */}
              <motion.button
                type="button"
                disabled={loadingExam}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  if (!loadingExam) {
                    onStartExam(targetCategoryId, selectedLanguageForMode);
                  }
                }}
                className={cn(
                  "group relative text-left flex flex-col justify-between p-5 pt-6 min-h-[245px]",
                  "rounded-2xl rounded-tr-[4px] [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,0_100%)]",
                  "bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08] border border-emerald-500/25 hover:border-emerald-500/55 hover:bg-emerald-500/[0.1] transition-colors shadow-sm cursor-pointer",
                  loadingExam && "opacity-60 cursor-not-allowed"
                )}
              >
                {/* Dog-ear folded corner */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 right-0 w-6 h-6 bg-emerald-500/20 dark:bg-emerald-400/20 border-b border-l border-emerald-500/35 rounded-bl-md"
                />

                <div className="space-y-4">
                  {/* File icon + extension tag */}
                  <div className="flex items-start justify-between gap-3 pr-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 pt-1">
                      SOLO.EXAM
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {isRw ? "Ikizamini Cyawe Wenyine" : isFr ? "Examen Individuel" : "Individual Exam"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isRw
                        ? `Kora ikizamini wenyine mu ${chosenTrack?.label || selectedLanguageForMode} urebe amanota n'ibisobanuro ako kanya.`
                        : isFr
                        ? `Passez l'épreuve individuellement en ${chosenTrack?.label || selectedLanguageForMode} avec correction détaillée.`
                        : `Practice on your own in ${chosenTrack?.label || selectedLanguageForMode} with full answer review afterward.`}
                    </p>
                  </div>
                </div>

                {/* File metadata footer */}
                <div className="mt-5 pt-3 border-t border-emerald-500/20 flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      {categoryQuestionsCount}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {categoryDurationMinutes}m
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                    <span>
                      {loadingExam
                        ? isRw
                          ? "Birategurwa..."
                          : isFr
                          ? "Préparation..."
                          : "Preparing..."
                        : isRw
                        ? "Fungura"
                        : isFr
                        ? "Ouvrir"
                        : "Open File"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.button>

              {/* File 2: Group Multiplayer Exam File */}
              <motion.button
                type="button"
                disabled={!groupExamEnabled || loadingExam}
                whileHover={groupExamEnabled ? { y: -3 } : undefined}
                whileTap={groupExamEnabled ? { scale: 0.99 } : undefined}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  if (groupExamEnabled && !loadingExam) {
                    onOpenGroupChallenge(targetCategoryId, selectedLanguageForMode);
                  }
                }}
                className={cn(
                  "group relative text-left flex flex-col justify-between p-5 pt-6 min-h-[245px]",
                  "rounded-2xl rounded-tr-[4px] [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,0_100%)] transition-colors shadow-sm",
                  groupExamEnabled
                    ? "bg-sky-500/[0.06] dark:bg-sky-500/[0.08] border border-sky-500/25 hover:border-sky-500/55 hover:bg-sky-500/[0.1] cursor-pointer"
                    : "bg-muted/30 border border-border/50 opacity-65 cursor-not-allowed"
                )}
              >
                {/* Dog-ear folded corner */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute top-0 right-0 w-6 h-6 border-b border-l rounded-bl-md",
                    groupExamEnabled
                      ? "bg-sky-500/20 dark:bg-sky-400/20 border-sky-500/35"
                      : "bg-muted border-border/50"
                  )}
                />

                <div className="space-y-4">
                  {/* File icon + extension tag */}
                  <div className="flex items-start justify-between gap-3 pr-4">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                        groupExamEnabled
                          ? "bg-sky-600 dark:bg-sky-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-mono pt-1",
                        groupExamEnabled
                          ? "text-sky-700 dark:text-sky-300"
                          : "text-muted-foreground"
                      )}
                    >
                      GROUP.ROOM
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3
                      className={cn(
                        "text-base font-semibold text-foreground transition-colors",
                        groupExamEnabled && "group-hover:text-sky-700 dark:group-hover:text-sky-300"
                      )}
                    >
                      {isRw ? "Ikizamini cy'Itsinda" : isFr ? "Examen en Groupe" : "Group Exam"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isRw
                        ? `Tumira inshuti mukorere hamwe mu ${chosenTrack?.label || selectedLanguageForMode} ku gihe kimwe n'urutonde rw'amanota.`
                        : isFr
                        ? `Invitez vos amis en ${chosenTrack?.label || selectedLanguageForMode} avec chronomètre partagé et classement.`
                        : `Invite friends to compete side-by-side in ${chosenTrack?.label || selectedLanguageForMode} with a shared timer and live rankings.`}
                    </p>
                  </div>
                </div>

                {/* File metadata footer */}
                <div
                  className={cn(
                    "mt-5 pt-3 border-t flex items-center justify-between gap-2 text-xs",
                    groupExamEnabled ? "border-sky-500/20" : "border-border/50"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground tabular-nums">
                    <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {isRw ? "Urutonde rw'itsinda" : isFr ? "Classement en direct" : "Live leaderboard"}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      groupExamEnabled
                        ? "text-sky-700 dark:text-sky-300"
                        : "text-muted-foreground"
                    )}
                  >
                    <span>
                      {groupExamEnabled
                        ? isRw
                          ? "Fungura"
                          : isFr
                          ? "Ouvrir"
                          : "Open File"
                        : isRw
                        ? "Byahagaritswe"
                        : isFr
                        ? "Suspendu"
                        : "Paused"}
                    </span>
                    {groupExamEnabled && (
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </span>
                </div>
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Quiet bottom hairline footer */}
      <div className="pt-2 text-center text-[11px] text-muted-foreground/80 tabular-nums">
        {footerNote || activeCategory?.name || t("exams") || "Exam Center"}
      </div>
    </div>
  );
}
