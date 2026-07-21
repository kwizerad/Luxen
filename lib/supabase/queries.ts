"use client";

import { createClient } from "./client";
import { createAdminClient } from "./admin";
import { isAdmin, canAddQuestions, hasReadWriteQuestionAccess, canManageExamSettings, PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";
import { normalizeExamSettings, isWithinAvailabilityWindow, questionHasAnyImage, shuffle } from "@/lib/exam-settings";
import type { ExamQuestion, ExamAnswer, ExamQuestionSortingMode } from "@/lib/database.types";

// Helper function to handle Supabase auth lock errors
async function getAuthUser() {
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
  const supabase = createClient();
  const user = await getAuthUser();
  
  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  let query = supabase
    .from("exam_categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isUserAdmin) {
    query = query.eq("is_published", true);
  }

  const { data: categories, error } = await query;

  if (error) throw error;
  return { categories: categories || [], is_admin: isUserAdmin };
}

export async function createExamCategory(name: string, is_published = false) {
  const supabase = createClient();
  const user = await getAuthUser();

  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  if (!user || !isPrimaryAdmin) {
    throw new Error("Unauthorized. Only primary admin can create categories.");
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

  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  if (!user || !isPrimaryAdmin) {
    throw new Error("Unauthorized. Only primary admin can update categories.");
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

  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

  if (!user || !isPrimaryAdmin) {
    throw new Error("Unauthorized. Only primary admin can delete categories.");
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

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  if (!user || !isUserAdmin) {
    throw new Error("Unauthorized. Admin access required.");
  }

  if (!id || typeof is_published !== "boolean") {
    throw new Error("Category ID and is_published are required");
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
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = isAdmin(user);

  // If requesting specific attempt
  if (attemptId) {
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .select(EXAM_ATTEMPT_COLUMNS)
      .eq("id", attemptId)
      .single();

    if (error) throw error;

    // Users can only see their own attempts, admins can see all
    if (attempt.user_id !== user.id && !isUserAdmin) {
      throw new Error("Unauthorized");
    }

    return { attempt };
  }

  // If requesting user's attempts
  if (userId) {
    if (userId !== user.id && !isUserAdmin) {
      throw new Error("Unauthorized");
    }

    const { data: attempts, error } = await supabase
      .from("exam_attempts")
      .select(EXAM_ATTEMPT_COLUMNS)
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { attempts: attempts || [] };
  }

  // Return current user's attempts
  const { data: attempts, error } = await supabase
    .from("exam_attempts")
    .select(EXAM_ATTEMPT_COLUMNS)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return { attempts: attempts || [] };
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

export async function createExamAttempt(attemptData: {
  category_id: string;
  category_name: string;
  total_questions: number;
  answers: ExamAnswer[];
  duration_seconds: number;
  status?: 'in_progress' | 'completed' | 'abandoned';
}) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { category_id, category_name, total_questions, answers, duration_seconds, status = 'completed' } = attemptData;

  if (!category_id || !category_name || !total_questions || !answers) {
    throw new Error("Missing required fields");
  }

  // Calculate score
  let correctAnswers = 0;
  const processedAnswers: ExamAnswer[] = answers.map((ans) => ({
    question_id: ans.question_id,
    selected_answer: ans.selected_answer,
    is_correct: ans.is_correct || false,
    time_spent_seconds: ans.time_spent_seconds,
  }));

  processedAnswers.forEach((ans) => {
    if (ans.is_correct) correctAnswers++;
  });

  const scorePercentage = Math.round((correctAnswers / total_questions) * 100);

  const { data, error } = await supabase
    .from("exam_attempts")
    .insert([{
      user_id: user.id,
      category_id,
      category_name,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds,
      total_questions,
      correct_answers: correctAnswers,
      score_percentage: scorePercentage,
      answers: processedAnswers,
      status,
    }])
    .select()
    .single();

  if (error) throw error;
  return { attempt: data };
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
    .select("category_id,question_count,duration_minutes,sorting_mode,available_from,available_to")
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

  const { question_count, duration_minutes, sorting_mode, available_from, available_to } = settings;

  if (!Number.isFinite(question_count) || question_count < 1 || question_count > 200) {
    throw new Error("question_count must be between 1 and 200");
  }
  if (!Number.isFinite(duration_minutes) || duration_minutes < 1 || duration_minutes > 300) {
    throw new Error("duration_minutes must be between 1 and 300");
  }
  if (!["RANDOM", "TEXT_ONLY", "WITH_PICTURE", "MIXED_50"].includes(sorting_mode)) {
    throw new Error("Invalid sorting_mode");
  }

  const { data, error } = await supabase
    .from("exam_settings")
    .upsert([{
      category_id: categoryId,
      question_count,
      duration_minutes,
      sorting_mode,
      available_from,
      available_to,
      updated_by: user.id,
    }], { onConflict: "category_id" })
    .select("category_id,question_count,duration_minutes,sorting_mode,available_from,available_to")
    .single();

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
    settings: normalizeExamSettings(data),
  };
}

// ============================================================================
// EXAM LIMITS QUERIES
// ============================================================================

export async function getExamLimits(userId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // If userId provided, check permissions
  if (userId) {
    if (userId !== user.id && !isAdmin(user)) {
      throw new Error("Unauthorized");
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

    if (countError) console.error("Error counting attempts:", countError);

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
  if (isAdmin(user)) {
    const { data: limits, error } = await supabase
      .from("user_exam_limits")
      .select("*");

    if (error) throw error;
    return { limits: limits || [] };
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

  if (countError) console.error("Error counting attempts:", countError);

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

  // Use admin client to bypass RLS policies (server only).
  // In the browser the service role key is unavailable, so fall back to the
  // anon client and rely on RLS policies. This prevents a hard crash; if RLS
  // blocks the write it will surface as a PostgREST error instead.
  const client =
    typeof window === "undefined" && isAdmin(user) ? createAdminClient() : supabase;

  const { data, error } = await client
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

  // Use admin client to bypass RLS policies (server only).
  // In the browser the service role key is unavailable, so fall back to the
  // anon client and rely on RLS policies.
  const client =
    typeof window === "undefined" && isAdmin(user) ? createAdminClient() : supabase;

  const { error } = await client
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

export async function getExamForTaking(categoryId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!categoryId) {
    throw new Error("categoryId is required");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get universal exam limit
  const { data: universalLimit, error: universalError } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "universal_exam_limit")
    .single();

  const universalExamLimit = universalLimit ? parseInt(universalLimit.value, 10) : 5;

  // Get user's daily limit and unlimited status (user limit can override universal)
  const { data: userLimit, error: limitError } = await supabase
    .from("user_exam_limits")
    .select("daily_limit, is_limited")
    .eq("user_id", user.id)
    .single();

  if (limitError && limitError.code !== "PGRST116") {
    console.error("Error fetching user limit:", limitError);
  }

  const isLimited = userLimit?.is_limited ?? true;
  // Use user limit if set and less than universal, otherwise use universal
  const userLimitValue = userLimit?.daily_limit ?? universalExamLimit;
  const dailyLimit = Math.min(userLimitValue, universalExamLimit);

  // Count today's attempts
  const { count: attemptsToday, error: countError } = await supabase
    .from("exam_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString());

  if (countError) {
    console.error("Error counting attempts:", countError);
  }

  const attemptsCount = attemptsToday || 0;

  // Only enforce limit if user is in limited mode
  if (isLimited && attemptsCount >= dailyLimit) {
    throw new Error(`Daily exam limit reached. You can take ${dailyLimit} exam(s) per day. Please try again tomorrow.`);
  }

  // Load settings
  const { data: rawSettings, error: settingsError } = await supabase
    .from("exam_settings")
    .select("question_count,duration_minutes,sorting_mode,available_from,available_to")
    .eq("category_id", categoryId)
    .maybeSingle();

  if (settingsError) {
    const message = settingsError.message || "";
    if (!message.toLowerCase().includes("does not exist") && 
        !message.toLowerCase().includes("could not find the table") &&
        !message.toLowerCase().includes("schema cache")) {
      throw settingsError;
    }
  }

  const settings = normalizeExamSettings(rawSettings ?? undefined);
  const now = new Date();
  
  if (!isWithinAvailabilityWindow(now, settings.available_from, settings.available_to)) {
    throw new Error("Exam is not available at this time.");
  }

  const { data: questions, error: qError } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("category_id", categoryId);

  if (qError) throw qError;

  // Pick questions based on sorting mode
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
    // RANDOM
    picked = shuffle(typedQuestions).slice(0, count);
  }

  const remainingAttempts = isLimited ? dailyLimit - attemptsCount - 1 : 999999;

  return {
    categoryId,
    settings,
    totalAvailable: (questions || []).length,
    questions: picked,
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
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = isAdmin(user);

  // Build the OR conditions properly
  let orConditions = [`target_user_id.eq.${user.id}`, `target_role.eq.all`];
  
  if (isUserAdmin) {
    orConditions.push("target_role.eq.admin");
  } else {
    orConditions.push("target_role.eq.student");
  }

  // Use OR filter
  const targetFilter = `or(${orConditions.join(",")})`;

  console.log('Fetching notifications with filter:', targetFilter);

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
    console.error('Supabase query error:', error);
    throw error;
  }

  console.log('Raw notifications from DB:', notifications);

  // Get read status for each notification
  const { data: readStatuses, error: readError } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id)
    .in("notification_id", notifications?.map((n: { id: string }) => n.id) || []);

  if (readError) {
    console.error("Error fetching read statuses:", readError);
  }

  const readNotificationIds = new Set(readStatuses?.map((r: { notification_id: string }) => r.notification_id) || []);

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
    .and(`or(target_user_id.eq.${user.id},target_role.eq.all),or(expires_at.is.null,expires_at.gt.now())`);

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

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

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

// ============================================================================
// SETUP ADMIN QUERIES
// ============================================================================

export async function checkAdminExists() {
  const supabase = createClient();
  
  // Check if admin exists by trying to sign in with a known admin
  // or check from a setup status table
  // This is a simplified version - in production you might want to use RPC
  
  const { data, error } = await supabase
    .from("admin_setup_status")
    .select("admin_exists")
    .single();

  if (error) {
    // If table doesn't exist, assume setup is needed
    return { adminExists: false };
  }

  return { adminExists: data?.admin_exists ?? false };
}

export async function setupAdmin(email: string, password: string) {
  const supabase = createClient();
  
  // Create admin user using signUp (will be confirmed via email or auto-confirm)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "Admin",
        username: "NavoAdmin",
      },
    },
  });

  if (error) throw error;

  // Mark setup as complete
  await supabase
    .from("admin_setup_status")
    .upsert({ id: 1, admin_exists: true });

  return {
    success: true,
    message: "Admin user created successfully",
    user: data.user,
  };
}

// ============================================================================
// COURSE MANAGEMENT QUERIES
// ============================================================================

export async function getCourseLanguages() {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  let query = client
    .from("course_languages")
    .select("*")
    .order("order_index", { ascending: true });

  // Only show published languages to non-admin users
  if (!isUserAdmin) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return { languages: data || [] };
}

export async function getCourseModules(languageId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  let query = client
    .from("course_modules")
    .select("*")
    .order("order_index", { ascending: true });

  if (languageId) {
    query = query.eq("language_id", languageId);
  }

  // Only show published modules to non-admin users
  if (!isUserAdmin) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return { modules: data || [] };
}

export async function getCourseLessons(moduleId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  let query = client
    .from("course_lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  // Only show published lessons to non-admin users
  if (!isUserAdmin) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return { lessons: data || [] };
}

export async function getModuleExamSettings(moduleId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("module_exam_settings")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();

  if (error) throw error;

  // Return default settings if none exist
  if (!data) {
    return {
      settings: {
        question_count: 20,
        duration_minutes: 20,
        passing_score: 70,
        randomize_questions: true,
        randomize_answers: true,
        max_attempts: 3,
      }
    };
  }

  return { settings: data };
}

export async function getModuleExamQuestions(moduleId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("module_exam_questions")
    .select("*")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return { questions: data || [] };
}

export async function getStudentModuleProgress(userId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  const targetUserId = userId || user.id;

  const { data, error } = await client
    .from("student_module_progress")
    .select("*")
    .eq("user_id", targetUserId);

  if (error) throw error;
  return { progress: data || [] };
}

export async function getStudentLessonProgress(userId?: string, moduleId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  const targetUserId = userId || user.id;

  let query = client
    .from("student_lesson_progress")
    .select("*")
    .eq("user_id", targetUserId);

  if (moduleId) {
    query = query.eq("module_id", moduleId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return { progress: data || [] };
}

export async function markLessonComplete(lessonId: string, moduleId: string, timeSpentSeconds: number = 0) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("student_lesson_progress")
    .upsert([{
      user_id: user.id,
      lesson_id: lessonId,
      module_id: moduleId,
      completed: true,
      completed_at: new Date().toISOString(),
      time_spent_seconds: timeSpentSeconds,
    }], { onConflict: "user_id,lesson_id" })
    .select()
    .single();

  if (error) throw error;

  // Update module progress
  await updateModuleProgress(moduleId);

  // Send notification for lesson completion
  try {
    // Get lesson details
    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("title")
      .eq("id", lessonId)
      .single();

    // Use admin client on the server to bypass RLS on the notifications
    // table; in the browser fall back to the anon client (RLS may block the
    // insert, which is acceptable since the notification is best-effort and
    // this whole block is wrapped in try/catch).
    const notifClient =
      typeof window === "undefined" ? createAdminClient() : supabase;

    await notifClient
      .from("notifications")
      .insert({
        user_id: user.id,
        type: 'system_update',
        title: 'Lesson Completed ✅',
        message: `You completed "${lesson?.title || 'a lesson'}"! Keep up the great work.`,
        data: {
          lesson_id: lessonId,
          module_id: moduleId,
        },
      });
  } catch (notificationError) {
    console.error("Failed to create notification:", notificationError);
    // Don't throw error - notification is secondary to lesson completion
  }

  return { progress: data };
}

async function updateModuleProgress(moduleId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  // Get total lessons for this module
  const { data: totalLessonsData } = await client
    .from("course_lessons")
    .select("id")
    .eq("module_id", moduleId)
    .eq("is_published", true);

  const totalLessons = totalLessonsData?.length || 0;

  // Get completed lessons for this user
  const { data: completedLessonsData } = await client
    .from("student_lesson_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .eq("completed", true);

  const lessonsCompleted = completedLessonsData?.length || 0;

  // Get exam status
  const { data: moduleProgress } = await client
    .from("student_module_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  // Update or insert module progress
  await client
    .from("student_module_progress")
    .upsert([{
      user_id: user.id,
      module_id: moduleId,
      lessons_completed: lessonsCompleted,
      total_lessons: totalLessons,
      exam_passed: moduleProgress?.exam_passed || false,
      exam_attempts: moduleProgress?.exam_attempts || 0,
      best_score: moduleProgress?.best_score,
      completed_at: moduleProgress?.completed_at,
    }], { onConflict: "user_id,module_id" });
}

export async function createModuleExamAttempt(attemptData: {
  module_id: string;
  module_title: string;
  total_questions: number;
  answers: any[];
  duration_seconds: number;
  score_percentage: number;
  passed: boolean;
}) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { module_id, module_title, total_questions, answers, duration_seconds, score_percentage, passed } = attemptData;

  const { data, error } = await supabase
    .from("module_exam_attempts")
    .insert([{
      user_id: user.id,
      module_id,
      module_title,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds,
      total_questions,
      correct_answers: answers.filter((a: any) => a.is_correct).length,
      score_percentage,
      passed,
      answers,
      status: 'completed',
    }])
    .select()
    .single();

  if (error) throw error;

  // Update module progress
  await updateModuleExamProgress(module_id, score_percentage, passed);

  return { attempt: data };
}

async function updateModuleExamProgress(moduleId: string, score: number, passed: boolean) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  // Get current progress
  const { data: currentProgress } = await client
    .from("student_module_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  const examAttempts = (currentProgress?.exam_attempts || 0) + 1;
  const bestScore = currentProgress?.best_score
    ? Math.max(currentProgress.best_score, score)
    : score;

  // Update or insert module progress
  await client
    .from("student_module_progress")
    .upsert([{
      user_id: user.id,
      module_id: moduleId,
      lessons_completed: currentProgress?.lessons_completed || 0,
      total_lessons: currentProgress?.total_lessons || 0,
      exam_passed: passed || currentProgress?.exam_passed || false,
      exam_attempts: examAttempts,
      best_score: bestScore,
      completed_at: passed ? new Date().toISOString() : currentProgress?.completed_at,
    }], { onConflict: "user_id,module_id" });
}

export async function getModuleExamAttempts(userId?: string, moduleId?: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  const targetUserId = userId || user.id;

  let query = client
    .from("module_exam_attempts")
    .select("*")
    .eq("user_id", targetUserId);

  if (moduleId) {
    query = query.eq("module_id", moduleId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return { attempts: data || [] };
}

export async function getModuleExamForTaking(moduleId: string) {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() || user.user_metadata?.role === "Admin");

  // Use admin client for admins to bypass RLS issues
  const client = isUserAdmin && typeof window === "undefined" ? createAdminClient() : supabase;

  // Get settings
  const { data: settings } = await client
    .from("module_exam_settings")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();

  if (!settings) {
    throw new Error("Module exam settings not found");
  }

  // Get all published questions
  const { data: allQuestions } = await client
    .from("module_exam_questions")
    .select("*")
    .eq("module_id", moduleId)
    .eq("is_published", true);

  if (!allQuestions || allQuestions.length === 0) {
    throw new Error("No questions available for this module exam");
  }

  // Get module info
  const { data: module } = await client
    .from("course_modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!module) {
    throw new Error("Module not found");
  }

  // Check if user has exceeded max attempts
  const { data: progress } = await supabase
    .from("student_module_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (progress && progress.exam_attempts >= settings.max_attempts && !progress.exam_passed) {
    throw new Error("You have exceeded the maximum number of attempts for this exam");
  }

  // Select questions based on settings
  let selectedQuestions = allQuestions;

  if (settings.randomize_questions) {
    selectedQuestions = shuffleArray(allQuestions);
  }

  selectedQuestions = selectedQuestions.slice(0, settings.question_count);

  // Randomize answer choices if enabled
  if (settings.randomize_answers) {
    selectedQuestions = selectedQuestions.map((q: any) => {
      const options = [
        { key: 'A', text: q.option_a, image: q.option_a_image },
        { key: 'B', text: q.option_b, image: q.option_b_image },
        { key: 'C', text: q.option_c, image: q.option_c_image },
        { key: 'D', text: q.option_d, image: q.option_d_image },
      ].filter(opt => opt.text || opt.image);

      const shuffledOptions = shuffleArray(options);

      return {
        ...q,
        shuffledOptions,
      };
    });
  }

  return {
    module,
    settings,
    questions: selectedQuestions,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// ============================================================================
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
