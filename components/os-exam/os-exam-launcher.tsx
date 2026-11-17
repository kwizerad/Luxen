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
  FileText,
  Trophy,
  CheckCircle2,
  Zap,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    categories.find((c) => isUUID(c.id)) ||
    categories[0];

  const targetCategoryId =
    (activeCategory && isUUID(activeCategory.id) ? activeCategory.id : null) ||
    (isUUID(selectedCategoryId) ? selectedCategoryId : null) ||
    EXTERNAL_EXAM_CATEGORY_ID;

  const chosenTrack = FLAG_TRACKS.find((f) => f.key === selectedLanguageForMode);

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

      {/* Main Content Area: Stage 1 (Select Language) vs Stage 2 (Choose Individual vs Group Exam) */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8">
        {loadingCategories ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7 w-full max-w-2xl">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="aspect-[3/2] w-full rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-4 w-24 mx-auto rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
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
                    </div>

                    {/* Language Label + Select Action */}
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
          /* Stage 2: Individual Exam vs Group Exam in Selected Language */
          <div className="w-full max-w-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Active Language Chip Banner */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {isRw ? "Ururimi rwahiswemo:" : isFr ? "Langue sélectionnée :" : "Exam Language:"}
                </span>
                <Badge variant="default" className="text-xs font-semibold shrink-0">
                  {chosenTrack?.label || selectedLanguageForMode}
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLanguageForMode(null)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                {isRw ? "Guhindura" : isFr ? "Changer" : "Change"}
              </Button>
            </div>

            {/* Title / Guidance */}
            <div className="text-center space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isRw
                  ? "Hitamo Uburyo bw'Ikizamini"
                  : isFr
                  ? "Choisissez le Mode d'Examen"
                  : "Choose Your Exam Mode"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isRw
                  ? "Hitamo gukora wenyine cyangwa guhatana mu itsinda n'abandi banyeshuri muri uru rurimi."
                  : isFr
                  ? "Choisissez entre une session individuelle ou un défi multijoueur dans cette langue."
                  : `Select individual solo practice or compete in a multiplayer group exam in ${selectedLanguageForMode}.`}
              </p>
            </div>

            {/* Individual vs Group Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Individual Exam */}
              <div
                onClick={() => {
                  if (!loadingExam) {
                    onStartExam(targetCategoryId, selectedLanguageForMode);
                  }
                }}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 p-5 transition-all duration-200 cursor-pointer group shadow-sm",
                  loadingExam && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {isRw ? "Ikizamini Cyawe Wenyine" : isFr ? "Examen Individuel" : "Individual Exam"}
                      </h3>
                      <span className="inline-block text-[11px] font-semibold text-primary">
                        {isRw ? "Kora Wenyine (Solo)" : isFr ? "Mode Solo" : "Solo Practice"}
                      </span>
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRw
                      ? `Kora ikizamini cy'imyitozo mu ${chosenTrack?.label || selectedLanguageForMode} ku muvuduko wawe ufite ibibazo 20 n'iminota 20.`
                      : isFr
                      ? `Passez un examen d'entraînement officiel en ${chosenTrack?.label || selectedLanguageForMode} à votre propre rythme.`
                      : `Take an official 20-question practice mock exam in ${selectedLanguageForMode} with instant result review.`}
                  </p>

                  <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs text-foreground/85">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{isRw ? "Ibibazo 20 mu minota 20" : isFr ? "20 questions en 20 min" : "20 questions in 20 minutes"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{isRw ? "Ibisobanuro birambuye" : isFr ? "Explications détaillées" : "Detailed explanation review"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    disabled={loadingExam}
                    className="w-full h-9 rounded-xl text-xs font-semibold justify-between px-3.5 cursor-pointer"
                  >
                    <span>
                      {loadingExam
                        ? isRw
                          ? "Birategurwa..."
                          : "Preparing..."
                        : isRw
                        ? "Tangira Ikizamini"
                        : isFr
                        ? "Commencer en Solo"
                        : "Start Individual Exam"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* Option 2: Group Exam */}
              <div
                onClick={() => {
                  if (groupExamEnabled && !loadingExam) {
                    onOpenGroupChallenge(targetCategoryId, selectedLanguageForMode);
                  }
                }}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 shadow-sm",
                  groupExamEnabled
                    ? "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer group"
                    : "border-border/40 bg-muted/20 opacity-70 cursor-not-allowed"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {isRw ? "Ikizamini cy'Itsinda" : isFr ? "Examen en Groupe" : "Group Exam"}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>{isRw ? "Itsinda (Multiplayer)" : isFr ? "Multijoueur" : "Multiplayer"}</span>
                      </span>
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isRw
                      ? `Tumira abanyeshuri mukorere hamwe ikizamini mu ${chosenTrack?.label || selectedLanguageForMode} mu gihe kimwe n'amanota ako kanya.`
                      : isFr
                      ? `Défiez vos camarades en direct en ${chosenTrack?.label || selectedLanguageForMode} avec un classement synchronisé.`
                      : `Compete live with classmates in ${selectedLanguageForMode} with a synchronized timer and leaderboard.`}
                  </p>

                  <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs text-foreground/85">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{isRw ? "Igihe cy'itsinda gikomatanyije" : isFr ? "Chrono synchronisé en direct" : "Synchronized live countdown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{isRw ? `Kizakorwa mu ${chosenTrack?.label || selectedLanguageForMode}` : isFr ? `Session en ${chosenTrack?.label || selectedLanguageForMode}` : `Taken in ${selectedLanguageForMode}`}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant={groupExamEnabled ? "outline" : "ghost"}
                    disabled={!groupExamEnabled || loadingExam}
                    className={cn(
                      "w-full h-9 rounded-xl text-xs font-semibold justify-between px-3.5",
                      groupExamEnabled && "group-hover:bg-primary group-hover:text-primary-foreground border-primary/40 cursor-pointer"
                    )}
                  >
                    <span>
                      {groupExamEnabled
                        ? isRw
                          ? "Kora mu Itsinda"
                          : isFr
                          ? "Lancer en Groupe"
                          : "Start Group Exam"
                        : isRw
                        ? "Itsinda ryahagaritswe"
                        : "Group paused"}
                    </span>
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500 group-hover:text-current transition-transform" />
                  </Button>
                </div>
              </div>
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
