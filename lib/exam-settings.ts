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

export function resolveExplicitExamLanguage(
  source:
    | {
        exam_language?: string | null;
        language?: string | null;
        category_name?: string | null;
        is_module?: boolean;
      }
    | null
    | undefined
): CanonicalExamLanguage | null {
  if (!source || source.is_module) return null;

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

  return null;
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
  const explicit = resolveExplicitExamLanguage(source);
  if (explicit) {
    return explicit;
  }
  return normalizeCanonicalExamLanguage(fallbackLanguage);
}

export function inferCanonicalLanguageFromQuestions(
  questions?: Array<{
    question?: string | null;
    option_a?: string | null;
    option_b?: string | null;
    option_c?: string | null;
    option_d?: string | null;
    explanation?: string | null;
  }> | null
): CanonicalExamLanguage | null {
  if (!Array.isArray(questions) || questions.length === 0) return null;
  const sample = questions
    .slice(0, 10)
    .map(
      (q) =>
        `${q?.question || ""} ${q?.option_a || ""} ${q?.option_b || ""} ${q?.option_c || ""} ${q?.option_d || ""} ${q?.explanation || ""}`
    )
    .join(" ")
    .toLowerCase();
  if (!sample.trim()) return null;

  const rwDomain = [
    "ikinyabiziga",
    "umuhanda",
    "icyapa",
    "ibyapa",
    "umuyobozi",
    "ibinyabiziga",
    "igisubizo",
    "ibisubizo",
    "byemewe",
    "ntibishoboka",
    "amabwiriza",
    "abanyamaguru",
    "umuvuduko",
    "amasangano",
  ];
  const rwCommon = [
    "kugeza",
    "hagati",
    "mbere",
    "nyuma",
    "kandi",
    "cyangwa",
    "igihe",
    "ntabwo",
    "yego",
    "oya",
    "gusa",
    "hose",
    "kugira",
    "uburenganzira",
  ];

  const frDomain = [
    "véhicule",
    "vehicule",
    "conducteur",
    "chaussée",
    "chaussee",
    "panneau",
    "signalisation",
    "priorité",
    "priorite",
    "intersection",
    "vitesse",
    "obligatoire",
    "interdit",
    "piétons",
    "pietons",
    "stationnement",
    "dépassement",
    "depassement",
  ];
  const frCommon = [
    "lorsque",
    "quelle",
    "quels",
    "quelles",
    "dans",
    "avec",
    "sans",
    "pour",
    "entre",
    "avant",
    "après",
    "apres",
    "obligatoirement",
    "aucune",
    "toutes",
  ];

  const enDomain = [
    "vehicle",
    "driver",
    "road",
    "traffic",
    "speed",
    "sign",
    "pedestrian",
    "intersection",
    "required",
    "prohibited",
    "parking",
    "overtaking",
    "carriageway",
    "pavement",
    "roundabout",
  ];
  const enCommon = [
    "must",
    "allowed",
    "when",
    "which",
    "should",
    "cannot",
    "before",
    "after",
    "between",
    "during",
    "without",
    "following",
    "neither",
    "always",
  ];

  const countHits = (words: string[], weight: number) =>
    words.reduce((acc, word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?:^|[^a-zàâäéèêëîïôöùûüç])${escaped}(?:$|[^a-zàâäéèêëîïôöùûüç])`, "i");
      return regex.test(sample) ? acc + weight : acc;
    }, 0);

  const rwScore = countHits(rwDomain, 2) + countHits(rwCommon, 1);
  const frScore = countHits(frDomain, 2) + countHits(frCommon, 1);
  const enScore = countHits(enDomain, 2) + countHits(enCommon, 1);

  if (frScore > rwScore && frScore > enScore && frScore >= 2) return "French";
  if (enScore > rwScore && enScore > frScore && enScore >= 2) return "English";
  if (rwScore > frScore && rwScore > enScore && rwScore >= 2) return "Kinyarwanda";
  return null;
}
