import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/ai/gemini-client";
import { pcmToWav } from "@/lib/ai/audio-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language = "English", voice = "Kore", returnDataUrl = true } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required for TTS generation" }, { status: 400 });
    }

    // Limit length to ~2500 characters to keep synthesis snappy and responsive
    const trimmedText = text.trim().slice(0, 2500);

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
            // Voices available: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
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

    if (returnDataUrl) {
      const wavBase64 = wavBuffer.toString("base64");
      const audioUrl = `data:audio/wav;base64,${wavBase64}`;
      return NextResponse.json({
        success: true,
        audioUrl,
        sampleRate: 24000,
        voice,
        language,
      });
    }

    return new Response(wavBuffer, {
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
