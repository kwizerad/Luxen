import type { ExamQuestion, ExamQuestionSortingMode, ExamSettings } from "@/lib/database.types";

export const DEFAULT_EXAM_SETTINGS = {
  question_count: 20,
  duration_minutes: 20,
  sorting_mode: "RANDOM" as ExamQuestionSortingMode,
  available_from: null as string | null,
  available_to: null as string | null,
};

export type ExamSettingsInput = {
  question_count?: number;
  duration_minutes?: number;
  sorting_mode?: ExamQuestionSortingMode;
  available_from?: string | null;
  available_to?: string | null;
};

export function normalizeExamSettings(
  partial: Partial<Pick<ExamSettings, "question_count" | "duration_minutes" | "sorting_mode" | "available_from" | "available_to">> | null | undefined,
) {
  return {
    question_count: partial?.question_count ?? DEFAULT_EXAM_SETTINGS.question_count,
    duration_minutes: partial?.duration_minutes ?? DEFAULT_EXAM_SETTINGS.duration_minutes,
    sorting_mode: (partial?.sorting_mode ?? DEFAULT_EXAM_SETTINGS.sorting_mode) as ExamQuestionSortingMode,
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

