import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai/gemini-client";
import { pcmToWav } from "@/lib/ai/audio-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, entityId, language = "English", voice = "Kore", returnDataUrl = true, scope } = body;

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

    const supabase = createAdminClient();

    // 1. Check system_config for TTS toggles
    try {
      const { data: configRows } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", [
          "tts_master_enabled",
          `tts_language_${normLang.toLowerCase()}_enabled`,
          "tts_learning_enabled",
          "tts_exams_enabled",
        ]);

      if (configRows && configRows.length > 0) {
        const masterEnabled = configRows.find((r) => r.key === "tts_master_enabled")?.value !== "false";
        const langEnabled = configRows.find((r) => r.key === `tts_language_${normLang.toLowerCase()}_enabled`)?.value !== "false";
        const learningEnabled = configRows.find((r) => r.key === "tts_learning_enabled")?.value !== "false";
        const examsEnabled = configRows.find((r) => r.key === "tts_exams_enabled")?.value !== "false";

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

    // 2. Check Supabase course_ai_cache for permanent audio storage (including imported human audio)
    if (entityId) {
      try {
        const { data: cached } = await supabase
          .from("course_ai_cache")
          .select("cached_data, content_hash")
          .eq("entity_id", entityId)
          .eq("target_language", normLang)
          .eq("feature_type", "tts_audio")
          .maybeSingle();

        // If audio exists and is imported OR content hasn't changed, return immediately
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
        console.warn("Error checking course_ai_cache:", err);
      }
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured in your environment. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables or import recorded audio in Admin Settings.",
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
        { error: "No audio generated from neural model" },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(rawPcmBase64, "base64");
    const isAlreadyWav =
      audioBuffer.length >= 4 &&
      audioBuffer.toString("ascii", 0, 4) === "RIFF";
    const wavBuffer = isAlreadyWav ? audioBuffer : pcmToWav(audioBuffer, 24000, 1);
    const wavBase64 = wavBuffer.toString("base64");
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;

    // 2. Persist to Supabase course_ai_cache so repeat listens are instant & free
    if (entityId) {
      try {
        const supabase = createAdminClient();
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
      { error: friendlyError },
      { status: 500 }
    );
  }
}
