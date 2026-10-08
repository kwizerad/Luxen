"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, ActionResult } from "./_shared";
import { TTSConfig, DEFAULT_TTS_CONFIG, ImportedTTSAudioRecord, normalizeTTSLanguage } from "@/lib/tts-config";
import crypto from "crypto";

function handleError(error: unknown): { success: false; error: string } {
  if (error instanceof Error) return { success: false, error: error.message };
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; error?: string; details?: string };
    if (e.message) return { success: false, error: e.message };
    if (e.error) return { success: false, error: e.error };
  }
  return { success: false, error: String(error) };
}

/**
 * Loads current TTS settings from system_config
 */
export async function getTTSConfigAction(): Promise<ActionResult<TTSConfig>> {
  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", [
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
      ]);

    if (error) throw error;

    const config: TTSConfig = { ...DEFAULT_TTS_CONFIG };
    if (rows && rows.length > 0) {
      for (const row of rows) {
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
        if (row.key === "tts_gemini_voice" && row.value) config.geminiVoice = row.value as any;
      }
    }

    return { success: true, data: config };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Saves TTS settings into system_config
 */
export async function saveTTSConfigAction(config: Partial<TTSConfig>): Promise<ActionResult<TTSConfig>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const currentRes = await getTTSConfigAction();
    const updated: TTSConfig = {
      ...(currentRes.success ? currentRes.data : DEFAULT_TTS_CONFIG),
      ...config,
    };

    const entries = [
      { key: "tts_master_enabled", value: String(updated.masterEnabled), description: "Master switch for Text-to-Speech audio" },
      { key: "tts_language_kinyarwanda_enabled", value: String(updated.kinyarwandaEnabled), description: "Enable or disable TTS in Kinyarwanda" },
      { key: "tts_language_english_enabled", value: String(updated.englishEnabled), description: "Enable or disable TTS in English" },
      { key: "tts_language_french_enabled", value: String(updated.frenchEnabled), description: "Enable or disable TTS in French" },
      { key: "tts_learning_enabled", value: String(updated.learningEnabled), description: "Enable or disable TTS inside course lessons" },
      { key: "tts_exams_enabled", value: String(updated.examsEnabled), description: "Enable or disable TTS in practice exams and questions" },
      { key: "tts_prefer_imported_audio", value: String(updated.preferImportedAudio), description: "Prioritize imported human audio over AI generated speech" },
      { key: "tts_gemini_neural_enabled", value: String(updated.geminiNeuralEnabled), description: "Master switch to enable or disable Gemini Neural AI TTS generation" },
      { key: "tts_gemini_kinyarwanda_enabled", value: String(updated.geminiKinyarwandaEnabled), description: "Allow Gemini Neural AI TTS for Kinyarwanda" },
      { key: "tts_gemini_english_enabled", value: String(updated.geminiEnglishEnabled), description: "Allow Gemini Neural AI TTS for English" },
      { key: "tts_gemini_french_enabled", value: String(updated.geminiFrenchEnabled), description: "Allow Gemini Neural AI TTS for French" },
      { key: "tts_gemini_voice", value: String(updated.geminiVoice || "Kore"), description: "Default prebuilt voice for Gemini Neural TTS" },
    ];

    for (const item of entries) {
      await supabase.from("system_config").upsert(
        { key: item.key, value: item.value, description: item.description, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }

    return { success: true, data: updated };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Imports / attaches an audio file as official TTS for an entity & language
 */
export async function saveImportedTTSAudioAction(payload: {
  entityId: string;
  entityTitle: string;
  entityType?: "question" | "topic" | "lesson" | "custom";
  language: string;
  audioUrl: string;
  durationSeconds?: number;
  notes?: string;
}): Promise<ActionResult<ImportedTTSAudioRecord>> {
  try {
    const adminUser = await requireAdmin();
    const supabase = createAdminClient();

    const {
      entityId,
      entityTitle,
      entityType = "question",
      language,
      audioUrl,
      durationSeconds,
      notes,
    } = payload;

    if (!entityId || !audioUrl) {
      return { success: false, error: "Entity ID and audio URL are required" };
    }

    const normLang = normalizeTTSLanguage(language);
    const contentHash = crypto
      .createHash("md5")
      .update(`${entityId}:${normLang}:${audioUrl}`)
      .digest("hex");

    const cachedData = {
      audioUrl,
      language: normLang,
      isImported: true,
      entityTitle: entityTitle || entityId,
      entityType,
      durationSeconds,
      notes: notes || "",
      importedAt: new Date().toISOString(),
      importedBy: adminUser.email || "Admin",
    };

    // Upsert into course_ai_cache with feature_type = "tts_audio"
    const { data: upserted, error } = await supabase
      .from("course_ai_cache")
      .upsert(
        {
          entity_id: entityId,
          target_language: normLang,
          feature_type: "tts_audio",
          content_hash: contentHash,
          cached_data: cachedData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_id,target_language,feature_type" }
      )
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: upserted.id,
        entityId,
        entityTitle: entityTitle || entityId,
        entityType,
        language: normLang,
        audioUrl,
        durationSeconds,
        notes,
        importedAt: upserted.updated_at || new Date().toISOString(),
        importedBy: adminUser.email,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Lists all imported TTS audio tracks
 */
export async function listImportedTTSAudiosAction(
  languageFilter?: string
): Promise<ActionResult<ImportedTTSAudioRecord[]>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    let query = supabase
      .from("course_ai_cache")
      .select("id, entity_id, target_language, cached_data, updated_at")
      .eq("feature_type", "tts_audio")
      .order("updated_at", { ascending: false });

    if (languageFilter && languageFilter !== "all") {
      query = query.eq("target_language", normalizeTTSLanguage(languageFilter));
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const records: ImportedTTSAudioRecord[] = (rows || [])
      .filter((r) => r.cached_data?.audioUrl)
      .map((r) => ({
        id: r.id,
        entityId: r.entity_id,
        entityTitle: r.cached_data?.entityTitle || r.entity_id,
        entityType: r.cached_data?.entityType || "question",
        language: r.target_language,
        audioUrl: r.cached_data?.audioUrl,
        durationSeconds: r.cached_data?.durationSeconds,
        fileSize: r.cached_data?.fileSize,
        notes: r.cached_data?.notes,
        importedAt: r.cached_data?.importedAt || r.updated_at,
        importedBy: r.cached_data?.importedBy,
      }));

    return { success: true, data: records };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Deletes an imported TTS audio record from cache
 */
export async function deleteImportedTTSAudioAction(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase.from("course_ai_cache").delete().eq("id", id);
    if (error) throw error;

    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Retrieves audio for a given entity and language
 */
export async function getTTSAudioForEntityAction(
  entityId: string,
  language: string
): Promise<ActionResult<{ audioUrl: string | null; isImported: boolean }>> {
  try {
    const supabase = createAdminClient();
    const normLang = normalizeTTSLanguage(language);

    const { data: row } = await supabase
      .from("course_ai_cache")
      .select("cached_data")
      .eq("entity_id", entityId)
      .eq("target_language", normLang)
      .eq("feature_type", "tts_audio")
      .maybeSingle();

    if (row && row.cached_data?.audioUrl) {
      return {
        success: true,
        data: {
          audioUrl: row.cached_data.audioUrl,
          isImported: Boolean(row.cached_data.isImported),
        },
      };
    }

    return { success: true, data: { audioUrl: null, isImported: false } };
  } catch (error) {
    return handleError(error);
  }
}
