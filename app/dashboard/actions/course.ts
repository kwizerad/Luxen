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
// COMBINED DASHBOARD DATA (single server action, shared course fetch)
// ============================================================================

export interface ContinueLearningData {
  courseTitle: string;
  courseLanguage: string;
  moduleTitle: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
}

export interface DashboardStats {
  lessonsCompleted: number;
  totalLessons: number;
  modulesCompleted: number;
  totalModules: number;
  progressPercent: number;
}

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

function isLearningLanguage(language: string): language is LearningLanguage {
  return (LEARNING_LANGUAGES as readonly string[]).includes(language);
}

async function resolveLearningLanguage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  interfaceLanguage?: string
): Promise<LearningLanguage | null> {
  // Fetch enabled languages from system_config
  const { data: langConfigs } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", [
      "learning_language_english_enabled",
      "learning_language_french_enabled",
      "learning_language_kinyarwanda_enabled",
    ]);

  const disabledLanguages = new Set<string>();
  for (const row of langConfigs || []) {
    if (row.value === "false") {
      const match = row.key.match(/^learning_language_(.+)_enabled$/);
      if (match) {
        // Capitalize first letter to match LEARNING_LANGUAGES format
        const lang = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        disabledLanguages.add(lang);
      }
    }
  }

  const isLanguageEnabled = (lang: string): boolean =>
    !disabledLanguages.has(lang);

  if (interfaceLanguage && isLearningLanguage(interfaceLanguage) && isLanguageEnabled(interfaceLanguage)) {
    return interfaceLanguage;
  }

  // Fetch user profile and all published courses in parallel
  const [profileResult, coursesResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("learning_language")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("course_languages")
      .select("language")
      .eq("status", "published")
      .is("deleted_at", null),
  ]);

  const saved = profileResult.data?.learning_language;
  if (saved && isLearningLanguage(saved) && isLanguageEnabled(saved)) {
    return saved;
  }

  // Find the first matching enabled learning language from published courses
  const publishedLanguages = new Set(
    (coursesResult.data || []).map((c: { language: string }) => c.language)
  );
  for (const lang of LEARNING_LANGUAGES) {
    if (isLanguageEnabled(lang) && publishedLanguages.has(lang)) {
      return lang;
    }
  }

  return null;
}

export interface DashboardData {
  continueLearning: ContinueLearningData | null;
  stats: DashboardStats;
}

export async function getDashboardData(
  interfaceLanguage?: string
): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      continueLearning: null,
      stats: {
        lessonsCompleted: 0,
        totalLessons: 0,
        modulesCompleted: 0,
        totalModules: 0,
        progressPercent: 0,
      },
    };
  }

  // If interfaceLanguage is already a valid learning language, skip the profile lookup
  let effectiveLanguage: LearningLanguage | null = null;
  if (interfaceLanguage && isLearningLanguage(interfaceLanguage)) {
    effectiveLanguage = interfaceLanguage;
  } else {
    effectiveLanguage = await resolveLearningLanguage(supabase, user, interfaceLanguage);
  }
  if (!effectiveLanguage) {
    return {
      continueLearning: null,
      stats: {
        lessonsCompleted: 0,
        totalLessons: 0,
        modulesCompleted: 0,
        totalModules: 0,
        progressPercent: 0,
      },
    };
  }

  // Single course fetch — shared by both continue-learning and stats
  const { course } = await loadCourseByLanguage(effectiveLanguage);
  if (!course || course.modules.length === 0) {
    return {
      continueLearning: null,
      stats: {
        lessonsCompleted: 0,
        totalLessons: 0,
        modulesCompleted: 0,
        totalModules: 0,
        progressPercent: 0,
      },
    };
  }

  const moduleIds = course.modules.map((m) => m.id);

  // Parallel: lesson progress + module progress (need exam_attempts for completion check)
  const [lessonProgressResult, moduleProgressResult] = await Promise.all([
    supabase
      .from("student_lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("module_id", moduleIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("student_module_progress")
      .select("module_id, exam_attempts")
      .eq("user_id", user.id)
      .in("module_id", moduleIds),
  ]);

  const lessonProgress = lessonProgressResult.data || [];
  const moduleProgress = moduleProgressResult.data || [];

  // --- Stats (matching course-view calculation) ---
  const totalModules = course.modules.length;

  // Build lesson progress map: lessonId -> completed
  const lessonCompletedMap = new Map<string, boolean>();
  for (const p of lessonProgress) {
    lessonCompletedMap.set(p.lesson_id, p.completed);
  }

  // Build module progress map: moduleId -> { examAttempts }
  const moduleExamAttemptsMap = new Map<string, number>();
  for (const p of moduleProgress) {
    moduleExamAttemptsMap.set(p.module_id, (p as { exam_attempts?: number }).exam_attempts || 0);
  }

  // Calculate progress matching course-view's buildFlatList logic:
  // - Lessons with topics are split into topic items (+ 1 content item if content exists)
  // - Exam items are added for modules with examSettings
  let totalItems = 0;
  let completedItems = 0;
  let totalLessons = 0;
  let lessonsCompleted = 0;
  let modulesCompleted = 0;

  for (const mod of course.modules) {
    const allLessonsDone = mod.lessons.length > 0 && mod.lessons.every((l) => lessonCompletedMap.get(l.id) === true);
    const examAttempts = moduleExamAttemptsMap.get(mod.id) || 0;
    const examTaken = examAttempts > 0;
    const isComplete = allLessonsDone && (examTaken || !mod.examSettings);
    if (isComplete) modulesCompleted++;

    for (const lesson of mod.lessons) {
      totalLessons++;
      const isLessonCompleted = lessonCompletedMap.get(lesson.id) === true;
      if (isLessonCompleted) lessonsCompleted++;

      const topics = Array.isArray(lesson.topics) ? lesson.topics : [];
      if (topics.length > 0) {
        // Content page item (only if content exists)
        if (lesson.content && lesson.content.trim()) {
          totalItems++;
          if (isLessonCompleted) completedItems++;
        }
        // Topic items
        for (const _topic of topics) {
          totalItems++;
          if (isLessonCompleted) completedItems++;
        }
      } else {
        // Single lesson item
        totalItems++;
        if (isLessonCompleted) completedItems++;
      }
    }

    // Exam item
    if (mod.examSettings) {
      totalItems++;
      if (examTaken) completedItems++;
    }
  }

  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // --- Continue learning ---
  const progressMap = new Map<string, { completed: boolean; updated_at: string }>();
  for (const p of lessonProgress) {
    progressMap.set(p.lesson_id, {
      completed: p.completed,
      updated_at: p.updated_at,
    });
  }

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

  let continueLearning: ContinueLearningData | null = null;

  if (allLessons.length > 0) {
    // Strategy 1: most recently updated incomplete lesson
    const incompleteStarted = lessonProgress
      .filter((p: { completed: boolean }) => !p.completed)
      .sort((a: { updated_at: string }, b: { updated_at: string }) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    if (incompleteStarted.length > 0) {
      const target = incompleteStarted[0];
      const lessonInfo = allLessons.find((l) => l.lessonId === target.lesson_id);
      if (lessonInfo) {
        continueLearning = {
          courseTitle: course.title,
          courseLanguage: course.language,
          moduleTitle: lessonInfo.moduleTitle,
          moduleId: lessonInfo.moduleId,
          lessonId: lessonInfo.lessonId,
          lessonTitle: lessonInfo.lessonTitle,
        };
      }
    }

    if (!continueLearning) {
      // Strategy 2: first unstarted lesson
      const firstUnstarted = allLessons.find((l) => !progressMap.has(l.lessonId));
      if (firstUnstarted) {
        continueLearning = {
          courseTitle: course.title,
          courseLanguage: course.language,
          moduleTitle: firstUnstarted.moduleTitle,
          moduleId: firstUnstarted.moduleId,
          lessonId: firstUnstarted.lessonId,
          lessonTitle: firstUnstarted.lessonTitle,
        };
      }
    }

    if (!continueLearning) {
      // Strategy 3: last lesson (all completed)
      const last = allLessons[allLessons.length - 1];
      continueLearning = {
        courseTitle: course.title,
        courseLanguage: course.language,
        moduleTitle: last.moduleTitle,
        moduleId: last.moduleId,
        lessonId: last.lessonId,
        lessonTitle: last.lessonTitle,
      };
    }
  }

  return {
    continueLearning,
    stats: {
      lessonsCompleted,
      totalLessons,
      modulesCompleted,
      totalModules,
      progressPercent,
    },
  };
}

// Keep old function signatures for backward compatibility but delegate to getDashboardData
export async function getContinueLearningData(
  interfaceLanguage?: string
): Promise<ContinueLearningData | null> {
  const data = await getDashboardData(interfaceLanguage);
  return data.continueLearning;
}

// Keep old function signature for backward compatibility but delegate to getDashboardData
export async function getDashboardStats(
  interfaceLanguage?: string
): Promise<DashboardStats> {
  const data = await getDashboardData(interfaceLanguage);
  return data.stats;
}
