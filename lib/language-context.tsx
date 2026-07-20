"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import en from "./translations/en";
import rw from "./translations/rw";
import fr from "./translations/fr";
import ar from "./translations/ar";

type Language = "English" | "Arabic" | "Kinyarwanda" | "French";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  English: en,
  Kinyarwanda: rw,
  French: fr,
  Arabic: ar,
};

const RTL_LANGUAGES: Language[] = ["Arabic"];

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

const VALID_LANGUAGES: Language[] = ["English", "Arabic", "Kinyarwanda", "French"];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("English");
  const [systemName, setSystemName] = useState<string>("Navo");
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const isAdminRoute = typeof pathname === "string" && pathname.startsWith("/Admin");

  const isRTL = RTL_LANGUAGES.includes(language);

  // Admin panel is English-only; other areas use the selected language
  const effectiveLanguage: Language = isAdminRoute ? "English" : language;
  const effectiveIsRTL = isAdminRoute ? false : isRTL;

  const applyLanguage = useCallback((lang: Language) => {
    const validLang = VALID_LANGUAGES.includes(lang) ? lang : "English";
    setLanguageState(validLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && VALID_LANGUAGES.includes(savedLanguage as Language)) {
      applyLanguage(savedLanguage as Language);
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
    document.documentElement.lang = effectiveLanguage === "English" ? "en" : effectiveLanguage === "Arabic" ? "ar" : effectiveLanguage === "French" ? "fr" : "rw";
  }, [effectiveLanguage, effectiveIsRTL]);

  const setLanguage = useCallback((lang: Language) => {
    if (isAdminRoute) return;
    const validLang = VALID_LANGUAGES.includes(lang) ? lang : "English";
    applyLanguage(validLang);
  }, [isAdminRoute, applyLanguage]);

  const t = useCallback((key: string): string => {
    if (key === "navo") {
      return mounted ? systemName : "Navo";
    }
    const langTranslations = translations[effectiveLanguage] || translations["English"];
    return langTranslations[key] || translations["English"][key] || key;
  }, [effectiveLanguage, mounted, systemName]);

  return (
    <LanguageContext.Provider value={{ language: effectiveLanguage, setLanguage, t, isRTL: effectiveIsRTL }}>
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
