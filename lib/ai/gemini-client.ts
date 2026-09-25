import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not defined");
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

export async function generateContentWithFallback(params: {
  contents: string | any;
  config?: any;
}) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isCapacityError =
        err?.message?.includes("503") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (isCapacityError) {
        console.warn(`Model ${model} unavailable due to demand, retrying with next candidate...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
