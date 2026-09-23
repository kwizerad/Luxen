"use client";

import { useRouter } from "next/navigation";
import { 
  Users, 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Trophy, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  Clock,
  Sparkles,
  Award,
  Radio,
  BookOpen,
  Scale,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ExamChoiceScreenProps {
  onNavigate: (choice: "individual" | "group") => void;
  groupExamEnabled?: boolean;
}

export function ExamChoiceScreen({ onNavigate, groupExamEnabled = true }: ExamChoiceScreenProps) {
  const { t, language } = useLanguage();
  const router = useRouter();

  const handleChoice = (choice: "individual" | "group") => {
    onNavigate(choice);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-start px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 sm:pb-36">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">
        
        {/* Navigation & Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/dashboard");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("backToDashboard") || t("back") || "Gusubira ku Rubuga"}</span>
            </button>

            <span className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase hidden sm:inline-block">
              exam · mode selection
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase">
              {t("examMode") || "uburyo bw'ikizamini"}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-100 text-balance">
              {t("examChoiceTitle") || "Hitamo Uburyo bwo Gukora Ikizamini"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-snug">
              {t("examChoiceSubtitle") || "Hitamo niba wifuza gukora ikizamini wenyine ku muvuduko wawe cyangwa guhatana mu gihe nyacyo n'inshuti zawe."}
            </p>
          </div>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          
          {/* Bento Tile 1: Individual Exam (Large 7-Col Anchor) */}
          <div
            onClick={() => handleChoice("individual")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleChoice("individual");
            }}
            className="md:col-span-7 flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 p-4 sm:p-6 transition-colors cursor-pointer group select-none shadow-none"
          >
            <div className="space-y-4">
              {/* Header with Lowercase Label and Green Accent Container */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
                    mode · solo practice
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                    {t("individualExam") || "Ikizamini cy'Umuntu ku Giti Cye"}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                    {t("soloMode") || "Gisanzwe (Solo)"}
                  </span>
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Denser Description */}
              <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                {t("individualExamDescription") || "Kora ikizamini cyuzuye ku muvuduko wawe, wimenyereze ibibazo byose, kandi ubone isuzuma ryimbitse n'ibisobanuro."}
              </p>

              {/* High-Density Highlights with 1px Crisp Dividers */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{t("selfPacedPractice") || "Umuvuduko wihariye & Igihe kigenwe"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{t("instantResultReview") || "Ibisobanuro birambuye by'amategeko"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{t("passMarkThreshold") || "Amanota yo gutsinda ni 60%"}</span>
                </div>
              </div>
            </div>

            {/* Green Accent CTA Button */}
            <div className="mt-5 pt-3 border-t border-zinc-800/60">
              <Button
                type="button"
                className="w-full h-10 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-none justify-between px-4 transition-colors"
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
              className="md:col-span-5 flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 p-4 sm:p-6 transition-colors cursor-pointer group select-none shadow-none"
            >
              <div className="space-y-4">
                {/* Header with Lowercase Label and Orange Accent Container */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
                      mode · multiplayer arena
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                      {t("groupExam") || "Ikizamini cy'Itsinda"}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>{t("multiplayerMode") || "Itsinda (Multiplayer)"}</span>
                    </span>
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Denser Description */}
                <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                  {t("groupExamDescription") || "Tegura ikizamini cyangwa winjire mu kizamini cy'abanyeshuri bagenzi bawe, muhatane mu gihe nyacyo, murebe urutonde rw'abatsinze."}
                </p>

                {/* High-Density Highlights with 1px Crisp Dividers */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{t("liveLeaderboard") || "Urutonde rw'Amanota (🥇🥈🥉 Leaderboard)"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{t("realTimeChallenge") || "Igihe gitangirira rimwe ku bitabiriye bose"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Users className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{t("requiresAtLeastTwo") || "Nibura abanyeshuri 2 ngo bibe itsinda"}</span>
                  </div>
                </div>
              </div>

              {/* Orange Accent CTA Button */}
              <div className="mt-5 pt-3 border-t border-zinc-800/60">
                <Button
                  type="button"
                  className="w-full h-10 rounded-lg text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-none justify-between px-4 transition-colors"
                >
                  <span>{t("startGroupExam") || "Tegura cyangwa Injira mu Tsinda"}</span>
                  <Trophy className="h-4 w-4 shrink-0 group-hover:scale-105 transition-transform" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="md:col-span-5 flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6 opacity-60">
              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
                  mode · currently disabled
                </span>
                <h3 className="text-base font-semibold text-zinc-300">Group Exam Mode</h3>
                <p className="text-xs text-zinc-400">Multiplayer challenges are currently offline for maintenance.</p>
              </div>
            </div>
          )}

          {/* Bento Sub-Tile 3: Passing Criteria (4-Col) */}
          <div className="md:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
                standards · passing threshold
              </span>
              <Scale className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-200">
                60% (12 / 20) Minimum Score
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Official Rwanda National Police theory benchmark. 20 timed questions randomly drawn from 12 distinct traffic modules.
              </p>
            </div>
          </div>

          {/* Bento Sub-Tile 4: Real-Time Protocol (4-Col) */}
          <div className="md:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
                telemetry · live battle sync
              </span>
              <Radio className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-200">
                Synchronized Clock & Anti-Cheat
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Questions are revealed simultaneously across participants with scrambled answer sequences and real-time tie-breakers.
              </p>
            </div>
          </div>

          {/* Bento Sub-Tile 5: Explanations & Review (4-Col) */}
          <div className="md:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
                assistance · law articles & audio
              </span>
              <BookOpen className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-200">
                Instant Explanations & Audio
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Detailed legal explanations and full audio voiceover are accessible for every question in Kinyarwanda, English, and French.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
