import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export interface ExternalChapter {
  id: string;
  title: string;
  chapter_number: number;
  image: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalSection {
  id: string;
  title: string;
  section_number: number;
  chapter_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalLesson {
  id: string;
  title: string;
  lesson_number: number;
  lesson_image: string | null;
  section_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalQuestion {
  id: string;
  title: string;
  choice: string[];
  choice_answer: number;
  chapter_id: string;
  image: string | null;
  question_numbers: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalQuestionSet {
  id: number;
  set_number: number;
  image_count: number;
  total_questions: number;
  created_at?: string;
  updated_at?: string;
}

let cachedExternalCredentials: { url: string; key: string } | null = null;

export function isExternalSupabaseConfigured(): boolean {
  const url =
    process.env.EXTERNAL_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL ||
    cachedExternalCredentials?.url;
  const key =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXTERNAL_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY ||
    cachedExternalCredentials?.key;
  return Boolean(url && key && url.startsWith("http"));
}

export async function resolveExternalSupabaseCredentials(): Promise<{ url: string; key: string } | null> {
  const envUrl =
    process.env.EXTERNAL_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL;
  const envKey =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXTERNAL_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY;

  if (envUrl && envKey && envUrl.startsWith("http")) {
    cachedExternalCredentials = { url: envUrl, key: envKey };
    return cachedExternalCredentials;
  }

  if (cachedExternalCredentials) {
    return cachedExternalCredentials;
  }

  // Fallback: load from primary database's system_config table (useful in production deployments where EXTERNAL_SUPABASE_* env vars were not copied over)
  if (isSupabaseAdminConfigured()) {
    try {
      const adminSb = createAdminClient();
      const { data } = await adminSb
        .from("system_config")
        .select("key, value")
        .in("key", [
          "external_supabase_url",
          "external_supabase_service_role_key",
          "external_supabase_anon_key",
        ]);

      if (data && data.length > 0) {
        const map = new Map<string, string>();
        for (const row of data) {
          if (row.key && row.value) {
            map.set(String(row.key), String(row.value).replace(/^"|"$/g, "").trim());
          }
        }
        const dbUrl = map.get("external_supabase_url");
        const dbKey =
          map.get("external_supabase_service_role_key") ||
          map.get("external_supabase_anon_key");

        if (dbUrl && dbKey && dbUrl.startsWith("http")) {
          cachedExternalCredentials = { url: dbUrl, key: dbKey };
          return cachedExternalCredentials;
        }
      }
    } catch {
      // ignore fallback errors
    }
  }

  return null;
}

export async function getExternalAdminClient(): Promise<SupabaseClient | null> {
  if (typeof window !== "undefined") {
    throw new Error("getExternalAdminClient() must only be called on the server.");
  }

  const creds = await resolveExternalSupabaseCredentials();
  if (!creds) {
    return null;
  }

  return createClient(creds.url, creds.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, {
          ...options,
          cache: "no-store",
        }),
    },
  });
}

export function createExternalAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createExternalAdminClient() must only be called on the server.");
  }

  const url =
    process.env.EXTERNAL_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL ||
    cachedExternalCredentials?.url ||
    "https://placeholder.supabase.co";
  const key =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXTERNAL_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY ||
    cachedExternalCredentials?.key ||
    "placeholder-key";

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

