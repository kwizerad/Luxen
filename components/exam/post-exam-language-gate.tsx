"use client";

import { CheckCircle2, Globe, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExamLangOption = "Kinyarwanda" | "English" | "French";

export function normalizeExamLanguage(lang?: string | null): ExamLangOption {
  const l = String(lang || "").trim().toLowerCase();
  if (l === "en" || l === "english") return "English";
  if (l === "fr" || l === "french" || l === "français" || l === "francais") return "French";
  return "Kinyarwanda";
}

interface PostExamLanguageGateProps {
  currentLanguage: string;
  translatingLanguage: string | null;
  onContinueCurrent: () => void;
  onSelectLanguage: (targetLanguage: ExamLangOption) => void;
}

const LANGUAGE_META: Record<
  ExamLangOption,
  { value: ExamLangOption; nativeLabel: string; flag: string }
> = {
  Kinyarwanda: {
    value: "Kinyarwanda",
    nativeLabel: "Ikinyarwanda",
    flag: "🇷🇼",
  },
  English: {
    value: "English",
    nativeLabel: "English",
    flag: "🇬🇧",
  },
  French: {
    value: "French",
    nativeLabel: "Français",
    flag: "🇫🇷",
  },
};

export function PostExamLanguageGate({
  currentLanguage,
  translatingLanguage,
  onContinueCurrent,
  onSelectLanguage,
}: PostExamLanguageGateProps) {
  const normalized = normalizeExamLanguage(currentLanguage);
  const currentMeta = LANGUAGE_META[normalized];
  const otherLanguages = (["Kinyarwanda", "English", "French"] as ExamLangOption[]).filter(
    (l) => l !== normalized
  );

  const copy =
    normalized === "Kinyarwanda"
      ? {
          badge: "Ikizamini Cyarangiye",
          title: "Urifuza gukomeza mu Kinyarwanda cyangwa guhindura ururimi?",
          subtitle:
            "Mbere y'uko ubona amanota n'ibisubizo by'ukuri, hitamo ururimi ushaka gusuzumiramo ibisubizo byawe.",
          continueBtn: `Komeza mu ${currentMeta.nativeLabel}`,
          orSwitchLabel: "Cyangwa uhindure ujye muri:",
          switchPrefix: "Hindura ujye muri",
          translatingText: "Birimo guhindurwa...",
        }
      : normalized === "French"
      ? {
          badge: "Examen Terminé",
          title: "Souhaitez-vous continuer en Français ou changer de langue ?",
          subtitle:
            "Avant d'afficher votre score et de révéler les réponses, choisissez la langue de correction.",
          continueBtn: `Continuer en ${currentMeta.nativeLabel}`,
          orSwitchLabel: "Ou passer à une autre langue :",
          switchPrefix: "Passer en",
          translatingText: "Traduction en cours...",
        }
      : {
          badge: "Exam Completed",
          title: "Continue in English or change language?",
          subtitle:
            "Before revealing your score and answers, choose whether to continue in your exam language or switch to another language.",
          continueBtn: `Continue in ${currentMeta.nativeLabel}`,
          orSwitchLabel: "Or change to:",
          switchPrefix: "Change to",
          translatingText: "Translating review...",
        };

  const isBusy = translatingLanguage !== null;
  const isTranslatingCurrent = translatingLanguage === normalized;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[65vh] p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-card/95 dark:bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-sm text-center"
      >
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Globe className="w-3.5 h-3.5" />
            <span>{copy.badge}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
            {copy.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        {/* Primary choice: continue in current exam language */}
        <Button
          type="button"
          size="lg"
          disabled={isBusy}
          onClick={onContinueCurrent}
          className="w-full rounded-xl h-12 text-sm font-bold gap-2.5 cursor-pointer shadow-xs"
        >
          {isTranslatingCurrent ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{copy.translatingText}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="text-base">
                {currentMeta.flag}
              </span>
              <span>{copy.continueBtn}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </>
          )}
        </Button>

        {/* Secondary choices: switch to another language */}
        <div className="space-y-3 pt-1 border-t border-border/60">
          <p className="text-xs font-medium text-muted-foreground pt-2">
            {copy.orSwitchLabel}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {otherLanguages.map((langKey) => {
              const meta = LANGUAGE_META[langKey];
              const isTranslatingThis = translatingLanguage === langKey;
              return (
                <Button
                  key={langKey}
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => onSelectLanguage(langKey)}
                  className={cn(
                    "h-11 rounded-xl px-3.5 text-xs sm:text-sm font-semibold gap-2 cursor-pointer transition-all",
                    isTranslatingThis && "border-primary text-primary bg-primary/5"
                  )}
                >
                  {isTranslatingThis ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span className="truncate">{copy.translatingText}</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="text-base shrink-0">
                        {meta.flag}
                      </span>
                      <span className="truncate">
                        {copy.switchPrefix} {meta.nativeLabel}
                      </span>
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
