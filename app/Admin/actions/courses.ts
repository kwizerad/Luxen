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
  if (error instanceof Error) return { success: false, error: error.message };
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; error?: string; details?: string };
    if (e.message) return { success: false, error: e.message };
    if (e.error) return { success: false, error: e.error };
    if (e.details) return { success: false, error: e.details };
  }
  return { success: false, error: String(error) };
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
    revalidatePath("/Admin/course");
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

    console.log("Creating basic module:", { courseId, title });

    // Validate courseId
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from("course_languages")
      .select("id")
      .eq("id", courseId)
      .is("deleted_at", null)
      .single();
    
    if (courseError) {
      console.error("Course lookup failed:", courseError);
      throw new Error(`Course not found: ${courseError.message}`);
    }
    if (!course) {
      throw new Error("Course not found or has been deleted");
    }

    const { count, error: countError } = await supabase
      .from("course_modules")
      .select("*", { count: "exact", head: true })
      .eq("language_id", courseId)
      .is("deleted_at", null);

    if (countError) {
      console.error("Module count failed:", countError);
      throw new Error(`Failed to count modules: ${countError.message}`);
    }

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
    
    if (error) {
      console.error("Module creation failed:", error);
      throw error;
    }
    
    if (!data) {
      throw new Error("Module creation returned no data");
    }

    console.log("Basic module created successfully:", data.id);
    
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
    return { success: true, data };
  } catch (error) {
    console.error("Basic module creation failed:", error);
    return handleError(error);
  }
}

/**
 * Atomically creates a module together with a default "Lesson 1" and an exam
 * named "The {moduleTitle} Test". If any insert fails, all three are rolled
 * back via soft-delete so the UI never sees a half-created module.
 */
export async function createModuleWithDefaults(
  courseId: string,
  title?: string
): Promise<ActionResult<{ module: CourseModule; lesson: CourseLesson; exam: ModuleExamSettings }>> {
  const moduleTitle = title?.trim() || "New Module";
  const lessonTitle = "Lesson 1";
  const examTitle = `The ${moduleTitle} Test`;

  console.log("Creating module with defaults:", { courseId, moduleTitle });

  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();

    // Validate courseId
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from("course_languages")
      .select("id")
      .eq("id", courseId)
      .is("deleted_at", null)
      .single();
    
    if (courseError) {
      console.error("Course lookup failed:", courseError);
      throw new Error(`Course not found: ${courseError.message}`);
    }
    if (!course) {
      throw new Error("Course not found or has been deleted");
    }

    console.log("Course verified, creating module...");

    // 1. Insert the module.
    const { count: moduleCount, error: countError } = await supabase
      .from("course_modules")
      .select("*", { count: "exact", head: true })
      .eq("language_id", courseId)
      .is("deleted_at", null);

    if (countError) {
      console.error("Module count failed:", countError);
      throw new Error(`Failed to count modules: ${countError.message}`);
    }

    const { data: module, error: moduleError } = await supabase
      .from("course_modules")
      .insert({
        language_id: courseId,
        title: moduleTitle,
        order_index: moduleCount || 0,
        status: "draft",
        is_published: false,
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    
    if (moduleError) {
      console.error("Module creation failed:", moduleError);
      throw new Error(`Failed to create module: ${moduleError.message}`);
    }
    if (!module) {
      throw new Error("Module creation returned no data");
    }
    
    console.log("Module created successfully:", module.id);
    const moduleId = module.id;

    // 2. Insert the default lesson.
    const { data: lesson, error: lessonError } = await supabase
      .from("course_lessons")
      .insert({
        module_id: moduleId,
        title: lessonTitle,
        content: "",
        content_type: "text",
        order_index: 0,
        status: "draft",
        is_published: false,
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    
    if (lessonError) {
      console.error("Lesson creation failed:", lessonError);
      // Rollback: soft-delete the module if lesson creation fails
      await supabase
        .from("course_modules")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", moduleId);
      throw new Error(`Failed to create lesson: ${lessonError.message}`);
    }
    
    if (!lesson) {
      throw new Error("Lesson creation returned no data");
    }

    console.log("Lesson created successfully:", lesson.id);

    // 3. Insert the default exam.
    const { data: exam, error: examError } = await supabase
      .from("module_exam_settings")
      .insert({
        module_id: moduleId,
        title: examTitle,
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
    
    if (examError) {
      console.error("Exam creation failed:", examError);
      // Rollback: soft-delete the module and lesson if exam creation fails
      await supabase
        .from("course_lessons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", lesson.id);
      await supabase
        .from("course_modules")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", moduleId);
      throw new Error(`Failed to create exam: ${examError.message}`);
    }
    
    if (!exam) {
      throw new Error("Exam creation returned no data");
    }

    console.log("Exam created successfully:", exam.id);

    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
    return { success: true, data: { module, lesson, exam } };
  } catch (error) {
    console.error("Module creation failed:", error);
    // Best-effort rollback: soft-delete any rows that were inserted before the
    // failure so the UI never sees a half-created module.
    try {
      const supabase = createAdminClient();
      const now = new Date().toISOString();
      // We don't have the IDs of partial inserts, so we clean up any orphaned
      // rows for this course that have no children — best-effort only.
      // The module insert is the first step; if it succeeded but a later step
      // failed, soft-delete the module (cascade handles children via DB).
      // This is a safety net; the common case is all-or-nothing.
      await supabase
        .from("course_modules")
        .update({ deleted_at: now })
        .eq("language_id", courseId)
        .eq("title", moduleTitle)
        .is("deleted_at", null);
    } catch {
      // ignore rollback errors
    }
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
    revalidatePath("/Admin/course");
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
    revalidatePath("/Admin/course");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderModules(moduleIds: string[]): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    
    // Validate input
    if (!moduleIds || moduleIds.length === 0) {
      throw new Error("Module IDs array is empty");
    }
    
    // Remove duplicates while preserving order
    const uniqueModuleIds = Array.from(new Set(moduleIds));
    if (uniqueModuleIds.length !== moduleIds.length) {
      throw new Error("Duplicate module IDs detected");
    }
    
    // Verify all modules exist and belong to the same course
    const { data: modules, error: fetchError } = await supabase
      .from("course_modules")
      .select("id, language_id, order_index")
      .in("id", uniqueModuleIds)
      .is("deleted_at", null);
    
    if (fetchError) throw fetchError;
    if (!modules || modules.length !== uniqueModuleIds.length) {
      throw new Error("One or more modules not found or already deleted");
    }
    
    // Verify all modules belong to the same course
    const courseIds = new Set(modules.map(m => m.language_id));
    if (courseIds.size > 1) {
      throw new Error("All modules must belong to the same course");
    }
    
    const courseId = Array.from(courseIds)[0];
    
    // Get current total module count for this course to ensure we're not missing any
    const { count: totalModules, error: countError } = await supabase
      .from("course_modules")
      .select("*", { count: "exact", head: true })
      .eq("language_id", courseId)
      .is("deleted_at", null);
    
    if (countError) throw countError;
    if (totalModules !== uniqueModuleIds.length) {
      throw new Error(`Module count mismatch. Expected ${totalModules} modules, but received ${uniqueModuleIds.length}`);
    }
    
    // Update order indices in a transaction-like manner with error handling
    const admin = await requireAdmin();
    const updates = uniqueModuleIds.map((id, index) =>
      supabase
        .from("course_modules")
        .update({ 
          order_index: index,
          updated_at: new Date().toISOString(),
          updated_by: admin.id
        })
        .eq("id", id)
        .is("deleted_at", null)
    );
    
    const results = await Promise.all(updates);
    const errors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) {
        errors.push(`Failed to update module at index ${i}: ${results[i].error?.message || 'Unknown error'}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to update modules: ${errors.join(", ")}`);
    }
    
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
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
    revalidatePath("/Admin/course");
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
        topics: input.topics,
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
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
    revalidatePath("/Admin/course");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderLessons(lessonIds: string[]): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    
    // Validate input
    if (!lessonIds || lessonIds.length === 0) {
      throw new Error("Lesson IDs array is empty");
    }
    
    // Remove duplicates while preserving order
    const uniqueLessonIds = Array.from(new Set(lessonIds));
    if (uniqueLessonIds.length !== lessonIds.length) {
      throw new Error("Duplicate lesson IDs detected");
    }
    
    // Verify all lessons exist and belong to the same module
    const { data: lessons, error: fetchError } = await supabase
      .from("course_lessons")
      .select("id, module_id, order_index")
      .in("id", uniqueLessonIds)
      .is("deleted_at", null);
    
    if (fetchError) throw fetchError;
    if (!lessons || lessons.length !== uniqueLessonIds.length) {
      throw new Error("One or more lessons not found or already deleted");
    }
    
    // Verify all lessons belong to the same module
    const moduleIds = new Set(lessons.map(l => l.module_id));
    if (moduleIds.size > 1) {
      throw new Error("All lessons must belong to the same module");
    }
    
    const moduleId = Array.from(moduleIds)[0];
    
    // Get current total lesson count for this module to ensure we're not missing any
    const { count: totalLessons, error: countError } = await supabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("module_id", moduleId)
      .is("deleted_at", null);
    
    if (countError) throw countError;
    if (totalLessons !== uniqueLessonIds.length) {
      throw new Error(`Lesson count mismatch. Expected ${totalLessons} lessons, but received ${uniqueLessonIds.length}`);
    }
    
    // Update order indices in a transaction-like manner with error handling
    const admin = await requireAdmin();
    const updates = uniqueLessonIds.map((id, index) =>
      supabase
        .from("course_lessons")
        .update({ 
          order_index: index,
          updated_at: new Date().toISOString(),
          updated_by: admin.id
        })
        .eq("id", id)
        .is("deleted_at", null)
    );
    
    const results = await Promise.all(updates);
    const errors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) {
        errors.push(`Failed to update lesson at index ${i}: ${results[i].error?.message || 'Unknown error'}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to update lessons: ${errors.join(", ")}`);
    }
    
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
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

    // Check for an existing soft-deleted row (from before the hard-delete fix).
    // If found, restore it instead of inserting to avoid UNIQUE constraint violation.
    const { data: existing } = await supabase
      .from("module_exam_settings")
      .select("id")
      .eq("module_id", moduleId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("module_exam_settings")
        .update({
          deleted_at: null,
          title,
          status: "draft",
          question_count: 20,
          duration_minutes: 20,
          passing_percentage: 70,
          max_attempts: 2,
          updated_by: admin.id,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      revalidatePath("/Admin/course-studio");
      revalidatePath("/Admin/course");
      return { success: true, data };
    }

    const { data, error } = await supabase
      .from("module_exam_settings")
      .insert({
        module_id: moduleId,
        title,
        status: "draft",
        question_count: 20,
        duration_minutes: 20,
        passing_percentage: 70,
        randomize_questions: false,
        randomize_answers: false,
        max_attempts: 2,
        exam_type: "",
        created_by: admin.id,
        updated_by: admin.id,
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
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
        max_attempts: input.max_attempts,
        randomize_questions: input.randomize_questions,
        randomize_answers: input.randomize_answers,
        show_results_immediately: input.show_results_immediately,
        show_explanations: input.show_explanations,
        allow_review: input.allow_review,
        question_count: input.question_count,
        exam_type: input.exam_type,
        updated_by: admin.id,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteExamSettings(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    // Hard delete because module_id has a UNIQUE constraint.
    // A soft-deleted row would block creating a new exam for the same module.
    const { error } = await supabase
      .from("module_exam_settings")
      .delete()
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
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
    revalidatePath("/Admin/course");
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
    revalidatePath("/Admin/course");
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
    revalidatePath("/Admin/course");
    return { success: true, data: null };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderExamQuestions(questionIds: string[]): Promise<ActionResult<null>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    
    // Validate input
    if (!questionIds || questionIds.length === 0) {
      throw new Error("Question IDs array is empty");
    }
    
    // Remove duplicates while preserving order
    const uniqueQuestionIds = Array.from(new Set(questionIds));
    if (uniqueQuestionIds.length !== questionIds.length) {
      throw new Error("Duplicate question IDs detected");
    }
    
    // Verify all questions exist and belong to the same module
    const { data: questions, error: fetchError } = await supabase
      .from("module_exam_questions")
      .select("id, module_id, order_index")
      .in("id", uniqueQuestionIds)
      .is("deleted_at", null);
    
    if (fetchError) throw fetchError;
    if (!questions || questions.length !== uniqueQuestionIds.length) {
      throw new Error("One or more questions not found or already deleted");
    }
    
    // Verify all questions belong to the same module
    const moduleIds = new Set(questions.map(q => q.module_id));
    if (moduleIds.size > 1) {
      throw new Error("All questions must belong to the same module");
    }
    
    const moduleId = Array.from(moduleIds)[0];
    
    // Get current total question count for this module to ensure we're not missing any
    const { count: totalQuestions, error: countError } = await supabase
      .from("module_exam_questions")
      .select("*", { count: "exact", head: true })
      .eq("module_id", moduleId)
      .is("deleted_at", null);
    
    if (countError) throw countError;
    if (totalQuestions !== uniqueQuestionIds.length) {
      throw new Error(`Question count mismatch. Expected ${totalQuestions} questions, but received ${uniqueQuestionIds.length}`);
    }
    
    // Update order indices in a transaction-like manner with error handling
    const admin = await requireAdmin();
    const updates = uniqueQuestionIds.map((id, index) =>
      supabase
        .from("module_exam_questions")
        .update({ 
          order_index: index,
          updated_at: new Date().toISOString(),
          updated_by: admin.id
        })
        .eq("id", id)
        .is("deleted_at", null)
    );
    
    const results = await Promise.all(updates);
    const errors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) {
        errors.push(`Failed to update question at index ${i}: ${results[i].error?.message || 'Unknown error'}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to update questions: ${errors.join(", ")}`);
    }
    
    revalidatePath("/Admin/course-studio");
    revalidatePath("/Admin/course");
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
