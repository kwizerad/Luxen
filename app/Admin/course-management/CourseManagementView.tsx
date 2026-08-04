"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, MoreHorizontal, Check, Loader2, Globe, Lock, Layers, FileText, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import { updateCourse, updateModule, updateLesson } from "@/app/Admin/actions/courses";
import { toast } from "sonner";
import type { CourseLanguageCourse, CourseModule, CourseLesson } from "@/lib/database.types";

const LANGUAGES: CourseLanguage[] = ["English", "Kinyarwanda", "French"];
type CourseLanguage = "English" | "Kinyarwanda" | "French";
type CourseStatus = "draft" | "published" | "archived";

interface CourseWithCounts extends CourseLanguageCourse {
  moduleCount: number;
  lessonCount: number;
}

interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
}

export function CourseManagementView() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [courseModules, setCourseModules] = useState<Record<string, ModuleWithLessons[]>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loadingModules, setLoadingModules] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    setLoading(true);
    const { data: coursesData, error: coursesError } = await supabase
      .from("course_languages")
      .select("*")
      .in("language", LANGUAGES)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    const { data: modulesData, error: modulesError } = await supabase
      .from("course_modules")
      .select("id, language_id, lessons:course_lessons(id)")
      .is("deleted_at", null);
    if (coursesError || modulesError) {
      setLoading(false);
      return;
    }
    const lessonCounts = new Map<string, number>();
    const moduleCounts = new Map<string, number>();
    for (const mod of modulesData || []) {
      moduleCounts.set(mod.language_id, (moduleCounts.get(mod.language_id) || 0) + 1);
      const lessonData = (mod as { lessons?: { length: number }[] }).lessons;
      lessonCounts.set(mod.language_id, (lessonCounts.get(mod.language_id) || 0) + (lessonData?.length || 0));
    }
    const enriched = (coursesData || []).map((c: CourseLanguageCourse) => ({
      ...c,
      moduleCount: moduleCounts.get(c.id) || 0,
      lessonCount: lessonCounts.get(c.id) || 0,
    }));
    setCourses(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (courseId: string, status: CourseStatus) => {
    if (status === "archived") return;
    setUpdatingId(courseId);
    try {
      const result = await updateCourse(courseId, { status });
      if (result.success) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, status, is_published: status === "published" }
              : c
          )
        );
        toast.success(
          status === "published"
            ? t("coursePublished") || "Course published."
            : t("courseDrafted") || "Course moved to draft."
        );
      } else {
        toast.error(result.error || t("failedToUpdate") || "Failed to update course.");
      }
    } catch {
      toast.error(t("failedToUpdate") || "Failed to update course.");
    } finally {
      setUpdatingId(null);
    }
  };

  const togglePublish = (course: CourseWithCounts) => {
    const newStatus: CourseStatus = course.is_published ? "draft" : "published";
    handleStatusChange(course.id, newStatus);
  };

  const loadModules = useCallback(async (courseId: string) => {
    setLoadingModules(courseId);
    const supabase = createClient();
    const { data: modulesData, error } = await supabase
      .from("course_modules")
      .select("*, lessons:course_lessons(*)")
      .eq("language_id", courseId)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });
    if (error) {
      toast.error(t("failedToUpdate") || "Failed to load modules.");
      setLoadingModules(null);
      return;
    }
    const sorted = (modulesData || []).map((m: any) => ({
      ...m,
      lessons: (m.lessons || []).sort((a: CourseLesson, b: CourseLesson) => a.order_index - b.order_index),
    }));
    setCourseModules((prev) => ({ ...prev, [courseId]: sorted }));
    setLoadingModules(null);
  }, [t]);

  const toggleCourseExpand = (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
      if (!courseModules[courseId]) loadModules(courseId);
    }
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleModuleStatusChange = async (courseId: string, moduleId: string, status: CourseStatus) => {
    if (status === "archived") return;
    setUpdatingId(moduleId);
    try {
      const result = await updateModule(moduleId, { status });
      if (result.success) {
        setCourseModules((prev) => ({
          ...prev,
          [courseId]: (prev[courseId] || []).map((m) =>
            m.id === moduleId ? { ...m, status, is_published: status === "published" } : m
          ),
        }));
        toast.success(status === "published" ? t("modulePublished") || "Module published." : t("moduleDrafted") || "Module moved to draft.");
      } else {
        toast.error(result.error || t("failedToUpdate") || "Failed to update module.");
      }
    } catch {
      toast.error(t("failedToUpdate") || "Failed to update module.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLessonStatusChange = async (courseId: string, moduleId: string, lessonId: string, status: CourseStatus) => {
    if (status === "archived") return;
    setUpdatingId(lessonId);
    try {
      const result = await updateLesson(lessonId, { status });
      if (result.success) {
        setCourseModules((prev) => ({
          ...prev,
          [courseId]: (prev[courseId] || []).map((m) =>
            m.id === moduleId
              ? { ...m, lessons: m.lessons.map((l) => l.id === lessonId ? { ...l, status, is_published: status === "published" } : l) }
              : m
          ),
        }));
        toast.success(status === "published" ? t("lessonPublished") || "Lesson published." : t("lessonDrafted") || "Lesson moved to draft.");
      } else {
        toast.error(result.error || t("failedToUpdate") || "Failed to update lesson.");
      }
    } catch {
      toast.error(t("failedToUpdate") || "Failed to update lesson.");
    } finally {
      setUpdatingId(null);
    }
  };

  const publishAllLessons = async (courseId: string, moduleId: string) => {
    const mod = (courseModules[courseId] || []).find((m) => m.id === moduleId);
    if (!mod || mod.lessons.length === 0) return;
    setUpdatingId(`all-${moduleId}`);
    try {
      await Promise.all(mod.lessons.map((l) => updateLesson(l.id, { status: "published" })));
      setCourseModules((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || []).map((m) =>
          m.id === moduleId ? { ...m, lessons: m.lessons.map((l) => ({ ...l, status: "published", is_published: true })) } : m
        ),
      }));
      toast.success(t("allLessonsPublished") || "All lessons published.");
    } catch {
      toast.error(t("failedToUpdate") || "Failed to publish lessons.");
    } finally {
      setUpdatingId(null);
    }
  };

  const draftAllLessons = async (courseId: string, moduleId: string) => {
    const mod = (courseModules[courseId] || []).find((m) => m.id === moduleId);
    if (!mod || mod.lessons.length === 0) return;
    setUpdatingId(`all-${moduleId}`);
    try {
      await Promise.all(mod.lessons.map((l) => updateLesson(l.id, { status: "draft" })));
      setCourseModules((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || []).map((m) =>
          m.id === moduleId ? { ...m, lessons: m.lessons.map((l) => ({ ...l, status: "draft", is_published: false })) } : m
        ),
      }));
      toast.success(t("allLessonsDrafted") || "All lessons moved to draft.");
    } catch {
      toast.error(t("failedToUpdate") || "Failed to draft lessons.");
    } finally {
      setUpdatingId(null);
    }
  };

  const languageLabel = (lang: CourseLanguage) =>
    lang === "Kinyarwanda" ? "Kinyarwanda" : lang === "French" ? "Français" : "English";

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-card !rounded-[5px] p-4 sm:p-5 space-y-4">
            <div className="admin-skeleton h-6 w-40 rounded-[5px]" />
            <div className="admin-skeleton h-4 w-24 rounded-[5px]" />
            <div className="admin-skeleton h-20 w-full rounded-[5px]" />
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="admin-card !rounded-[5px] p-8 sm:p-12 flex flex-col items-center justify-center text-center text-[var(--admin-muted)]">
        <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-40" />
        <p className="text-sm sm:text-base">{t("noCoursesFound") || "No courses found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Course cards — responsive grid with curved corners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {courses.map((course) => {
          const isPublished = course.status === "published";
          const isDraft = course.status === "draft";
          const titleColor = isPublished ? "text-green-600 dark:text-green-400" : "text-[var(--admin-text)]";
          const mutedColor = isPublished ? "text-green-500/80 dark:text-green-300/80" : "text-[var(--admin-muted)]";
          const isActive = expandedCourseId === course.id;

          return (
            <div
              key={course.id}
              className={
                "admin-card !rounded-[5px] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 cursor-pointer transition-[border-color,box-shadow] duration-250 " +
                (isActive ? "!border-[var(--admin-primary)] ring-1 ring-[var(--admin-primary)] " : "") +
                (isPublished
                  ? "!border-green-500/40 hover:!border-green-500/60 shadow-[0_0_24px_rgba(34,197,94,0.15)]"
                  : isDraft
                  ? "opacity-60 hover:opacity-90"
                  : "")
              }
              onClick={() => toggleCourseExpand(course.id)}
            >
              {/* Header: title + status badge + actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base sm:text-lg font-semibold flex items-center gap-2 ${titleColor}`}>
                    <BookOpen className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isPublished ? "text-green-600 dark:text-green-400" : "text-[var(--admin-primary)]"}`} />
                    <span className="truncate">{course.title}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full " +
                        (isPublished
                          ? "bg-green-500/15 text-green-600 dark:text-green-400"
                          : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]")
                      }
                    >
                      {isPublished ? (
                        <><Globe className="h-3 w-3" /> {t("published") || "Published"}</>
                      ) : (
                        <><Lock className="h-3 w-3" /> {t("draft") || "Draft"}</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Publish toggle */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublish(course)}
                    disabled={updatingId === course.id}
                    className={isPublished ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"}
                    title={isPublished ? t("unpublishCategory") || "Unpublish" : t("publishCategory") || "Publish"}
                  >
                    {updatingId === course.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPublished ? (
                      <Globe className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] transition-colors disabled:opacity-50"
                        disabled={updatingId === course.id}
                        aria-label={t("actions") || "Actions"}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>{t("status") || "Status"}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(course.id, "published")}
                        disabled={isPublished}
                        className="gap-2 cursor-pointer"
                      >
                        <Check className={`h-4 w-4 ${isPublished ? "text-green-600 dark:text-green-400" : "opacity-0"}`} />
                        {t("published") || "Published"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(course.id, "draft")}
                        disabled={isDraft}
                        className="gap-2 cursor-pointer"
                      >
                        <Check className={`h-4 w-4 ${isDraft ? "text-slate-400" : "opacity-0"}`} />
                        {t("draft") || "Draft"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Description + stats row */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <p className={`text-xs sm:text-sm line-clamp-2 ${mutedColor}`}>
                  {course.description || t("noDescription") || "No description"}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-[var(--admin-muted)] flex-wrap">
                  <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-[var(--admin-primary)]" />{course.moduleCount} {t("modules") || "Modules"}</span>
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />{course.lessonCount} {t("lessons") || "Lessons"}</span>
                  <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{languageLabel(course.language as CourseLanguage)}</span>
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--admin-border)]" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCourseExpand(course.id)}
                  className="gap-1.5 flex-1 sm:flex-none justify-center sm:justify-start"
                >
                  {isActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="truncate">{isActive ? (t("hideModules") || "Hide Modules") : (t("viewModules") || "View Modules")}</span>
                </Button>
                <Link href={`/Admin/course?tab=studio&courseId=${course.id}`} className="flex-1 sm:flex-none">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 w-full justify-center sm:justify-start">
                    <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                    {t("manage") || "Manage"}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modules table for selected course — appears below the grid */}
      {expandedCourseId && (() => {
        const course = courses.find((c) => c.id === expandedCourseId);
        const modules = courseModules[expandedCourseId] || [];
        const isPublished = course?.status === "published";

        return (
          <div className="admin-card !rounded-[5px] overflow-hidden">
            {/* Table header */}
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isPublished ? "text-green-600 dark:text-green-400" : "text-[var(--admin-primary)]"}`} />
                <h3 className="text-base sm:text-lg font-semibold truncate text-[var(--admin-text)]">
                  {course?.title} — {t("modules") || "Modules"}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpandedCourseId(null)}
                className="text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex-shrink-0"
              >
                {t("cancel") || "Close"}
              </Button>
            </div>

            {/* Loading state */}
            {loadingModules === expandedCourseId && (
              <div className="p-4 sm:p-6 flex items-center gap-2 text-sm text-[var(--admin-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading") || "Loading..."}
              </div>
            )}

            {/* Empty state */}
            {modules.length === 0 && loadingModules !== expandedCourseId && (
              <div className="p-6 sm:p-8 text-center text-sm text-[var(--admin-muted)]">
                {t("noModulesYet") || "No modules yet."}
              </div>
            )}

            {/* Modules table */}
            {modules.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)] text-xs">
                      <th className="text-left font-medium px-3 sm:px-4 py-2.5">{t("moduleName") || "Module / Lesson Name"}</th>
                      <th className="text-center font-medium px-3 py-2.5 hidden sm:table-cell">{t("totalLessons") || "Lessons / Topics"}</th>
                      <th className="text-center font-medium px-2 sm:px-3 py-2.5">{t("status") || "Status"}</th>
                      <th className="text-left font-medium px-3 py-2.5 hidden md:table-cell">{t("createdAt") || "Created At"}</th>
                      <th className="text-right font-medium px-3 sm:px-4 py-2.5">{t("actions") || "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => {
                      const modPublished = mod.status === "published";
                      const isModExpanded = expandedModules.has(mod.id);
                      const allLessonsPublished = mod.lessons.length > 0 && mod.lessons.every((l) => l.status === "published");
                      const allLessonsDraft = mod.lessons.length > 0 && mod.lessons.every((l) => l.status === "draft");

                      return (
                        <Fragment key={mod.id}>
                          {/* Module row */}
                          <tr
                            className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)] transition-colors cursor-pointer"
                            onClick={() => toggleModuleExpand(mod.id)}
                          >
                            <td className="px-3 sm:px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isModExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-[var(--admin-muted)] flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-[var(--admin-muted)] flex-shrink-0" />
                                )}
                                <Layers className={`h-4 w-4 flex-shrink-0 ${modPublished ? "text-green-600 dark:text-green-400" : "text-[var(--admin-primary)]"}`} />
                                <span className="font-medium truncate text-[var(--admin-text)]">{mod.title}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center hidden sm:table-cell">
                              <span className="text-xs text-[var(--admin-muted)]">{mod.lessons.length} {t("lessons") || "lessons"}</span>
                            </td>
                            <td className="px-2 sm:px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${modPublished ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"}`}>
                                {modPublished ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                                {modPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-[var(--admin-muted)] hidden md:table-cell">
                              {new Date(mod.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-3 sm:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleModuleStatusChange(expandedCourseId, mod.id, modPublished ? "draft" : "published")}
                                  disabled={updatingId === mod.id}
                                  className={modPublished ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"}
                                  title={modPublished ? (t("draftModule") || "Move to Draft") : (t("publishModule") || "Publish Module")}
                                >
                                  {updatingId === mod.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : modPublished ? (
                                    <Globe className="h-3.5 w-3.5" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                {mod.lessons.length > 0 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => publishAllLessons(expandedCourseId, mod.id)}
                                    disabled={updatingId === `all-${mod.id}` || allLessonsPublished}
                                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-30"
                                    title={t("publishAllLessons") || "Publish All Lessons"}
                                  >
                                    {updatingId === `all-${mod.id}` ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                                {mod.lessons.length > 0 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => draftAllLessons(expandedCourseId, mod.id)}
                                    disabled={updatingId === `all-${mod.id}` || allLessonsDraft}
                                    className="text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-30"
                                    title={t("draftAllLessons") || "Draft All Lessons"}
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded lesson rows */}
                          {isModExpanded && (
                            mod.lessons.length === 0 ? (
                              <tr className="border-b border-[var(--admin-border)]">
                                <td colSpan={5} className="px-4 py-3 text-center text-xs text-[var(--admin-muted)]">
                                  {t("noLessonsYet") || "No lessons yet."}
                                </td>
                              </tr>
                            ) : (
                              mod.lessons.map((lesson) => {
                                const lessonPublished = lesson.status === "published";
                                const topicCount = Array.isArray(lesson.topics) ? lesson.topics.length : 0;
                                return (
                                  <tr
                                    key={lesson.id}
                                    className="border-b border-[var(--admin-border)] last:border-b-0 hover:bg-[var(--admin-hover-bg)] transition-colors"
                                  >
                                    <td className="px-3 sm:px-4 py-2.5 pl-8 sm:pl-10">
                                      <div className="flex items-center gap-2">
                                        <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${lessonPublished ? "text-green-600 dark:text-green-400" : "text-[var(--admin-muted)]"}`} />
                                        <span className="text-xs truncate text-[var(--admin-text)]">{lesson.title}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                                      <span className="text-xs text-[var(--admin-muted)]">{topicCount} {t("topics") || "topics"}</span>
                                    </td>
                                    <td className="px-2 sm:px-3 py-2.5 text-center">
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${lessonPublished ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"}`}>
                                        {lessonPublished ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                                        {lessonPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-[var(--admin-muted)] hidden md:table-cell">
                                      {new Date(lesson.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 sm:px-4 py-2.5">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleLessonStatusChange(expandedCourseId, mod.id, lesson.id, lessonPublished ? "draft" : "published")}
                                          disabled={updatingId === lesson.id}
                                          className={lessonPublished ? "text-green-400 hover:text-green-300" : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"}
                                          title={lessonPublished ? (t("draftLesson") || "Move to Draft") : (t("publishLesson") || "Publish Lesson")}
                                        >
                                          {updatingId === lesson.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : lessonPublished ? (
                                            <Globe className="h-3.5 w-3.5" />
                                          ) : (
                                            <Lock className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
