"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  CheckCircle2,
  Trophy,
  Zap,
  ArrowRight,
  ShieldCheck,
  Scale,
  Radio,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ExamChoiceScreenProps {
  onSelectChoice?: (choice: "individual" | "group") => void;
  onNavigate?: (choice: "individual" | "group") => void;
  groupExamEnabled?: boolean;
}

export function ExamChoiceScreen({
  onSelectChoice,
  onNavigate,
  groupExamEnabled = true,
}: ExamChoiceScreenProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleChoice = (choice: "individual" | "group") => {
    const handler = onSelectChoice || onNavigate;
    if (handler) {
      handler(choice);
    } else {
      if (choice === "individual") {
        router.push("/dashboard/exam?mode=individual");
      } else {
        router.push("/dashboard/services/live-exam");
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-6 px-1 sm:px-4 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* High-Information Architecture Bento Container */}
      <div className="space-y-4 sm:space-y-5">
        
        {/* Header Block with System Status */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border/80 dark:border-zinc-800/80">
          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-muted-foreground dark:text-zinc-400 lowercase">
              {t("examMode") || "uburyo bw'ikizamini"}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground dark:text-zinc-100 text-balance">
              {t("examChoiceTitle") || "Hitamo Uburyo bwo Gukora Ikizamini"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 max-w-3xl leading-snug">
              {t("examChoiceSubtitle") || "Hitamo niba wifuza gukora ikizamini wenyine ku muvuduko wawe cyangwa guhatana mu gihe nyacyo n'inshuti zawe."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>RNP Syllabus Active</span>
          </div>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4">
          
          {/* Bento Tile 1: Individual Exam (Large 7-Col Anchor) */}
          <div
            onClick={() => handleChoice("individual")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleChoice("individual");
            }}
            className="md:col-span-7 flex flex-col justify-between rounded-2xl border border-border/90 dark:border-zinc-800 bg-card hover:bg-muted/30 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 p-5 sm:p-6 transition-all duration-200 cursor-pointer group select-none shadow-xs hover:shadow-md"
          >
            <div className="space-y-4">
              {/* Header with Lowercase Label and Green Accent Container */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase">
                    mode · solo practice
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {t("individualExam") || "Ikizamini cy'Umuntu ku Giti Cye"}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    {t("soloMode") || "Gisanzwe (Solo)"}
                  </span>
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Denser Description */}
              <p className="text-xs sm:text-[13px] text-muted-foreground dark:text-zinc-400 leading-relaxed">
                {t("individualExamDescription") || "Kora ikizamini cyuzuye ku muvuduko wawe, wimenyereze ibibazo byose, kandi ubone isuzuma ryimbitse n'ibisobanuro."}
              </p>

              {/* High-Density Highlights with 1px Crisp Dividers */}
              <div className="pt-3 border-t border-border/80 dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{t("selfPacedPractice") || "Umuvuduko wihariye & Igihe kigenwe"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{t("instantResultReview") || "Ibisobanuro birambuye by'amategeko"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{t("passMarkThreshold") || "Amanota yo gutsinda ni 60%"}</span>
                </div>
              </div>
            </div>

            {/* Green Accent CTA Button */}
            <div className="mt-5 pt-3 border-t border-border/60 dark:border-zinc-800/60">
              <Button
                type="button"
                className="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs justify-between px-4 transition-colors"
              >
                <span>{t("startIndividualExam") || "Tangira Ikizamini Gisanzwe"}</span>
                <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Bento Tile 2: Group Exam (5-Col Companion) */}
          {groupExamEnabled ? (
            <div
              onClick={() => handleChoice("group")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleChoice("group");
              }}
              className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-border/90 dark:border-zinc-800 bg-card hover:bg-muted/30 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 p-5 sm:p-6 transition-all duration-200 cursor-pointer group select-none shadow-xs hover:shadow-md"
            >
              <div className="space-y-4">
                {/* Header with Lowercase Label and Orange Accent Container */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase">
                      mode · multiplayer arena
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t("groupExam") || "Ikizamini cy'Itsinda"}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{t("multiplayerMode") || "Itsinda (Multiplayer)"}</span>
                    </span>
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Denser Description */}
                <p className="text-xs sm:text-[13px] text-muted-foreground dark:text-zinc-400 leading-relaxed">
                  {t("groupExamDescription") || "Tegura ikizamini cyangwa winjire mu kizamini cy'abanyeshuri bagenzi bawe, muhatane mu gihe nyacyo, murebe urutonde rw'abatsinze."}
                </p>

                {/* High-Density Highlights with 1px Crisp Dividers */}
                <div className="pt-3 border-t border-border/80 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                    <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">{t("liveLeaderboard") || "Urutonde rw'Amanota (🥇🥈🥉 Leaderboard)"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                    <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">{t("realTimeChallenge") || "Igihe gitangirira rimwe ku bitabiriye bose"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/80 dark:text-zinc-300">
                    <Users className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">{t("requiresAtLeastTwo") || "Nibura abanyeshuri 2 ngo bibe itsinda"}</span>
                  </div>
                </div>
              </div>

              {/* Orange Accent CTA Button */}
              <div className="mt-5 pt-3 border-t border-border/60 dark:border-zinc-800/60">
                <Button
                  type="button"
                  className="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs justify-between px-4 transition-colors"
                >
                  <span>{t("startGroupExam") || "Tegura cyangwa Injira mu Tsinda"}</span>
                  <Trophy className="h-4 w-4 shrink-0 group-hover:scale-105 transition-transform" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-border/80 dark:border-zinc-800 bg-muted/40 dark:bg-zinc-900/30 p-5 sm:p-6 opacity-70">
              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase">
                  mode · currently disabled
                </span>
                <h3 className="text-base font-semibold text-foreground dark:text-zinc-300">Group Exam Mode</h3>
                <p className="text-xs text-muted-foreground dark:text-zinc-400">Multiplayer challenges are currently offline for maintenance.</p>
              </div>
            </div>
          )}

          {/* Bento Sub-Tile 3: Passing Criteria (4-Col) */}
          <div className="md:col-span-4 rounded-2xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/40 p-4 sm:p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase">
                standards · passing threshold
              </span>
              <Scale className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-semibold text-foreground dark:text-zinc-200">
                60% (12 / 20) Minimum Score
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground dark:text-zinc-400 leading-snug">
                Official Rwanda National Police theory benchmark. 20 timed questions randomly drawn from 12 distinct traffic modules.
              </p>
            </div>
          </div>

          {/* Bento Sub-Tile 4: Real-Time Protocol (4-Col) */}
          <div className="md:col-span-4 rounded-2xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/40 p-4 sm:p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase">
                telemetry · live battle sync
              </span>
              <Radio className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-semibold text-foreground dark:text-zinc-200">
                Synchronized Clock &amp; Anti-Cheat
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground dark:text-zinc-400 leading-snug">
                Questions are revealed simultaneously across participants with scrambled answer sequences and real-time tie-breakers.
              </p>
            </div>
          </div>

          {/* Bento Sub-Tile 5: Explanations & Review (4-Col) */}
          <div className="md:col-span-4 rounded-2xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/40 p-4 sm:p-5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase">
                assistance · law articles &amp; audio
              </span>
              <BookOpen className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-semibold text-foreground dark:text-zinc-200">
                Instant Explanations &amp; Audio
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground dark:text-zinc-400 leading-snug">
                Detailed legal explanations and full audio voiceover are accessible for every question in Kinyarwanda, English, and French.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
