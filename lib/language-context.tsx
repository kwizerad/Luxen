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
  en: en,
  Kinyarwanda: rw,
  rw: rw,
  French: fr,
  fr: fr,
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
      if (parsed.systemName) {
        return parsed.systemName;
      }
      return "Navo";
    } catch {
      return "Navo";
    }
  }
  return "Navo";
};

const LANGUAGE_STORAGE_KEY = "navo-language";
const LANGUAGE_CODE_STORAGE_KEY = "navo-language-code";
const LEGACY_LANG_CACHE_KEY = "luxen_lang";
const EXPLICIT_LANG_FLAG_KEY = "navo-language-user-set";
const LANGUAGE_COOKIE_NAME = "navo_lang";

function languageToCode(lang: string): "rw" | "en" | "fr" {
  const raw = String(lang || "").trim().toLowerCase();
  if (raw === "en" || raw === "english") return "en";
  if (raw === "fr" || raw === "french" || raw === "français") return "fr";
  return "rw";
}

function readLangCookie(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("Kinyarwanda");
  const [systemName, setSystemName] = useState<string>("Navo");
  const [mounted, setMounted] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState(ALL_LANGUAGES.map(l => ({ value: l.value, label: l.label, flag: l.flag })));

  const pathname = usePathname();
  const isAdminRoute = typeof pathname === "string" && pathname.toLowerCase().startsWith("/admin");

  // Admin panel is English-only; other areas use the selected language
  const effectiveLanguage: Language = isAdminRoute ? "English" : language;
  const effectiveIsRTL = false;

  const normalizeLanguage = useCallback((lang?: string | null): Language => {
    const raw = String(lang || "").trim().toLowerCase();
    if (raw === "en" || raw === "english") return "English";
    if (raw === "fr" || raw === "french" || raw === "français") return "French";
    return "Kinyarwanda";
  }, []);

  const readCachedUserLanguage = useCallback((): Language => {
    if (typeof window === "undefined") return "Kinyarwanda";
    try {
      const primary = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (primary && primary.trim()) {
        return normalizeLanguage(primary);
      }
      // Restore from secondary caches only if the user explicitly chose a non-Kinyarwanda language
      const fallbackRaw =
        localStorage.getItem(LANGUAGE_CODE_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_LANG_CACHE_KEY) ||
        readLangCookie();
      if (fallbackRaw && fallbackRaw.trim()) {
        const normalized = normalizeLanguage(fallbackRaw);
        if (normalized !== "Kinyarwanda") {
          return normalized;
        }
      }
    } catch {}
    return "Kinyarwanda";
  }, [normalizeLanguage]);

  const applyLanguage = useCallback((lang?: string | null, markExplicit = false) => {
    const normalized = normalizeLanguage(lang);
    setLanguageState(normalized);
    if (typeof window !== "undefined") {
      const code = languageToCode(normalized);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
        localStorage.setItem(LANGUAGE_CODE_STORAGE_KEY, code);
        localStorage.setItem(LEGACY_LANG_CACHE_KEY, code);
        if (markExplicit || normalized !== "Kinyarwanda") {
          localStorage.setItem(EXPLICIT_LANG_FLAG_KEY, "true");
        }
      } catch {}
      try {
        document.cookie = `${LANGUAGE_COOKIE_NAME}=${code}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
    }
  }, [normalizeLanguage]);

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

      // Only switch if current language was explicitly disabled by Admin, preferring Kinyarwanda first
      const currentLang = readCachedUserLanguage();
      const currentConfigKey = ALL_LANGUAGES.find((l) => l.value === currentLang)?.configKey;
      if (currentConfigKey && disabledSet.has(currentConfigKey)) {
        const fallback =
          !disabledSet.has("kinyarwanda")
            ? "Kinyarwanda"
            : enabled[0]?.value || "Kinyarwanda";
        applyLanguage(fallback, false);
      }
    };

    fetchEnabled();
  }, [applyLanguage, readCachedUserLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolved = readCachedUserLanguage();
    applyLanguage(resolved, resolved !== "Kinyarwanda");

    setSystemName(getDefaultSystemName());
    setMounted(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "navo-branding-config") {
        setSystemName(getDefaultSystemName());
      } else if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const synced = normalizeLanguage(e.newValue);
        setLanguageState(synced);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyLanguage, normalizeLanguage, readCachedUserLanguage]);

  // Keep document attributes in sync with the effective language
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dir = effectiveIsRTL ? "rtl" : "ltr";
    document.documentElement.lang = effectiveLanguage === "English" ? "en" : effectiveLanguage === "French" ? "fr" : "rw";
  }, [effectiveLanguage, effectiveIsRTL]);

  const setLanguage = useCallback((lang: Language) => {
    if (isAdminRoute) return;
    applyLanguage(lang, true);
  }, [isAdminRoute, applyLanguage]);

  const t = useCallback((key: string): string => {
    if (key === "navo") {
      return mounted ? systemName : "Navo";
    }
    const langTranslations = translations[effectiveLanguage] || translations["Kinyarwanda"];
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
