import { createAdminClient } from "@/lib/supabase/admin";

export interface GazetteArticle {
  id: string;
  articleNumber: string; // e.g. "Article 28" / "Ingingo ya 28"
  title: string;
  category: "priority" | "speed" | "overtaking" | "signs" | "signals" | "parking" | "penalties" | "general";
  language: "rw" | "en" | "fr" | "all";
  decreeRef: string; // e.g. "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002 / Presidential Order No 85/01"
  content: string;
  keyTakeaways: string[];
  updatedAt?: string;
}

// Sample dummy articles removed per user instruction.
// All Gazette articles must come exclusively from the uploaded official multilingual Gazette PDF.
export const SEED_GAZETTE_ARTICLES: GazetteArticle[] = [];

const CONFIG_KEY = "official_gazette_articles";

let memoryCachedArticles: GazetteArticle[] | null = null;
let lastCacheTime = 0;

/**
 * Fetch all Gazette articles (returns only authentic articles saved in system_config).
 */
export async function getGazetteArticles(): Promise<GazetteArticle[]> {
  const nowMs = Date.now();
  if (memoryCachedArticles && nowMs - lastCacheTime < 30000) {
    return memoryCachedArticles;
  }

  try {
    const adminSb = createAdminClient();
    const { data, error } = await adminSb
      .from("system_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) {
          memoryCachedArticles = parsed;
          lastCacheTime = nowMs;
          return parsed;
        }
      } catch (parseErr) {
        console.error("Error parsing gazette articles JSON:", parseErr);
      }
    }
  } catch (error) {
    console.error("Error reading gazette articles from system_config:", error);
  }

  memoryCachedArticles = [];
  lastCacheTime = nowMs;
  return [];
}

/**
 * Save / update gazette articles in system_config.
 */
export async function saveGazetteArticles(articles: GazetteArticle[]): Promise<boolean> {
  memoryCachedArticles = articles;
  lastCacheTime = Date.now();
  try {
    const adminSb = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await adminSb
      .from("system_config")
      .upsert(
        {
          key: CONFIG_KEY,
          value: JSON.stringify(articles),
          description: "Official Gazette of Rwanda Traffic Code articles and legal references",
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Failed to save gazette articles:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception saving gazette articles:", err);
    return false;
  }
}

/**
 * Clear all gazette articles from cache and system_config.
 */
export async function clearGazetteArticles(): Promise<boolean> {
  memoryCachedArticles = [];
  lastCacheTime = Date.now();
  try {
    const adminSb = createAdminClient();
    const { error } = await adminSb
      .from("system_config")
      .delete()
      .eq("key", CONFIG_KEY);
    return !error;
  } catch (err) {
    console.error("Error clearing gazette articles:", err);
    return false;
  }
}
