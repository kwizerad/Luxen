"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExternalAdminClient, EXTERNAL_COURSE_ID } from "@/lib/supabase/external";
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

function formatExternalLessonHtml(rawTitle: string, lessonImage: string | null): { shortTitle: string; htmlContent: string } {
  const lines = String(rawTitle || "").trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  const firstLine = lines[0] || "Lesson";
  const shortTitle = firstLine.length > 90 ? firstLine.slice(0, 87) + "..." : firstLine;

  const paragraphsHtml = String(rawTitle || "")
    .trim()
    .split(/\r?\n\r?\n|\r?\n/)
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p class="mb-3 leading-relaxed">${p.trim()}</p>`)
    .join("");

  const imageHtml =
    lessonImage && lessonImage.startsWith("http")
      ? `<div class="my-4 flex justify-center"><img src="${lessonImage}" alt="${shortTitle.replace(/"/g, "&quot;")}" class="max-h-72 rounded-xl object-contain border border-border/60 p-2 bg-white" /></div>`
      : "";

  return {
    shortTitle,
    htmlContent: `${imageHtml}${paragraphsHtml || `<p>${shortTitle}</p>`}`,
  };
}

async function loadPublishedExternalCourse(language: string): Promise<CourseWithModules | null> {
  try {
    const adminSb = createAdminClient();
    const { data: cfgRows } = await adminSb
      .from("system_config")
      .select("key, value")
      .in("key", [
        "external_course_published",
        "external_course_title",
        "external_course_quiz_settings",
      ]);

    const cfgMap = new Map<string, string>();
    for (const r of cfgRows || []) {
      if (r.key && r.value !== undefined && r.value !== null) {
        cfgMap.set(String(r.key), String(r.value));
      }
    }

    if (cfgMap.get("external_course_published") !== "true") {
      return null;
    }

    const extSb = await getExternalAdminClient();
    if (!extSb) return null;

    const [chaptersRes, sectionsRes, lessonsRes, questionsRes] = await Promise.all([
      extSb.from("chapters").select("*").order("chapter_number", { ascending: true }).order("id", { ascending: true }),
      extSb.from("sections").select("*").order("section_number", { ascending: true }).order("id", { ascending: true }),
      extSb.from("lessons").select("*").order("lesson_number", { ascending: true }).order("id", { ascending: true }),
      extSb.from("questions").select("id, chapter_id"),
    ]);

    const chapters = chaptersRes.data || [];
    const sections = sectionsRes.data || [];
    const lessons = lessonsRes.data || [];
    const questions = questionsRes.data || [];

    if (chapters.length === 0) return null;

    let quizSettings: {
      globalDurationMinutes: number;
      globalQuestionCount: number;
      perCourse: Record<string, { durationMinutes?: number; questionCount?: number }>;
    } = {
      globalDurationMinutes: 20,
      globalQuestionCount: 20,
      perCourse: {},
    };

    const rawQuiz = cfgMap.get("external_course_quiz_settings");
    if (rawQuiz) {
      try {
        const parsed = JSON.parse(rawQuiz);
        if (parsed && typeof parsed === "object") {
          quizSettings = {
            globalDurationMinutes: Number(parsed.globalDurationMinutes) || 20,
            globalQuestionCount: Number(parsed.globalQuestionCount) || 20,
            perCourse: parsed.perCourse && typeof parsed.perCourse === "object" ? parsed.perCourse : {},
          };
        }
      } catch {}
    }

    // Group sections by chapter_id
    const sectionsByChapter = new Map<string, any[]>();
    for (const s of sections) {
      const list = sectionsByChapter.get(s.chapter_id) || [];
      list.push(s);
      sectionsByChapter.set(s.chapter_id, list);
    }

    // Group lessons by section_id
    const lessonsBySection = new Map<string, any[]>();
    for (const l of lessons) {
      const list = lessonsBySection.get(l.section_id) || [];
      list.push(l);
      lessonsBySection.set(l.section_id, list);
    }

    // Count questions per chapter_id
    const questionCountByChapter = new Map<string, number>();
    for (const q of questions) {
      if (q.chapter_id) {
        questionCountByChapter.set(q.chapter_id, (questionCountByChapter.get(q.chapter_id) || 0) + 1);
      }
    }

    const now = new Date().toISOString();
    const modules: ModuleWithLessons[] = chapters.map((chap: any, chapIdx: number) => {
      const modId = `ext-mod-${chap.id}`;
      const chapSections = sectionsByChapter.get(chap.id) || [];
      const chapLessonsRaw: any[] = [];
      for (const sec of chapSections) {
        const secLessons = lessonsBySection.get(sec.id) || [];
        for (const l of secLessons) {
          chapLessonsRaw.push({ ...l, _sectionTitle: sec.title });
        }
      }
      chapLessonsRaw.sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));

      // Map each external lesson directly to a CourseLesson with topics: [] so there is only (Course/Module -> Lesson)
      const mappedLessons: CourseLesson[] = chapLessonsRaw.map((l: any, lIdx: number) => {
        const { shortTitle, htmlContent } = formatExternalLessonHtml(l.title, l.lesson_image);
        return {
          id: `ext-les-${l.id}`,
          module_id: modId,
          title: shortTitle,
          content: htmlContent,
          content_type: "text",
          media_url: l.lesson_image || null,
          image_url: l.lesson_image || null,
          order_index: lIdx,
          is_published: true,
          status: "published",
          topics: [],
          estimated_minutes: 3,
          created_at: l.created_at || now,
          updated_at: l.updated_at || now,
          deleted_at: null,
        } as unknown as CourseLesson;
      });

      const courseOverride = quizSettings.perCourse?.[chap.id];
      const durMins = Number(courseOverride?.durationMinutes) || Number(quizSettings.globalDurationMinutes) || 20;
      const reqQCount = Number(courseOverride?.questionCount) || Number(quizSettings.globalQuestionCount) || 20;
      const availableQ = questionCountByChapter.get(chap.id) || questions.length || 20;
      const finalQCount = Math.min(reqQCount, Math.max(1, availableQ));

      const examSettings: ModuleExamSettings = {
        id: `ext-exam-settings-${chap.id}`,
        module_id: modId,
        title: `Quiz: Course ${chap.chapter_number || chapIdx + 1} - ${chap.title}`,
        question_count: finalQCount,
        duration_minutes: durMins,
        passing_percentage: 70,
        randomize_questions: true,
        randomize_answers: false,
        max_attempts: 10,
        retake_limit: 10,
        allow_review: true,
        show_results_immediately: true,
        show_explanations: true,
        status: "published",
        created_at: now,
        updated_at: now,
      } as unknown as ModuleExamSettings;

      return {
        id: modId,
        language_id: EXTERNAL_COURSE_ID,
        title: `Course ${chap.chapter_number || chapIdx + 1}: ${chap.title}`,
        description: `${mappedLessons.length} Lessons • ${finalQCount} Quiz Questions (${durMins} min)`,
        order_index: chapIdx,
        is_published: true,
        status: "published",
        created_at: chap.created_at || now,
        updated_at: chap.updated_at || now,
        deleted_at: null,
        lessons: mappedLessons,
        examSettings,
      } as unknown as ModuleWithLessons;
    });

    const courseTitle = cfgMap.get("external_course_title") || "Official Traffic Rules & Road Signs Course";

    return {
      id: EXTERNAL_COURSE_ID,
      language: (language as any) || "Kinyarwanda",
      title: courseTitle,
      description: "Complete traffic code curriculum with interactive modules, visual road sign lessons, and quizzes.",
      is_published: true,
      status: "published",
      order_index: 0,
      midterm_enabled: false,
      midterm_interval: 3,
      midterm_question_count: quizSettings.globalQuestionCount || 20,
      midterm_duration_minutes: quizSettings.globalDurationMinutes || 20,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      modules,
    } as unknown as CourseWithModules;
  } catch (err) {
    console.warn("Failed to load published external course:", err);
    return null;
  }
}

export async function loadCourseByLanguage(
  language: string
): Promise<LoadCourseResult> {
  // Check if External Course is published — when enabled, serve it as the single course
  // with External Courses mapped to Modules and External Lessons mapped to Lessons
  const extCourse = await loadPublishedExternalCourse(language);
  if (extCourse) {
    return { course: extCourse };
  }

  const supabase = await createClient();

  const { data: courseData, error: courseError } = await supabase
    .from("course_languages")
    .select("*")
    .eq("language", language)
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
    .is("deleted_at", null)
    .order("order_index", { ascending: true });

  if (modulesError || !modulesData) {
    console.error("Failed to load modules:", modulesError);
    return { course: { ...courseData, modules: [] } as CourseWithModules };
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
  topicId?: string;
  topicTitle?: string;
  topicIndex?: number;
  totalTopics?: number;
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

const LANG_MAP: Record<string, LearningLanguage> = {
  rw: "Kinyarwanda",
  en: "English",
  fr: "French",
  kinyarwanda: "Kinyarwanda",
  english: "English",
  french: "French",
  Kinyarwanda: "Kinyarwanda",
  English: "English",
  French: "French",
};

function normalizeLearningLanguage(lang?: string | null): LearningLanguage | null {
  if (!lang) return null;
  return LANG_MAP[lang.toLowerCase()] || (LEARNING_LANGUAGES.includes(lang as LearningLanguage) ? (lang as LearningLanguage) : null);
}

function isLearningLanguage(language: string): language is LearningLanguage {
  return (LEARNING_LANGUAGES as readonly string[]).includes(language);
}

async function resolveLearningLanguage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  interfaceLanguage?: string
): Promise<LearningLanguage | null> {
  const adminSb = createAdminClient();

  // Fetch enabled languages & external course publish status from system_config using admin client
  const { data: langConfigs } = await adminSb
    .from("system_config")
    .select("key, value")
    .in("key", [
      "learning_language_english_enabled",
      "learning_language_french_enabled",
      "learning_language_kinyarwanda_enabled",
      "external_course_published",
    ]);

  const disabledLanguages = new Set<string>();
  let isExternalCoursePublished = false;
  for (const row of langConfigs || []) {
    if (row.key === "external_course_published" && String(row.value).toLowerCase() === "true") {
      isExternalCoursePublished = true;
    } else if (row.value === "false") {
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

  const normalizedInterface = normalizeLearningLanguage(interfaceLanguage);
  if (normalizedInterface && isLanguageEnabled(normalizedInterface)) {
    return normalizedInterface;
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

  const saved = normalizeLearningLanguage(profileResult.data?.learning_language);
  if (saved && isLanguageEnabled(saved)) {
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

  // If external course is published, default to Kinyarwanda (or first enabled language)
  if (isExternalCoursePublished) {
    return isLanguageEnabled("Kinyarwanda") ? "Kinyarwanda" : "English";
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
  const isExternalCourse = course.id === EXTERNAL_COURSE_ID || moduleIds.some((id) => id.startsWith("ext-mod-"));

  // Parallel: lesson progress + module progress (skip UUID-typed tables when external course IDs are used)
  const [lessonProgressResult, moduleProgressResult] = isExternalCourse
    ? [{ data: [] as any[] }, { data: [] as any[] }]
    : await Promise.all([
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

  function parseTopicsList(raw: unknown): { id: string; title: string }[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((t, idx) => {
        if (typeof t === "string") {
          try {
            const p = JSON.parse(t);
            if (p && typeof p === "object") {
              return { id: p.id || `topic-${idx}`, title: p.title || "" };
            }
          } catch {}
          return { id: `topic-${idx}`, title: t };
        }
        if (typeof t === "object" && t !== null) {
          const obj = t as { id?: string; title?: string };
          return { id: obj.id || `topic-${idx}`, title: obj.title || "" };
        }
        return { id: `topic-${idx}`, title: "" };
      });
    }
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return parseTopicsList(p);
      } catch {}
    }
    return [];
  }

  const allLessons: {
    moduleId: string;
    moduleTitle: string;
    lessonId: string;
    lessonTitle: string;
    topics: { id: string; title: string }[];
  }[] = [];

  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      allLessons.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        topics: parseTopicsList(lesson.topics),
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
        const firstTopic = lessonInfo.topics.length > 0 ? lessonInfo.topics[0] : undefined;
        continueLearning = {
          courseTitle: course.title,
          courseLanguage: course.language,
          moduleTitle: lessonInfo.moduleTitle,
          moduleId: lessonInfo.moduleId,
          lessonId: lessonInfo.lessonId,
          lessonTitle: lessonInfo.lessonTitle,
          topicId: firstTopic?.id,
          topicTitle: firstTopic?.title,
          topicIndex: firstTopic ? 0 : undefined,
          totalTopics: lessonInfo.topics.length > 0 ? lessonInfo.topics.length : undefined,
        };
      }
    }

    if (!continueLearning) {
      // Strategy 2: first unstarted lesson
      const firstUnstarted = allLessons.find((l) => !progressMap.has(l.lessonId));
      if (firstUnstarted) {
        const firstTopic = firstUnstarted.topics.length > 0 ? firstUnstarted.topics[0] : undefined;
        continueLearning = {
          courseTitle: course.title,
          courseLanguage: course.language,
          moduleTitle: firstUnstarted.moduleTitle,
          moduleId: firstUnstarted.moduleId,
          lessonId: firstUnstarted.lessonId,
          lessonTitle: firstUnstarted.lessonTitle,
          topicId: firstTopic?.id,
          topicTitle: firstTopic?.title,
          topicIndex: firstTopic ? 0 : undefined,
          totalTopics: firstUnstarted.topics.length > 0 ? firstUnstarted.topics.length : undefined,
        };
      }
    }

    if (!continueLearning) {
      // Strategy 3: last lesson (all completed)
      const last = allLessons[allLessons.length - 1];
      const firstTopic = last.topics.length > 0 ? last.topics[0] : undefined;
      continueLearning = {
        courseTitle: course.title,
        courseLanguage: course.language,
        moduleTitle: last.moduleTitle,
        moduleId: last.moduleId,
        lessonId: last.lessonId,
        lessonTitle: last.lessonTitle,
        topicId: firstTopic?.id,
        topicTitle: firstTopic?.title,
        topicIndex: firstTopic ? 0 : undefined,
        totalTopics: last.topics.length > 0 ? last.topics.length : undefined,
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
