"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CourseLanguageCourse,
  CourseModule,
  CourseLesson,
  ModuleExamSettings,
  ModuleExamQuestion,
} from "@/lib/database.types";
import { requireAdmin, ActionResult } from "./_shared";

function handleError(error: unknown): { success: false; error: string } {
  const message = error instanceof Error ? error.message : String(error);
  return { success: false, error: message };
}

// ============================================================================
// COURSES (course_languages)
// ============================================================================

const BUILT_IN_COURSES = [
  { language: "English", title: "English Course", description: "Traffic school course in English", order_index: 0 },
  { language: "French", title: "French Course", description: "Traffic school course in French", order_index: 1 },
  { language: "Kinyarwanda", title: "Kinyarwanda Course", description: "Traffic school course in Kinyarwanda", order_index: 2 },
] as const;

const BUILT_IN_LANGUAGES = BUILT_IN_COURSES.map((course) => course.language);

export async function listCourses(): Promise<ActionResult<CourseLanguageCourse[]>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data: existing, error } = await supabase
      .from("course_languages")
      .select("*")
      .in("language", BUILT_IN_LANGUAGES)
      .is("deleted_at", null);
    if (error) throw error;

    const existingLanguages = new Set((existing || []).map((course) => course.language));
    const missingCourses = BUILT_IN_COURSES.filter((course) => !existingLanguages.has(course.language));
    if (missingCourses.length) {
      const { error: seedError } = await supabase.from("course_languages").insert(
        missingCourses.map((course) => ({ ...course, is_published: true, status: "published" }))
      );
      if (seedError) throw seedError;
    }

    const { data, error: refetchError } = await supabase
      .from("course_languages")
      .select("*")
      .in("language", BUILT_IN_LANGUAGES)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (refetchError) throw refetchError;

    const courseByLanguage = new Map((data || []).map((course) => [course.language, course]));
    return {
      success: true,
      data: BUILT_IN_LANGUAGES.map((language) => courseByLanguage.get(language)).filter(
        (course): course is CourseLanguageCourse => Boolean(course)
      ),
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function getCourse(id: string): Promise<ActionResult<CourseLanguageCourse | null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("course_languages")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateCourse(
  id: string,
  input: Partial<CourseLanguageCourse>
): Promise<ActionResult<CourseLanguageCourse>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { data: course, error: courseError } = await supabase
      .from("course_languages")
      .select("language")
      .eq("id", id)
      .single();
    if (courseError) throw courseError;
    if (!BUILT_IN_LANGUAGES.includes(course.language as (typeof BUILT_IN_LANGUAGES)[number])) {
      throw new Error("Only the built-in English, French, and Kinyarwanda courses can be managed.");
    }
    if (input.status && input.status !== "draft" && input.status !== "published") {
      throw new Error("Built-in courses can only be published or unpublished.");
    }

    const { data, error } = await supabase
      .from("course_languages")
      .update({
        title: input.title,
        description: input.description,
        thumbnail_url: input.thumbnail_url,
        banner_url: input.banner_url,
        status: input.status,
        is_published: input.status === "published",
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// MODULES
// ============================================================================

export async function listModules(courseId: string): Promise<ActionResult<CourseModule[]>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("course_modules")
      .select("*")
      .eq("language_id", courseId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleError(error);
  }
}

export async function createModule(courseId: string, title = "New Module"): Promise<ActionResult<CourseModule>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();

    const { count } = await supabase
      .from("course_modules")
      .select("*", { count: "exact", head: true })
      .eq("language_id", courseId)
      .is("deleted_at", null);

    const { data, error } = await supabase
      .from("course_modules")
      .insert({
        language_id: courseId,
        title,
        order_index: count || 0,
        status: "draft",
        is_published: false,
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateModule(
  id: string,
  input: Partial<CourseModule>
): Promise<ActionResult<CourseModule>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("course_modules")
      .update({
        title: input.title,
        description: input.description,
        status: input.status,
        is_published: input.status === "published",
        order_index: input.order_index,
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteModule(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("course_modules")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderModules(moduleIds: string[]): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const updates = moduleIds.map((id, index) =>
      supabase.from("course_modules").update({ order_index: index }).eq("id", id)
    );
    const results = await Promise.all(updates);
    for (const result of results) {
      if (result.error) throw result.error;
    }
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// LESSONS
// ============================================================================

export async function listLessons(moduleId: string): Promise<ActionResult<CourseLesson[]>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("module_id", moduleId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleError(error);
  }
}

export async function createLesson(moduleId: string, title = "New Lesson"): Promise<ActionResult<CourseLesson>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("module_id", moduleId)
      .is("deleted_at", null);
    const { data, error } = await supabase
      .from("course_lessons")
      .insert({
        module_id: moduleId,
        title,
        content: "",
        content_type: "text",
        order_index: count || 0,
        status: "draft",
        is_published: false,
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateLesson(
  id: string,
  input: Partial<CourseLesson>
): Promise<ActionResult<CourseLesson>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("course_lessons")
      .update({
        title: input.title,
        content: input.content,
        content_type: input.content_type,
        media_url: input.media_url,
        audio_url: input.audio_url,
        image_url: input.image_url,
        status: input.status,
        is_published: input.status === "published",
        order_index: input.order_index,
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteLesson(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("course_lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderLessons(lessonIds: string[]): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const updates = lessonIds.map((id, index) =>
      supabase.from("course_lessons").update({ order_index: index }).eq("id", id)
    );
    const results = await Promise.all(updates);
    for (const result of results) {
      if (result.error) throw result.error;
    }
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// EXAM SETTINGS
// ============================================================================

export async function getExamSettings(moduleId: string): Promise<ActionResult<ModuleExamSettings | null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("module_exam_settings")
      .select("*")
      .eq("module_id", moduleId)
      .is("deleted_at", null)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function createExamSettings(
  moduleId: string,
  title = "Module Exam"
): Promise<ActionResult<ModuleExamSettings>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("module_exam_settings")
      .insert({
        module_id: moduleId,
        title,
        status: "draft",
        question_count: 0,
        duration_minutes: 20,
        passing_percentage: 70,
        randomize_questions: false,
        randomize_answers: false,
        max_attempts: 3,
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateExamSettings(
  id: string,
  input: Partial<ModuleExamSettings>
): Promise<ActionResult<ModuleExamSettings>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("module_exam_settings")
      .update({
        title: input.title,
        status: input.status,
        passing_percentage: input.passing_percentage,
        duration_minutes: input.duration_minutes,
        time_limit_minutes: input.time_limit_minutes,
        max_attempts: input.max_attempts,
        randomize_questions: input.randomize_questions,
        randomize_answers: input.randomize_answers,
        show_results_immediately: input.show_results_immediately,
        show_explanations: input.show_explanations,
        allow_review: input.allow_review,
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteExamSettings(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("module_exam_settings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// EXAM QUESTIONS
// ============================================================================

export async function listExamQuestions(moduleId: string): Promise<ActionResult<ModuleExamQuestion[]>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("module_exam_questions")
      .select("*")
      .eq("module_id", moduleId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleError(error);
  }
}

function normalizeQuestionInput(input: Partial<ModuleExamQuestion>) {
  const isTF = input.type === "true_false";
  return {
    type: input.type,
    question: input.question,
    question_image: input.question_image,
    option_a: isTF ? "True" : input.option_a,
    option_a_image: isTF ? null : input.option_a_image,
    option_b: isTF ? "False" : input.option_b,
    option_b_image: isTF ? null : input.option_b_image,
    option_c: isTF ? null : input.option_c,
    option_c_image: isTF ? null : input.option_c_image,
    option_d: isTF ? null : input.option_d,
    option_d_image: isTF ? null : input.option_d_image,
    correct_answer: input.correct_answer,
    explanation: input.explanation,
    points: input.points,
    order_index: input.order_index,
    is_published: true,
    metadata: input.metadata,
    tags: input.tags,
    randomize_answer_order: input.randomize_answer_order,
  };
}

export async function createExamQuestion(
  moduleId: string,
  input: Partial<ModuleExamQuestion>
): Promise<ActionResult<ModuleExamQuestion>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("module_exam_questions")
      .select("*", { count: "exact", head: true })
      .eq("module_id", moduleId)
      .is("deleted_at", null);
    const { data, error } = await supabase
      .from("module_exam_questions")
      .insert({
        module_id: moduleId,
        ...normalizeQuestionInput(input),
        order_index: input.order_index ?? count ?? 0,
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateExamQuestion(
  id: string,
  input: Partial<ModuleExamQuestion>
): Promise<ActionResult<ModuleExamQuestion>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("module_exam_questions")
      .update({
        ...normalizeQuestionInput(input),
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteExamQuestion(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("module_exam_questions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderExamQuestions(questionIds: string[]): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const updates = questionIds.map((id, index) =>
      supabase.from("module_exam_questions").update({ order_index: index }).eq("id", id)
    );
    const results = await Promise.all(updates);
    for (const result of results) {
      if (result.error) throw result.error;
    }
    revalidatePath("/Admin/course-studio");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// LOAD FULL COURSE DATA
// ============================================================================

export interface FullCourse {
  course: CourseLanguageCourse;
  modules: Array<{
    module: CourseModule;
    lessons: CourseLesson[];
    exam: ModuleExamSettings | null;
    questions: ModuleExamQuestion[];
  }>;
}

export async function loadFullCourse(courseId: string): Promise<ActionResult<FullCourse>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data: course, error: courseError } = await supabase
      .from("course_languages")
      .select("*")
      .eq("id", courseId)
      .is("deleted_at", null)
      .single();
    if (courseError) throw courseError;

    const { data: modules, error: modulesError } = await supabase
      .from("course_modules")
      .select("*")
      .eq("language_id", courseId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (modulesError) throw modulesError;

    const moduleIds = (modules || []).map((m) => m.id);

    const [lessonsRes, examsRes, questionsRes] = await Promise.all([
      supabase
        .from("course_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .is("deleted_at", null)
        .order("order_index", { ascending: true }),
      supabase
        .from("module_exam_settings")
        .select("*")
        .in("module_id", moduleIds)
        .is("deleted_at", null),
      supabase
        .from("module_exam_questions")
        .select("*")
        .in("module_id", moduleIds)
        .is("deleted_at", null)
        .order("order_index", { ascending: true }),
    ]);

    if (lessonsRes.error) throw lessonsRes.error;
    if (examsRes.error) throw examsRes.error;
    if (questionsRes.error) throw questionsRes.error;

    const lessonsByModule = new Map<string, CourseLesson[]>();
    for (const lesson of lessonsRes.data || []) {
      const arr = lessonsByModule.get(lesson.module_id) || [];
      arr.push(lesson);
      lessonsByModule.set(lesson.module_id, arr);
    }

    const examsByModule = new Map<string, ModuleExamSettings>();
    for (const exam of examsRes.data || []) {
      examsByModule.set(exam.module_id, exam);
    }

    const questionsByModule = new Map<string, ModuleExamQuestion[]>();
    for (const question of questionsRes.data || []) {
      const arr = questionsByModule.get(question.module_id) || [];
      arr.push(question);
      questionsByModule.set(question.module_id, arr);
    }

    const result: FullCourse = {
      course,
      modules: (modules || []).map((module) => ({
        module,
        lessons: lessonsByModule.get(module.id) || [],
        exam: examsByModule.get(module.id) || null,
        questions: questionsByModule.get(module.id) || [],
      })),
    };

    return { success: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// STORAGE UPLOAD
// ============================================================================

export async function getSignedUploadUrl(
  path: string
): Promise<ActionResult<{ signedUrl: string; publicUrl: string; path: string }>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from("course-assets")
      .createSignedUploadUrl(path);
    if (error) throw error;
    const { data: publicData } = supabase.storage.from("course-assets").getPublicUrl(path);
    return { success: true, data: { signedUrl: data.signedUrl, publicUrl: publicData.publicUrl, path } };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteStorageObject(path: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from("course-assets").remove([path]);
    if (error) throw error;
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}
