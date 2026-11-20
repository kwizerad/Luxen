"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";

export function UserPreferencesLoader() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setLanguage } = useLanguage();
  const loadedUserIdRef = useRef<string | null>(null);

  // Immediately restore saved text size on mount before auth/network resolves
  useEffect(() => {
    try {
      const root = document.documentElement;
      const savedTextSize = localStorage.getItem("navo-text-size");
      if (savedTextSize) {
        root.dataset.textSize = savedTextSize;
        if (savedTextSize === "sm") root.style.fontSize = "14px";
        else if (savedTextSize === "md") root.style.fontSize = "16px";
        else if (savedTextSize === "lg") root.style.fontSize = "18px";
      }
      const savedScale = localStorage.getItem("user_text_size");
      if (savedScale) {
        const parsed = parseFloat(savedScale);
        if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 1.5) {
          root.style.fontSize = `${parsed * 100}%`;
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.id) {
      loadedUserIdRef.current = null;
      return;
    }
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;

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

          // Only restore language from metadata if the user has not explicitly confirmed a language in this browser
          const hasExplicitLocal =
            localStorage.getItem("navo-language-user-confirmed") === "1" ||
            document.cookie.includes("navo_lang_user_set=1");

          if (
            !hasExplicitLocal &&
            metadata.language_user_selected === true &&
            (metadata.language === "en" ||
              metadata.language === "English" ||
              metadata.language === "fr" ||
              metadata.language === "French" ||
              metadata.language === "rw" ||
              metadata.language === "Kinyarwanda")
          ) {
            setLanguage(metadata.language);
          }

          // Load text size preference if not overridden by floating slider
          const hasLocalScale = localStorage.getItem("user_text_size") !== null;
          if (!hasLocalScale && metadata.text_size) {
            const root = document.documentElement;
            root.dataset.textSize = metadata.text_size;
            try {
              localStorage.setItem("navo-text-size", metadata.text_size);
            } catch {}
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
  }, [user?.id, theme, setTheme, setLanguage]);

  return null;
}