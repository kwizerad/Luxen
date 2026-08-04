"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  CourseLanguageCourse,
  CourseModule,
  CourseLesson,
  ModuleExamSettings,
} from "@/lib/database.types";

export interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
  examSettings?: ModuleExamSettings | null;
}

export interface CourseWithModules extends CourseLanguageCourse {
  modules: ModuleWithLessons[];
}

export interface LoadCourseResult {
  course: CourseWithModules | null;
}

export async function loadCourseByLanguage(
  language: string
): Promise<LoadCourseResult> {
  const supabase = await createClient();

  const { data: courseData, error: courseError } = await supabase
    .from("course_languages")
    .select("*")
    .eq("language", language)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (courseError || !courseData) {
    console.error("Failed to load course:", courseError);
    return { course: null };
  }

  const { data: modulesData, error: modulesError } = await supabase
    .from("course_modules")
    .select("*, lessons:course_lessons(*)")
    .eq("language_id", courseData.id)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("order_index", { ascending: true });

  if (modulesError || !modulesData) {
    console.error("Failed to load modules:", modulesError);
    return { course: null };
  }

  const typedModules = modulesData as Array<CourseModule & { lessons: CourseLesson[] }>;
  const moduleIds = typedModules.map((m) => m.id);

  const examSettingsMap = new Map<string, ModuleExamSettings>();
  if (moduleIds.length > 0) {
    const { data: examSettings } = await supabase
      .from("module_exam_settings")
      .select("*")
      .in("module_id", moduleIds)
      .is("deleted_at", null);
    (examSettings || []).forEach((es: ModuleExamSettings) => examSettingsMap.set(es.module_id, es));
  }

  const modules: ModuleWithLessons[] = typedModules.map((module) => {
    const lessons = (module.lessons || [])
      .filter((lesson) => !lesson.deleted_at)
      .sort((a, b) => a.order_index - b.order_index);
    return {
      ...module,
      lessons,
      examSettings: examSettingsMap.get(module.id) || null,
    };
  });

  return {
    course: { ...courseData, modules } as CourseWithModules,
  };
}

// ============================================================================
// CONTINUE LEARNING
// ============================================================================

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

function isLearningLanguage(language: string): language is LearningLanguage {
  return (LEARNING_LANGUAGES as readonly string[]).includes(language);
}

export interface ContinueLearningData {
  courseTitle: string;
  courseLanguage: string;
  moduleTitle: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
}

export async function getContinueLearningData(
  interfaceLanguage?: string
): Promise<ContinueLearningData | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Resolve effective learning language
  let effectiveLanguage: LearningLanguage | null = null;

  if (interfaceLanguage && isLearningLanguage(interfaceLanguage)) {
    effectiveLanguage = interfaceLanguage;
  }

  if (!effectiveLanguage) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("learning_language")
      .eq("id", user.id)
      .maybeSingle();
    const saved = profile?.learning_language;
    if (saved && isLearningLanguage(saved)) {
      effectiveLanguage = saved;
    }
  }

  if (!effectiveLanguage) {
    // Try all learning languages — pick the first that has a published course
    for (const lang of LEARNING_LANGUAGES) {
      const { data } = await supabase
        .from("course_languages")
        .select("id")
        .eq("language", lang)
        .eq("status", "published")
        .is("deleted_at", null)
        .limit(1);
      if (data && data.length > 0) {
        effectiveLanguage = lang;
        break;
      }
    }
  }

  if (!effectiveLanguage) return null;

  // Load the course with modules and lessons
  const { course } = await loadCourseByLanguage(effectiveLanguage);
  if (!course || course.modules.length === 0) return null;

  const moduleIds = course.modules.map((m) => m.id);

  // Fetch lesson progress for this user
  const { data: lessonProgress } = await supabase
    .from("student_lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("module_id", moduleIds)
    .order("updated_at", { ascending: false });

  const progressMap = new Map<string, { completed: boolean; updated_at: string }>();
  for (const p of lessonProgress || []) {
    progressMap.set(p.lesson_id, {
      completed: p.completed,
      updated_at: p.updated_at,
    });
  }

  // Build a flat ordered list of all lessons across modules
  const allLessons: { moduleId: string; moduleTitle: string; lessonId: string; lessonTitle: string }[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      allLessons.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
      });
    }
  }

  if (allLessons.length === 0) return null;

  // Strategy 1: Find the most recently updated incomplete lesson
  const incompleteStarted = (lessonProgress || [])
    .filter((p) => !p.completed)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (incompleteStarted.length > 0) {
    const target = incompleteStarted[0];
    const lessonInfo = allLessons.find((l) => l.lessonId === target.lesson_id);
    if (lessonInfo) {
      return {
        courseTitle: course.title,
        courseLanguage: course.language,
        moduleTitle: lessonInfo.moduleTitle,
        moduleId: lessonInfo.moduleId,
        lessonId: lessonInfo.lessonId,
        lessonTitle: lessonInfo.lessonTitle,
      };
    }
  }

  // Strategy 2: Find the first lesson that has no progress record (not started yet)
  // after all completed lessons
  const firstUnstarted = allLessons.find((l) => !progressMap.has(l.lessonId));
  if (firstUnstarted) {
    return {
      courseTitle: course.title,
      courseLanguage: course.language,
      moduleTitle: firstUnstarted.moduleTitle,
      moduleId: firstUnstarted.moduleId,
      lessonId: firstUnstarted.lessonId,
      lessonTitle: firstUnstarted.lessonTitle,
    };
  }

  // Strategy 3: Everything is completed — return the last lesson
  const last = allLessons[allLessons.length - 1];
  return {
    courseTitle: course.title,
    courseLanguage: course.language,
    moduleTitle: last.moduleTitle,
    moduleId: last.moduleId,
    lessonId: last.lessonId,
    lessonTitle: last.lessonTitle,
  };
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface DashboardStats {
  lessonsCompleted: number;
  totalLessons: number;
  modulesCompleted: number;
  totalModules: number;
  examAttemptsCount: number;
  bestExamScore: number | null;
}

export async function getDashboardStats(
  interfaceLanguage?: string
): Promise<DashboardStats> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      lessonsCompleted: 0,
      totalLessons: 0,
      modulesCompleted: 0,
      totalModules: 0,
      examAttemptsCount: 0,
      bestExamScore: null,
    };
  }

  // Resolve learning language (same logic as getContinueLearningData)
  let effectiveLanguage: LearningLanguage | null = null;
  if (interfaceLanguage && isLearningLanguage(interfaceLanguage)) {
    effectiveLanguage = interfaceLanguage;
  }
  if (!effectiveLanguage) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("learning_language")
      .eq("id", user.id)
      .maybeSingle();
    const saved = profile?.learning_language;
    if (saved && isLearningLanguage(saved)) {
      effectiveLanguage = saved;
    }
  }
  if (!effectiveLanguage) {
    for (const lang of LEARNING_LANGUAGES) {
      const { data } = await supabase
        .from("course_languages")
        .select("id")
        .eq("language", lang)
        .eq("status", "published")
        .is("deleted_at", null)
        .limit(1);
      if (data && data.length > 0) {
        effectiveLanguage = lang;
        break;
      }
    }
  }

  let lessonsCompleted = 0;
  let totalLessons = 0;
  let modulesCompleted = 0;
  let totalModules = 0;

  if (effectiveLanguage) {
    const { course } = await loadCourseByLanguage(effectiveLanguage);
    if (course) {
      const moduleIds = course.modules.map((m) => m.id);
      totalModules = course.modules.length;
      totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

      if (moduleIds.length > 0) {
        // Lesson progress
        const { data: lessonProgress } = await supabase
          .from("student_lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .in("module_id", moduleIds)
          .eq("completed", true);
        lessonsCompleted = lessonProgress?.length || 0;

        // Module progress
        const { data: moduleProgress } = await supabase
          .from("student_module_progress")
          .select("module_id")
          .eq("user_id", user.id)
          .in("module_id", moduleIds);
        modulesCompleted = moduleProgress?.length || 0;
      }
    }
  }

  // Exam attempts
  const { data: examAttempts } = await supabase
    .from("exam_attempts")
    .select("score_percentage, status")
    .eq("user_id", user.id)
    .eq("status", "completed");
  const completedAttempts = examAttempts || [];
  const examAttemptsCount = completedAttempts.length;
  const bestExamScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map((a: { score_percentage: number }) => a.score_percentage || 0))
    : null;

  return {
    lessonsCompleted,
    totalLessons,
    modulesCompleted,
    totalModules,
    examAttemptsCount,
    bestExamScore,
  };
}
