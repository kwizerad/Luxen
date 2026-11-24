import type { ExamQuestion, ExamQuestionSortingMode, ExamSettings } from "@/lib/database.types";

export const DEFAULT_EXAM_SETTINGS = {
  question_count: 20,
  duration_minutes: 20,
  sorting_mode: "RANDOM" as ExamQuestionSortingMode,
  passing_percentage: 60,
  available_from: null as string | null,
  available_to: null as string | null,
};

export type ExamSettingsInput = {
  question_count?: number;
  duration_minutes?: number;
  sorting_mode?: ExamQuestionSortingMode;
  passing_percentage?: number;
  available_from?: string | null;
  available_to?: string | null;
};

export function normalizeExamSettings(
  partial: Partial<Pick<ExamSettings, "question_count" | "duration_minutes" | "sorting_mode" | "passing_percentage" | "available_from" | "available_to">> | null | undefined,
) {
  return {
    question_count: partial?.question_count ?? DEFAULT_EXAM_SETTINGS.question_count,
    duration_minutes: partial?.duration_minutes ?? DEFAULT_EXAM_SETTINGS.duration_minutes,
    sorting_mode: (partial?.sorting_mode ?? DEFAULT_EXAM_SETTINGS.sorting_mode) as ExamQuestionSortingMode,
    passing_percentage: partial?.passing_percentage ?? DEFAULT_EXAM_SETTINGS.passing_percentage,
    available_from: partial?.available_from ?? DEFAULT_EXAM_SETTINGS.available_from,
    available_to: partial?.available_to ?? DEFAULT_EXAM_SETTINGS.available_to,
  };
}

function hasValue(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function questionHasAnyImage(q: ExamQuestion): boolean {
  return (
    hasValue(q.question_image) ||
    hasValue(q.option_a_image) ||
    hasValue(q.option_b_image) ||
    hasValue(q.option_c_image) ||
    hasValue(q.option_d_image)
  );
}

export function isWithinAvailabilityWindow(now: Date, availableFrom?: string | null, availableTo?: string | null): boolean {
  const from = availableFrom ? new Date(availableFrom) : null;
  const to = availableTo ? new Date(availableTo) : null;

  if (!from && !to) return true; // always available
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const RWANDA_PVS_CATEGORY_ID = "00000000-0000-4000-8000-000000000e01";

export function isRwandaPvsCategory(category: {
  id?: string | null;
  name?: string | null;
} | null | undefined): boolean {
  if (!category) return false;
  if (category.id === RWANDA_PVS_CATEGORY_ID) return true;
  const name = String(category.name || "").trim();
  return /rwanda\s*pvs/i.test(name);
}

export function prioritizeRwandaPvsCategories<
  T extends { id?: string | null; name?: string | null }
>(categories: T[]): T[] {
  if (!Array.isArray(categories) || categories.length <= 1) {
    return Array.isArray(categories) ? categories : [];
  }
  const pvs: T[] = [];
  const rest: T[] = [];
  for (const cat of categories) {
    if (isRwandaPvsCategory(cat)) {
      pvs.push(cat);
    } else {
      rest.push(cat);
    }
  }
  return [...pvs, ...rest];
}

export function pickDefaultExamCategory<
  T extends { id?: string | null; name?: string | null }
>(categories: T[]): T | undefined {
  if (!Array.isArray(categories) || categories.length === 0) return undefined;
  const pvs = categories.find((c) => isRwandaPvsCategory(c));
  if (pvs) return pvs;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return categories.find((c) => c.id && uuidRegex.test(c.id)) || categories[0];
}

export type CanonicalExamLanguage = "Kinyarwanda" | "English" | "French";

export function normalizeCanonicalExamLanguage(
  lang?: string | null
): CanonicalExamLanguage {
  const lower = String(lang || "").trim().toLowerCase();
  if (lower === "en" || lower === "english" || lower.includes("english")) {
    return "English";
  }
  if (
    lower === "fr" ||
    lower === "french" ||
    lower === "français" ||
    lower === "francais" ||
    lower.includes("french") ||
    lower.includes("français")
  ) {
    return "French";
  }
  return "Kinyarwanda";
}

export function getExamResultLanguageName(
  source:
    | {
        exam_language?: string | null;
        language?: string | null;
        category_name?: string | null;
        is_module?: boolean;
      }
    | null
    | undefined,
  fallbackLanguage: string = "Kinyarwanda"
): string {
  if (!source) return normalizeCanonicalExamLanguage(fallbackLanguage);
  if (source.is_module && source.category_name) {
    return source.category_name;
  }
  const explicitLang = source.exam_language || source.language;
  if (explicitLang && String(explicitLang).trim()) {
    return normalizeCanonicalExamLanguage(explicitLang);
  }
  const rawName = String(source.category_name || "").trim();
  const lower = rawName.toLowerCase();
  if (
    lower === "english" ||
    lower === "en" ||
    lower.includes("official traffic rules")
  ) {
    return "English";
  }
  if (
    lower === "french" ||
    lower === "français" ||
    lower === "francais" ||
    lower === "fr" ||
    lower.includes("examen blanc officiel")
  ) {
    return "French";
  }
  if (
    lower === "kinyarwanda" ||
    lower === "rw" ||
    lower.includes("ikizamini cy'imyitozo")
  ) {
    return "Kinyarwanda";
  }
  if (
    !rawName ||
    /rwanda\s*pvs/i.test(rawName) ||
    /navo'?s?\s*(mock\s*)?exam/i.test(rawName) ||
    /test\s*mock/i.test(rawName) ||
    /official\s*driving\s*exam/i.test(rawName) ||
    /ikizamini\s*cy'?amategeko/i.test(rawName) ||
    /general\s*(driving|exam)/i.test(rawName)
  ) {
    return normalizeCanonicalExamLanguage(fallbackLanguage);
  }
  return normalizeCanonicalExamLanguage(fallbackLanguage);
}

