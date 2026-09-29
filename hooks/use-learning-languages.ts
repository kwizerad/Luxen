"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ALL_LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof ALL_LEARNING_LANGUAGES)[number];

const LANG_KEY_MAP: Record<string, string> = {
  English: "english",
  French: "french",
  Kinyarwanda: "kinyarwanda",
};

/**
 * Hook that reads the `learning_language_<lang>_enabled` system_config keys
 * and returns the list of languages the admin has enabled for student use.
 *
 * Falls back to all languages enabled if no config rows exist.
 * Subscribes to realtime changes so toggles take effect immediately.
 */
export function useLearningLanguages() {
  const [enabledLanguages, setEnabledLanguages] = useState<LearningLanguage[]>(
    ALL_LEARNING_LANGUAGES as unknown as LearningLanguage[]
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();
    const configKeys = ALL_LEARNING_LANGUAGES.map(
      (lang) => `learning_language_${LANG_KEY_MAP[lang]}_enabled`
    );

    const fetchEnabled = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", configKeys);

      const enabledSet = new Set<string>(ALL_LEARNING_LANGUAGES as readonly string[]);

      for (const row of data || []) {
        // Extract the language name from the key
        const match = row.key.match(/^learning_language_(.+)_enabled$/);
        if (match) {
          const langKey = match[1];
          const langName = Object.keys(LANG_KEY_MAP).find(
            (k) => LANG_KEY_MAP[k] === langKey
          );
          if (langName) {
            if (row.value === "false") {
              enabledSet.delete(langName);
            } else {
              enabledSet.add(langName);
            }
          }
        }
      }

      setEnabledLanguages(
        ALL_LEARNING_LANGUAGES.filter((l) => enabledSet.has(l)) as LearningLanguage[]
      );
      setLoading(false);
    };

    void fetchEnabled();

    const channelName = `learning_languages_config-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_config" },
        () => {
          void fetchEnabled();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { enabledLanguages, loading };
}
