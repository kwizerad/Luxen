import { createClient } from "@supabase/supabase-js";

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

export function isExternalSupabaseConfigured(): boolean {
  const url = process.env.EXTERNAL_SUPABASE_URL;
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY || process.env.EXTERNAL_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

export function createExternalAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createExternalAdminClient() must only be called on the server.");
  }

  const url = process.env.EXTERNAL_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXTERNAL_SUPABASE_ANON_KEY ||
    "placeholder-key";

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
