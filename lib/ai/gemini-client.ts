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
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
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

    // For each model, attempt up to 3 retries on 503/429 before moving to next candidate
    for (let retry = 0; retry < 3; retry++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || JSON.stringify(err) || "").toLowerCase();
        const isUnavailableOrThrottled =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("429") ||
          errMsg.includes("quota") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("overloaded");

        if (isUnavailableOrThrottled) {
          const suggestedDelay = extractRetryDelayMs(err);
          const exponentialDelay = (retry + 1) * 2000;
          const waitMs = Math.max(suggestedDelay, exponentialDelay);

          console.warn(
            `[Gemini] Model ${model} unavailable/throttled (attempt ${retry + 1}/3). Waiting ${waitMs}ms before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        // If error is model not found (404), break immediately to next candidate
        if (
          errMsg.includes("404") ||
          errMsg.includes("not found") ||
          errMsg.includes("no longer available")
        ) {
          break;
        }

        throw err;
      }
    }
  }

  throw lastError;
}
