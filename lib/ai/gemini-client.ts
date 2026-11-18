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
  "gemini-3.1-flash-lite",
  "gemini-4-hydrogen",
];

function sanitizeConfigForModel(model: string, config?: Record<string, any>) {
  if (!config) return undefined;
  if (model.startsWith("gemini-4-")) {
    const {
      temperature: _t,
      topP: _tp,
      topK: _tk,
      candidateCount: _cc,
      ...rest
    } = config;
    return rest;
  }
  return config;
}

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
  timeoutMs?: number;
  maxRetries?: number;
}) {
  let lastError: any = null;
  const timeoutMs = Math.max(3000, params.timeoutMs ?? 20000);
  const maxRetries = Math.max(1, params.maxRetries ?? 2);

  for (let modelIdx = 0; modelIdx < CANDIDATE_MODELS.length; modelIdx++) {
    const model = CANDIDATE_MODELS[modelIdx];
    const safeConfig = sanitizeConfigForModel(model, params.config);

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: safeConfig,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Model ${model} timed out after ${Math.round(timeoutMs / 1000)}s`)),
              timeoutMs
            )
          ),
        ]);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || JSON.stringify(err) || "").toLowerCase();

        // If error is model not found (404) or daily quota exhausted or long retryDelay (> 4s), switch immediately
        const suggestedDelay = extractRetryDelayMs(err);
        if (
          errMsg.includes("404") ||
          errMsg.includes("not found") ||
          errMsg.includes("no longer available") ||
          errMsg.includes("perday") ||
          errMsg.includes("free_tier_requests") ||
          suggestedDelay > 4000
        ) {
          console.warn(
            `[Gemini] Model ${model} quota exhausted or unavailable (delay: ${suggestedDelay}ms). Switching to next model...`
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

        if (isTransient && retry + 1 < maxRetries) {
          const waitMs = Math.min(Math.max(suggestedDelay, 500), 1500);
          console.warn(
            `[Gemini] Model ${model} transient busy (attempt ${retry + 1}/${maxRetries}). Waiting ${waitMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        break;
      }
    }
  }

  throw lastError;
}
