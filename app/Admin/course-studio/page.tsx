"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { useCourseStudio } from "@/hooks/use-course-studio";
import { CourseTree, Selection } from "./components/course-tree";
import { CreateMenu } from "./components/create-menu";
import { LessonEditor } from "./components/lesson-editor";
import { ExamStudio } from "./components/exam-studio";
import { CourseSettings } from "./components/course-settings";
import { ExamSettingsPanel } from "./components/exam-settings-panel";
import { LessonSettingsPanel } from "./components/lesson-settings-panel";
import { ModuleSettingsPanel } from "./components/module-settings-panel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Layers, FileText, ClipboardList, GraduationCap, Loader2, Save, Settings } from "lucide-react";

export default function CourseStudioPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    courses,
    coursesLoading,
    coursesError,
    course,
    courseLoading,
    courseError,
    selectedCourseId,
    selection,
    selectCourse,
    select,
    selectedModule,
    selectedLesson,
    selectedExam,
    hasUnsavedChanges,
    isSaving,
    isMutating,
    justSaved,
    save,
    discardDirty,
    actions,
  } = useCourseStudio();

  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "modules" | "settings">("overview");

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;
      const isPrimaryAdmin = user?.email?.toLowerCase() === "navo@admin.jn";
      if (!user || (role !== "Admin" && !isPrimaryAdmin)) {
        router.push("/auth/login");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    const ok = await save();
    if (ok) {
      toast.success(t("changesSaved") || "Changes saved successfully.");
    }
  };

  const requestSelect = (sel: Selection) => {
    if (hasUnsavedChanges) {
      setPendingSelection(sel);
      setPendingCourseId(null);
      setShowUnsavedDialog(true);
      return;
    }
    setActiveTab(sel.type === "course" ? "overview" : "modules");
    select(sel);
  };

  const requestSelectCourse = (id: string) => {
    if (hasUnsavedChanges) {
      setPendingCourseId(id);
      setPendingSelection(null);
      setShowUnsavedDialog(true);
      return;
    }
    setActiveTab("overview");
    selectCourse(id);
  };

  const confirmSwitch = async (shouldSave: boolean) => {
    if (shouldSave) {
      const ok = await save();
      if (!ok) return;
    } else {
      discardDirty();
    }
    setShowUnsavedDialog(false);
    if (pendingSelection) {
      setActiveTab(pendingSelection.type === "course" ? "overview" : "modules");
      select(pendingSelection);
      setPendingSelection(null);
    } else if (pendingCourseId) {
      setActiveTab("overview");
      selectCourse(pendingCourseId);
      setPendingCourseId(null);
    }
  };

  const cancelSwitch = () => {
    setShowUnsavedDialog(false);
    setPendingSelection(null);
    setPendingCourseId(null);
  };

  const getWorkspaceTitle = () => {
    if (selection.type === "lesson" && selectedLesson) {
      return (
        <>
          <FileText className="h-5 w-5 text-[var(--admin-primary)]" />
          {t("lessonEditor") || "Lesson Editor"}
        </>
      );
    }
    if (selection.type === "exam" && selectedExam) {
      return (
        <>
          <ClipboardList className="h-5 w-5 text-[var(--admin-secondary)]" />
          {t("examStudio") || "Exam Studio"}
        </>
      );
    }
    if (selection.type === "module" && selectedModule) {
      return (
        <>
          <Layers className="h-5 w-5 text-[var(--admin-secondary)]" />
          {t("moduleOverview") || "Module Overview"}
        </>
      );
    }
    return (
      <>
        <BookOpen className="h-5 w-5 text-[var(--admin-primary)]" />
        {t("courseOverview") || "Course Overview"}
      </>
    );
  };

  const saveButtonLabel = () => {
    if (isSaving) return t("saving") || "Saving...";
    if (justSaved) return t("saved") || "Saved ✓";
    if (hasUnsavedChanges) return t("saveChanges") || "Save Changes";
    return t("save") || "Save";
  };

  if (coursesLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center admin-card">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-primary)]" />
      </div>
    );
  }

  if (courseLoading) {
    return <CourseStudioSkeleton />;
  }

  if (coursesError || courseError) {
    console.error("Course load error:", coursesError || courseError);
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center admin-card text-center text-[var(--admin-muted)] p-8">
        <BookOpen className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium text-[var(--admin-text)] mb-2">
          {t("failedToLoadCourses") || "Failed to load courses"}
        </p>
        <p className="text-sm max-w-md">
          {coursesError?.message || courseError?.message || t("unknownError") || "An unknown error occurred."}
        </p>
      </div>
    );
  }

  if (!course && !courseLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center admin-card text-center text-[var(--admin-muted)] p-8">
        <BookOpen className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium text-[var(--admin-text)]">
          {t("noCourseSelected") || "No course selected"}
        </p>
        <p className="text-sm mt-2 max-w-md">
          {t("noCourseSelectedHint") || "Make sure the Supabase migration has been applied and the course_languages table contains the default courses."}
        </p>
      </div>
    );
  }

  const canCreateExam = !!selectedModule && !selectedModule.exam;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4">
      {course && (
        <CourseTree
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={requestSelectCourse}
          selected={selection}
          onSelect={requestSelect}
          onAddModule={actions.addModule}
          onAddLesson={actions.addLesson}
          onAddExam={actions.addExam}
          onDeleteModule={actions.removeModule}
          onDeleteLesson={actions.removeLesson}
          onMoveModule={actions.moveModule}
          onMoveLesson={actions.moveLesson}
          isMutating={isMutating}
        />
      )}

      <main className="flex-1 min-w-0 admin-card p-4 sm:p-5 flex flex-col overflow-hidden">
        {course && (
          <div className="flex flex-col h-full gap-4 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[var(--admin-border)] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0"><h1 className="admin-page-title truncate">{course.title}</h1><p className="text-[var(--admin-muted)] text-sm">{t("courseStudioNav") || "Course Studio"}</p></div>
                <Button type="button" onClick={handleSave} disabled={!hasUnsavedChanges || isSaving} className="admin-btn-primary shrink-0">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}{saveButtonLabel()}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("courseStudioNav") || "Course Studio"}>
                {[
                  { id: "overview", label: t("courseOverview") || "Course Overview", icon: BookOpen },
                  { id: "modules", label: t("modules") || "Modules", icon: Layers },
                  { id: "settings", label: t("courseSettings") || "Course Settings", icon: Settings },
                ].map(({ id, label, icon: Icon }) => <Button key={id} type="button" variant={activeTab === id ? "default" : "outline"} className="gap-2" onClick={() => setActiveTab(id as "overview" | "modules" | "settings")}><Icon className="h-4 w-4" />{label}</Button>)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === "overview" && <CourseOverview course={course} />}
              {activeTab === "settings" && <CourseSettings course={course} onChange={actions.updateCourse} initiallyOpen />}
              {activeTab === "modules" && <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><h2 className="admin-card-title flex items-center gap-2">{getWorkspaceTitle()}</h2>{selectedModule && <CreateMenu onNewLesson={() => actions.addLesson(selectedModule.id)} onNewExam={() => actions.addExam(selectedModule.id)} examDisabled={!canCreateExam} examDisabledReason={canCreateExam ? undefined : t("moduleAlreadyHasExam") || "This module already has an exam."} />}</div>
                {selection.type === "lesson" && selectedLesson && <><LessonEditor lesson={selectedLesson} onChange={(lesson) => actions.updateLesson(lesson.id, lesson)} /><div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4"><LessonSettingsPanel lesson={selectedLesson} onChange={(lesson) => actions.updateLesson(lesson.id, lesson)} /></div></>}
                {selection.type === "exam" && selectedExam && <><ExamStudio exam={selectedExam} onAddQuestion={(type) => actions.addQuestion(selectedModule!.id, type)} onUpdateQuestion={actions.updateQuestion} onDeleteQuestion={actions.removeQuestion} onDuplicateQuestion={actions.duplicateQuestion} onMoveQuestion={actions.moveQuestion} onReorderQuestions={actions.reorderQuestions} /><div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4"><ExamSettingsPanel exam={selectedExam} onChange={(exam) => selectedExam.id && actions.updateExam(selectedExam.id, exam)} onDelete={() => { if (selectedExam.id && confirm(t("confirmDeleteExam") || "Delete this module exam?")) actions.removeExam(selectedExam.id); }} /></div></>}
                {selection.type === "module" && selectedModule && <><ModuleOverview module={selectedModule} /><div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4"><ModuleSettingsPanel module={selectedModule} onChange={(module) => actions.updateModule(module.id, module)} /></div></>}
                {selection.type === "course" && <CourseOverview course={course} />}
              </div>}
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-slate-700 bg-slate-900 p-6 text-slate-50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedChangesTitle") || "Unsaved Changes"}</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--admin-muted)]">
              {t("unsavedChangesMessage") ||
                "You have unsaved changes. Do you want to save them before switching courses?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={cancelSwitch}
              className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              variant="outline"
              onClick={() => confirmSwitch(false)}
              className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
            >
              {t("discardChanges") || "Discard Changes"}
            </Button>
            <Button
              onClick={() => confirmSwitch(true)}
              disabled={isSaving}
              className="admin-btn-primary"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {isSaving ? t("saving") || "Saving..." : t("saveContinue") || "Save & Continue"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourseStudioSkeleton() {
  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4" aria-busy="true">
      <aside className="w-full lg:w-80 admin-card p-4 space-y-4"><Skeleton variant="admin" className="h-8 w-32 rounded-lg" /><Skeleton variant="admin" className="h-10 w-full rounded-xl" />{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="admin" className="h-16 w-full rounded-xl" />)}</aside>
      <main className="flex-1 admin-card p-5 space-y-5"><div className="flex justify-between"><div className="space-y-2"><Skeleton variant="admin" className="h-7 w-52 rounded-lg" /><Skeleton variant="admin" className="h-4 w-32 rounded-lg" /></div><Skeleton variant="admin" className="h-10 w-28 rounded-xl" /></div><div className="flex gap-2"><Skeleton variant="admin" className="h-9 w-36 rounded-lg" /><Skeleton variant="admin" className="h-9 w-28 rounded-lg" /></div><Skeleton variant="admin" className="h-44 w-full rounded-2xl" /><Skeleton variant="admin" className="h-28 w-full rounded-2xl" /></main>
    </div>
  );
}

function CourseOverview({ course }: { course: import("@/lib/courses-store").Course }) {
  const { t } = useLanguage();
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalExams = course.modules.filter((m) => !!m.exam).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Layers className="h-5 w-5" />} label={t("modules") || "Modules"} value={course.modules.length} color="text-[var(--admin-primary)]" />
        <StatCard icon={<FileText className="h-5 w-5" />} label={t("lessons") || "Lessons"} value={totalLessons} color="text-green-400" />
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label={t("exams") || "Exams"} value={totalExams} color="text-[var(--admin-secondary)]" />
      </div>

      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--admin-primary)]/15 flex items-center justify-center text-[var(--admin-primary)]">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">{course.title}</h2>
        </div>
        <p className="text-[var(--admin-muted)] text-sm">{course.description || t("noDescription") || "No description"}</p>
      </div>
    </div>
  );
}

function ModuleOverview({ module }: { module: import("@/lib/courses-store").Module }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<FileText className="h-5 w-5" />} label={t("lessons") || "Lessons"} value={module.lessons.length} color="text-green-400" />
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label={t("exam") || "Exam"} value={module.exam ? 1 : 0} color="text-[var(--admin-secondary)]" />
        <StatCard icon={<Layers className="h-5 w-5" />} label={t("totalItems") || "Total Items"} value={module.lessons.length + (module.exam ? 1 : 0)} color="text-[var(--admin-primary)]" />
      </div>

      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--admin-text)] mb-2">{module.title}</h2>
        <p className="text-[var(--admin-muted)] text-sm">
          {module.exam
            ? t("moduleHasExamAndLessons") || "This module contains lessons and a module exam."
            : t("moduleHasNoExam") || "This module has lessons but no exam yet. Use the Create button to add one."}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="admin-stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--admin-muted)] text-sm">{label}</p>
          <p className="text-2xl font-bold text-[var(--admin-text)]">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>{icon}</div>
      </div>
    </div>
  );
}
