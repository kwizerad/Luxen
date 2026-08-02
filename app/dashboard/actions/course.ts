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
