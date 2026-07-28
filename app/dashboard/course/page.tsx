"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Layers, FileText, GraduationCap } from "lucide-react";
import type { CourseLanguage, CourseLanguageCourse, CourseModule, CourseLesson } from "@/lib/database.types";

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
}

interface CourseWithModules extends CourseLanguageCourse {
  modules: ModuleWithLessons[];
}

const isLearningLanguage = (language: string): language is LearningLanguage =>
  LEARNING_LANGUAGES.includes(language as LearningLanguage);

export default function StudentCoursePage() {
  const { t, language: interfaceLanguage } = useLanguage();
  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLanguage, setSavingLanguage] = useState(false);

  const loadCourse = useCallback(async (selectedLanguage: LearningLanguage | null) => {
    if (!selectedLanguage) {
      setCourse(null);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);
    const { data: courseData, error: courseError } = await supabase
      .from("course_languages")
      .select("*")
      .eq("language", selectedLanguage)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (courseError || !courseData) {
      setCourse(null);
      setLoading(false);
      return;
    }

    const { data: modulesData, error: modulesError } = await supabase
      .from("course_modules")
      .select("*, lessons:course_lessons(*)")
      .eq("language_id", courseData.id)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (modulesError || !modulesData) {
      setCourse(null);
      setLoading(false);
      return;
    }

    const modules = (modulesData as Array<CourseModule & { lessons: CourseLesson[] }>).map((module) => {
      const lessons = (module.lessons || [])
        .filter((lesson) => !lesson.deleted_at)
        .sort((a, b) => a.order_index - b.order_index);
      return { ...module, lessons } as ModuleWithLessons;
    });
    setCourse({ ...courseData, modules } as CourseWithModules);
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadLearningLanguage = async () => {
      const matchingLanguage = isLearningLanguage(interfaceLanguage) ? interfaceLanguage : null;
      if (matchingLanguage) {
        setLearningLanguage(matchingLanguage);
        await loadCourse(matchingLanguage);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("user_profiles").select("learning_language").eq("id", user.id).maybeSingle()
        : { data: null };
      const savedLanguage = profile?.learning_language;
      const selectedLanguage = isLearningLanguage(savedLanguage || "") ? savedLanguage : null;
      setLearningLanguage(selectedLanguage);
      await loadCourse(selectedLanguage);
    };

    void loadLearningLanguage();
  }, [interfaceLanguage, loadCourse]);

  const selectLearningLanguage = async (selectedLanguage: LearningLanguage) => {
    const supabase = createClient();
    setSavingLanguage(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingLanguage(false);
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ learning_language: selectedLanguage })
      .eq("id", user.id);
    if (!error) {
      setLearningLanguage(selectedLanguage);
      await loadCourse(selectedLanguage);
    }
    setSavingLanguage(false);
  };

  const totalLessons = (selectedCourse: CourseWithModules) =>
    selectedCourse.modules.reduce((sum, module) => sum + module.lessons.length, 0);

  if (loading) {
    return <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/40"><BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40 animate-pulse" /><p className="text-lg font-medium">{t("loading") || "Loading..."}</p></div>;
  }

  if (!learningLanguage) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border bg-card p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <BookOpen className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Choose the language you want to study in</h1>
          <p className="text-sm text-muted-foreground">Your learning language is separate from the application interface language.</p>
        </div>
        <div className="grid gap-3">
          {LEARNING_LANGUAGES.map((option) => (
            <Button key={option} type="button" variant="outline" className="h-12 justify-start" disabled={savingLanguage} onClick={() => void selectLearningLanguage(option)}>
              {option === "English" ? "English" : option === "French" ? "Français" : "Kinyarwanda"}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/40"><BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" /><p className="text-lg font-medium">{t("noCoursesAvailable") || "No courses available"}</p><p className="text-sm text-muted-foreground mt-1">There is no published {learningLanguage} course right now.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1"><h1 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="h-7 w-7 text-primary" />{t("courses") || "Courses"}</h1><p className="text-muted-foreground text-sm">Showing the published {learningLanguage} course.</p></div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{course.title}</h2><p className="text-muted-foreground text-sm">{course.description}</p></div><div className="flex items-center gap-2 flex-shrink-0"><Badge variant="secondary" className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{course.modules.length} {t("modules") || "modules"}</Badge><Badge variant="outline" className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{totalLessons(course)} {t("lessons") || "lessons"}</Badge></div></div>
        <div className="space-y-4">{course.modules.map((module) => <div key={module.id} className="rounded-xl border bg-muted/30 p-4 space-y-3"><h3 className="text-base font-medium flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />{module.title}</h3>{module.lessons.length === 0 ? <p className="text-sm text-muted-foreground">{t("noLessonsYet") || "No lessons yet."}</p> : <div className="space-y-3 pl-6">{module.lessons.map((lesson) => <div key={lesson.id} className="rounded-xl border bg-background p-3"><h4 className="font-medium text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{lesson.title}</h4><p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{lesson.content || t("noContent") || "No content yet."}</p></div>)}</div>}</div>)}</div>
      </div>
    </div>
  );
}
