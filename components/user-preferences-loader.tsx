"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";

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
          
          // Load theme preference
          if (metadata.theme && metadata.theme !== theme) {
            setTheme(metadata.theme);
          }
          
          // Load language preference
          if (metadata.language && metadata.language !== language) {
            setLanguage(metadata.language);
          }
          
          // Load text size preference
          if (metadata.text_size) {
            const root = document.documentElement;
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