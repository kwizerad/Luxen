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
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export const ai: GoogleGenAI = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    const client = getAiClient();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];

function extractRetryDelayMs(err: any): number {
  try {
    const str = typeof err === "string" ? err : JSON.stringify(err) + " " + String(err?.message || "");
    const match1 = str.match(/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s/i);
    if (match1 && match1[1]) {
      return Math.ceil(parseFloat(match1[1]) * 1000) + 600;
    }
    const match2 = str.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
    if (match2 && match2[1]) {
      return Math.ceil(parseFloat(match2[1]) * 1000) + 600;
    }
  } catch {}
  return 0;
}

export async function generateContentWithFallback(params: {
  contents: string | any;
  config?: any;
}) {
  let lastError: any = null;

  for (let modelIdx = 0; modelIdx < CANDIDATE_MODELS.length; modelIdx++) {
    const model = CANDIDATE_MODELS[modelIdx];

    // For each model, attempt up to 2 retries on short transient 503/429 before moving immediately to next candidate
    for (let retry = 0; retry < 2; retry++) {
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Model ${model} timed out after 30s`)), 30000)
          ),
        ]);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || JSON.stringify(err) || "").toLowerCase();

        // If error is model not found (404) or daily quota exhausted or long retryDelay (> 8s), immediately try next candidate model without sleeping!
        const suggestedDelay = extractRetryDelayMs(err);
        if (
          errMsg.includes("404") ||
          errMsg.includes("not found") ||
          errMsg.includes("no longer available") ||
          errMsg.includes("perday") ||
          errMsg.includes("free_tier_requests") ||
          suggestedDelay > 8000
        ) {
          console.warn(
            `[Gemini] Model ${model} quota exhausted or unavailable (delay: ${suggestedDelay}ms). Switching to next model immediately...`
          );
          break;
        }

        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("429") ||
          errMsg.includes("quota") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("timed out");

        if (isTransient) {
          if (retry === 0) {
            const waitMs = Math.min(Math.max(suggestedDelay, 1200), 3000);
            console.warn(
              `[Gemini] Model ${model} transient busy (attempt 1/2). Waiting ${waitMs}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }
          // On second transient failure for this model, immediately switch to next candidate model
          break;
        }

        // For any other unexpected error on this model, try next candidate model
        break;
      }
    }
  }

  throw lastError;
}
