"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("English");
  const [systemName, setSystemName] = useState<string>("Navo");
  const [mounted, setMounted] = useState(false);

  const isRTL = RTL_LANGUAGES.includes(language);

  const applyLanguage = useCallback((lang: Language) => {
    // Validate language before setting
    const validLang = ["English", "Arabic", "Kinyarwanda", "French"].includes(lang) ? lang : "English";
    setLanguageState(validLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
      // Apply RTL/LTR direction to the document
      document.documentElement.dir = RTL_LANGUAGES.includes(validLang) ? "rtl" : "ltr";
      document.documentElement.lang = validLang === "English" ? "en" : validLang === "Arabic" ? "ar" : validLang === "French" ? "fr" : "rw";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const validLanguages: Language[] = ["English", "Arabic", "Kinyarwanda", "French"];
    if (savedLanguage && validLanguages.includes(savedLanguage as Language)) {
      applyLanguage(savedLanguage as Language);
    } else {
      applyLanguage("English");
    }

    setSystemName(getDefaultSystemName());
    setMounted(true);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "navo-branding-config") {
        setSystemName(getDefaultSystemName());
      }
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue && validLanguages.includes(e.newValue as Language)) {
        applyLanguage(e.newValue as Language);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyLanguage]);

  const setLanguage = (lang: Language) => {
    const validLanguages: Language[] = ["English", "Arabic", "Kinyarwanda", "French"];
    const validLang = validLanguages.includes(lang) ? lang : "English";
    applyLanguage(validLang);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new StorageEvent("storage", { key: LANGUAGE_STORAGE_KEY, newValue: validLang }));
    }
  };

  const t = (key: string): string => {
    if (key === "navo") {
      return mounted ? systemName : "Navo";
    }
    // Fallback to English if language is not available
    const langTranslations = translations[language] || translations["English"];
    return langTranslations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
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
