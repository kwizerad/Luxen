"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Search, GraduationCap, Layers } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import type { CourseLanguageCourse } from "@/lib/database.types";

const LANGUAGES: CourseLanguage[] = ["English", "Kinyarwanda", "French"];
const STATUSES: CourseStatus[] = ["draft", "published", "archived"];
type CourseLanguage = "English" | "Kinyarwanda" | "French";
type CourseStatus = "draft" | "published" | "archived";

interface CourseWithCounts extends CourseLanguageCourse {
  moduleCount: number;
  lessonCount: number;
}

export default function CourseManagementPage() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CourseStatus>("all");
  const [languageFilter, setLanguageFilter] = useState<"all" | CourseLanguage>("all");

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

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      const matchesLanguage = languageFilter === "all" || course.language === languageFilter;
      return matchesSearch && matchesStatus && matchesLanguage;
    });
  }, [courses, searchQuery, statusFilter, languageFilter]);

  const getStatusBadge = (status: CourseStatus) => {
    const variants: Record<CourseStatus, string> = {
      published: "admin-badge-success",
      draft: "admin-badge-warning",
      archived: "admin-badge-secondary",
    };
    return <Badge className={variants[status]}>{t(status) || status}</Badge>;
  };

  const languageLabel = (lang: CourseLanguage) =>
    lang === "Kinyarwanda" ? "Kinyarwanda" : lang === "French" ? "Français" : "English";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="admin-page-title flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-[var(--admin-primary)]" />
          {t("courseManagementNav") || "Course Management"}
        </h1>
        <p className="text-[var(--admin-muted)] text-sm">
          {t("admin.courseManagement.description") || "Overview of the three fixed courses: English, Kinyarwanda, and French. Admins manage modules and lessons in Course Studio."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-muted)] text-sm">{t("totalCourses") || "Total Courses"}</p>
              <p className="text-2xl font-bold text-[var(--admin-text)]">{courses.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--admin-primary)]/15 flex items-center justify-center text-[var(--admin-primary)]">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-muted)] text-sm">{t("published") || "Published"}</p>
              <p className="text-2xl font-bold text-[var(--admin-text)]">
                {courses.filter((c) => c.status === "published").length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--admin-muted)] text-sm">{t("totalLessons") || "Total Lessons"}</p>
              <p className="text-2xl font-bold text-[var(--admin-text)]">
                {courses.reduce((sum, c) => sum + c.lessonCount, 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6]">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
            <Input
              placeholder={t("searchCourses") || "Search courses..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CourseStatus | "all")}>
            <SelectTrigger className="admin-input w-full sm:w-40">
              <SelectValue placeholder={t("allStatuses") || "All statuses"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses") || "All statuses"}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={(value) => setLanguageFilter(value as CourseLanguage | "all")}>
            <SelectTrigger className="admin-input w-full sm:w-44">
              <SelectValue placeholder={t("allLanguages") || "All languages"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allLanguages") || "All languages"}</SelectItem>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>{languageLabel(lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--admin-border)] hover:bg-transparent">
              <TableHead className="text-[var(--admin-muted)] font-medium">{t("course") || "Course"}</TableHead>
              <TableHead className="text-[var(--admin-muted)] font-medium">{t("language") || "Language"}</TableHead>
              <TableHead className="text-[var(--admin-muted)] font-medium">{t("status") || "Status"}</TableHead>
              <TableHead className="text-[var(--admin-muted)] font-medium">{t("modules") || "Modules"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-[var(--admin-muted)]">
                  {t("loading") || "Loading..."}
                </TableCell>
              </TableRow>
            ) : filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-[var(--admin-muted)]">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>{t("noCoursesFound") || "No courses found."}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((course) => (
                <TableRow
                  key={course.id}
                  className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-hover-bg)]/50 transition-colors"
                >
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium text-[var(--admin-text)]">{course.title}</p>
                      <p className="text-sm text-[var(--admin-muted)] line-clamp-1">{course.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[var(--admin-text)]">{languageLabel(course.language as CourseLanguage)}</TableCell>
                  <TableCell>{getStatusBadge(course.status as CourseStatus)}</TableCell>
                  <TableCell className="text-[var(--admin-text)]">
                    {course.moduleCount} modules · {course.lessonCount} lessons
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
