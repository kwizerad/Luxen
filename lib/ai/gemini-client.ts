import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    "";
  return key.trim();
}

export function isAiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.length > 5);
}

export function getAiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not defined in environment variables. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export const ai: GoogleGenAI = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    const client = getAiClient();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export async function generateContentWithFallback(params: {
  contents: string | any;
  config?: any;
}) {
  let lastError: any = null;

  for (let attempt = 0; attempt < CANDIDATE_MODELS.length; attempt++) {
    const model = CANDIDATE_MODELS[attempt];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || "").toLowerCase();
      const isRetryable =
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("resource_exhausted") ||
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("404") ||
        errMsg.includes("not_found") ||
        errMsg.includes("no longer available");

      if (isRetryable) {
        console.warn(`Model ${model} error (${errMsg.slice(0, 80)}...), trying candidate ${attempt + 1}/${CANDIDATE_MODELS.length}...`);
        // Exponential backoff before next model attempt
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(1.5, attempt)));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
