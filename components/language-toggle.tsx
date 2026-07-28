"use client";

import { useLanguage } from "@/lib/language-context";

const languages = [
  { value: "English", label: "EN" },
  { value: "French", label: "FR" },
  { value: "Kinyarwanda", label: "RW" },
] as const;

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      {languages.map((lang, index) => (
        <button
          key={lang.value}
          onClick={() => setLanguage(lang.value)}
          className={`px-2 py-1 rounded transition-colors ${
            language === lang.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
