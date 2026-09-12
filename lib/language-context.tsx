"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import en from "./translations/en";
import rw from "./translations/rw";
import fr from "./translations/fr";
import { createClient } from "./supabase/client";

type Language = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  availableLanguages: { value: string; label: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  English: en,
  Kinyarwanda: rw,
  French: fr,
};

const ALL_LANGUAGES = [
  { value: "English", label: "English", flag: "🇬🇧", configKey: "english" },
  { value: "French", label: "Français", flag: "🇫🇷", configKey: "french" },
  { value: "Kinyarwanda", label: "Kinyarwanda", flag: "🇷🇼", configKey: "kinyarwanda" },
];

// Get default system name from localStorage or fallback to "Navo"
const getDefaultSystemName = (): string => {
  if (typeof window === "undefined") return "Navo";
  const saved = localStorage.getItem("navo-branding-config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.systemName || "Navo";
    } catch {
      return "Navo";
    }
  }
  return "Navo";
};

const LANGUAGE_STORAGE_KEY = "navo-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("English");
  const [systemName, setSystemName] = useState<string>("Navo");
  const [mounted, setMounted] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState(ALL_LANGUAGES.map(l => ({ value: l.value, label: l.label, flag: l.flag })));

  const pathname = usePathname();
  const isAdminRoute = typeof pathname === "string" && pathname.startsWith("/Admin");

  // Admin panel is English-only; other areas use the selected language
  const effectiveLanguage: Language = isAdminRoute ? "English" : language;
  const effectiveIsRTL = false;

  const applyLanguage = useCallback((lang: Language) => {
    setLanguageState(lang || "English");
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang || "English");
    }
  }, []);

  // Fetch interface language toggles from system_config
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supabase = createClient();
    const configKeys = ALL_LANGUAGES.map((l) => `interface_language_${l.configKey}_enabled`);

    const fetchEnabled = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", configKeys);

      const disabledSet = new Set<string>();
      for (const row of data || []) {
        if (row.value === "false") {
          const match = row.key.match(/^interface_language_(.+)_enabled$/);
          if (match) disabledSet.add(match[1]);
        }
      }

      const enabled = ALL_LANGUAGES
        .filter((l) => !disabledSet.has(l.configKey))
        .map((l) => ({ value: l.value, label: l.label, flag: l.flag }));

      setAvailableLanguages(enabled.length > 0 ? enabled : ALL_LANGUAGES.map(l => ({ value: l.value, label: l.label, flag: l.flag })));

      // If current language is now disabled, fall back to English
      const currentLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (currentLang) {
        const currentConfigKey = ALL_LANGUAGES.find((l) => l.value === currentLang)?.configKey;
        if (currentConfigKey && disabledSet.has(currentConfigKey)) {
          applyLanguage("English");
        }
      }
    };

    fetchEnabled();
  }, [applyLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage) {
      applyLanguage(savedLanguage);
    } else {
      applyLanguage("English");
    }

    setSystemName(getDefaultSystemName());
    setMounted(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "navo-branding-config") {
        setSystemName(getDefaultSystemName());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyLanguage]);

  // Keep document attributes in sync with the effective language
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dir = effectiveIsRTL ? "rtl" : "ltr";
    document.documentElement.lang = effectiveLanguage === "English" ? "en" : effectiveLanguage === "French" ? "fr" : "rw";
  }, [effectiveLanguage, effectiveIsRTL]);

  const setLanguage = useCallback((lang: Language) => {
    if (isAdminRoute) return;
    applyLanguage(lang);
  }, [isAdminRoute, applyLanguage]);

  const t = useCallback((key: string): string => {
    if (key === "navo") {
      return mounted ? systemName : "Navo";
    }
    const langTranslations = translations[effectiveLanguage] || translations["English"];
    return langTranslations[key] || translations["English"][key] || key;
  }, [effectiveLanguage, mounted, systemName]);

  return (
    <LanguageContext.Provider value={{ language: effectiveLanguage, setLanguage, t, isRTL: effectiveIsRTL, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
