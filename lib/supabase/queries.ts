"use client";

import { createClient } from "./client";
import { isAdmin, isPrimaryAdmin, canAddQuestions, hasReadWriteQuestionAccess, canManageExamSettings, PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { normalizeExamSettings, isWithinAvailabilityWindow, questionHasAnyImage, shuffle } from "@/lib/exam-settings";
import { EXTERNAL_EXAM_CATEGORY_ID, isExternalExamCategoryId, isExternalModuleId, isExternalLessonId } from "@/lib/supabase/external";
import { secureApiPost } from "@/lib/e2e-crypto";
import { isUUID } from "@/lib/utils";
import type { ExamCategory, ExamQuestion, ExamAnswer, ExamAttempt, ExamQuestionSortingMode, ModuleExamSettings, ModuleExamQuestion, ModuleExamAttempt, ModuleExamAnswer, ExamRetakeRequest, ExamRetakeType, ExamRetakeStatus } from "@/lib/database.types";

// Helper function to handle Supabase auth lock errors and enrich user profile role
async function getAuthUser() {
  try {
    const user = await getCurrentUser();
    if (user) return user;
  } catch (error: any) {
    if (error?.message?.includes("lock") || error?.message?.includes("Lock")) {
      console.warn("Supabase auth lock error (non-critical):", error.message);
      throw new Error("Auth temporarily unavailable, please try again");
    }
  }
  const supabase = createClient();
  try {
    const result = await supabase.auth.getUser();
    return result.data.user;
  } catch (error: any) {
    // Suppress lock errors - they're internal Supabase timing issues
    if (error?.message?.includes("lock") || error?.message?.includes("Lock")) {
      console.warn("Supabase auth lock error (non-critical):", error.message);
      throw new Error("Auth temporarily unavailable, please try again");
    }
    throw error;
  }
}

// ============================================================================
// EXAM CATEGORIES QUERIES
// ============================================================================

export async function getExamCategories() {
  const user = await getAuthUser().catch(() => null);
  const isUserAdmin = Boolean(user && isAdmin(user));

  console.log("[ExamCategories] Fetching exam categories, isUserAdmin:", isUserAdmin);

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/exam-categories", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.categories) && json.categories.length > 0) {
          console.log("[ExamCategories] Loaded categories via /api/exam-categories:", json.categories);
          const questionCounts: Record<string, number> = {};
          for (const c of json.categories) {
            questionCounts[c.id] = c.question_count || 365;
          }
          return { categories: json.categories, question_counts: questionCounts, is_admin: isUserAdmin };
        }
      }
    } catch (apiCatErr) {
      console.warn("[ExamCategories] /api/exam-categories fetch error, using Supabase client fallback:", apiCatErr);
    }
  }

  const supabase = createClient();

  let query = supabase
    .from("exam_categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isUserAdmin) {
    query = query.eq("is_published", true);
  }

  const fetchPromise = Promise.all([
    query,
    supabase.from("exam_settings").select("category_id,duration_minutes,question_count"),
    supabase.from("exam_questions").select("category_id"),
  ]);

  const timeoutPromise = new Promise<any>((_, reject) =>
    setTimeout(() => reject(new Error("Exam categories fetch timeout")), 5000)
  );

  let categories: any[] = [];
  let settingsData: any[] = [];
  let questionCategoryRows: any[] = [];

  try {
    const results: any = await Promise.race([fetchPromise, timeoutPromise]);
    categories = results[0].data || [];
    const error = results[0].error;
    settingsData = results[1].data || [];
    const settingsError = results[1].error;
    questionCategoryRows = results[2].data || [];

    if (error) {
      console.warn("Exam categories fetch error:", error);
      return { categories: [], question_counts: {}, is_admin: isUserAdmin };
    }

    if (settingsError && !settingsError.message.toLowerCase().includes("does not exist")) {
      console.error("Error fetching exam settings:", settingsError);
    }
  } catch (err) {
    console.warn("Exam categories fetch timeout or error:", err);
  }

  const settingsMap = new Map<string, { duration_minutes?: number; question_count?: number }>();
  for (const s of settingsData || []) {
    settingsMap.set(s.category_id, { duration_minutes: s.duration_minutes, question_count: s.question_count });
  }

  const questionCounts: Record<string, number> = {};
  for (const c of categories || []) {
    questionCounts[c.id] = 0;
  }
  for (const q of questionCategoryRows || []) {
    if (q.category_id) {
      questionCounts[q.category_id] = (questionCounts[q.category_id] || 0) + 1;
    }
  }

  const categoriesWithSettings: ExamCategory[] = (categories || []).map((c: ExamCategory) => ({
    ...c,
    duration_minutes: settingsMap.get(c.id)?.duration_minutes ?? undefined,
    question_count: settingsMap.get(c.id)?.question_count ?? undefined,
  }));

  // Also check if External DB Exam is published (or if admin is viewing categories)
  try {
    const extKeys = [
      "external_exam_published",
      "external_exam_title",
      "external_exam_duration_minutes",
      "external_exam_question_count",
    ];
    let extCfgRows: Array<{ key: string; value: string }> | null = null;

    if (typeof window !== "undefined") {
      try {
        const res = await fetch(
          `/api/system-config?keys=${encodeURIComponent(extKeys.join(","))}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.configs)) {
            extCfgRows = json.configs;
          }
        }
      } catch {}
    }

    if (!extCfgRows) {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", extKeys);
      extCfgRows = data || [];
    }

    const extMap = new Map<string, string>();
    for (const r of extCfgRows || []) {
      if (r.key && r.value !== undefined && r.value !== null) {
        extMap.set(String(r.key), String(r.value));
      }
    }
    const extPublished = extMap.get("external_exam_published") === "true";
    const rawExtTitle = extMap.get("external_exam_title") || "Navo's Mock Exam (External DB)";
    const activeUiLang = typeof window !== "undefined" ? localStorage.getItem("luxen_lang") || "rw" : "rw";
    const isDefaultExtTitle =
      rawExtTitle === "Navo's Mock Exam (External DB)" ||
      rawExtTitle === "Navo's Mock Exam (External Question Bank)";
    const extTitle = isDefaultExtTitle
      ? activeUiLang === "fr"
        ? "Examen Blanc Officiel du Code de la Route"
        : activeUiLang === "en"
        ? "Official Traffic Rules & Road Signs Mock Exam"
        : "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda"
      : rawExtTitle;
    const extDesc =
      activeUiLang === "fr"
        ? "Examen blanc officiel des règles de circulation et des panneaux routiers"
        : activeUiLang === "en"
        ? "Official Traffic Rules & Road Signs Mock Exam from Question Bank"
        : "Ikizamini cy'imyitozo cy'amategeko y'umuhanda n'ibyapa by'umuhanda";
    const extDuration = Number(extMap.get("external_exam_duration_minutes")) || 20;
    const extQuestions = Number(extMap.get("external_exam_question_count")) || 20;

    const existingIdx = categoriesWithSettings.findIndex((c) => c.id === EXTERNAL_EXAM_CATEGORY_ID);
    if (extPublished || isUserAdmin) {
      const extCategoryObj: ExamCategory = {
        id: EXTERNAL_EXAM_CATEGORY_ID,
        name: extTitle,
        description: extDesc,
        created_by: user?.id || "system",
        is_published: extPublished,
        duration_minutes: extDuration,
        question_count: extQuestions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        categoriesWithSettings[existingIdx] = {
          ...categoriesWithSettings[existingIdx],
          ...extCategoryObj,
        };
      } else if (extPublished || isUserAdmin) {
        categoriesWithSettings.unshift(extCategoryObj);
      }
      if (!questionCounts[EXTERNAL_EXAM_CATEGORY_ID]) {
        questionCounts[EXTERNAL_EXAM_CATEGORY_ID] = 451;
      }
    } else if (existingIdx >= 0 && !isUserAdmin) {
      categoriesWithSettings.splice(existingIdx, 1);
    }
  } catch (err) {
    console.error("getExamCategories inner error:", err);
  }

  // Guarantee at least 1 exam category is available for students so exam never blocks
  if (categoriesWithSettings.length === 0) {
    const fallbackCategory: ExamCategory = {
      id: EXTERNAL_EXAM_CATEGORY_ID,
      name: "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda (Official Mock Exam)",
      description: "Ikizamini cyuzuye cy'ibibazo 20 by'amategeko y'umuhanda n'ibyapa mu Kinyarwanda cyimbitse.",
      created_by: "system",
      is_published: true,
      duration_minutes: 20,
      question_count: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    categoriesWithSettings.push(fallbackCategory);
    questionCounts[EXTERNAL_EXAM_CATEGORY_ID] = 451;
  }

  return { categories: categoriesWithSettings, question_counts: questionCounts, is_admin: isUserAdmin };
}

export async function createExamCategory(name: string, is_published = false) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized. Only admins can create categories.");
  }

  if (!name || name.trim() === "") {
    throw new Error("Category name is required");
  }

  const { data, error } = await supabase
    .from("exam_categories")
    .insert([{ name: name.trim(), created_by: user.id, is_published }])
    .select()
    .single();

  if (error) throw error;
  return { category: data };
}

export async function updateExamCategory(id: string, name: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized. Only admins can update categories.");
  }

  if (!id || !name || name.trim() === "") {
    throw new Error("Category ID and name are required");
  }

  const { data, error } = await supabase
    .from("exam_categories")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { category: data };
}

export async function deleteExamCategory(id: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized. Only admins can delete categories.");
  }

  if (!id) {
    throw new Error("Category ID is required");
  }

  // First, delete all questions in this category
  const { error: questionsError } = await supabase
    .from("exam_questions")
    .delete()
    .eq("category_id", id);

  if (questionsError) throw questionsError;

  // Then delete the category
  const { error } = await supabase
    .from("exam_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

export async function toggleCategoryPublishStatus(id: string, is_published: boolean) {
  const supabase = createClient();
  const user = await getAuthUser();

  const isUserAdmin = Boolean(user && isAdmin(user));

  if (!user || !isUserAdmin) {
    throw new Error("Unauthorized. Admin access required.");
  }

  if (!id || typeof is_published !== "boolean") {
    throw new Error("Category ID and is_published are required");
  }

  if (isExternalExamCategoryId(id)) {
    const res = await fetch("/api/external-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_publish_settings",
        payload: { examPublished: is_published },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update external exam publish status");
    }
    return {
      success: true,
      category: { id, is_published },
      message: is_published ? "External exam published" : "External exam unpublished",
    };
  }

  const { data, error } = await supabase
    .from("exam_categories")
    .update({ is_published, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return { 
    success: true, 
    category: data,
    message: is_published ? "Category published" : "Category unpublished"
  };
}

// ============================================================================
// EXAM QUESTIONS QUERIES
// ============================================================================

export async function getExamQuestions(categoryId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized");
  }

  let query = supabase.from("exam_questions").select("*");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data: questions, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return { questions: questions || [] };
}

export async function getPublicExamQuestions(categoryId?: string, search?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  let query = supabase.from("exam_questions").select("*");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    query = query.or(`question.ilike.%${search}%,option_a.ilike.%${search}%,option_b.ilike.%${search}%,option_c.ilike.%${search}%,option_d.ilike.%${search}%,explanation.ilike.%${search}%`);
  }

  const { data: questions, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return { questions: questions || [] };
}

export async function createExamQuestion(questionData: {
  category_id: string;
  question?: string;
  question_image?: string;
  option_a?: string;
  option_a_image?: string;
  option_b?: string;
  option_b_image?: string;
  option_c?: string;
  option_c_image?: string;
  option_d?: string;
  option_d_image?: string;
  correct_answer: string;
  explanation?: string;
}) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized. You must be an admin to add questions.");
  }

  if (!canAddQuestions(user)) {
    throw new Error("You don't have permission to add questions");
  }

  const {
    category_id,
    question,
    question_image,
    option_a,
    option_a_image,
    option_b,
    option_b_image,
    option_c,
    option_c_image,
    option_d,
    option_d_image,
    correct_answer,
    explanation,
  } = questionData;

  if (!category_id || !correct_answer) {
    throw new Error("Missing required fields");
  }

  // Validate that question has at least text OR image
  if ((!question || question.trim() === "") && (!question_image || question_image.trim() === "")) {
    throw new Error("Question must have either text or an image");
  }

  // Validate that each option has at least text OR image
  const validateOption = (text: string | undefined, image: string | undefined, optionName: string) => {
    if ((!text || text.trim() === "") && (!image || image.trim() === "")) {
      return `${optionName} must have either text or an image`;
    }
    return null;
  };

  const optionErrors = [
    validateOption(option_a, option_a_image, "Option A"),
    validateOption(option_b, option_b_image, "Option B"),
    validateOption(option_c, option_c_image, "Option C"),
    validateOption(option_d, option_d_image, "Option D"),
  ].filter(Boolean);

  if (optionErrors.length > 0) {
    throw new Error(optionErrors.join("; "));
  }

  if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
    throw new Error("Invalid correct answer");
  }

  // Check for duplicate question
  const normalizedQuestion = question?.trim().toLowerCase() || "";
  const { data: existingQuestions, error: checkError } = await supabase
    .from("exam_questions")
    .select("id, question, option_a, option_b, option_c, option_d")
    .eq("category_id", category_id)
    .ilike("question", normalizedQuestion);

  if (checkError) {
    throw new Error("Error checking for duplicates");
  }

  const isDuplicate = existingQuestions?.some((q: { question: string | null; option_a: string | null; option_b: string | null; option_c: string | null; option_d: string | null }) => {
    const normalize = (str: string | null | undefined) => (str?.trim().toLowerCase() || "");
    const questionTextMatch = normalize(q.question) === normalizedQuestion;
    const optionAMatch = normalize(q.option_a) === normalize(option_a);
    const optionBMatch = normalize(q.option_b) === normalize(option_b);
    const optionCMatch = normalize(q.option_c) === normalize(option_c);
    const optionDMatch = normalize(q.option_d) === normalize(option_d);

    return questionTextMatch && optionAMatch && optionBMatch && optionCMatch && optionDMatch;
  });

  if (isDuplicate) {
    throw new Error("A question with the same text and identical options already exists in this category");
  }

  const { data, error } = await supabase
    .from("exam_questions")
    .insert([{
      category_id,
      question,
      question_image,
      option_a,
      option_a_image,
      option_b,
      option_b_image,
      option_c,
      option_c_image,
      option_d,
      option_d_image,
      correct_answer,
      explanation,
      created_by: user.id,
    }])
    .select()
    .single();

  if (error) throw error;
  return { question: data };
}

export async function updateExamQuestion(id: string, updateData: Partial<ExamQuestion>) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized");
  }

  if (!hasReadWriteQuestionAccess(user)) {
    throw new Error("You don't have permission to edit questions");
  }

  if (!id) {
    throw new Error("Question ID is required");
  }

  const { data, error } = await supabase
    .from("exam_questions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { question: data };
}

export async function deleteExamQuestion(id: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized");
  }

  if (!hasReadWriteQuestionAccess(user)) {
    throw new Error("You don't have permission to delete questions");
  }

  if (!id) {
    throw new Error("Question ID is required");
  }

  const { error } = await supabase
    .from("exam_questions")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// ============================================================================
// EXAM ATTEMPTS QUERIES
// ============================================================================

const EXAM_ATTEMPT_COLUMNS =
  "id, user_id, category_id, category_name, started_at, completed_at, duration_seconds, total_questions, correct_answers, score_percentage, answers, status, created_at, updated_at";

export async function getExamAttempts(userId?: string, attemptId?: string) {
  const supabase = createClient();
  const user = await getAuthUser().catch(() => null);

  const isUserAdmin = Boolean(user && isAdmin(user));

  // If requesting specific attempt
  if (attemptId) {
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .select(EXAM_ATTEMPT_COLUMNS)
      .eq("id", attemptId)
      .maybeSingle();

    if (error) {
      console.warn("Error fetching exam attempt by id:", error.message);
      return { attempt: null };
    }

    if (!attempt) return { attempt: null };

    // Users can only see their own attempts, admins can see all
    if (user && attempt.user_id !== user.id && !isUserAdmin) {
      throw new Error("Unauthorized");
    }

    return { attempt };
  }

  // If requesting user's attempts
  const targetId = userId || user?.id;

  if (targetId) {
    if (userId && user && userId !== user.id && !isUserAdmin) {
      throw new Error("Unauthorized");
    }

    if (!isUUID(targetId)) {
      return { attempts: [] };
    }

    const { data: attempts, error } = await supabase
      .from("exam_attempts")
      .select(EXAM_ATTEMPT_COLUMNS)
      .eq("user_id", targetId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Error fetching user attempts:", error.message);
      return { attempts: [] };
    }
    return { attempts: attempts || [] };
  }

  return { attempts: [] };
}

export async function deleteExamAttempt(attemptId: string) {
  if (!attemptId) {
    throw new Error("Attempt ID is required");
  }

  const supabase = createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.warn("Failed to get session before deleting exam attempt:", sessionError.message);
  }

  const accessToken = session?.access_token;

  const response = await fetch(`/api/exam-attempts/${attemptId}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || result?.details || "Failed to delete exam attempt");
  }

  return result;
}

export async function getExamAttemptsWithQuestions(attemptId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (attemptId) {
    // Get the specific attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select(EXAM_ATTEMPT_COLUMNS)
      .eq("id", attemptId)
      .single();

    if (attemptError) throw attemptError;

    // Users can only see their own attempts, admins can see all
    if (attempt.user_id !== user.id && !isAdmin(user)) {
      throw new Error("Unauthorized");
    }

    // Get all question IDs from the answers
    const questionIds = attempt.answers.map((answer: any) => answer.question_id);

    if (questionIds.length === 0) {
      return { attempt: { ...attempt, questions: [] } };
    }

    // Fetch the full question details
    const { data: questions, error: questionsError } = await supabase
      .from("exam_questions")
      .select("*")
      .in("id", questionIds);

    if (questionsError) throw questionsError;

    // Map questions to answers
    const questionsWithAnswers = attempt.answers.map((answer: any) => {
      const question = questions?.find((q: any) => q.id === answer.question_id);
      return {
        ...answer,
        question: question || null
      };
    });

    return { 
      attempt: { 
        ...attempt, 
        answers: questionsWithAnswers,
        questions: questions || []
      } 
    };
  }

  throw new Error("Attempt ID is required for detailed view");
}

export async function getExamSavingConfig(): Promise<{
  saveIndividualExams: boolean;
  saveGroupExams: boolean;
}> {
  try {
    let rows: Array<{ key: string; value: string }> | null = null;

    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/system-config?keys=save_individual_exams_enabled,save_group_exams_enabled", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.configs)) {
            rows = json.configs;
          }
        }
      } catch {
        // Fallback to direct Supabase query below
      }
    }

    if (!rows) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["save_individual_exams_enabled", "save_group_exams_enabled"]);

      if (!error && data) {
        rows = data;
      }
    }

    if (!rows) {
      return { saveIndividualExams: true, saveGroupExams: true };
    }

    let saveIndividualExams = true;
    let saveGroupExams = true;

    for (const row of rows) {
      if (row.key === "save_individual_exams_enabled") {
        saveIndividualExams = String(row.value).toLowerCase() !== "false";
      } else if (row.key === "save_group_exams_enabled") {
        saveGroupExams = String(row.value).toLowerCase() !== "false";
      }
    }

    return { saveIndividualExams, saveGroupExams };
  } catch {
    return { saveIndividualExams: true, saveGroupExams: true };
  }
}

export async function updateExamSavingConfig(config: {
  saveIndividualExams?: boolean;
  saveGroupExams?: boolean;
}): Promise<void> {
  const updates: Promise<any>[] = [];
  if (config.saveIndividualExams !== undefined) {
    updates.push(
      updateSystemConfig(
        "save_individual_exams_enabled",
        config.saveIndividualExams.toString(),
        "Allow or disallow saving individual exam attempts to database and user history"
      )
    );
  }
  if (config.saveGroupExams !== undefined) {
    updates.push(
      updateSystemConfig(
        "save_group_exams_enabled",
        config.saveGroupExams.toString(),
        "Allow or disallow saving group exam challenges and results to database and history"
      )
    );
  }
  await Promise.all(updates);
}

export async function createExamAttempt(attemptData: {
  category_id: string;
  category_name: string;
  total_questions: number;
  answers: ExamAnswer[];
  duration_seconds: number;
  status?: 'in_progress' | 'completed' | 'abandoned';
  submission_reason?: 'manual' | 'page_closed' | 'cheating_violation' | 'time_expired';
  violation_summary?: string;
  is_group_challenge?: boolean;
  challenge_id?: string;
}) {
  const supabase = createClient();
  let user = await getAuthUser().catch(() => null);

  if (!user && typeof window !== "undefined") {
    try {
      const { data: { user: clientUser } } = await supabase.auth.getUser();
      if (clientUser) user = clientUser;
    } catch {}
  }

  if (!user && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("navo_user") || sessionStorage.getItem("navo_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) user = parsed;
      }
    } catch {}
  }

  const { category_id, category_name, total_questions, answers, duration_seconds, status = 'completed', is_group_challenge } = attemptData;

  if (!category_id || !category_name || !total_questions || !answers) {
    throw new Error("Missing required fields");
  }

  // Handle External DB Exam grading and persistence via server route
  if (isExternalExamCategoryId(category_id)) {
    const { ok, data: json } = await secureApiPost("/api/external-courses/exam", {
      action: "submit_exam",
      attemptData,
    });
    if (!ok) {
      throw new Error(json?.error || "Failed to submit external exam");
    }
    return {
      attempt: json.attempt,
      questionDetails: json.questionDetails || {},
    };
  }

  // Check admin saving settings
  const savingConfig = await getExamSavingConfig();
  const shouldSave = is_group_challenge
    ? savingConfig.saveGroupExams
    : savingConfig.saveIndividualExams;

  // Never trust client-supplied is_correct — look up the real answer key
  // server-side so a tampered request can't fake a passing score.
  const questionIds = answers.map((ans) => ans.question_id);
  const { data: answerKeyRows, error: answerKeyError } = await supabase
    .from("exam_questions")
    .select("id, correct_answer, explanation")
    .in("id", questionIds);

  if (answerKeyError) throw new Error(answerKeyError.message || "Failed to fetch answer key");

  const answerKey = new Map<string, { correct_answer: string; explanation?: string }>(
    (answerKeyRows || []).map((q: { id: string; correct_answer: string; explanation?: string }) => [
      q.id,
      { correct_answer: q.correct_answer, explanation: q.explanation },
    ])
  );

  let correctAnswers = 0;
  const processedAnswers: ExamAnswer[] = answers.map((ans) => {
    const isCorrect = answerKey.get(ans.question_id)?.correct_answer === ans.selected_answer;
    if (isCorrect) correctAnswers++;
    return {
      question_id: ans.question_id,
      selected_answer: ans.selected_answer,
      is_correct: isCorrect,
      time_spent_seconds: ans.time_spent_seconds,
    };
  });

  const hasAnsweredAny = answers.some((ans) => Boolean(ans.selected_answer));
  const answersToPersist: ExamAnswer[] = hasAnsweredAny ? processedAnswers : [];

  const scorePercentage = Math.round((correctAnswers / total_questions) * 100);
  const questionDetails: Record<string, { correct_answer: string; explanation?: string }> = {};
  if (hasAnsweredAny) {
    answerKey.forEach((value, id) => {
      questionDetails[id] = { correct_answer: value.correct_answer as string, explanation: value.explanation };
    });
  }

  const hasValidUser = Boolean(user?.id && isUUID(user.id));
  const attemptUserId = hasValidUser ? user!.id : null;

  const transientAttempt: ExamAttempt = {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: attemptUserId || "guest",
    category_id,
    category_name,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    duration_seconds,
    total_questions,
    correct_answers: correctAnswers,
    score_percentage: scorePercentage,
    answers: answersToPersist,
    status,
    submission_reason: attemptData.submission_reason || 'manual',
    violation_summary: attemptData.violation_summary || null,
  };

  // If exam saving is disabled by Admin or user is guest/transient, return transient result without database insertion
  if (!shouldSave || !hasValidUser || !attemptUserId) {
    return {
      attempt: transientAttempt,
      questionDetails,
      is_saved: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from("exam_attempts")
      .insert([{
        user_id: attemptUserId,
        category_id,
        category_name,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds,
        total_questions,
        correct_answers: correctAnswers,
        score_percentage: scorePercentage,
        answers: answersToPersist,
        status,
        submission_reason: attemptData.submission_reason || 'manual',
        violation_summary: attemptData.violation_summary || null,
      }])
      .select()
      .single();

    if (error) {
      console.warn("Could not persist attempt to db, returning transient:", error.message);
      return {
        attempt: transientAttempt,
        questionDetails,
        is_saved: false,
      };
    }

    // If the student passed (score >= 50), auto-verify provision (category P)
    if (scorePercentage >= 50 && attemptUserId) {
      try {
        await supabase
          .from("user_profiles")
          .update({
            provision_verified: true,
            provision_category: "P",
            provision_verified_at: new Date().toISOString(),
          })
          .eq("id", attemptUserId);
      } catch (provError) {
        console.error("Failed to auto-verify provision:", provError);
      }
    }

    // Notify the student that their exam result is available
    if (attemptUserId) {
      try {
        await createNotification({
          type: "exam_result",
          title: "Exam Result Available",
          message: `Your ${category_name} exam result is now available. Score: ${scorePercentage}%`,
          priority: scorePercentage >= 50 ? "normal" : "urgent",
          target_user_id: attemptUserId,
          related_entity_type: "exam_attempt",
          related_entity_id: data.id,
          action_url: "/dashboard",
        });
      } catch (notifyError) {
        console.warn("Failed to send exam result notification:", notifyError);
      }
    }

    return {
      attempt: data,
      questionDetails,
      is_saved: true,
    };
  } catch (err: any) {
    console.warn("Error inserting exam attempt, returning transient result:", err);
    return {
      attempt: transientAttempt,
      questionDetails,
      is_saved: false,
    };
  }
}

// ============================================================================
// EXAM SETTINGS QUERIES
// ============================================================================

export async function getExamSettings(categoryId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("exam_settings")
    .select("*")
    .eq("category_id", categoryId)
    .maybeSingle();

  if (error) {
    const message = error.message || "";
    if (!message.toLowerCase().includes("does not exist") && 
        !message.toLowerCase().includes("could not find the table") &&
        !message.toLowerCase().includes("schema cache")) {
      throw error;
    }
  }

  return {
    categoryId,
    settings: normalizeExamSettings(data ?? undefined),
  };
}

export async function updateExamSettings(
  categoryId: string,
  settings: {
    question_count: number;
    duration_minutes: number;
    sorting_mode: ExamQuestionSortingMode;
    passing_percentage?: number;
    available_from?: string | null;
    available_to?: string | null;
  }
) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !canManageExamSettings(user)) {
    throw new Error("Unauthorized");
  }

  if (!categoryId) {
    throw new Error("categoryId is required");
  }

  const { question_count, duration_minutes, sorting_mode, passing_percentage, available_from, available_to } = settings;

  if (!Number.isFinite(question_count) || question_count < 1 || question_count > 200) {
    throw new Error("question_count must be between 1 and 200");
  }
  if (!Number.isFinite(duration_minutes) || duration_minutes < 1 || duration_minutes > 300) {
    throw new Error("duration_minutes must be between 1 and 300");
  }
  if (passing_percentage !== undefined && (!Number.isFinite(passing_percentage) || passing_percentage < 1 || passing_percentage > 100)) {
    throw new Error("passing_percentage must be between 1 and 100");
  }
  if (!["RANDOM", "TEXT_ONLY", "WITH_PICTURE", "MIXED_50"].includes(sorting_mode)) {
    throw new Error("Invalid sorting_mode");
  }

  const payload: Record<string, any> = {
    category_id: categoryId,
    question_count,
    duration_minutes,
    sorting_mode,
    available_from,
    available_to,
    updated_by: user.id,
  };
  if (passing_percentage !== undefined) {
    payload.passing_percentage = passing_percentage;
  }

  let { data, error } = await supabase
    .from("exam_settings")
    .upsert([payload], { onConflict: "category_id" })
    .select("*")
    .single();

  if (error && error.message?.includes("passing_percentage")) {
    // If column doesn't exist yet, retry without passing_percentage
    delete payload.passing_percentage;
    const retry = await supabase
      .from("exam_settings")
      .upsert([payload], { onConflict: "category_id" })
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    const message = error.message || "";
    if (message.toLowerCase().includes("does not exist") || 
        message.toLowerCase().includes("could not find the table") ||
        message.toLowerCase().includes("schema cache")) {
      throw new Error("Missing database table exam_settings. Create it in Supabase first.");
    }
    throw error;
  }

  return {
    categoryId,
    settings: normalizeExamSettings(data ? { ...data, passing_percentage: passing_percentage ?? data.passing_percentage } : undefined),
  };
}

// ============================================================================
// EXAM LIMITS QUERIES
// ============================================================================

export async function getExamLimits(userId?: string) {
  const supabase = createClient();
  const user = await getAuthUser().catch(() => null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // If userId provided, check permissions
  if (userId) {
    if (user && userId !== user.id && !isAdmin(user)) {
      throw new Error("Unauthorized");
    }

    if (!isUUID(userId)) {
      return {
        user_id: userId,
        daily_limit: 5,
        is_limited: false,
        attempts_today: 0,
        remaining_attempts: 999999,
        limit_exists: false,
        unlimited: true,
      };
    }

    const { data: limit, error } = await supabase
      .from("user_exam_limits")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    const { count: attemptsToday, error: countError } = await supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("started_at", today.toISOString())
      .lt("started_at", tomorrow.toISOString());

    if (countError) console.warn("Error counting attempts:", countError);

    const isLimited = limit?.is_limited ?? true;
    const dailyLimit = limit?.daily_limit ?? 5;
    const remaining = isLimited ? Math.max(0, dailyLimit - (attemptsToday || 0)) : 999999;

    return {
      user_id: userId,
      daily_limit: dailyLimit,
      is_limited: isLimited,
      attempts_today: attemptsToday || 0,
      remaining_attempts: remaining,
      limit_exists: !!limit,
      unlimited: !isLimited,
    };
  }

  // If admin, return all limits
  if (user && isAdmin(user)) {
    const { data: limits, error } = await supabase
      .from("user_exam_limits")
      .select("*");

    if (error) throw error;
    return { limits: limits || [] };
  }

  // If no user or non-UUID user, return default limit
  if (!user || !isUUID(user.id)) {
    return {
      user_id: user?.id || "guest",
      daily_limit: 5,
      is_limited: false,
      attempts_today: 0,
      remaining_attempts: 999999,
      limit_exists: false,
      unlimited: true,
    };
  }

  // Return current user's limit
  const { data: limit, error } = await supabase
    .from("user_exam_limits")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  const { count: attemptsToday, error: countError } = await supabase
    .from("exam_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString());

  if (countError) console.warn("Error counting attempts:", countError);

  const isLimited = limit?.is_limited ?? true;
  const dailyLimit = limit?.daily_limit ?? 5;
  const remaining = isLimited ? Math.max(0, dailyLimit - (attemptsToday || 0)) : 999999;

  return {
    user_id: user.id,
    daily_limit: dailyLimit,
    is_limited: isLimited,
    attempts_today: attemptsToday || 0,
    remaining_attempts: remaining,
    limit_exists: !!limit,
    unlimited: !isLimited,
  };
}

export async function updateExamLimit(user_id: string, daily_limit?: number, is_limited?: boolean) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }

  if (!user_id || (daily_limit !== undefined && typeof daily_limit !== "number")) {
    throw new Error("user_id is required, daily_limit must be a number if provided");
  }

  if (daily_limit !== undefined && (daily_limit < 1 || daily_limit > 100)) {
    throw new Error("daily_limit must be between 1 and 100");
  }

  const upsertData: Record<string, unknown> = {
    user_id,
    updated_at: new Date().toISOString(),
  };

  if (daily_limit !== undefined) {
    upsertData.daily_limit = daily_limit;
  }

  if (is_limited !== undefined) {
    upsertData.is_limited = is_limited;
  }

  // Use the regular client; RLS policies allow admins to manage exam limits.
  const { data, error } = await supabase
    .from("user_exam_limits")
    .upsert(upsertData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    message: "Exam limit updated successfully",
    limit: data,
  };
}

export async function deleteExamLimit(userId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }

  if (!userId) {
    throw new Error("userId is required");
  }

  // Use the regular client; RLS policies allow admins to manage exam limits.
  const { error } = await supabase
    .from("user_exam_limits")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;

  return {
    success: true,
    message: "Exam limit removed. User will use default limit (5).",
  };
}

// ============================================================================
// EXAM TAKE QUERIES
// ============================================================================

function createSeededRng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seed: string): T[] {
  const rng = createSeededRng(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function getExamForTaking(categoryId: string, challengeId?: string, language?: string) {
  const supabase = createClient();
  let user = await getAuthUser().catch(() => null);

  if (!user && typeof window !== "undefined") {
    try {
      const { data: { user: clientUser } } = await supabase.auth.getUser();
      if (clientUser) user = clientUser;
    } catch {}
  }

  if (!user && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("navo_user") || sessionStorage.getItem("navo_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) user = parsed;
      }
    } catch {}
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const hasValidUser = Boolean(user?.id && isUUID(user.id));

  // Get universal exam limit
  let universalExamLimit = 5;
  try {
    const { data: universalLimit } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "universal_exam_limit")
      .single();

    if (universalLimit?.value) {
      universalExamLimit = parseInt(universalLimit.value, 10) || 5;
    }
  } catch {}

  let isLimited = true;
  let dailyLimit = universalExamLimit;
  let attemptsCount = 0;

  if (hasValidUser && user?.id) {
    try {
      // Get user's daily limit and unlimited status (user limit can override universal)
      const { data: userLimit, error: limitError } = await supabase
        .from("user_exam_limits")
        .select("daily_limit, is_limited")
        .eq("user_id", user.id)
        .single();

      if (limitError && limitError.code !== "PGRST116") {
        console.warn("Could not fetch user limit:", limitError.message);
      }

      isLimited = userLimit?.is_limited ?? true;
      const userLimitValue = userLimit?.daily_limit ?? universalExamLimit;
      dailyLimit = Math.min(userLimitValue, universalExamLimit);
    } catch {}

    try {
      // Count today's attempts
      const { count: attemptsToday, error: countError } = await supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString());

      if (countError) {
        console.warn("Could not count attempts:", countError.message);
      } else {
        attemptsCount = attemptsToday || 0;
      }
    } catch {}
  }

  // Only enforce limit if user is in limited mode
  if (hasValidUser && isLimited && attemptsCount >= dailyLimit) {
    throw new Error(`Daily exam limit reached. You can take ${dailyLimit} exam(s) per day. Please try again tomorrow.`);
  }

  const activeLang =
    language ||
    (typeof window !== "undefined" ? localStorage.getItem("luxen_lang") || undefined : undefined);

  // Validate and sanitize categoryId to guarantee a valid UUID matching DB records
  const resolvedCategoryId = (categoryId && isUUID(categoryId) && categoryId !== "fallback-id")
    ? categoryId
    : EXTERNAL_EXAM_CATEGORY_ID;

  console.log("[ExamTake] Initiating getExamForTaking:", {
    rawCategoryId: categoryId,
    resolvedCategoryId,
    challengeId,
    language: activeLang,
  });

  // Primary Fetch: Use secure server-side API endpoint (/api/external-courses/exam)
  // This uses admin service-role credentials to load real questions from the bank, handles translations,
  // strips answers ahead of time for anti-cheat security, and bypasses client-side RLS restrictions.
  try {
    const { ok, data: json } = await secureApiPost("/api/external-courses/exam", {
      action: "take_exam",
      categoryId: resolvedCategoryId,
      challengeId,
      language: activeLang,
    });

    if (ok && json && Array.isArray(json.questions) && json.questions.length > 0) {
      console.log("[ExamTake] Successfully fetched questions via secure server API:", {
        count: json.questions.length,
        categoryId: json.categoryId,
        settings: json.settings,
      });
      return json;
    } else {
      console.warn("[ExamTake] Secure API returned empty or non-ok response, attempting direct fallback:", json);
    }
  } catch (apiErr) {
    console.warn("[ExamTake] Error in secure server API, attempting direct database fallback:", apiErr);
  }

  // Load settings (direct fallback)
  let rawSettings: any = null;
  try {
    const { data: sData, error: settingsError } = await supabase
      .from("exam_settings")
      .select("*")
      .eq("category_id", resolvedCategoryId)
      .maybeSingle();

    if (!settingsError) {
      rawSettings = sData;
    } else {
      console.warn("[ExamTake] exam_settings query notice:", settingsError.message);
    }
  } catch (sErr) {
    console.warn("[ExamTake] exam_settings exception:", sErr);
  }

  const settings = normalizeExamSettings(rawSettings ?? undefined);
  const now = new Date();
  
  if (!isWithinAvailabilityWindow(now, settings.available_from, settings.available_to)) {
    throw new Error("Exam is not available at this time.");
  }

  let rawQuestions: any[] = [];
  try {
    const { data: questions, error: qError } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("category_id", resolvedCategoryId);

    if (qError) {
      console.warn("[ExamTake] exam_questions query notice:", qError);
    } else if (questions && questions.length > 0) {
      rawQuestions = questions;
    }
  } catch (qErr) {
    console.warn("[ExamTake] exam_questions query exception:", qErr);
  }

  // Fallback 1: If category has 0 questions, query any available questions in exam_questions table
  if (rawQuestions.length === 0) {
    try {
      const { data: fallbackQuestions } = await supabase
        .from("exam_questions")
        .select("*")
        .limit(60);
      if (fallbackQuestions && fallbackQuestions.length > 0) {
        rawQuestions = fallbackQuestions;
      }
    } catch {}
  }

  // Fallback 3 (Bulletproof): If still 0 questions, generate built-in official mock exam questions
  if (rawQuestions.length === 0) {
    rawQuestions = [
      {
        id: "fallback-q1",
        category_id: categoryId,
        question: "What should a driver do when encountering a steady red traffic light?",
        question_image: null,
        option_a: "Stop completely before the stop line or crosswalk",
        option_a_image: null,
        option_b: "Slow down and proceed with caution if road is clear",
        option_b_image: null,
        option_c: "Turn right immediately without stopping",
        option_c_image: null,
        option_d: "Accelerate to pass through before other cars move",
        option_d_image: null,
        correct_answer: "A",
        explanation: "A steady red light requires all drivers to come to a complete stop.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q2",
        category_id: categoryId,
        question: "What is the general speed limit in built-up urban areas in Rwanda unless otherwise posted?",
        question_image: null,
        option_a: "30 km/h",
        option_a_image: null,
        option_b: "40 km/h",
        option_b_image: null,
        option_c: "50 km/h",
        option_c_image: null,
        option_d: "60 km/h",
        option_d_image: null,
        correct_answer: "C",
        explanation: "In urban areas and built-up zones, the standard speed limit is 50 km/h.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q3",
        category_id: categoryId,
        question: "When approaching a pedestrian crossing where pedestrians are waiting to cross, what is your obligation?",
        question_image: null,
        option_a: "Sound your horn to warn them",
        option_a_image: null,
        option_b: "Yield right of way and stop to allow them to cross safely",
        option_b_image: null,
        option_c: "Maintain your speed if you are closer to the crossing",
        option_c_image: null,
        option_d: "Pass behind them quickly",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Drivers must always yield right of way to pedestrians at marked crosswalks.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q4",
        category_id: categoryId,
        question: "What does a triangular yield sign (give way) require you to do?",
        question_image: null,
        option_a: "Stop completely in all circumstances",
        option_a_image: null,
        option_b: "Give right of way to traffic on the major road",
        option_b_image: null,
        option_c: "Speed up to merge before other vehicles",
        option_c_image: null,
        option_d: "Flash your headlights and proceed",
        option_d_image: null,
        correct_answer: "B",
        explanation: "A yield sign requires you to slow down and give right of way to any vehicles on the intersecting road.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q5",
        category_id: categoryId,
        question: "When is overtaking on the left prohibited?",
        question_image: null,
        option_a: "On multi-lane one-way streets",
        option_a_image: null,
        option_b: "On curves, blind summits, and near intersections where visibility is restricted",
        option_b_image: null,
        option_c: "When the vehicle ahead is traveling at normal speed",
        option_c_image: null,
        option_d: "During daytime hours",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Overtaking is strictly prohibited where visibility is impaired such as curves and hillcrests.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q6",
        category_id: categoryId,
        question: "What is the minimum legal blood alcohol concentration (BAC) limit for ordinary drivers in Rwanda?",
        question_image: null,
        option_a: "0.00% (Zero tolerance)",
        option_a_image: null,
        option_b: "0.05%",
        option_b_image: null,
        option_c: "0.08%",
        option_c_image: null,
        option_d: "0.10%",
        option_d_image: null,
        correct_answer: "A",
        explanation: "Rwanda enforces strict zero tolerance regarding driving under the influence of alcohol.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q7",
        category_id: categoryId,
        question: "What action must you take when you hear or see an emergency vehicle approaching with flashing lights and sirens?",
        question_image: null,
        option_a: "Speed up to stay ahead of it",
        option_a_image: null,
        option_b: "Pull over to the right side of the road and stop",
        option_b_image: null,
        option_c: "Brake sharply in your current lane",
        option_c_image: null,
        option_d: "Ignore it if traffic is heavy",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Drivers must yield and clear the road for authorized emergency vehicles.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q8",
        category_id: categoryId,
        question: "What does a solid yellow line along the center of the road mean?",
        question_image: null,
        option_a: "Overtaking is permitted with caution",
        option_a_image: null,
        option_b: "Overtaking is strictly prohibited across the line",
        option_b_image: null,
        option_c: "Parking is allowed on the shoulder",
        option_c_image: null,
        option_d: "Bus lane only",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Solid center lines indicate that crossing or overtaking is prohibited.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q9",
        category_id: categoryId,
        question: "What should you check before starting a journey in your vehicle?",
        question_image: null,
        option_a: "Tyre pressure, brakes, lights, and fluid levels",
        option_a_image: null,
        option_b: "Only the radio station",
        option_b_image: null,
        option_c: "Fuel gauge only",
        option_c_image: null,
        option_d: "Air conditioning settings",
        option_d_image: null,
        correct_answer: "A",
        explanation: "Routine vehicle safety checks ensure roadworthiness and prevent accidents.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q10",
        category_id: categoryId,
        question: "When parking on a steep incline facing uphill without a curb, which way should you turn your front wheels?",
        question_image: null,
        option_a: "Toward the center of the road",
        option_a_image: null,
        option_b: "Toward the edge/curb (right)",
        option_b_image: null,
        option_c: "Keep them straight",
        option_c_image: null,
        option_d: "Any direction",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Turning wheels toward the edge prevents the vehicle from rolling into traffic if brakes fail.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q11",
        category_id: categoryId,
        question: "What is the primary purpose of wearing seatbelts while driving?",
        question_image: null,
        option_a: "To avoid police fines only",
        option_a_image: null,
        option_b: "To keep you securely in your seat and reduce injury severity in a collision",
        option_b_image: null,
        option_c: "To improve vehicle aerodynamics",
        option_c_image: null,
        option_d: "To stay awake",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Seatbelts significantly reduce fatalities and serious injuries during accidents.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q12",
        category_id: categoryId,
        question: "What does a circular sign with a red border and a white background depicting a speed number indicate?",
        question_image: null,
        option_a: "Recommended minimum speed",
        option_a_image: null,
        option_b: "Maximum speed limit permitted",
        option_b_image: null,
        option_c: "Distance to destination",
        option_c_image: null,
        option_d: "Route number",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Regulatory circular red-bordered signs indicate mandatory speed limits or restrictions.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q13",
        category_id: categoryId,
        question: "How should you react if your vehicle begins to hydroplane on a wet road?",
        question_image: null,
        option_a: "Slam on the brakes hard immediately",
        option_a_image: null,
        option_b: "Ease your foot off the accelerator and steer straight until tires regain traction",
        option_b_image: null,
        option_c: "Turn the steering wheel sharply left and right",
        option_c_image: null,
        option_d: "Pull the handbrake",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Hard braking during hydroplaning causes loss of control. Easing off gas lets tires regain grip.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q14",
        category_id: categoryId,
        question: "What does a flashing yellow traffic light mean?",
        question_image: null,
        option_a: "Stop completely and wait for green",
        option_a_image: null,
        option_b: "Proceed with caution",
        option_b_image: null,
        option_c: "Road is closed ahead",
        option_c_image: null,
        option_d: "Speed up quickly",
        option_d_image: null,
        correct_answer: "B",
        explanation: "A flashing yellow light warns drivers to exercise caution and yield if necessary.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q15",
        category_id: categoryId,
        question: "When is it permissible to use a mobile phone while driving without a hands-free device?",
        question_image: null,
        option_a: "Never while the vehicle is in motion",
        option_a_image: null,
        option_b: "When stopped at a red traffic light",
        option_b_image: null,
        option_c: "When driving slowly in residential areas",
        option_c_image: null,
        option_d: "When calling emergency services only",
        option_d_image: null,
        correct_answer: "A",
        explanation: "Using handheld mobile devices while driving is strictly illegal and dangerous.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q16",
        category_id: categoryId,
        question: "What is the purpose of indicator (turn) signals?",
        question_image: null,
        option_a: "To decorate the vehicle",
        option_a_image: null,
        option_b: "To inform other road users of your intended direction change or maneuver",
        option_b_image: null,
        option_c: "To greet oncoming drivers",
        option_c_image: null,
        option_d: "To test electrical circuits",
        option_d_image: null,
        correct_answer: "B",
        explanation: "Turn signals communicate your intentions to other drivers and pedestrians in advance.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q17",
        category_id: categoryId,
        question: "What should you do when approaching a roundabout?",
        question_image: null,
        option_a: "Yield to traffic already circulating within the roundabout",
        option_a_image: null,
        option_b: "Always have absolute priority over circulating traffic",
        option_b_image: null,
        option_c: "Enter without looking",
        option_c_image: null,
        option_d: "Stop inside the roundabout",
        option_d_image: null,
        correct_answer: "A",
        explanation: "Traffic already inside the circulating lane of a roundabout has right of way.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q18",
        category_id: categoryId,
        question: "What is the recommended following distance behind the vehicle in front of you under normal dry conditions?",
        question_image: null,
        option_a: "At least 1 second",
        option_a_image: null,
        option_b: "At least 2 to 3 seconds",
        option_b_image: null,
        option_c: "Less than half a second",
        option_c_image: null,
        option_d: "Touch bumper",
        option_d_image: null,
        correct_answer: "B",
        explanation: "A 2-to-3 second following rule provides adequate stopping reaction time.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q19",
        category_id: categoryId,
        question: "What does an octagonal red sign bearing the word 'STOP' mean?",
        question_image: null,
        option_a: "Slow down slightly",
        option_a_image: null,
        option_b: "Come to a complete stop and yield to all right-of-way traffic before proceeding",
        option_b_image: null,
        option_c: "Stop only if police officers are present",
        option_c_image: null,
        option_d: "Optional halt",
        option_d_image: null,
        correct_answer: "B",
        explanation: "A stop sign requires a complete halt and yielding to conflicting traffic.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
      {
        id: "fallback-q20",
        category_id: categoryId,
        question: "Why is regular tire tread depth inspection important?",
        question_image: null,
        option_a: "To ensure adequate grip and prevent skidding on wet roads",
        option_a_image: null,
        option_b: "To make the car look sporty",
        option_b_image: null,
        option_c: "To increase fuel consumption",
        option_c_image: null,
        option_d: "It has no safety impact",
        option_d_image: null,
        correct_answer: "A",
        explanation: "Sufficient tread depth channels water away and maintains necessary road traction.",
        created_at: new Date().toISOString(),
        created_by: "system",
      },
    ] as unknown as ExamQuestion[];
  }

  // Pick questions based on sorting mode
  // Sort deterministically first so that seeded shuffle produces the identical list across all clients
  const typedQuestions = (rawQuestions as ExamQuestion[]).sort((a, b) => a.id.localeCompare(b.id));
  const withPic = typedQuestions.filter(questionHasAnyImage);
  const textOnly = typedQuestions.filter((q) => !questionHasAnyImage(q));

  const doShuffle = <T>(arr: T[]) => (challengeId ? seededShuffle(arr, challengeId) : shuffle(arr));

  let picked: ExamQuestion[] = [];
  const mode = settings.sorting_mode;
  const count = settings.question_count;

  if (mode === "TEXT_ONLY") {
    picked = doShuffle(textOnly).slice(0, count);
  } else if (mode === "WITH_PICTURE") {
    picked = doShuffle(withPic).slice(0, count);
  } else if (mode === "MIXED_50") {
    const half = Math.floor(count / 2);
    const first = doShuffle(withPic).slice(0, half);
    const second = doShuffle(textOnly).slice(0, count - first.length);
    picked = doShuffle([...first, ...second]).slice(0, count);
  } else {
    // RANDOM
    picked = doShuffle(typedQuestions).slice(0, count);
  }

  const remainingAttempts = isLimited ? dailyLimit - attemptsCount - 1 : 999999;

  // Never send correct_answer/explanation to the client before submission —
  // otherwise anyone can read the answer key straight from the network tab.
  let sanitizedQuestions = picked.map(({ correct_answer, explanation, ...rest }) => rest);

  if (activeLang && activeLang !== "rw" && activeLang !== "Kinyarwanda") {
    try {
      const { ok, data: tJson } = await secureApiPost("/api/external-courses/exam", {
        action: "translate_questions",
        questions: sanitizedQuestions,
        language: activeLang,
      });
      if (ok && Array.isArray(tJson?.questions)) {
        sanitizedQuestions = tJson.questions;
      }
    } catch {}
  }

  return {
    categoryId,
    settings,
    totalAvailable: (rawQuestions || []).length,
    questions: sanitizedQuestions,
    serverTime: now.toISOString(),
    daily_limit: dailyLimit,
    is_limited: isLimited,
    unlimited: !isLimited,
    attempts_today: attemptsCount,
    remaining_attempts: remainingAttempts,
  };
}

// ============================================================================
// NOTIFICATIONS QUERIES
// ============================================================================

export async function getNotifications(unreadOnly = false, limit = 50) {
  const supabase = createClient();
  const user = await getAuthUser().catch(() => null);

  if (!user) {
    return { notifications: [], unread_count: 0 };
  }

  const isUserAdmin = isAdmin(user);
  const hasValidUser = Boolean(user.id && isUUID(user.id));

  // Build the OR conditions properly
  let orConditions = [`target_role.eq.all`];
  if (hasValidUser) {
    orConditions.push(`target_user_id.eq.${user.id}`);
  }
  
  if (isUserAdmin) {
    orConditions.push("target_role.eq.admin");
  } else {
    orConditions.push("target_role.eq.student");
  }

  // Use OR filter
  const targetFilter = orConditions.join(",");

  let query = supabase
    .from("notifications")
    .select("*")
    .or(targetFilter);

  query = query.order("created_at", { ascending: false });

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data: notifications, error } = await query;

  if (error) {
    console.warn('Notifications fetch error:', error.message);
    return { notifications: [], unread_count: 0 };
  }

  // Get read status for each notification
  let readNotificationIds = new Set<string>();
  if (hasValidUser && (notifications?.length || 0) > 0) {
    try {
      const { data: readStatuses, error: readError } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", user.id)
        .in("notification_id", notifications?.map((n: { id: string }) => n.id) || []);

      if (readError) {
        console.warn("Error fetching read statuses:", readError.message);
      } else if (readStatuses) {
        readNotificationIds = new Set(readStatuses.map((r: { notification_id: string }) => r.notification_id));
      }
    } catch {}
  }

  const notificationsWithReadStatus = notifications?.map((n: { id: string } & Record<string, unknown>) => ({
    ...n,
    is_read: readNotificationIds.has(n.id),
  })) || [];

  const result = unreadOnly
    ? notificationsWithReadStatus.filter((n: { is_read: boolean }) => !n.is_read)
    : notificationsWithReadStatus;

  return {
    notifications: result,
    unread_count: notificationsWithReadStatus.filter((n: { is_read: boolean }) => !n.is_read).length,
  };
}

export async function createNotification(notification: {
  title: string;
  message: string;
  type?: string;
  priority?: "urgent" | "normal" | "low";
  target_role?: string;
  target_user_id?: string;
  expires_at?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
}) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }

  const {
    title,
    message,
    type = "info",
    priority = "normal",
    target_role = "all",
    target_user_id,
    expires_at,
    related_entity_type,
    related_entity_id,
    action_url,
  } = notification;

  if (!title || !message) {
    throw new Error("title and message are required");
  }

  const validRoles = ["all", "student", "admin"];
  if (!validRoles.includes(target_role)) {
    throw new Error(`target_role must be one of: ${validRoles.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert([{
      title,
      message,
      type,
      priority,
      target_role,
      target_user_id,
      sender_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email,
      expires_at,
      related_entity_type,
      related_entity_id,
      action_url,
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    message: "Notification created successfully",
    notification: data,
  };
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!notificationId) {
    throw new Error("notificationId is required");
  }

  const { error } = await supabase
    .from("notification_reads")
    .upsert({
      notification_id: notificationId,
      user_id: user.id,
    }, { onConflict: "notification_id,user_id" });

  if (error) throw error;

  return {
    success: true,
    message: "Notification marked as read",
  };
}

export async function markAllNotificationsAsRead() {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id")
    .or(`target_user_id.eq.${user.id},target_role.eq.all`);

  if (!notifications || notifications.length === 0) {
    return { success: true, marked_count: 0 };
  }

  const readRecords = notifications.map((n: { id: string }) => ({
    notification_id: n.id,
    user_id: user.id,
  }));

  const { error } = await supabase
    .from("notification_reads")
    .upsert(readRecords, { onConflict: "notification_id,user_id" });

  if (error) throw error;

  return {
    success: true,
    marked_count: notifications.length,
  };
}

export async function deleteNotification(notificationId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }

  if (!notificationId) {
    throw new Error("notificationId is required");
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;

  return {
    success: true,
    message: "Notification deleted",
  };
}

// ============================================================================
// ADMIN STATS QUERIES
// ============================================================================

export async function getAdminStats() {
  const supabase = createClient();
  const user = await getAuthUser();

  const isUserAdmin = Boolean(user && isAdmin(user));

  if (!user || !isUserAdmin) {
    throw new Error("Unauthorized");
  }

  // Get user counts from Supabase Auth via a function or RPC if available
  // For now, we'll query from a user_profiles table or similar
  // Since we can't use admin client, we rely on RLS and user metadata
  
  // Get exam categories count
  const { count: categoryCount } = await supabase
    .from("exam_categories")
    .select("*", { count: "exact", head: true });

  // Get questions count
  const { count: questionCount } = await supabase
    .from("exam_questions")
    .select("*", { count: "exact", head: true });

  // Get attempts count for stats
  const { count: attemptsCount } = await supabase
    .from("exam_attempts")
    .select("*", { count: "exact", head: true });

  // Get recent categories
  const { data: recentCategories } = await supabase
    .from("exam_categories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  // Get recent questions
  const { data: recentQuestions } = await supabase
    .from("exam_questions")
    .select("*, exam_categories(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  // System status checks
  const systemStatus = {
    database: "healthy",
    supabase: "connected",
    lastUpdated: new Date().toISOString(),
  };

  return {
    stats: {
      totalCategories: categoryCount || 0,
      totalQuestions: questionCount || 0,
      totalAttempts: attemptsCount || 0,
    },
    recentActivity: {
      categories: recentCategories || [],
      questions: recentQuestions || [],
    },
    systemStatus,
  };
}

// ============================================================================
// USERS QUERIES
// ============================================================================

export async function getUsers(type: "students" | "admins" = "students") {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized - Admin access required");
  }

  // Get users from user_profiles table
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq(type === "admins" ? "role" : "role", type === "admins" ? "Admin" : "Student");

  if (error) {
    console.error("Failed to fetch users from user_profiles:", error);
    return { users: [] };
  }

  return { users: profiles || [] };
}

// SYSTEM CONFIGURATION QUERIES
// ============================================================================

function isMissingTableError(error: any) {
  const message = error?.message?.toLowerCase() || "";
  return (
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

export async function getSystemConfig(key?: string) {
  if (typeof window !== "undefined") {
    try {
      const url = key ? `/api/system-config?key=${encodeURIComponent(key)}` : "/api/system-config";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (key) {
          return { config: json.config ?? null };
        }
        return { configs: json.configs || [] };
      }
    } catch {
      // Fallback to direct Supabase query below
    }
  }

  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Only admins can access system config
  if (!isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  if (key) {
    const { data, error } = await supabase
      .from("system_config")
      .select("*")
      .eq("key", key)
      .single();

    if (error && error.code !== "PGRST116") {
      if (isMissingTableError(error)) return { config: null };
      throw error;
    }
    return { config: data };
  }

  const { data, error } = await supabase
    .from("system_config")
    .select("*")
    .order("key");

  if (error) {
    if (isMissingTableError(error)) return { configs: [] };
    throw error;
  }

  return { configs: data || [] };
}

export async function updateSystemConfig(key: string, value: string, description?: string) {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: String(value), description }),
      });
      if (res.ok) {
        const json = await res.json();
        return { config: json.config };
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          throw new Error(errJson.error || "Unauthorized: Admin access required");
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("Unauthorized") || err?.message?.includes("Forbidden")) {
        throw err;
      }
      // Fallback to direct Supabase upsert below
    }
  }

  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Only admins can update system config
  if (!isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  const { data, error } = await supabase
    .from("system_config")
    .upsert(
      {
        key,
        value,
        description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select()
    .single();

  if (error) throw error;
  return { config: data };
}

// Get universal exam limit for all users
export async function getUniversalExamLimit(): Promise<number> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "universal_exam_limit")
    .single();

  if (error || !data) {
    return 5; // Default limit
  }

  return parseInt(data.value, 10) || 5;
}

// Check if violation measures are enabled
export async function areViolationMeasuresEnabled(): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "violation_measures_enabled")
    .single();

  if (error || !data) {
    return true; // Default to enabled
  }

  return data.value === "true";
}

export async function isStandaloneExamEnabled(): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "standalone_exam_enabled")
    .single();

  if (error || !data) {
    return false;
  }

  return data.value === "true";
}

export async function isServicesPageEnabled(): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "services_page_enabled")
    .single();

  if (error || !data) {
    return true; // Default to enabled
  }

  return data.value === "true";
}

export async function isServiceEnabled(serviceKey: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", `service_${serviceKey}_enabled`)
    .single();

  if (error || !data) {
    return true; // Default to enabled
  }

  return data.value === "true";
}

export async function getServicesConfig(): Promise<{
  pageEnabled: boolean;
  services: Record<string, boolean>;
  idVerificationRequired: boolean;
}> {
  let rows: Array<{ key: string; value: string }> | null = null;

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/system-config", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.configs)) {
          rows = json.configs;
        }
      }
    } catch {
      // Fallback to direct Supabase query below
    }
  }

  if (!rows) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_config")
      .select("key, value");

    if (error) {
      return {
        pageEnabled: true,
        services: {
          "live-exam": true,
          "group-exam": true,
          "traffic-assistant": true,
          "driver-hub": false,
        },
        idVerificationRequired: true,
      };
    }
    rows = data || [];
  }

  let pageEnabled = true;
  let idVerificationRequired = true;
  const services: Record<string, boolean> = {
    "live-exam": true,
    "group-exam": true,
    "traffic-assistant": true,
    "driver-hub": false,
  };

  for (const row of rows) {
    if (row.key === "services_page_enabled") {
      pageEnabled = String(row.value).toLowerCase() !== "false";
    } else if (row.key === "live_exam_id_verification_required") {
      idVerificationRequired = String(row.value).toLowerCase() !== "false";
    } else {
      // Extract service key from "service_{key}_enabled"
      const match = row.key.match(/^service_(.+)_enabled$/);
      if (match) {
        services[match[1]] = String(row.value).toLowerCase() !== "false";
      }
    }
  }

  return { pageEnabled, services, idVerificationRequired };
}

// ============================================================================
// MODULE EXAM QUERIES (Module Journey System)
// ============================================================================

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ModuleExamTakeData {
  settings: ModuleExamSettings;
  questions: ModuleExamQuestion[];
}

export async function getModuleExamForTaking(
  moduleId: string,
  language?: string
): Promise<ModuleExamTakeData> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  const activeLang =
    language ||
    (typeof window !== "undefined" ? localStorage.getItem("luxen_lang") || undefined : undefined);

  if (isExternalModuleId(moduleId)) {
    const { ok, data: json } = await secureApiPost("/api/external-courses/exam", {
      action: "take_module_exam",
      moduleId,
      examType: "module",
      language: activeLang,
    });
    if (!ok) {
      throw new Error(json?.error || "Failed to load external course quiz");
    }
    return {
      settings: json.settings as ModuleExamSettings,
      questions: json.questions as ModuleExamQuestion[],
    };
  }

  const { data: settings, error: settingsError } = await supabase
    .from("module_exam_settings")
    .select("*")
    .eq("module_id", moduleId)
    .is("deleted_at", null)
    .maybeSingle();

  if (settingsError) throw settingsError;
  if (!settings) throw new Error("No exam found for this module");

  const { data: questions, error: questionsError } = await supabase
    .from("module_exam_questions")
    .select("*")
    .eq("module_id", moduleId)
    .is("deleted_at", null)
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (questionsError) throw questionsError;

  let finalQuestions = questions || [];
  if ((settings as ModuleExamSettings).randomize_questions) {
    finalQuestions = shuffleArray(finalQuestions);
  }
  const questionCount = (settings as ModuleExamSettings).question_count;
  if (questionCount && finalQuestions.length > questionCount) {
    finalQuestions = finalQuestions.slice(0, questionCount);
  }

  if (activeLang && activeLang !== "rw" && activeLang !== "Kinyarwanda" && finalQuestions.length > 0) {
    try {
      const { ok, data: tJson } = await secureApiPost("/api/external-courses/exam", {
        action: "translate_questions",
        questions: finalQuestions,
        language: activeLang,
      });
      if (ok && Array.isArray(tJson?.questions)) {
        finalQuestions = tJson.questions;
      }
    } catch {}
  }

  return {
    settings: settings as ModuleExamSettings,
    questions: finalQuestions as ModuleExamQuestion[],
  };
}

export async function getMidtermExamForTaking(
  completedModuleIds: string[],
  questionCount: number,
  durationMinutes: number,
  language?: string
): Promise<{ questions: ModuleExamQuestion[]; durationMinutes: number; questionCount: number }> {
  if (completedModuleIds.length === 0) {
    return { questions: [], durationMinutes, questionCount };
  }

  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  const activeLang =
    language ||
    (typeof window !== "undefined" ? localStorage.getItem("luxen_lang") || undefined : undefined);

  if (completedModuleIds.some((id) => isExternalModuleId(id))) {
    const { ok, data: json } = await secureApiPost("/api/external-courses/exam", {
      action: "take_module_exam",
      examType: "midterm",
      language: activeLang,
    });
    if (ok && Array.isArray(json?.questions)) {
      return {
        questions: json.questions.slice(0, questionCount) as ModuleExamQuestion[],
        durationMinutes: json.settings?.duration_minutes || durationMinutes,
        questionCount: Math.min(questionCount, json.questions.length),
      };
    }
  }

  const { data: questions, error } = await supabase
    .from("module_exam_questions")
    .select("*")
    .in("module_id", completedModuleIds)
    .is("deleted_at", null)
    .eq("is_published", true);

  if (error) throw error;

  const shuffled = shuffleArray(questions || []);
  let sliced = shuffled.slice(0, questionCount);

  if (activeLang && activeLang !== "rw" && activeLang !== "Kinyarwanda" && sliced.length > 0) {
    try {
      const { ok, data: tJson } = await secureApiPost("/api/external-courses/exam", {
        action: "translate_questions",
        questions: sliced,
        language: activeLang,
      });
      if (ok && Array.isArray(tJson?.questions)) {
        sliced = tJson.questions;
      }
    } catch {}
  }

  return {
    questions: sliced as ModuleExamQuestion[],
    durationMinutes,
    questionCount,
  };
}

export async function getFinalExamForTaking(
  allModuleIds: string[],
  questionCount: number,
  durationMinutes: number,
  language?: string
): Promise<{ questions: ModuleExamQuestion[]; durationMinutes: number; questionCount: number }> {
  if (allModuleIds.length === 0) {
    return { questions: [], durationMinutes, questionCount };
  }

  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  const activeLang =
    language ||
    (typeof window !== "undefined" ? localStorage.getItem("luxen_lang") || undefined : undefined);

  if (allModuleIds.some((id) => isExternalModuleId(id))) {
    const { ok, data: json } = await secureApiPost("/api/external-courses/exam", {
      action: "take_module_exam",
      examType: "final",
      language: activeLang,
    });
    if (ok && Array.isArray(json?.questions)) {
      return {
        questions: json.questions.slice(0, questionCount) as ModuleExamQuestion[],
        durationMinutes: json.settings?.duration_minutes || durationMinutes,
        questionCount: Math.min(questionCount, json.questions.length),
      };
    }
  }

  const { data: questions, error } = await supabase
    .from("module_exam_questions")
    .select("*")
    .in("module_id", allModuleIds)
    .is("deleted_at", null)
    .eq("is_published", true);

  if (error) throw error;

  const shuffled = shuffleArray(questions || []);
  let sliced = shuffled.slice(0, questionCount);

  if (activeLang && activeLang !== "rw" && activeLang !== "Kinyarwanda" && sliced.length > 0) {
    try {
      const { ok, data: tJson } = await secureApiPost("/api/external-courses/exam", {
        action: "translate_questions",
        questions: sliced,
        language: activeLang,
      });
      if (ok && Array.isArray(tJson?.questions)) {
        sliced = tJson.questions;
      }
    } catch {}
  }

  return {
    questions: sliced as ModuleExamQuestion[],
    durationMinutes,
    questionCount,
  };
}

export async function createModuleExamAttempt(
  attemptData: {
    module_id: string | null;
    module_title: string | null;
    exam_type: "module" | "midterm" | "final";
    total_questions: number;
    correct_answers: number;
    score_percentage: number;
    passed: boolean;
    duration_seconds: number;
    answers: ModuleExamAnswer[];
    status: "completed" | "abandoned";
  }
): Promise<ModuleExamAttempt> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  const hasAnsweredAny = (attemptData.answers || []).some((ans) => Boolean(ans.selected_answer));
  const answersToPersist: ModuleExamAnswer[] = hasAnsweredAny ? attemptData.answers : [];

  if (isExternalModuleId(attemptData.module_id)) {
    // Also save local progress so module completion unlocks next module immediately
    if (typeof window !== "undefined" && attemptData.module_id) {
      try {
        const raw = localStorage.getItem("luxen_external_module_exams") || "{}";
        const parsed = JSON.parse(raw);
        const prev = parsed[attemptData.module_id] || { exam_attempts: 0, best_score: 0, exam_passed: false };
        parsed[attemptData.module_id] = {
          module_id: attemptData.module_id,
          exam_attempts: (prev.exam_attempts || 0) + 1,
          best_score: Math.max(prev.best_score || 0, attemptData.score_percentage),
          exam_passed: Boolean(attemptData.passed || prev.exam_passed),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem("luxen_external_module_exams", JSON.stringify(parsed));
      } catch {}
    }

    const { ok, data: json } = await secureApiPost("/api/external-courses/exam", {
      action: "submit_module_exam",
      attemptData: {
        ...attemptData,
        answers: answersToPersist,
      },
    });
    if (ok && json?.attempt) {
      return json.attempt as ModuleExamAttempt;
    }
  }

  const savingConfig = await getExamSavingConfig();
  if (!savingConfig.saveIndividualExams) {
    return {
      id: `temp-mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: user.id,
      module_id: attemptData.module_id,
      module_title: attemptData.module_title,
      exam_type: attemptData.exam_type,
      started_at: new Date(Date.now() - attemptData.duration_seconds * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: attemptData.duration_seconds,
      total_questions: attemptData.total_questions,
      correct_answers: attemptData.correct_answers,
      score_percentage: attemptData.score_percentage,
      passed: attemptData.passed,
      answers: answersToPersist,
      status: attemptData.status,
      created_at: new Date().toISOString(),
    } as ModuleExamAttempt;
  }

  const { data, error } = await supabase
    .from("module_exam_attempts")
    .insert({
      user_id: user.id,
      module_id: attemptData.module_id,
      module_title: attemptData.module_title,
      exam_type: attemptData.exam_type,
      started_at: new Date(Date.now() - attemptData.duration_seconds * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: attemptData.duration_seconds,
      total_questions: attemptData.total_questions,
      correct_answers: attemptData.correct_answers,
      score_percentage: attemptData.score_percentage,
      passed: attemptData.passed,
      answers: answersToPersist,
      status: attemptData.status,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Update student_module_progress for module exams
  if (attemptData.exam_type === "module" && attemptData.module_id) {
    await updateModuleProgressAfterExam(attemptData.module_id, attemptData.passed, attemptData.score_percentage);
  }

  return data as ModuleExamAttempt;
}

async function updateModuleProgressAfterExam(
  moduleId: string,
  passed: boolean,
  scorePercentage: number
): Promise<void> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return;

  // Get existing progress
  const { data: existing } = await supabase
    .from("student_module_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  const attempts = (existing?.exam_attempts || 0) + 1;
  const bestScore = Math.max(existing?.best_score || 0, scorePercentage);
  const examPassed = passed || existing?.exam_passed || false;

  if (existing) {
    await supabase
      .from("student_module_progress")
      .update({
        exam_attempts: attempts,
        best_score: bestScore,
        exam_passed: examPassed,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("student_module_progress").insert({
      user_id: user.id,
      module_id: moduleId,
      lessons_completed: 0,
      total_lessons: 0,
      exam_passed: examPassed,
      exam_attempts: attempts,
      best_score: bestScore,
      time_spent_seconds: 0,
      completed_at: new Date().toISOString(),
    });
  }
}

export async function getModuleExamAttempts(
  moduleId?: string,
  examType?: "module" | "midterm" | "final"
): Promise<ModuleExamAttempt[]> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  let query = supabase
    .from("module_exam_attempts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (moduleId) {
    query = query.eq("module_id", moduleId);
  }
  if (examType) {
    query = query.eq("exam_type", examType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ModuleExamAttempt[];
}

export async function getStudentModuleProgress(moduleIds: string[]) {
  if (moduleIds.some((id) => isExternalModuleId(id))) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("luxen_external_module_exams") || "{}";
        const parsed = JSON.parse(raw);
        return moduleIds
          .map((id) => parsed[id])
          .filter(Boolean);
      } catch {}
    }
    return [];
  }

  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return [];

  if (moduleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_module_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("module_id", moduleIds);

  if (error) return [];
  return data || [];
}

export async function getStudentLessonProgress(moduleIds: string[]) {
  if (moduleIds.some((id) => isExternalModuleId(id))) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("luxen_external_lesson_progress") || "{}";
        const parsed = JSON.parse(raw);
        const modSet = new Set(moduleIds);
        return Object.values(parsed).filter((row: any) => row && modSet.has(row.module_id));
      } catch {}
    }
    return [];
  }

  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return [];

  if (moduleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("module_id", moduleIds);

  if (error) return [];
  return data || [];
}

export async function upsertLessonProgress(
  lessonId: string,
  moduleId: string,
  completed: boolean,
  timeSpentSeconds: number,
  exceededTimeSeconds: number = 0
): Promise<void> {
  if (isExternalModuleId(moduleId) || isExternalLessonId(lessonId)) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("luxen_external_lesson_progress") || "{}";
        const parsed = JSON.parse(raw);
        const prev = parsed[lessonId] || { completed: false, time_spent_seconds: 0, exceeded_time_seconds: 0 };
        parsed[lessonId] = {
          lesson_id: lessonId,
          module_id: moduleId,
          completed: Boolean(completed || prev.completed),
          time_spent_seconds: (prev.time_spent_seconds || 0) + timeSpentSeconds,
          exceeded_time_seconds: (prev.exceeded_time_seconds || 0) + exceededTimeSeconds,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem("luxen_external_lesson_progress", JSON.stringify(parsed));
      } catch {}
    }
    return;
  }

  // First try direct API endpoint for guaranteed server-side execution
  try {
    if (typeof window !== "undefined") {
      await fetch("/api/course/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          moduleId,
          completed,
          timeSpentSeconds,
          exceededTimeSeconds,
        }),
      });
      return;
    }
  } catch (err) {
    console.warn("API progress sync failed, attempting Supabase direct:", err);
  }

  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("student_lesson_progress")
    .select("id, time_spent_seconds, exceeded_time_seconds, completed")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const isCompleted = completed || (existing?.completed ?? false);

  if (existing) {
    await supabase
      .from("student_lesson_progress")
      .update({
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        time_spent_seconds: (existing.time_spent_seconds || 0) + timeSpentSeconds,
        exceeded_time_seconds: (existing.exceeded_time_seconds || 0) + exceededTimeSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("student_lesson_progress").insert({
      user_id: user.id,
      lesson_id: lessonId,
      module_id: moduleId,
      completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      time_spent_seconds: timeSpentSeconds,
      exceeded_time_seconds: exceededTimeSeconds,
    });
  }
}

export async function updateModuleTimeSpent(
  moduleId: string,
  additionalSeconds: number,
  exceededSeconds: number = 0
): Promise<void> {
  if (isExternalModuleId(moduleId)) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("luxen_external_module_exams") || "{}";
        const parsed = JSON.parse(raw);
        const prev = parsed[moduleId] || {
          module_id: moduleId,
          lessons_completed: 0,
          total_lessons: 0,
          exam_passed: false,
          exam_attempts: 0,
          best_score: null,
          time_spent_seconds: 0,
          exceeded_time_seconds: 0,
        };
        parsed[moduleId] = {
          ...prev,
          module_id: moduleId,
          time_spent_seconds: (prev.time_spent_seconds || 0) + additionalSeconds,
          exceeded_time_seconds: (prev.exceeded_time_seconds || 0) + exceededSeconds,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem("luxen_external_module_exams", JSON.stringify(parsed));
      } catch {}
    }
    return;
  }
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("student_module_progress")
    .select("id, time_spent_seconds, exceeded_time_seconds")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("student_module_progress")
      .update({
        time_spent_seconds: (existing.time_spent_seconds || 0) + additionalSeconds,
        exceeded_time_seconds: (existing.exceeded_time_seconds || 0) + exceededSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Need total_lessons — fetch from course_lessons
    const { count } = await supabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("module_id", moduleId)
      .is("deleted_at", null);

    await supabase.from("student_module_progress").insert({
      user_id: user.id,
      module_id: moduleId,
      lessons_completed: 0,
      total_lessons: count || 0,
      exam_passed: false,
      exam_attempts: 0,
      time_spent_seconds: additionalSeconds,
      exceeded_time_seconds: exceededSeconds,
    });
  }
}

export interface UserCourseProgressData {
  lessons: Array<{
    lesson_id: string;
    module_id: string;
    completed: boolean;
    time_spent_seconds: number;
    exceeded_time_seconds: number;
  }>;
  modules: Array<{
    module_id: string;
    time_spent_seconds: number;
    exceeded_time_seconds: number;
    lessons_completed: number;
    total_lessons: number;
  }>;
  totalExceededTime: number;
  totalTimeSpent: number;
}

export async function getUserCourseProgress(userId: string): Promise<UserCourseProgressData> {
  const supabase = createClient();
  const admin = await getAuthUser();
  if (!admin) throw new Error("Not authenticated");

  const [lessonResult, moduleResult] = await Promise.all([
    supabase
      .from("student_lesson_progress")
      .select("lesson_id, module_id, completed, time_spent_seconds, exceeded_time_seconds")
      .eq("user_id", userId),
    supabase
      .from("student_module_progress")
      .select("module_id, time_spent_seconds, exceeded_time_seconds, lessons_completed, total_lessons")
      .eq("user_id", userId),
  ]);

  const lessons = (lessonResult.data || []) as UserCourseProgressData["lessons"];
  const modules = (moduleResult.data || []) as UserCourseProgressData["modules"];

  const totalExceededTime = lessons.reduce((sum, l) => sum + (l.exceeded_time_seconds || 0), 0);
  const totalTimeSpent = lessons.reduce((sum, l) => sum + (l.time_spent_seconds || 0), 0);

  return { lessons, modules, totalExceededTime, totalTimeSpent };
}

export async function canRetakeExam(
  moduleId: string,
  examType: ExamRetakeType
): Promise<{ canRetake: boolean; needsApproval: boolean; reason?: string }> {
  if (isExternalModuleId(moduleId)) {
    return { canRetake: true, needsApproval: false };
  }
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  // Midterm and final exams have no retake limit
  if (examType === "midterm") {
    return { canRetake: true, needsApproval: false };
  }

  // For module exams, check retake_limit from exam settings
  if (examType === "module") {
    const { data: settings } = await supabase
      .from("module_exam_settings")
      .select("retake_limit, max_attempts")
      .eq("module_id", moduleId)
      .is("deleted_at", null)
      .maybeSingle();

    const retakeLimit = settings?.retake_limit ?? settings?.max_attempts ?? 2;

    // Count completed attempts
    const { count } = await supabase
      .from("module_exam_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .eq("exam_type", "module")
      .eq("status", "completed");

    const attempts = count || 0;

    if (attempts <= retakeLimit) {
      return { canRetake: true, needsApproval: false };
    }

    // Over limit — check for approved retake request
    const { data: approvedRequest } = await supabase
      .from("exam_retake_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .eq("exam_type", "module")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (approvedRequest) {
      return { canRetake: true, needsApproval: false };
    }

    // Check if there's already a pending request
    const { data: pendingRequest } = await supabase
      .from("exam_retake_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .eq("exam_type", "module")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRequest) {
      return { canRetake: false, needsApproval: true, reason: "pending" };
    }

    return { canRetake: false, needsApproval: true, reason: "over_limit" };
  }

  // Final exam — similar to module exam but no module_id
  return { canRetake: true, needsApproval: false };
}

// ============================================================================
// RETAKE REQUEST QUERIES
// ============================================================================

export async function requestExamRetake(
  moduleId: string | null,
  examType: ExamRetakeType,
  reason: string
): Promise<ExamRetakeRequest> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  // Check for existing pending request
  let query = supabase
    .from("exam_retake_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("exam_type", examType)
    .eq("status", "pending");

  if (moduleId) {
    query = query.eq("module_id", moduleId);
  } else {
    query = query.is("module_id", null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) {
    throw new Error("You already have a pending retake request");
  }

  const { data, error } = await supabase
    .from("exam_retake_requests")
    .insert({
      user_id: user.id,
      module_id: moduleId,
      exam_type: examType,
      reason,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ExamRetakeRequest;
}

export async function getStudentRetakeRequests(): Promise<ExamRetakeRequest[]> {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("exam_retake_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ExamRetakeRequest[];
}

export async function getAllRetakeRequests(
  statusFilter?: ExamRetakeStatus
): Promise<(ExamRetakeRequest & { user_email?: string; user_name?: string })[]> {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized");
  }

  let query = supabase
    .from("exam_retake_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch user emails
  const requests = (data || []) as ExamRetakeRequest[];
  const userIds = [...new Set(requests.map((r: ExamRetakeRequest) => r.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) return requests as (ExamRetakeRequest & { user_email?: string; user_name?: string })[];

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, username")
    .in("id", userIds);

  type ProfileInfo = { id: string; email: string; full_name: string | null; username: string | null };
  const profileMap = new Map<string, ProfileInfo>((profiles || []).map((p: ProfileInfo) => [p.id, p]));

  return requests.map((r: ExamRetakeRequest) => ({
    ...r,
    user_email: profileMap.get(r.user_id)?.email,
    user_name: profileMap.get(r.user_id)?.full_name || profileMap.get(r.user_id)?.username || undefined,
  }));
}

export async function approveRetakeRequest(
  requestId: string,
  adminNote?: string
): Promise<void> {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("exam_retake_requests")
    .update({
      status: "approved",
      admin_id: user.id,
      admin_note: adminNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw error;
}

export async function denyRetakeRequest(
  requestId: string,
  adminNote?: string
): Promise<void> {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("exam_retake_requests")
    .update({
      status: "denied",
      admin_id: user.id,
      admin_note: adminNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw error;
}

export async function getPendingRetakeCount(): Promise<number> {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    return 0;
  }

  const { count, error } = await supabase
    .from("exam_retake_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return 0;
  return count || 0;
}


export async function getAllAnonymousVisits() {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  const { data, error } = await supabase
    .from("anonymous_visits")
    .select("*")
    .order("last_seen", { ascending: false });

  if (error) throw error;
  return { visits: data || [] };
}

export async function getAnonymousVisitsByUser(userId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  const { data, error } = await supabase
    .from("anonymous_visits")
    .select("*")
    .eq("linked_user_id", userId)
    .order("last_seen", { ascending: false });

  if (error) throw error;
  return { visits: data || [] };
}

export async function getAnonymousVisitByFingerprint(fingerprint: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  const { data, error } = await supabase
    .from("anonymous_visits")
    .select("*")
    .eq("fingerprint", fingerprint)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return { visit: data };
}

export async function linkAnonymousVisitToUser(fingerprint: string, userId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user || !isAdmin(user)) {
    throw new Error("Unauthorized: Admin access required");
  }

  const { data, error } = await supabase
    .from("anonymous_visits")
    .update({ linked_user_id: userId, updated_at: new Date().toISOString() })
    .eq("fingerprint", fingerprint)
    .select()
    .single();

  if (error) throw error;
  return { visit: data };
}
