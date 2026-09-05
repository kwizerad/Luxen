"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { normalizeExamSettings, isWithinAvailabilityWindow, questionHasAnyImage, shuffle } from "@/lib/exam-settings";
import { FREE_EXAM_ATTEMPTS_LIMIT } from "@/lib/anonymous-exam-config";
import type { ExamCategory, ExamQuestion } from "@/lib/database.types";

/**
 * After this many *different* device fingerprints from the same IP have
 * each exhausted their free attempts, stop granting new "fresh device"
 * free attempts from that IP too — this makes it harder to fool the limit
 * by simply clearing localStorage/site data to reset the fingerprint.
 */
const IP_RESET_ALLOWANCE = 3;

function getClientIP(): string {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("remote-addr") || "unknown";
}

/** Published exam categories, readable without authentication (bypasses RLS via the service role). */
export async function getPublicExamCategories() {
  const supabase = createAdminClient();

  const { data: categories, error } = await supabase
    .from("exam_categories")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const { data: settingsData } = await supabase
    .from("exam_settings")
    .select("category_id,duration_minutes,question_count");

  const settingsMap = new Map<string, { duration_minutes?: number; question_count?: number }>();
  for (const s of settingsData || []) {
    settingsMap.set(s.category_id, { duration_minutes: s.duration_minutes, question_count: s.question_count });
  }

  const categoriesWithSettings = (categories || []).map((c: ExamCategory) => ({
    ...c,
    duration_minutes: settingsMap.get(c.id)?.duration_minutes ?? undefined,
    question_count: settingsMap.get(c.id)?.question_count ?? undefined,
  }));

  return { categories: categoriesWithSettings };
}

/** Read-only check of how many free attempts a fingerprint has left (for UI gating). */
export async function checkAnonymousExamStatus(fingerprint: string) {
  if (!fingerprint) {
    return { attemptsUsed: 0, remaining: FREE_EXAM_ATTEMPTS_LIMIT, requiresLogin: false };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("anonymous_exam_attempts")
    .select("attempt_count")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  const attemptsUsed = data?.attempt_count || 0;
  const remaining = Math.max(0, FREE_EXAM_ATTEMPTS_LIMIT - attemptsUsed);
  return { attemptsUsed, remaining, requiresLogin: remaining <= 0 };
}

/**
 * Starts a free practice exam for an anonymous visitor. Enforces the free
 * attempt limit server-side (never trusts the client), and throws
 * `Error("LOGIN_REQUIRED")` once the fingerprint (or its IP, see above) has
 * exhausted its free attempts.
 */
export async function startAnonymousExam(categoryId: string, fingerprint: string) {
  if (!categoryId) throw new Error("categoryId is required");
  if (!fingerprint) throw new Error("LOGIN_REQUIRED");

  const supabase = createAdminClient();
  const ipAddress = getClientIP();

  const { data: existing } = await supabase
    .from("anonymous_exam_attempts")
    .select("id, attempt_count")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  const attemptsUsed = existing?.attempt_count || 0;

  if (attemptsUsed >= FREE_EXAM_ATTEMPTS_LIMIT) {
    throw new Error("LOGIN_REQUIRED");
  }

  if (ipAddress && ipAddress !== "unknown") {
    const { count: exhaustedFromIp } = await supabase
      .from("anonymous_exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("attempt_count", FREE_EXAM_ATTEMPTS_LIMIT)
      .neq("fingerprint", fingerprint);

    if ((exhaustedFromIp || 0) >= IP_RESET_ALLOWANCE) {
      throw new Error("LOGIN_REQUIRED");
    }
  }

  const now = new Date().toISOString();
  if (existing) {
    await supabase
      .from("anonymous_exam_attempts")
      .update({
        attempt_count: attemptsUsed + 1,
        ip_address: ipAddress,
        last_attempt_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("anonymous_exam_attempts").insert({
      fingerprint,
      ip_address: ipAddress,
      attempt_count: 1,
      first_attempt_at: now,
      last_attempt_at: now,
      updated_at: now,
    });
  }

  const { data: rawSettings, error: settingsError } = await supabase
    .from("exam_settings")
    .select("question_count,duration_minutes,sorting_mode,available_from,available_to")
    .eq("category_id", categoryId)
    .maybeSingle();

  if (settingsError) {
    const message = settingsError.message || "";
    if (
      !message.toLowerCase().includes("does not exist") &&
      !message.toLowerCase().includes("could not find the table") &&
      !message.toLowerCase().includes("schema cache")
    ) {
      throw settingsError;
    }
  }

  const settings = normalizeExamSettings(rawSettings ?? undefined);
  const nowDate = new Date();

  if (!isWithinAvailabilityWindow(nowDate, settings.available_from, settings.available_to)) {
    throw new Error("Exam is not available at this time.");
  }

  const { data: questions, error: qError } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("category_id", categoryId);

  if (qError) throw qError;

  const typedQuestions = (questions || []) as ExamQuestion[];
  const withPic = typedQuestions.filter(questionHasAnyImage);
  const textOnly = typedQuestions.filter((q) => !questionHasAnyImage(q));

  let picked: ExamQuestion[] = [];
  const mode = settings.sorting_mode;
  const count = settings.question_count;

  if (mode === "TEXT_ONLY") {
    picked = shuffle(textOnly).slice(0, count);
  } else if (mode === "WITH_PICTURE") {
    picked = shuffle(withPic).slice(0, count);
  } else if (mode === "MIXED_50") {
    const half = Math.floor(count / 2);
    const first = shuffle(withPic).slice(0, half);
    const second = shuffle(textOnly).slice(0, count - first.length);
    picked = shuffle([...first, ...second]).slice(0, count);
  } else {
    picked = shuffle(typedQuestions).slice(0, count);
  }

  // Never send correct_answer/explanation to the client before submission —
  // otherwise anyone can read the answer key straight from the network tab.
  const sanitizedQuestions = picked.map(({ correct_answer, explanation, ...rest }) => rest);

  return {
    categoryId,
    settings: {
      question_count: settings.question_count,
      duration_minutes: settings.duration_minutes,
      sorting_mode: settings.sorting_mode,
      available_from: settings.available_from,
      available_to: settings.available_to,
    },
    questions: sanitizedQuestions,
    serverTime: new Date().toISOString(),
    remainingFreeAttempts: Math.max(0, FREE_EXAM_ATTEMPTS_LIMIT - (attemptsUsed + 1)),
  };
}

/**
 * Grades a free anonymous exam server-side. Never trusts client-supplied
 * is_correct — looks up the real answer key by question id (scoped to the
 * given category) and computes the score itself. Not persisted (anonymous
 * attempts aren't stored in exam_attempts, which requires a user_id).
 * Returns per-question correct_answer/explanation so the review UI can
 * render them now that the exam is over.
 */
export async function submitAnonymousExam(
  fingerprint: string,
  categoryId: string,
  answers: { question_id: string; selected_answer: "A" | "B" | "C" | "D" | null; time_spent_seconds?: number }[]
) {
  if (!fingerprint) throw new Error("LOGIN_REQUIRED");
  if (!categoryId) throw new Error("categoryId is required");
  if (!Array.isArray(answers) || answers.length === 0) throw new Error("answers are required");

  const supabase = createAdminClient();

  // Sanity check: only grade for a fingerprint that has genuinely started at
  // least one free exam (via startAnonymousExam), so this can't be used as a
  // standalone answer-key oracle.
  const { data: existing } = await supabase
    .from("anonymous_exam_attempts")
    .select("attempt_count")
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (!existing || (existing.attempt_count || 0) <= 0) {
    throw new Error("LOGIN_REQUIRED");
  }

  const questionIds = answers.map((a) => a.question_id);
  const { data: answerKeyRows, error } = await supabase
    .from("exam_questions")
    .select("id, correct_answer, explanation")
    .eq("category_id", categoryId)
    .in("id", questionIds);

  if (error) throw error;

  const answerKey = new Map((answerKeyRows || []).map((q) => [q.id, { correct_answer: q.correct_answer, explanation: q.explanation }]));

  let correctAnswers = 0;
  const gradedAnswers = answers.map((ans) => {
    const isCorrect = answerKey.get(ans.question_id)?.correct_answer === ans.selected_answer;
    if (isCorrect) correctAnswers++;
    return {
      question_id: ans.question_id,
      selected_answer: ans.selected_answer,
      is_correct: isCorrect,
      time_spent_seconds: ans.time_spent_seconds,
    };
  });

  const questionDetails: Record<string, { correct_answer: string; explanation?: string }> = {};
  answerKey.forEach((value, id) => {
    questionDetails[id] = { correct_answer: value.correct_answer as string, explanation: value.explanation };
  });

  return {
    correctAnswers,
    scorePercentage: Math.round((correctAnswers / answers.length) * 100),
    answers: gradedAnswers,
    questionDetails,
  };
}
