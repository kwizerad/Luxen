"use client";

import {
  FileText,
  Users,
  CheckCircle2,
  Trophy,
  Zap,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ExamChoiceScreenProps {
  onSelectChoice?: (choice: "individual" | "group") => void;
  onNavigate?: (choice: "individual" | "group") => void;
  onBack?: () => void;
  groupExamEnabled?: boolean;
}

export function ExamChoiceScreen({
  onSelectChoice,
  onNavigate,
  onBack,
  groupExamEnabled = true,
}: ExamChoiceScreenProps) {
  const { t } = useLanguage();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = "#home";
      window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
    }
  };

  const handleChoice = (choice: "individual" | "group") => {
    const handler = onSelectChoice || onNavigate;
    if (handler) {
      handler(choice);
    } else {
      if (choice === "individual") {
        window.location.hash = "#exam?mode=individual";
        window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
      } else {
        window.location.hash = "#services/live-exam";
        window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-2 sm:py-4 px-2 sm:px-4 space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:text-foreground/80 bg-card hover:bg-muted/80 dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900 border border-border dark:border-zinc-800 transition-colors shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("back") || t("backToDashboard") || "Back"}</span>
        </button>
      </div>

      {/* Header Block */}
      <div className="space-y-1 pb-2 border-b border-border/80 dark:border-zinc-800/80">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground dark:text-zinc-100">
          {t("examChoiceTitle") || "Hitamo Uburyo bwo Gukora Ikizamini"}
        </h1>
        <p className="text-xs text-muted-foreground dark:text-zinc-400 max-w-2xl leading-relaxed">
          {t("examChoiceSubtitle") || "Hitamo niba wifuza gukora ikizamini wenyine ku muvuduko wawe cyangwa guhatana mu gihe nyacyo n'inshuti zawe."}
        </p>
      </div>

      {/* Balanced 2-Column Exam Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Card 1: Individual Exam */}
        <div
          onClick={() => handleChoice("individual")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleChoice("individual");
          }}
          className="flex flex-col justify-between rounded-xl border border-border/90 dark:border-zinc-800 bg-card hover:bg-muted/30 dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900/90 p-4 sm:p-5 transition-all duration-200 cursor-pointer group select-none shadow-xs hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2.5">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-bold text-foreground dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t("individualExam") || "Ikizamini cy'Umuntu ku Giti Cye"}
                </h2>
                <span className="inline-block text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {t("soloMode") || "Gisanzwe"}
                </span>
              </div>

              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground dark:text-zinc-400 leading-relaxed">
              {t("individualExamDescription") || "Kora ikizamini cyuzuye ku muvuduko wawe, wimenyereze ibibazo byose, kandi ubone isuzuma ryimbitse n'ibisobanuro."}
            </p>

            <div className="pt-2.5 border-t border-border/80 dark:border-zinc-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{t("selfPacedPractice") || "Umuvuduko wihariye & Igihe kigenwe"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{t("instantResultReview") || "Ibisobanuro birambuye by'amategeko"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{t("passMarkThreshold") || "Amanota yo gutsinda ni 60% (12/20)"}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 dark:border-zinc-800/60">
            <Button
              type="button"
              className="w-full h-9 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs justify-between px-3.5 transition-colors"
            >
              <span>{t("startIndividualExam") || "Tangira Ikizamini Gisanzwe"}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Card 2: Group Exam */}
        {groupExamEnabled && (
          <div
            onClick={() => handleChoice("group")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleChoice("group");
            }}
            className="flex flex-col justify-between rounded-xl border border-border/90 dark:border-zinc-800 bg-card hover:bg-muted/30 dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900/90 p-4 sm:p-5 transition-all duration-200 cursor-pointer group select-none shadow-xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2.5">
                <div className="space-y-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-foreground dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {t("groupExam") || "Ikizamini cy'Itsinda"}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{t("multiplayerMode") || "Itsinda"}</span>
                  </span>
                </div>

                <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground dark:text-zinc-400 leading-relaxed">
                {t("groupExamDescription") || "Tegura ikizamini cyangwa winjire mu kizamini cy'abanyeshuri bagenzi bawe, muhatane mu gihe nyacyo, murebe urutonde rw'abatsinze."}
              </p>

              <div className="pt-2.5 border-t border-border/80 dark:border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                  <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{t("liveLeaderboard") || "Urutonde rw'Amanota"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                  <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{t("realTimeChallenge") || "Igihe gitangirira rimwe ku bitabiriye bose"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                  <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{t("requiresAtLeastTwo") || "Nibura abanyeshuri 2 ngo bibe itsinda"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 dark:border-zinc-800/60">
              <Button
                type="button"
                className="w-full h-9 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs justify-between px-3.5 transition-colors"
              >
                <span>{t("startGroupExam") || "Tegura cyangwa Injira mu Tsinda"}</span>
                <Trophy className="h-3.5 w-3.5 shrink-0 group-hover:scale-105 transition-transform" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
