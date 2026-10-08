import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai/gemini-client";
import { pcmToWav } from "@/lib/ai/audio-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function isQuotaError(error: any): boolean {
  const status = error?.status || error?.code || error?.httpStatus || error?.response?.status;
  if (status === 429 || status === "RESOURCE_EXHAUSTED") return true;
  const msg = String(error?.message || error?.error?.message || error || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("too many requests") ||
    msg.includes("429") ||
    msg.includes("limit") ||
    msg.includes("exceeded") ||
    msg.includes("billing") ||
    msg.includes("insufficient")
  );
}

async function disableTTSInSystemConfig(supabase: ReturnType<typeof createAdminClient>) {
  try {
    const now = new Date().toISOString();
    const entries = [
      { key: "tts_master_enabled", value: "false", description: "Master switch for Text-to-Speech audio (Auto-disabled on quota limit)" },
      { key: "tts_learning_enabled", value: "false", description: "Enable or disable TTS inside course lessons" },
      { key: "tts_exams_enabled", value: "false", description: "Enable or disable TTS in practice exams and questions" },
      { key: "tts_gemini_neural_enabled", value: "false", description: "Master switch to enable or disable Gemini Neural AI TTS generation" },
    ];
    for (const item of entries) {
      await supabase.from("system_config").upsert(
        { key: item.key, value: item.value, description: item.description, updated_at: now },
        { onConflict: "key" }
      );
    }
  } catch (err) {
    console.warn("Failed to auto-disable TTS in system_config:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const language = searchParams.get("language") || "English";
    const normLang =
      language.toLowerCase().includes("kinya") || language === "rw"
        ? "Kinyarwanda"
        : language.toLowerCase().includes("fren") || language === "fr"
        ? "French"
        : "English";

    const supabase = createAdminClient();
    const { data: configRows } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", [
        "tts_master_enabled",
        `tts_language_${normLang.toLowerCase()}_enabled`,
        "tts_learning_enabled",
        "tts_exams_enabled",
        "tts_gemini_neural_enabled",
      ]);

    let masterEnabled = true;
    let langEnabled = true;
    let learningEnabled = true;
    let examsEnabled = true;
    let geminiNeuralEnabled = true;

    if (configRows && configRows.length > 0) {
      masterEnabled = configRows.find((r) => r.key === "tts_master_enabled")?.value !== "false";
      langEnabled = configRows.find((r) => r.key === `tts_language_${normLang.toLowerCase()}_enabled`)?.value !== "false";
      learningEnabled = configRows.find((r) => r.key === "tts_learning_enabled")?.value !== "false";
      examsEnabled = configRows.find((r) => r.key === "tts_exams_enabled")?.value !== "false";
      geminiNeuralEnabled = configRows.find((r) => r.key === "tts_gemini_neural_enabled")?.value !== "false";
    }

    let enabled = masterEnabled && langEnabled;
    if (scope === "exam" && !examsEnabled) enabled = false;
    if (scope === "learning" && !learningEnabled) enabled = false;

    return NextResponse.json({
      enabled,
      masterEnabled,
      langEnabled,
      learningEnabled,
      examsEnabled,
      geminiNeuralEnabled,
    });
  } catch {
    return NextResponse.json({ enabled: true });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  let scope: string | undefined;

  try {
    const body = await req.json();
    const { text, entityId, language = "English", voice = "Kore", returnDataUrl = true } = body;
    scope = body.scope;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required for TTS generation" }, { status: 400 });
    }

    const trimmedText = text.trim().slice(0, 2500);
    const contentHash = crypto.createHash("md5").update(trimmedText).digest("hex");
    const normLang =
      language.toLowerCase().includes("kinya") || language === "rw"
        ? "Kinyarwanda"
        : language.toLowerCase().includes("fren") || language === "fr"
        ? "French"
        : "English";

    // 1. Check system_config for TTS toggles
    let geminiNeuralEnabled = true;
    let geminiLangEnabled = true;
    try {
      const { data: configRows } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", [
          "tts_master_enabled",
          `tts_language_${normLang.toLowerCase()}_enabled`,
          "tts_learning_enabled",
          "tts_exams_enabled",
          "tts_gemini_neural_enabled",
          `tts_gemini_${normLang.toLowerCase()}_enabled`,
        ]);

      if (configRows && configRows.length > 0) {
        const masterEnabled = configRows.find((r) => r.key === "tts_master_enabled")?.value !== "false";
        const langEnabled = configRows.find((r) => r.key === `tts_language_${normLang.toLowerCase()}_enabled`)?.value !== "false";
        const learningEnabled = configRows.find((r) => r.key === "tts_learning_enabled")?.value !== "false";
        const examsEnabled = configRows.find((r) => r.key === "tts_exams_enabled")?.value !== "false";
        geminiNeuralEnabled = configRows.find((r) => r.key === "tts_gemini_neural_enabled")?.value !== "false";
        geminiLangEnabled = configRows.find((r) => r.key === `tts_gemini_${normLang.toLowerCase()}_enabled`)?.value !== "false";

        if (!masterEnabled) {
          return NextResponse.json(
            { error: "Text-to-Speech is currently disabled by administrator.", disabled: true },
            { status: 403 }
          );
        }

        if (!langEnabled) {
          return NextResponse.json(
            { error: `Text-to-Speech for ${normLang} is currently disabled by administrator.`, disabled: true },
            { status: 403 }
          );
        }

        if (scope === "exam" && !examsEnabled) {
          return NextResponse.json(
            { error: "Text-to-Speech is currently disabled for exams.", disabled: true },
            { status: 403 }
          );
        }

        if (scope === "learning" && !learningEnabled) {
          return NextResponse.json(
            { error: "Text-to-Speech is currently disabled for learning courses.", disabled: true },
            { status: 403 }
          );
        }
      }
    } catch (err) {
      console.warn("Could not check system_config TTS flags:", err);
    }

    // 2. Check dedicated Supabase Storage bucket ("tts-audio") and course_ai_cache
    const ttsBucket = "tts-audio";
    const storagePath = `questions/${entityId || "general"}/${contentHash}_${normLang.toLowerCase()}.wav`;

    // Ensure bucket exists or try to create it
    try {
      await supabase.storage.createBucket(ttsBucket, { public: true });
    } catch {
      // Bucket may already exist
    }

    if (entityId) {
      try {
        // Check if audio file already exists in Supabase Storage bucket
        const { data: fileData, error: fileError } = await supabase.storage
          .from(ttsBucket)
          .download(storagePath);

        if (!fileError && fileData) {
          const { data: publicData } = supabase.storage
            .from(ttsBucket)
            .getPublicUrl(storagePath);

          if (publicData?.publicUrl) {
            return NextResponse.json({
              success: true,
              audioUrl: publicData.publicUrl,
              fromStorageCache: true,
              sampleRate: 24000,
              voice,
              language: normLang,
            });
          }
        }

        // Fallback to table cache check
        const { data: cached } = await supabase
          .from("course_ai_cache")
          .select("cached_data, content_hash")
          .eq("entity_id", entityId)
          .eq("target_language", normLang)
          .eq("feature_type", "tts_audio")
          .maybeSingle();

        if (cached?.cached_data?.audioUrl) {
          if (cached.cached_data.isImported || cached.content_hash === contentHash) {
            return NextResponse.json({
              success: true,
              audioUrl: cached.cached_data.audioUrl,
              fromCache: true,
              isImported: Boolean(cached.cached_data.isImported),
              sampleRate: 24000,
              voice,
              language: normLang,
            });
          }
        }
      } catch (err) {
        console.warn("Error checking Supabase Storage or cache:", err);
      }
    }

    if (!geminiNeuralEnabled || !geminiLangEnabled) {
      return NextResponse.json(
        { error: "AI Neural Text-to-Speech is currently disabled.", disabled: true },
        { status: 403 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured in your environment.",
          disabled: true,
        },
        { status: 500 }
      );
    }

    const styleInstructions: Record<string, string> = {
      English: "Clear, friendly, articulate driving instructor teaching official traffic rules and road safety.",
      French: "Instructeur d'auto-école clair, bienveillant et articulé expliquant le code de la route.",
      Kinyarwanda: "Umwarimu w'amategeko y'umuhanda n'ibimenyetso, usobanura mu buryo bwumvikana neza cyane.",
    };

    const style = styleInstructions[language] || styleInstructions.English;

    // Call Gemini 3.8 Flash Lite TTS
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style,
              },
            } as any,
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);
    const rawPcmBase64 = audioPart?.inlineData?.data;

    if (!rawPcmBase64) {
      return NextResponse.json(
        { error: "No audio generated from neural model", disabled: scope === "exam" || scope === "learning" },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(rawPcmBase64, "base64");
    const isAlreadyWav =
      audioBuffer.length >= 4 &&
      audioBuffer.toString("ascii", 0, 4) === "RIFF";
    const wavBuffer = isAlreadyWav ? audioBuffer : pcmToWav(audioBuffer, 24000, 1);

    // Upload WAV to dedicated Supabase Storage bucket "tts-audio"
    let storageAudioUrl = `data:audio/wav;base64,${wavBuffer.toString("base64")}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from(ttsBucket)
        .upload(storagePath, wavBuffer, {
          contentType: "audio/wav",
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicData } = supabase.storage
          .from(ttsBucket)
          .getPublicUrl(storagePath);
        if (publicData?.publicUrl) {
          storageAudioUrl = publicData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Failed to upload TTS audio to Supabase Storage bucket:", storageErr);
    }

    const audioUrl = storageAudioUrl;

    // 2. Persist to Supabase course_ai_cache so repeat listens are instant & free
    if (entityId) {
      try {
        await supabase.from("course_ai_cache").upsert(
          {
            entity_id: entityId,
            target_language: normLang,
            feature_type: "tts_audio",
            content_hash: contentHash,
            cached_data: { audioUrl, voice, updatedAt: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entity_id,target_language,feature_type" }
        );
      } catch (err) {
        console.warn("Failed to persist tts to course_ai_cache:", err);
      }
    }

    if (returnDataUrl) {
      return NextResponse.json({
        success: true,
        audioUrl,
        sampleRate: 24000,
        voice,
        language,
      });
    }

    return new NextResponse(new Uint8Array(wavBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("API /api/ai/tts error:", error);
    const msg = String(error?.message || "");
    const quotaHit = isQuotaError(error);

    if (quotaHit) {
      await disableTTSInSystemConfig(supabase);
      return NextResponse.json(
        {
          error: "TTS quota limit reached. Text-to-Speech has been automatically disabled.",
          disabled: true,
          quotaExceeded: true,
        },
        { status: 429 }
      );
    }

    let friendlyError = msg || "Internal error generating neural speech";
    if (
      msg.includes("unregistered callers") ||
      msg.includes("PERMISSION_DENIED") ||
      msg.includes("API consumer identity")
    ) {
      friendlyError =
        "GEMINI_API_KEY is missing, invalid, or unauthorized. Please verify your GEMINI_API_KEY in Vercel Project Settings > Environment Variables.";
    }
    return NextResponse.json(
      {
        error: friendlyError,
        disabled: scope === "exam" || scope === "learning",
      },
      { status: 500 }
    );
  }
}
