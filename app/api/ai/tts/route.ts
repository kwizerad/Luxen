import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai/gemini-client";
import { pcmToWav } from "@/lib/ai/audio-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, entityId, language = "English", voice = "Kore", returnDataUrl = true } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required for TTS generation" }, { status: 400 });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured in your environment. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.",
        },
        { status: 500 }
      );
    }

    // Limit length to ~2500 characters to keep synthesis snappy and responsive
    const trimmedText = text.trim().slice(0, 2500);
    const contentHash = crypto.createHash("md5").update(trimmedText).digest("hex");

    // 1. Check Supabase course_ai_cache for permanent audio storage
    if (entityId) {
      try {
        const supabase = createAdminClient();
        const { data: cached } = await supabase
          .from("course_ai_cache")
          .select("cached_data, content_hash")
          .eq("entity_id", entityId)
          .eq("target_language", language)
          .eq("feature_type", "tts_audio")
          .maybeSingle();

        // If content has not changed, return cached audio directly (0ms, 0 API cost)
        if (cached && cached.content_hash === contentHash && cached.cached_data?.audioUrl) {
          return NextResponse.json({
            success: true,
            audioUrl: cached.cached_data.audioUrl,
            fromCache: true,
            sampleRate: 24000,
            voice,
            language,
          });
        }
      } catch (err) {
        console.warn("Error checking course_ai_cache:", err);
      }
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
            },
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

    const pcmBuffer = Buffer.from(rawPcmBase64, "base64");
    const wavBuffer = pcmToWav(pcmBuffer, 24000, 1);
    const wavBase64 = wavBuffer.toString("base64");
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;

    // 2. Persist to Supabase course_ai_cache so repeat listens are instant & free
    if (entityId) {
      try {
        const supabase = createAdminClient();
        await supabase.from("course_ai_cache").upsert(
          {
            entity_id: entityId,
            target_language: language,
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
    return NextResponse.json(
      { error: error?.message || "Internal error generating neural speech" },
      { status: 500 }
    );
  }
}
