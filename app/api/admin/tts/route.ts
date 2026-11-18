import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
import { DEFAULT_TTS_CONFIG, TTSConfig } from "@/lib/tts-config";
import { CACHE_KEYS, invalidateCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

const ALLOWED_VOICES = new Set(["Kore", "Puck", "Charon", "Fenrir", "Zephyr"]);

const TTS_CONFIG_KEYS = [
  "tts_master_enabled",
  "tts_language_kinyarwanda_enabled",
  "tts_language_english_enabled",
  "tts_language_french_enabled",
  "tts_learning_enabled",
  "tts_exams_enabled",
  "tts_prefer_imported_audio",
  "tts_gemini_neural_enabled",
  "tts_gemini_kinyarwanda_enabled",
  "tts_gemini_english_enabled",
  "tts_gemini_french_enabled",
  "tts_gemini_voice",
];

async function resolveAdminUser(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) return { user: null, isAdmin: false };
  if (isStrictlyStudentEmail(user.email)) return { user, isAdmin: false };

  let userIsAdmin = isAdmin(user as any);
  if (!userIsAdmin) {
    const adminSb = createAdminClient();
    const { data: profile } = await adminSb
      .from("user_profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !isStrictlyStudentEmail(profile?.email) &&
      (profile?.role?.toLowerCase() === "admin" ||
        profile?.email?.toLowerCase() === "navo@admin.jn")
    ) {
      userIsAdmin = true;
    }
  }

  return { user, isAdmin: userIsAdmin };
}

function sanitizeTTSPatch(raw: Record<string, any>): Partial<TTSConfig> {
  const patch: Partial<TTSConfig> = {};
  const boolKeys: Array<Exclude<keyof TTSConfig, "geminiVoice">> = [
    "masterEnabled",
    "kinyarwandaEnabled",
    "englishEnabled",
    "frenchEnabled",
    "learningEnabled",
    "examsEnabled",
    "preferImportedAudio",
    "geminiNeuralEnabled",
    "geminiKinyarwandaEnabled",
    "geminiEnglishEnabled",
    "geminiFrenchEnabled",
  ];
  for (const key of boolKeys) {
    if (typeof raw?.[key] === "boolean") {
      patch[key] = raw[key];
    }
  }
  if (typeof raw?.geminiVoice === "string" && ALLOWED_VOICES.has(raw.geminiVoice)) {
    patch.geminiVoice = raw.geminiVoice as TTSConfig["geminiVoice"];
  }
  return patch;
}

async function readTTSConfigFromDB(): Promise<TTSConfig> {
  const adminSb = createAdminClient();
  const { data: rows, error } = await adminSb
    .from("system_config")
    .select("key, value")
    .in("key", TTS_CONFIG_KEYS);

  if (error) throw error;

  const config: TTSConfig = { ...DEFAULT_TTS_CONFIG };
  for (const row of rows || []) {
    if (row.key === "tts_master_enabled") config.masterEnabled = row.value !== "false";
    if (row.key === "tts_language_kinyarwanda_enabled") config.kinyarwandaEnabled = row.value !== "false";
    if (row.key === "tts_language_english_enabled") config.englishEnabled = row.value !== "false";
    if (row.key === "tts_language_french_enabled") config.frenchEnabled = row.value !== "false";
    if (row.key === "tts_learning_enabled") config.learningEnabled = row.value !== "false";
    if (row.key === "tts_exams_enabled") config.examsEnabled = row.value !== "false";
    if (row.key === "tts_prefer_imported_audio") config.preferImportedAudio = row.value !== "false";
    if (row.key === "tts_gemini_neural_enabled") config.geminiNeuralEnabled = row.value !== "false";
    if (row.key === "tts_gemini_kinyarwanda_enabled") config.geminiKinyarwandaEnabled = row.value !== "false";
    if (row.key === "tts_gemini_english_enabled") config.geminiEnglishEnabled = row.value !== "false";
    if (row.key === "tts_gemini_french_enabled") config.geminiFrenchEnabled = row.value !== "false";
    if (row.key === "tts_gemini_voice" && row.value && ALLOWED_VOICES.has(row.value)) {
      config.geminiVoice = row.value as TTSConfig["geminiVoice"];
    }
  }

  return config;
}

export async function GET(request: NextRequest) {
  try {
    const { user, isAdmin: adminAllowed } = await resolveAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!adminAllowed) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const config = await readTTSConfigFromDB();
    return NextResponse.json(
      { success: true, data: config },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Error loading TTS config:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load TTS settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isAdmin: adminAllowed } = await resolveAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!adminAllowed) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const patch = sanitizeTTSPatch(rawBody);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid TTS configuration fields provided" }, { status: 400 });
    }

    const current = await readTTSConfigFromDB();
    const updated: TTSConfig = {
      ...current,
      ...patch,
    };

    const now = new Date().toISOString();
    const rowsToUpsert = [
      { key: "tts_master_enabled", value: String(updated.masterEnabled), description: "Master switch for Text-to-Speech audio", updated_at: now },
      { key: "tts_language_kinyarwanda_enabled", value: String(updated.kinyarwandaEnabled), description: "Enable or disable TTS in Kinyarwanda", updated_at: now },
      { key: "tts_language_english_enabled", value: String(updated.englishEnabled), description: "Enable or disable TTS in English", updated_at: now },
      { key: "tts_language_french_enabled", value: String(updated.frenchEnabled), description: "Enable or disable TTS in French", updated_at: now },
      { key: "tts_learning_enabled", value: String(updated.learningEnabled), description: "Enable or disable TTS inside course lessons", updated_at: now },
      { key: "tts_exams_enabled", value: String(updated.examsEnabled), description: "Enable or disable TTS in practice exams and questions", updated_at: now },
      { key: "tts_prefer_imported_audio", value: String(updated.preferImportedAudio), description: "Prioritize imported human audio over AI generated speech", updated_at: now },
      { key: "tts_gemini_neural_enabled", value: String(updated.geminiNeuralEnabled), description: "Master switch to enable or disable Gemini Neural AI TTS generation", updated_at: now },
      { key: "tts_gemini_kinyarwanda_enabled", value: String(updated.geminiKinyarwandaEnabled), description: "Allow Gemini Neural AI TTS for Kinyarwanda", updated_at: now },
      { key: "tts_gemini_english_enabled", value: String(updated.geminiEnglishEnabled), description: "Allow Gemini Neural AI TTS for English", updated_at: now },
      { key: "tts_gemini_french_enabled", value: String(updated.geminiFrenchEnabled), description: "Allow Gemini Neural AI TTS for French", updated_at: now },
      { key: "tts_gemini_voice", value: String(updated.geminiVoice || "Kore"), description: "Default prebuilt voice for Gemini Neural TTS", updated_at: now },
    ];

    const adminSb = createAdminClient();
    const { error } = await adminSb
      .from("system_config")
      .upsert(rowsToUpsert, { onConflict: "key" });

    if (error) throw error;

    invalidateCache(CACHE_KEYS.SYSTEM_CONFIG_ALL);

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Error saving TTS config:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save TTS settings" },
      { status: 500 }
    );
  }
}
