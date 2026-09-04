"use client";

import { useRouter } from "next/navigation";
import { Users, FileText, ArrowLeft, ArrowRight, Trophy, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";

interface ExamChoiceScreenProps {
  onNavigate: (choice: "individual" | "group") => void;
  groupExamEnabled?: boolean;
}

export function ExamChoiceScreen({ onNavigate, groupExamEnabled = true }: ExamChoiceScreenProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const handleChoice = (choice: "individual" | "group") => {
    onNavigate(choice);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Navigation & Header */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/40 transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("backToDashboard") || t("back") || "Gusubira ku Rubuga"}</span>
          </button>

          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <FileText className="w-3.5 h-3.5" />
              <span>{t("examMode") || "Hitamo Uburyo bw'Ikizamini"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {t("examChoiceTitle") || "Hitamo Uburyo bwo Gukora Ikizamini"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {t("examChoiceSubtitle") || "Hitamo niba wifuza gukora ikizamini wenyine ku muvuduko wawe cyangwa guhatana mu gihe nyacyo n'inshuti zawe."}
            </p>
          </div>
        </div>

        {/* Mode Cards Grid */}
        <div className={`grid gap-4 sm:gap-6 ${groupExamEnabled ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-md mx-auto"}`}>
          
          {/* Card 1: Individual Exam */}
          <div
            onClick={() => handleChoice("individual")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleChoice("individual");
            }}
            className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border-2 border-border/80 bg-gradient-to-b from-card to-card/60 p-5 sm:p-7 shadow-sm transition-all duration-200 hover:border-emerald-500/60 hover:shadow-md active:scale-[0.99] cursor-pointer"
          >
            <div>
              {/* Header inside Card */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shadow-xs">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold px-2.5 py-0.5">
                  {t("soloMode") || "Gisanzwe (Solo)"}
                </Badge>
              </div>

              {/* Title & Description */}
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t("individualExam") || "Ikizamini cy'Umuntu ku Giti Cye"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-5 leading-relaxed">
                {t("individualExamDescription") || "Kora ikizamini cyuzuye ku muvuduko wawe, wimenyereze ibibazo byose, kandi ubone isuzuma ryimbitse n'ibisobanuro."}
              </p>

              {/* Highlights */}
              <div className="space-y-2.5 pt-2 border-t border-border/40 mb-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{t("selfPacedPractice") || "Umuvuduko wihariye & Igihe kigenwe"}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{t("instantResultReview") || "Ibisobanuro birambuye by'amategeko"}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{t("passMarkThreshold") || "Amanota yo gutsinda ni 60%"}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 group-hover:gap-3 transition-all"
            >
              <span>{t("startIndividualExam") || "Tangira Ikizamini Gisanzwe"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
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
              className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border-2 border-border/80 bg-gradient-to-b from-card to-card/60 p-5 sm:p-7 shadow-sm transition-all duration-200 hover:border-amber-500/60 hover:shadow-md active:scale-[0.99] cursor-pointer"
            >
              <div>
                {/* Header inside Card */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition-colors shadow-xs">
                    <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{t("multiplayerMode") || "Itsinda (Multiplayer)"}</span>
                  </Badge>
                </div>

                {/* Title & Description */}
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {t("groupExam") || "Ikizamini cy'Itsinda"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-5 leading-relaxed">
                  {t("groupExamDescription") || "Tegura ikizamini cyangwa winjire mu kizamini cy'abanyeshuri bagenzi bawe, muhatane mu gihe nyacyo, murebe urutonde rw'abatsinze."}
                </p>

                {/* Highlights */}
                <div className="space-y-2.5 pt-2 border-t border-border/40 mb-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground/90">
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{t("liveLeaderboard") || "Urutonde rw'Amanota (🥇🥈🥉 Leaderboard)"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/90">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{t("realTimeChallenge") || "Igihe gitangirira rimwe ku bitabiriye bose"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/90">
                    <Users className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{t("requiresAtLeastTwo") || "Nibura abanyeshuri 2 ngo bibe itsinda"}</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-2 group-hover:gap-3 transition-all"
              >
                <span>{t("startGroupExam") || "Tegura cyangwa Injira mu Tsinda"}</span>
                <Trophy className="h-4 w-4" />
              </Button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

