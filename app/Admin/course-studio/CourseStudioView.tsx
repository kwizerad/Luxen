"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { useCourseStudio } from "@/hooks/use-course-studio";
import { cn } from "@/lib/utils";
import { CourseTree, Selection } from "./components/course-tree";
import { LessonEditor } from "./components/lesson-editor";
import { ExamStudio } from "./components/exam-studio";
import { CourseSettings } from "./components/course-settings";
import { ExamSettingsPanel } from "./components/exam-settings-panel";
import { LessonSettingsPanel } from "./components/lesson-settings-panel";
import { ModuleSettingsPanel } from "./components/module-settings-panel";
import { TopicSettingsPanel } from "./components/topic-settings-panel";
import { ConfirmDeleteDialog } from "./components/confirm-delete-dialog";
import { TopicStrip } from "./components/topic-strip";
import { ModuleOverview } from "./components/module-overview";
import { LessonFolderOverview } from "./components/lesson-folder-overview";
import { CourseOverview } from "./components/course-overview";
import { ExamSummaryHeader } from "./components/exam-summary-header";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Layers,
  FileText,
  ClipboardList,
  Loader2,
  Save,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  Pencil,
  Plus,
  ChevronRight,
  Volume2,
  Check,
  CheckCircle2,
} from "lucide-react";
import type { Editor } from "@tiptap/core";
import { ContextSettingsPanel } from "./components/context-settings-panel";
import { LessonContentView } from "@/app/dashboard/course/LessonContentView";
import { ExamPreview } from "./components/exam-preview";

export function CourseStudioView() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId") || undefined;
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
    isAutoSaving,
    justSaved,
    lastSavedAt,
    saveStatus,
    save,
    silentSave,
    actions,
  } = useCourseStudio(initialCourseId);

  const [showDeleteExam, setShowDeleteExam] = useState(false);
  const [showDeleteTopic, setShowDeleteTopic] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [, forceUpdate] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  // Reset preview mode and active question when selection changes
  useEffect(() => {
    setPreviewMode(false);
    setActiveQuestionId(null);
  }, [selection]);

  // When the ?courseId= URL param changes, switch the studio to that course.
  useEffect(() => {
    if (initialCourseId && initialCourseId !== selectedCourseId) {
      requestSelectCourse(initialCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourseId]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, isSaving]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestSelect = (sel: Selection) => {
    if (hasUnsavedChanges) {
      silentSave();
    }
    select(sel);
  };

  const requestSelectCourse = (id: string) => {
    if (hasUnsavedChanges) {
      silentSave();
    }
    selectCourse(id);
  };

  const selectedTopic = selection.type === "topic" && selectedLesson
    ? selectedLesson.topics?.find((tp) => tp.id === selection.topicId) || null
    : null;

  // --- Breadcrumb rendering ---
  const renderBreadcrumb = () => {
    const crumbs: { label: string; onClick?: () => void }[] = [];
    if (course) {
      crumbs.push({
        label: course.title,
        onClick: () => select({ type: "course" }),
      });
    }
    if (selectedModule && selection.type !== "course") {
      crumbs.push({
        label: selectedModule.title || (t("untitledModule") || "Untitled Module"),
        onClick: () => select({ type: "module", moduleId: selectedModule.id }),
      });
    }
    if (selection.type === "lesson" && selectedLesson) {
      crumbs.push({ label: selectedLesson.title || (t("untitledLesson") || "Untitled Lesson") });
    }
    if (selection.type === "topic" && selectedTopic) {
      if (selectedLesson) {
        crumbs.push({
          label: selectedLesson.title || (t("untitledLesson") || "Untitled Lesson"),
          onClick: () => select({ type: "lesson", moduleId: selectedModule!.id, lessonId: selectedLesson.id }),
        });
      }
      crumbs.push({ label: selectedTopic.title || (t("untitledTopic") || "Untitled Topic") });
    }
    if (selection.type === "exam" && selectedExam) {
      crumbs.push({ label: selectedExam.title || (t("moduleExam") || "Module Exam") });
      const qIndex = activeQuestionId
        ? selectedExam.questions.findIndex((q) => q.id === activeQuestionId)
        : -1;
      if (qIndex >= 0) {
        crumbs.push({ label: `${t("question") || "Question"} ${qIndex + 1}` });
      } else if (selectedExam.questions.length > 0) {
        crumbs.push({ label: `${selectedExam.questions.length} ${t("questions") || "questions"}` });
      } else {
        crumbs.push({ label: t("noQuestionsYet") || "No questions yet" });
      }
    }

    return (
      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
        {crumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center gap-1 min-w-0">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-[var(--admin-muted)] flex-shrink-0" />}
            <button
              type="button"
              onClick={crumb.onClick}
              disabled={!crumb.onClick}
              className={cn(
                "text-sm truncate max-w-[160px]",
                crumb.onClick
                  ? "text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-colors"
                  : "text-[var(--admin-text)] font-medium cursor-default"
              )}
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </div>
    );
  };

  // --- Context-aware toolbar actions ---
  const renderContextActions = () => {
    if (selection.type === "lesson" && selectedLesson && selectedModule) {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newTopic = {
              id: crypto.randomUUID(),
              title: `${t("topic") || "Topic"} ${(selectedLesson.topics?.length || 0) + 1}`,
              content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
              estimated_minutes: 5,
            };
            actions.updateLesson(selectedLesson.id, {
              ...selectedLesson,
              topics: [...(selectedLesson.topics || []), newTopic],
            });
            select({ type: "topic", moduleId: selectedModule.id, lessonId: selectedLesson.id, topicId: newTopic.id });
          }}
          className="admin-btn-secondary h-8 text-xs px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addTopic") || "Add Topic"}
        </Button>
      );
    }
    if (selection.type === "exam" && selectedExam && selectedModule) {
      return (
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const newId = await actions.addQuestion(selectedModule.id, "multiple_choice");
            if (newId) {
              setActiveQuestionId(newId);
            }
          }}
          className="admin-btn-primary h-8 text-xs px-3 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addQuestion") || "Add Question"}
        </Button>
      );
    }
    if (selection.type === "module" && selectedModule) {
      return (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => actions.addLesson(selectedModule.id)}
            disabled={isMutating}
            className="admin-btn-secondary h-8 text-xs px-3 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addLesson") || "Add Lesson"}
          </Button>
          {!selectedModule.exam && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => actions.addExam(selectedModule.id)}
              disabled={isMutating}
              className="admin-btn-secondary h-8 text-xs px-3 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addExam") || "Add Exam"}
            </Button>
          )}
        </>
      );
    }
    return null;
  };

  // --- Settings sidebar header ---
  const getSettingsHeader = () => {
    if (selection.type === "course") {
      return { icon: <BookOpen className="h-4 w-4 text-[var(--admin-primary)]" />, label: t("courseSettings") || "Course Settings" };
    }
    if (selection.type === "module") {
      return { icon: <Layers className="h-4 w-4 text-[var(--admin-secondary)]" />, label: t("moduleSettings") || "Module Settings" };
    }
    if (selection.type === "lesson") {
      return { icon: <FileText className="h-4 w-4 text-[var(--admin-primary)]" />, label: t("lessonSettings") || "Lesson Settings" };
    }
    if (selection.type === "topic") {
      return { icon: <BookOpen className="h-4 w-4 text-[var(--admin-primary)]" />, label: t("topicSettings") || "Topic Settings" };
    }
    if (selection.type === "exam") {
      return { icon: <ClipboardList className="h-4 w-4 text-[var(--admin-secondary)]" />, label: t("examSettings") || "Exam Settings" };
    }
    return { icon: <Settings className="h-4 w-4 text-[var(--admin-primary)]" />, label: t("settings") || "Settings" };
  };

  const saveButtonLabel = () => {
    if (isSaving) return t("saving") || "Saving...";
    if (justSaved) return t("saved") || "Saved ✓";
    if (hasUnsavedChanges) return t("saveChanges") || "Save Changes";
    return t("save") || "Save";
  };

  if (coursesLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center admin-card !rounded-[5px] !transform-none hover:!transform-none">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[var(--admin-primary)]" />
      </div>
    );
  }

  if (courseLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center admin-card !rounded-[5px] !transform-none hover:!transform-none">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-[var(--admin-primary)]" />
      </div>
    );
  }

  if (coursesError || courseError) {
    console.error("Course load error:", coursesError || courseError);
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center admin-card !rounded-[5px] !transform-none hover:!transform-none text-center text-[var(--admin-muted)] p-6 sm:p-8">
        <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-40" />
        <p className="text-base sm:text-lg font-medium text-[var(--admin-text)] mb-2">
          {t("failedToLoadCourses") || "Failed to load courses"}
        </p>
        <p className="text-xs sm:text-sm max-w-md">
          {coursesError?.message || courseError?.message || t("unknownError") || "An unknown error occurred."}
        </p>
      </div>
    );
  }

  if (!course && !courseLoading) {
    return (
      <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center admin-card !rounded-[5px] !transform-none hover:!transform-none text-center text-[var(--admin-muted)] p-6 sm:p-8">
        <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 opacity-40" />
        <p className="text-base sm:text-lg font-medium text-[var(--admin-text)]">
          {t("noCourseSelected") || "No course selected"}
        </p>
        <p className="text-xs sm:text-sm mt-2 max-w-md">
          {t("noCourseSelectedHint") || "Make sure the Supabase migration has been applied and the course_languages table contains the default courses."}
        </p>
      </div>
    );
  }

  const settingsHeader = getSettingsHeader();

  return (
    <div className="min-h-[calc(100vh-7rem)] admin-card !rounded-[5px] !transform-none hover:!transform-none flex flex-col lg:flex-row overflow-visible">
      {course && (
        <div className="lg:sticky lg:top-[48px] lg:h-[calc(100vh-7rem-48px)] lg:flex-shrink-0 lg:self-start lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--admin-border)]">
        <CourseTree
          courses={courses}
          course={course}
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
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col overflow-visible border-t lg:border-t-0 lg:border-l border-[var(--admin-border)]">
        {course && (
          <>
            {/* Top Action Toolbar */}
            <div className="sticky top-[48px] z-30 flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] h-auto border-b border-[var(--admin-border)] bg-[var(--admin-card)]">
              <div className="flex-1 min-w-0 overflow-hidden">
                {renderBreadcrumb()}
              </div>
              <div className="flex items-center flex-wrap gap-1.5 flex-shrink-0">
                {/* Context actions */}
                {renderContextActions()}
                {/* Preview/Edit toggle */}
                {(selection.type === "lesson" || selection.type === "topic" || selection.type === "exam") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode((p) => !p)}
                    className="admin-btn-secondary h-8 text-xs px-3 gap-1.5"
                  >
                    {previewMode ? <><Pencil className="h-3.5 w-3.5" /> {t("edit") || "Edit"}</> : <><Eye className="h-3.5 w-3.5" /> {t("preview") || "Preview"}</>}
                  </Button>
                )}
                <div className="w-px h-5 bg-[var(--admin-border)] mx-0.5" />
                {/* Save status & last saved timestamp */}
                {isSaving ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-muted)] px-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--admin-primary)]" />
                    <span className="hidden sm:inline">{t("saving") || "Saving..."}</span>
                  </span>
                ) : isAutoSaving ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-muted)] opacity-70 px-1">
                    <Loader2 className="h-3 w-3 animate-spin text-[var(--admin-muted)]" />
                    <span className="hidden sm:inline">{t("autoSaving") || "Saving..."}</span>
                  </span>
                ) : justSaved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">{t("saved") || "Saved"}</span>
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium px-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="hidden sm:inline">{t("unsavedChanges") || "Unsaved"}</span>
                  </span>
                ) : lastSavedAt ? (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[var(--admin-muted)] opacity-70 px-1">
                    <Check className="h-3 w-3 text-emerald-500/70" />
                    <span>{t("saved") || "Saved"} {lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </span>
                ) : null}

                {/* Save button */}
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="admin-btn-primary shrink-0 h-8 text-xs px-3 py-1.5 gap-1.5"
                  title="Ctrl + S / Cmd + S to save"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : justSaved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saveButtonLabel()}
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-3 sm:p-4 lg:p-5">
              <div className="space-y-3 sm:space-y-4">
                {/* Course selection */}
                {selection.type === "course" && (
                  <CourseOverview
                    course={course}
                    onSelectModule={(moduleId) => select({ type: "module", moduleId })}
                    onAddModule={() => actions.addModule()}
                  />
                )}

                {/* Module overview */}
                {selection.type === "module" && selectedModule && (
                  <ModuleOverview
                    module={selectedModule}
                    onSelectLesson={(lessonId) => select({ type: "lesson", moduleId: selectedModule.id, lessonId })}
                    onSelectExam={() => {
                      if (selectedModule.exam) {
                        select({ type: "exam", moduleId: selectedModule.id, examId: selectedModule.exam.id });
                      }
                    }}
                    onAddLesson={() => actions.addLesson(selectedModule.id)}
                    onAddExam={() => actions.addExam(selectedModule.id)}
                  />
                )}

                {/* Lesson folder overview */}
                {selection.type === "lesson" && selectedLesson && (
                  previewMode ? (
                    <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-6 space-y-4 sm:space-y-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-[var(--admin-text)]">{selectedLesson.title}</h2>
                        <p className="text-xs text-[var(--admin-muted)]">{selectedLesson.topics?.length || 0} {t("topics") || "topics"}</p>
                      </div>
                      {selectedLesson.topics && selectedLesson.topics.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4 pt-4 border-t border-[var(--admin-border)]">
                          {selectedLesson.topics.map((topic, i) => (
                            <div key={topic.id} className="space-y-2">
                              <h3 className="text-sm font-semibold text-[var(--admin-text)] flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] text-xs">{i + 1}</span>
                                {topic.title}
                                {topic.audioUrl && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-normal">
                                    <Volume2 className="h-3 w-3" />
                                    {t("audio") || "Audio"}
                                  </span>
                                )}
                              </h3>
                              <div className="pl-6 sm:pl-7">
                                <LessonContentView content={topic.content} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--admin-muted)] italic">{t("noTopicsYet") || "No topics yet."}</p>
                      )}
                    </div>
                  ) : (
                    <LessonFolderOverview
                      lesson={selectedLesson}
                      onSelectTopic={(topicId) => {
                        if (selectedModule) {
                          select({ type: "topic", moduleId: selectedModule.id, lessonId: selectedLesson.id, topicId });
                        }
                      }}
                      onAddTopic={() => {
                        const newTopic = {
                          id: crypto.randomUUID(),
                          title: `${t("topic") || "Topic"} ${(selectedLesson.topics?.length || 0) + 1}`,
                          content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
                          estimated_minutes: 5,
                        };
                        actions.updateLesson(selectedLesson.id, {
                          ...selectedLesson,
                          topics: [...(selectedLesson.topics || []), newTopic],
                        });
                      }}
                      onDeleteTopic={(topicId) => {
                        const updatedTopics = (selectedLesson.topics || []).filter((tp) => tp.id !== topicId);
                        actions.updateLesson(selectedLesson.id, {
                          ...selectedLesson,
                          topics: updatedTopics,
                        });
                      }}
                    />
                  )
                )}

                {/* Topic editor */}
                {selection.type === "topic" && selectedTopic && selectedLesson && (
                  previewMode ? (
                    <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-6 space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 text-[var(--admin-muted)] text-xs flex-wrap">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{selectedLesson.title}</span>
                        <span>/</span>
                        <span className="text-[var(--admin-primary)] truncate">{selectedTopic.title}</span>
                      </div>
                      {selectedTopic.audioUrl && (
                        <div className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/40 flex items-center gap-3">
                          <Volume2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <audio controls src={selectedTopic.audioUrl} className="h-8 w-full max-w-md" />
                        </div>
                      )}
                      <LessonContentView content={selectedTopic.content} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-[var(--admin-muted)] text-xs flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedModule) {
                                select({ type: "lesson", moduleId: selectedModule.id, lessonId: selectedLesson.id });
                              }
                            }}
                            className="hover:text-[var(--admin-text)] transition-colors font-medium flex items-center gap-1"
                          >
                            <span>←</span>
                            <span>{selectedLesson.title}</span>
                          </button>
                          <ChevronRight className="h-3 w-3 flex-shrink-0" />
                          <span className="text-[var(--admin-primary)] font-medium truncate">{selectedTopic.title}</span>
                        </div>
                        {selectedTopic.audioUrl && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>{t("ttsAudioAttached") || "TTS Audio"}</span>
                          </div>
                        )}
                      </div>

                      {/* Topic strip switcher */}
                      {selectedLesson.topics && selectedLesson.topics.length > 1 && (
                        <TopicStrip
                          topics={selectedLesson.topics}
                          activeTopicId={selectedTopic.id}
                          onSelectTopic={(topicId) => {
                            if (selectedModule) {
                              select({ type: "topic", moduleId: selectedModule.id, lessonId: selectedLesson.id, topicId });
                            }
                          }}
                          onAddTopic={() => {
                            const newTopic = {
                              id: crypto.randomUUID(),
                              title: `${t("topic") || "Topic"} ${(selectedLesson.topics?.length || 0) + 1}`,
                              content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
                              estimated_minutes: 5,
                            };
                            actions.updateLesson(selectedLesson.id, {
                              ...selectedLesson,
                              topics: [...(selectedLesson.topics || []), newTopic],
                            });
                          }}
                        />
                      )}

                      {/* Audio preview if audio is uploaded */}
                      {selectedTopic.audioUrl && (
                        <div className="p-3 rounded-[5px] border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
                          <Volume2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[var(--admin-text)]">{t("topicTTSAudio") || "Topic TTS Audio"}</div>
                            <audio controls src={selectedTopic.audioUrl} className="h-7 w-full mt-1" />
                          </div>
                        </div>
                      )}

                      <LessonEditor
                        lesson={{ ...selectedLesson, content: selectedTopic.content }}
                        onChange={(updated) => {
                          const updatedTopics = selectedLesson.topics?.map((tp) =>
                            tp.id === selectedTopic.id ? { ...tp, content: updated.content || "" } : tp
                          );
                          actions.updateLesson(selectedLesson.id, { ...selectedLesson, topics: updatedTopics });
                        }}
                        onEditorReady={(ed) => { editorRef.current = ed; forceUpdate((n) => n + 1); }}
                      />
                    </div>
                  )
                )}

                {/* Exam studio */}
                {selection.type === "exam" && selectedExam && (
                  previewMode ? (
                    <ExamPreview exam={selectedExam} />
                  ) : (
                    <div className="space-y-4">
                      <ExamSummaryHeader exam={selectedExam} />
                      <ExamStudio
                        exam={selectedExam}
                        activeQuestionId={activeQuestionId}
                        onActiveQuestionChange={setActiveQuestionId}
                        onAddQuestion={(type) => selectedModule ? actions.addQuestion(selectedModule.id, type) : Promise.resolve(null)}
                        onUpdateQuestion={actions.updateQuestion}
                        onDeleteQuestion={actions.removeQuestion}
                        onDuplicateQuestion={actions.duplicateQuestion}
                        onMoveQuestion={actions.moveQuestion}
                        onReorderQuestions={actions.reorderQuestions}
                        onBulkAddQuestions={async (questions) => {
                          if (!selectedModule) return;
                          for (const q of questions) {
                            const id = await actions.addQuestion(selectedModule.id, q.type);
                            if (id) {
                              actions.updateQuestion(id, q);
                            }
                          }
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Right aside — auto-switching settings panel */}
      {course && (
        settingsCollapsed ? (
          <aside className="settings-aside w-10 flex-shrink-0 p-2 flex flex-col items-center gap-2 overflow-hidden border-t lg:border-t-0 lg:border-l border-[var(--admin-border)] lg:sticky lg:top-[48px] lg:h-[calc(100vh-7rem-48px)] lg:self-start lg:overflow-y-auto">
            <button
              type="button"
              onClick={() => setSettingsCollapsed(false)}
              className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
              title={t("expand") || "Expand"}
              aria-label={t("expand") || "Expand"}
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsCollapsed(false)}
              className="p-1.5 rounded-md text-[var(--admin-primary)] bg-[var(--admin-primary)]/10 transition-colors"
              title={settingsHeader.label}
              aria-label={settingsHeader.label}
            >
              {settingsHeader.icon}
            </button>
          </aside>
        ) : (
        <aside className="settings-aside w-full lg:w-72 flex-shrink-0 p-3 sm:p-4 flex flex-col gap-2 overflow-hidden border-t lg:border-t-0 lg:border-l border-[var(--admin-border)] lg:sticky lg:top-[48px] lg:h-[calc(100vh-7rem-48px)] lg:self-start lg:overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="admin-card-title flex items-center gap-2 text-sm">
              {settingsHeader.icon}
              {settingsHeader.label}
            </h2>
            <button
              type="button"
              onClick={() => setSettingsCollapsed(true)}
              className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
              title={t("collapse") || "Collapse"}
              aria-label={t("collapse") || "Collapse"}
            >
              <PanelRightClose className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 text-sm">
            {/* Course settings */}
            {selection.type === "course" && (
              <CourseSettings course={course} onChange={actions.updateCourse} initiallyOpen />
            )}

            {/* Module settings */}
            {selection.type === "module" && selectedModule && (
              <ModuleSettingsPanel module={selectedModule} onChange={(module) => actions.updateModule(module.id, module)} />
            )}

            {/* Lesson settings */}
            {selection.type === "lesson" && selectedLesson && (
              <>
                <LessonSettingsPanel lesson={selectedLesson} onChange={(lesson) => actions.updateLesson(lesson.id, lesson)} />
                {editorRef.current && (editorRef.current.isActive("table") || editorRef.current.isActive("youtube") || editorRef.current.isActive("image")) && (
                  <ContextSettingsPanel editor={editorRef.current} />
                )}
              </>
            )}

            {/* Topic settings */}
            {selection.type === "topic" && selectedTopic && selectedLesson && (
              <TopicSettingsPanel
                topic={selectedTopic}
                onChange={(topic) => {
                  const updatedTopics = selectedLesson.topics?.map((tp) =>
                    tp.id === topic.id ? topic : tp
                  );
                  actions.updateLesson(selectedLesson.id, { ...selectedLesson, topics: updatedTopics });
                }}
                onDelete={() => setShowDeleteTopic(true)}
              />
            )}

            {/* Exam settings */}
            {selection.type === "exam" && selectedExam && (
              <ExamSettingsPanel
                exam={selectedExam}
                onChange={(exam) => selectedExam.id && actions.updateExam(selectedExam.id, exam)}
                onDelete={() => { if (selectedExam.id) setShowDeleteExam(true); }}
              />
            )}
          </div>
        </aside>
        )
      )}

      {/* Delete exam confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteExam}
        onOpenChange={setShowDeleteExam}
        title={t("confirmDeleteExam") || "Delete Exam"}
        description={t("confirmDeleteExamDesc") || `Are you sure you want to delete "${selectedExam?.title || ""}"? All questions in this exam will also be deleted.`}
        confirmLabel={t("delete") || "Delete"}
        cancelLabel={t("cancel") || "Cancel"}
        isDeleting={isMutating}
        onConfirm={() => {
          if (selectedExam?.id) actions.removeExam(selectedExam.id);
          setShowDeleteExam(false);
        }}
      />

      {/* Delete topic confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteTopic}
        onOpenChange={setShowDeleteTopic}
        title={t("confirmDeleteTopic") || "Delete Topic"}
        description={t("confirmDeleteTopicDesc") || `Are you sure you want to delete "${selectedTopic?.title || ""}"? This will permanently remove the topic and all its content.`}
        confirmLabel={t("delete") || "Delete"}
        cancelLabel={t("cancel") || "Cancel"}
        isDeleting={isMutating}
        onConfirm={() => {
          if (selectedLesson && selectedTopic) {
            const updatedTopics = selectedLesson.topics?.filter((tp) => tp.id !== selectedTopic.id);
            actions.updateLesson(selectedLesson.id, { ...selectedLesson, topics: updatedTopics });
            if (selectedModule) {
              select({ type: "lesson", moduleId: selectedModule.id, lessonId: selectedLesson.id });
            }
          }
          setShowDeleteTopic(false);
        }}
      />
    </div>
  );
}
