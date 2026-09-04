import type { ExamResultDetails } from "./types";

const codeResultCache = new Map<string, ExamResultDetails>();

export function getCachedResult(code: string): ExamResultDetails | undefined {
  return codeResultCache.get(code);
}

export function setCachedResult(code: string, details: ExamResultDetails): void {
  codeResultCache.set(code, details);
}

export function hasCachedResult(code: string): boolean {
  return codeResultCache.has(code);
}
