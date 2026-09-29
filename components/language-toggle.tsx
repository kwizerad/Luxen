"use client";

import { useLanguage } from "@/lib/language-context";

const langShortLabels: Record<string, string> = {
  English: "EN",
  French: "FR",
  Kinyarwanda: "RW",
};

export function LanguageToggle() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      {availableLanguages.map((lang) => (
        <button
          key={lang.value}
          onClick={() => setLanguage(lang.value)}
          className={`px-2 py-1 rounded transition-colors ${
            language === lang.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {langShortLabels[lang.value] || lang.value.slice(0, 2).toUpperCase()}
        </button>
      ))}
    </div>
  );
}
