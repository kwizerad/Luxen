"use client";

import type { ExamAnswer, ExamAttempt, ExamQuestion } from "@/lib/database.types";
import { invalidateStudentExamHistoryCache, studentCache } from "@/lib/student-cache";

const SAVING_CONFIG_STORAGE_KEY = "exam_saving_config_v1";
const HISTORY_STORAGE_PREFIX = "exam_browser_history_";
const MAX_BROWSER_HISTORY_ITEMS = 80;

export interface ExamSavingConfig {
  saveIndividualExams: boolean;
  saveGroupExams: boolean;
  updatedAt?: string;
}

export interface BrowserExamAttempt extends ExamAttempt {
  answers: ExamAnswer[];
  challenge_id?: string | null;
  is_module?: boolean;
  module_id?: string | null;
  module_title?: string | null;
  exam_type?: string | null;
  passed?: boolean;
  exam_language?: string | null;
  storage_source?: "browser";
}

export interface BrowserExamRecord {
  attempt: BrowserExamAttempt;
  questions?: ExamQuestion[];
  savedAt: string;
}

export function getBrowserExamSavingConfig(): ExamSavingConfig {
  if (typeof window === "undefined") {
    return { saveIndividualExams: true, saveGroupExams: true };
  }
  try {
    const raw = localStorage.getItem(SAVING_CONFIG_STORAGE_KEY);
    if (!raw) {
      return { saveIndividualExams: true, saveGroupExams: true };
    }
    const parsed = JSON.parse(raw);
    return {
      saveIndividualExams: parsed?.saveIndividualExams !== false,
      saveGroupExams: parsed?.saveGroupExams !== false,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : undefined,
    };
  } catch {
    return { saveIndividualExams: true, saveGroupExams: true };
  }
}

export function saveBrowserExamSavingConfig(partial: {
  saveIndividualExams?: boolean;
  saveGroupExams?: boolean;
}): ExamSavingConfig {
  const current = getBrowserExamSavingConfig();
  const next: ExamSavingConfig = {
    saveIndividualExams:
      partial.saveIndividualExams !== undefined
        ? Boolean(partial.saveIndividualExams)
        : current.saveIndividualExams,
    saveGroupExams:
      partial.saveGroupExams !== undefined
        ? Boolean(partial.saveGroupExams)
        : current.saveGroupExams,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SAVING_CONFIG_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent("system-config-updated", {
          detail: {
            keys: ["save_individual_exams_enabled", "save_group_exams_enabled"],
            config: next,
          },
        })
      );
    } catch {}
  }

  return next;
}

function getHistoryStorageKey(userId: string): string {
  return `${HISTORY_STORAGE_PREFIX}${userId}`;
}

function readRecordsFromLocalStorage(userId: string): BrowserExamRecord[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(getHistoryStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BrowserExamRecord =>
        Boolean(item && item.attempt && item.attempt.id)
    );
  } catch {
    return [];
  }
}

function writeRecordsToLocalStorage(
  userId: string,
  records: BrowserExamRecord[]
): boolean {
  if (typeof window === "undefined" || !userId) return false;
  const trimmed = records.slice(0, MAX_BROWSER_HISTORY_ITEMS);
  try {
    localStorage.setItem(getHistoryStorageKey(userId), JSON.stringify(trimmed));
    return true;
  } catch {
    // If localStorage hits quota (e.g. embedded base64 images inside old review questions),
    // compact older records first, keeping recent review questions intact.
    try {
      const compacted = trimmed.map((rec, idx) =>
        idx < 25
          ? rec
          : {
              ...rec,
              questions: undefined,
            }
      );
      localStorage.setItem(
        getHistoryStorageKey(userId),
        JSON.stringify(compacted)
      );
      return true;
    } catch {
      return false;
    }
  }
}

export function getBrowserExamRecords(userId?: string | null): BrowserExamRecord[] {
  if (!userId) return [];
  return readRecordsFromLocalStorage(userId);
}

export async function getBrowserExamRecordsAsync(
  userId?: string | null
): Promise<BrowserExamRecord[]> {
  if (!userId) return [];
  const localRecords = readRecordsFromLocalStorage(userId);

  try {
    const idbRes = await studentCache.read<BrowserExamRecord[]>(
      "browser_exam_history",
      { tier: "private", userId }
    );
    const idbRecords = Array.isArray(idbRes?.data) ? idbRes.data : [];

    if (idbRecords.length === 0) return localRecords;
    if (localRecords.length === 0) {
      writeRecordsToLocalStorage(userId, idbRecords);
      return idbRecords;
    }

    const byId = new Map<string, BrowserExamRecord>();
    for (const r of [...localRecords, ...idbRecords]) {
      const existing = byId.get(r.attempt.id);
      if (!existing || (r.questions?.length && !existing.questions?.length)) {
        byId.set(r.attempt.id, r);
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) => {
      const tA = new Date(
        a.attempt.completed_at || a.attempt.created_at || a.attempt.started_at || a.savedAt || 0
      ).getTime();
      const tB = new Date(
        b.attempt.completed_at || b.attempt.created_at || b.attempt.started_at || b.savedAt || 0
      ).getTime();
      return tB - tA;
    });
    return merged;
  } catch {
    return localRecords;
  }
}

export function getBrowserExamAttempts(
  userId?: string | null
): BrowserExamAttempt[] {
  return getBrowserExamRecords(userId).map((r) => r.attempt);
}

export async function getBrowserExamAttemptsAsync(
  userId?: string | null
): Promise<BrowserExamAttempt[]> {
  const records = await getBrowserExamRecordsAsync(userId);
  return records.map((r) => r.attempt);
}

export async function saveBrowserExamAttempt(
  userId: string,
  attempt: Partial<BrowserExamAttempt> & { id: string },
  questions?: ExamQuestion[],
  questionDetails?: Record<string, { correct_answer: string; explanation?: string }>
): Promise<BrowserExamRecord> {
  const now = new Date().toISOString();
  const normalizedAttempt: BrowserExamAttempt = {
    id: attempt.id,
    user_id: attempt.user_id || userId,
    category_id: attempt.category_id || "unknown",
    category_name: attempt.category_name || "Rwanda PVS Exam",
    started_at: attempt.started_at || now,
    completed_at: attempt.completed_at ?? now,
    duration_seconds: attempt.duration_seconds ?? 0,
    total_questions: attempt.total_questions ?? (questions?.length || 20),
    correct_answers: attempt.correct_answers ?? 0,
    score_percentage: attempt.score_percentage ?? 0,
    answers: Array.isArray(attempt.answers) ? attempt.answers : [],
    status: attempt.status || "completed",
    submission_reason: attempt.submission_reason || "manual",
    violation_summary: attempt.violation_summary ?? null,
    created_at: attempt.created_at || attempt.completed_at || now,
    challenge_id: attempt.challenge_id ?? null,
    is_module: Boolean(attempt.is_module),
    module_id: attempt.module_id ?? null,
    module_title: attempt.module_title ?? null,
    exam_type: attempt.exam_type ?? null,
    passed: attempt.passed,
    exam_language: attempt.exam_language ?? null,
    storage_source: "browser",
  };

  const hydratedQuestions = Array.isArray(questions) && questions.length > 0
    ? questions.map((q) => {
        const detail = questionDetails?.[q.id];
        return {
          ...q,
          correct_answer: (detail?.correct_answer ?? q.correct_answer) as ExamQuestion["correct_answer"],
          explanation: detail?.explanation ?? q.explanation,
        };
      })
    : undefined;

  const newRecord: BrowserExamRecord = {
    attempt: normalizedAttempt,
    questions: hydratedQuestions,
    savedAt: now,
  };

  const existing = await getBrowserExamRecordsAsync(userId);
  const filtered = existing.filter((r) => r.attempt.id !== normalizedAttempt.id);
  const next = [newRecord, ...filtered].slice(0, MAX_BROWSER_HISTORY_ITEMS);

  writeRecordsToLocalStorage(userId, next);

  try {
    await studentCache.write("browser_exam_history", next, {
      tier: "private",
      userId,
      category: "exam_history",
    });
    if (hydratedQuestions?.length) {
      await studentCache.write(`exam_review_${normalizedAttempt.id}`, hydratedQuestions, {
        tier: "private",
        userId,
        category: "exam_review",
      });
    }
    await invalidateStudentExamHistoryCache(userId);
  } catch {}

  return newRecord;
}

export async function getBrowserExamQuestions(
  userId: string,
  attemptId: string
): Promise<ExamQuestion[] | null> {
  if (!userId || !attemptId) return null;

  const records = await getBrowserExamRecordsAsync(userId);
  const match = records.find((r) => r.attempt.id === attemptId);
  if (match?.questions?.length) {
    return match.questions;
  }

  try {
    const cached = await studentCache.read<ExamQuestion[]>(`exam_review_${attemptId}`, {
      tier: "private",
      userId,
    });
    if (cached?.data?.length) {
      return cached.data;
    }
  } catch {}

  return null;
}

export async function deleteBrowserExamAttempt(
  userId: string,
  attemptId: string
): Promise<void> {
  if (!userId || !attemptId) return;
  const existing = await getBrowserExamRecordsAsync(userId);
  const next = existing.filter((r) => r.attempt.id !== attemptId);
  writeRecordsToLocalStorage(userId, next);
  try {
    await studentCache.write("browser_exam_history", next, {
      tier: "private",
      userId,
      category: "exam_history",
    });
    await studentCache.remove(`exam_review_${attemptId}`, {
      tier: "private",
      userId,
    });
    await invalidateStudentExamHistoryCache(userId);
  } catch {}
}

export async function hasBrowserExamHistory(
  userId?: string | null
): Promise<boolean> {
  if (!userId) return false;
  const local = readRecordsFromLocalStorage(userId);
  if (local.length > 0) return true;
  const all = await getBrowserExamRecordsAsync(userId);
  return all.length > 0;
}
