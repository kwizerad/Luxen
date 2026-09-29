"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";

type LanguageCode = "en" | "rw" | "fr";
type Language = "English" | "Kinyarwanda" | "French";

export function UserPreferencesLoader() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (!user) return;

    const loadUserPreferences = async () => {
      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser?.user_metadata) {
          const metadata = currentUser.user_metadata;

          // Load theme preference if valid and not locally overridden
          const localTheme = localStorage.getItem("navo-theme");
          if (!localTheme && (metadata.theme === "light" || metadata.theme === "dark")) {
            setTheme(metadata.theme);
          }

          // Load language preference
          const hasLocalLanguage = localStorage.getItem("navo-language") !== null;
          if (!hasLocalLanguage && metadata.language && metadata.language !== language) {
            // Convert language code to full name for context
            const languageMap: Record<LanguageCode, Language> = {
              en: "English",
              rw: "Kinyarwanda",
              fr: "French",
            };
            setLanguage(languageMap[metadata.language as LanguageCode] || "English");
          }

          // Load text size preference
          if (metadata.text_size) {
            const root = document.documentElement;
            root.dataset.textSize = metadata.text_size;
            switch (metadata.text_size) {
              case "sm":
                root.style.fontSize = "14px";
                break;
              case "md":
                root.style.fontSize = "16px";
                break;
              case "lg":
                root.style.fontSize = "18px";
                break;
            }
          }
        }
      } catch (error) {
        console.error("Failed to load user preferences:", error);
      }
    };

    loadUserPreferences();
  }, [user, theme, setTheme, language, setLanguage]);

  return null;
}