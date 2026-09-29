"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";
import {
  Course,
  Lesson,
  Module,
  ModuleExam,
  ModuleExamQuestionUI,
  ModuleExamQuestionType,
  dbCourseToUI,
  dbExamSettingsToUI,
  dbLessonToUI,
  dbModuleToUI,
  dbQuestionToUI,
  uiCourseToDB,
  uiExamToDBSettings,
  uiLessonToDB,
  uiModuleToDB,
  uiQuestionToDB,
} from "@/lib/courses-store";
import { Selection } from "@/app/Admin/course-studio/components/course-tree";
import {
  listCourses,
  loadFullCourse,
  createModuleWithDefaults,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  createExamSettings,
  updateExamSettings,
  deleteExamSettings,
  createExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
  reorderExamQuestions,
  updateCourse,
  FullCourse,
} from "@/app/Admin/actions/courses";
import { toast } from "sonner";

const COURSES_KEY = "admin/courses";
const courseKey = (id: string) => `admin/course/${id}`;

async function fetchCourses(): Promise<Course[]> {
  const result = await listCourses();
  if (!result.success) {
    console.error("Failed to fetch courses:", result.error);
    throw new Error(result.error);
  }
  return result.data.map(dbCourseToUI);
}

async function fetchFullCourse(courseId: string): Promise<Course> {
  const result = await loadFullCourse(courseId);
  if (!result.success) {
    console.error("Failed to fetch full course:", result.error);
    throw new Error(result.error);
  }
  return fullCourseToUI(result.data);
}

function fullCourseToUI(full: FullCourse): Course {
  const course = dbCourseToUI(full.course);
  course.modules = full.modules.map(({ module, lessons, exam, questions }) => {
    const mod = dbModuleToUI(module);
    mod.lessons = lessons.map(dbLessonToUI);
    if (exam) {
      const examUI = dbExamSettingsToUI(exam);
      examUI.questions = questions.map(dbQuestionToUI);
      mod.exam = examUI;
    }
    return mod;
  });
  return course;
}

function cloneCourse(course: Course): Course {
  return JSON.parse(JSON.stringify(course));
}

interface Drafts {
  course?: Partial<Course>;
  modules: Record<string, Partial<Module>>;
  lessons: Record<string, Partial<Lesson>>;
  exams: Record<string, Partial<ModuleExam>>;
  questions: Record<string, Partial<ModuleExamQuestionUI>>;
}

function emptyDrafts(): Drafts {
  return { modules: {}, lessons: {}, exams: {}, questions: {} };
}

function applyDrafts(course: Course | undefined, drafts: Drafts): Course | undefined {
  if (!course) return undefined;
  const next = cloneCourse(course);
  if (drafts.course) Object.assign(next, drafts.course);
  for (const mod of next.modules) {
    if (drafts.modules[mod.id]) Object.assign(mod, drafts.modules[mod.id]);
    for (const lesson of mod.lessons) {
      if (drafts.lessons[lesson.id]) Object.assign(lesson, drafts.lessons[lesson.id]);
    }
    if (mod.exam) {
      if (drafts.exams[mod.exam.id]) Object.assign(mod.exam, drafts.exams[mod.exam.id]);
      for (const q of mod.exam.questions) {
        if (drafts.questions[q.id]) Object.assign(q, drafts.questions[q.id]);
      }
    }
  }
  return next;
}

type DirtyKey = string;

function courseDirtyKey(): DirtyKey {
  return "course";
}
function moduleDirtyKey(id: string): DirtyKey {
  return `modules:${id}`;
}
function lessonDirtyKey(id: string): DirtyKey {
  return `lessons:${id}`;
}
function examDirtyKey(id: string): DirtyKey {
  return `exams:${id}`;
}
function questionDirtyKey(id: string): DirtyKey {
  return `questions:${id}`;
}

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function useCourseStudio(initialCourseId?: string) {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || "");
  const [selection, setSelection] = useState<Selection>({ type: "course" });
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts);
  const [dirty, setDirty] = useState<Set<DirtyKey>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Synchronized refs for fresh reads inside callbacks & timers
  const draftsRef = useRef<Drafts>(drafts);
  draftsRef.current = drafts;

  const dirtyRef = useRef<Set<DirtyKey>>(dirty);
  dirtyRef.current = dirty;

  const isSavingRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data: courses,
    error: coursesError,
    isLoading: coursesLoading,
  } = useSWR<Course[]>(COURSES_KEY, fetchCourses);

  const {
    data: serverCourse,
    error: courseError,
    isLoading: courseLoading,
    mutate: mutateCourse,
  } = useSWR<Course>(selectedCourseId ? courseKey(selectedCourseId) : null, () =>
    fetchFullCourse(selectedCourseId)
  );

  const serverCourseRef = useRef<Course | undefined>(serverCourse);
  serverCourseRef.current = serverCourse;

  const course = useMemo(() => applyDrafts(serverCourse, drafts), [serverCourse, drafts]);

  useEffect(() => {
    if (courses && !selectedCourseId) {
      setSelectedCourseId(courses[0]?.id || "");
    }
  }, [courses, selectedCourseId]);

  // Realtime subscription with safety check to prevent overwriting pending edits
  useEffect(() => {
    if (!selectedCourseId) return;
    const channelName = `course-studio:${selectedCourseId}-${Math.random().toString(36).slice(2, 9)}`;
    const handleRemoteChange = () => {
      // If we are currently editing or actively saving, do not trigger an immediate destructive refetch
      if (dirtyRef.current.size > 0 || isSavingRef.current) return;
      mutateCourse();
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_modules", filter: `language_id=eq.${selectedCourseId}` },
        handleRemoteChange
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "course_lessons" }, handleRemoteChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "module_exam_settings" }, handleRemoteChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "module_exam_questions" }, handleRemoteChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedCourseId, mutateCourse]);

  const selectedModule = useMemo(() => {
    if (!course) return null;
    if (selection.type === "module") return course.modules.find((m) => m.id === selection.moduleId) || null;
    if (selection.type === "lesson" || selection.type === "topic") {
      for (const mod of course.modules) {
        if (mod.lessons.some((l) => l.id === selection.lessonId)) return mod;
      }
    }
    if (selection.type === "exam") {
      return course.modules.find((m) => m.exam?.id === selection.examId) || null;
    }
    return course.modules[0] || null;
  }, [course, selection]);

  const selectedLesson = useMemo(() => {
    if (!selectedModule) return null;
    if (selection.type !== "lesson" && selection.type !== "topic") return null;
    return selectedModule.lessons.find((l) => l.id === selection.lessonId) || null;
  }, [selectedModule, selection]);

  const selectedExam = useMemo(() => {
    if (!selectedModule || selection.type !== "exam") return null;
    return selectedModule.exam?.id === selection.examId ? selectedModule.exam : null;
  }, [selectedModule, selection]);

  const hasUnsavedChanges = useMemo(() => dirty.size > 0, [dirty]);

  const saveStatus = useMemo<SaveStatus>(() => {
    if (isSaving || isAutoSaving) return "saving";
    if (dirty.size > 0) return "unsaved";
    return "saved";
  }, [isSaving, isAutoSaving, dirty.size]);

  // Core saving function that handles both manual and auto-saves safely
  const performSave = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      const silent = options?.silent ?? false;
      const baseCourse = serverCourseRef.current;
      const currentDirty = dirtyRef.current;
      const currentDrafts = draftsRef.current;

      if (!baseCourse || currentDirty.size === 0) return true;
      if (isSavingRef.current) return false;

      isSavingRef.current = true;
      if (silent) {
        setIsAutoSaving(true);
      } else {
        setIsSaving(true);
      }

      // Snapshot the exact drafts being saved right now
      const snapshotDrafts: Drafts = {
        course: currentDrafts.course ? { ...currentDrafts.course } : undefined,
        modules: { ...currentDrafts.modules },
        lessons: { ...currentDrafts.lessons },
        exams: { ...currentDrafts.exams },
        questions: { ...currentDrafts.questions },
      };

      const keysBeingSaved = Array.from(currentDirty);

      try {
        const operations: { key: DirtyKey; promise: Promise<{ success: boolean; error?: string }> }[] = [];

        if (currentDirty.has(courseDirtyKey()) && snapshotDrafts.course) {
          operations.push({
            key: courseDirtyKey(),
            promise: updateCourse(baseCourse.id, uiCourseToDB(snapshotDrafts.course as Course)) as Promise<{ success: boolean; error?: string }>,
          });
        }

        for (const key of currentDirty) {
          const parts = key.split(":");
          if (parts.length !== 2) continue;
          const [type, id] = parts;
          if (type === "modules" && snapshotDrafts.modules[id]) {
            operations.push({
              key,
              promise: updateModule(id, uiModuleToDB(snapshotDrafts.modules[id] as Module)) as Promise<{ success: boolean; error?: string }>,
            });
          } else if (type === "lessons" && snapshotDrafts.lessons[id]) {
            operations.push({
              key,
              promise: updateLesson(id, uiLessonToDB(snapshotDrafts.lessons[id] as Lesson)) as Promise<{ success: boolean; error?: string }>,
            });
          } else if (type === "exams" && snapshotDrafts.exams[id]) {
            operations.push({
              key,
              promise: updateExamSettings(id, uiExamToDBSettings(snapshotDrafts.exams[id] as ModuleExam)) as Promise<{ success: boolean; error?: string }>,
            });
          } else if (type === "questions" && snapshotDrafts.questions[id]) {
            operations.push({
              key,
              promise: updateExamQuestion(id, uiQuestionToDB(snapshotDrafts.questions[id] as ModuleExamQuestionUI)) as Promise<{ success: boolean; error?: string }>,
            });
          }
        }

        if (operations.length === 0) {
          return true;
        }

        const results = await Promise.all(operations.map((op) => op.promise));
        const failed = results
          .map((r, idx) => ({ result: r, op: operations[idx] }))
          .filter((item) => !item.result.success);

        if (failed.length > 0) {
          const messages = failed.map((f) => f.op.key + ": " + (f.result.error || "failed")).join("; ");
          throw new Error(`Save failed for ${messages}`);
        }

        // Build the optimistic course state reflecting all saved snapshot changes
        const optimisticUpdatedCourse = applyDrafts(baseCourse, snapshotDrafts);
        if (optimisticUpdatedCourse) {
          // Update SWR cache immediately so serverCourse matches what was saved.
          // This eliminates any intermediate gap where the UI would revert to stale data!
          await mutateCourse(optimisticUpdatedCourse, { revalidate: false });
        }

        // Clean up only the drafts and dirty keys that haven't received new edits during the save
        setDrafts((prev) => {
          const next: Drafts = {
            ...prev,
            modules: { ...prev.modules },
            lessons: { ...prev.lessons },
            exams: { ...prev.exams },
            questions: { ...prev.questions },
          };

          if (
            snapshotDrafts.course &&
            JSON.stringify(prev.course) === JSON.stringify(snapshotDrafts.course)
          ) {
            next.course = undefined;
          }

          for (const [id, mod] of Object.entries(snapshotDrafts.modules)) {
            if (JSON.stringify(prev.modules[id]) === JSON.stringify(mod)) {
              delete next.modules[id];
            }
          }

          for (const [id, les] of Object.entries(snapshotDrafts.lessons)) {
            if (JSON.stringify(prev.lessons[id]) === JSON.stringify(les)) {
              delete next.lessons[id];
            }
          }

          for (const [id, ex] of Object.entries(snapshotDrafts.exams)) {
            if (JSON.stringify(prev.exams[id]) === JSON.stringify(ex)) {
              delete next.exams[id];
            }
          }

          for (const [id, q] of Object.entries(snapshotDrafts.questions)) {
            if (JSON.stringify(prev.questions[id]) === JSON.stringify(q)) {
              delete next.questions[id];
            }
          }

          return next;
        });

        setDirty((prev) => {
          const next = new Set(prev);
          const activeDrafts = draftsRef.current;

          if (
            snapshotDrafts.course &&
            JSON.stringify(activeDrafts.course) === JSON.stringify(snapshotDrafts.course)
          ) {
            next.delete(courseDirtyKey());
          }

          for (const [id, mod] of Object.entries(snapshotDrafts.modules)) {
            if (JSON.stringify(activeDrafts.modules[id]) === JSON.stringify(mod)) {
              next.delete(moduleDirtyKey(id));
            }
          }

          for (const [id, les] of Object.entries(snapshotDrafts.lessons)) {
            if (JSON.stringify(activeDrafts.lessons[id]) === JSON.stringify(les)) {
              next.delete(lessonDirtyKey(id));
            }
          }

          for (const [id, ex] of Object.entries(snapshotDrafts.exams)) {
            if (JSON.stringify(activeDrafts.exams[id]) === JSON.stringify(ex)) {
              next.delete(examDirtyKey(id));
            }
          }

          for (const [id, q] of Object.entries(snapshotDrafts.questions)) {
            if (JSON.stringify(activeDrafts.questions[id]) === JSON.stringify(q)) {
              next.delete(questionDirtyKey(id));
            }
          }

          return next;
        });

        setLastSavedAt(new Date());

        if (!silent) {
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2500);
        }

        // Background revalidate in case the server generated timestamps or IDs
        mutateCourse();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!silent) {
          toast.error(message || "Failed to save changes");
        } else {
          console.warn("Autosave encounter:", message);
        }
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
        setIsAutoSaving(false);
      }
    },
    [mutateCourse]
  );

  const save = useCallback(async (): Promise<boolean> => {
    // Clear any pending debounced autosave since user triggered manual save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    return performSave({ silent: false });
  }, [performSave]);

  const silentSave = useCallback(async (): Promise<boolean> => {
    return performSave({ silent: true });
  }, [performSave]);

  // Keep a ref to silentSave for timers
  const silentSaveRef = useRef(silentSave);
  silentSaveRef.current = silentSave;

  const scheduleDebouncedAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      silentSaveRef.current();
    }, 2500);
  }, []);

  const updateDraft = useCallback(
    <T>(key: DirtyKey, patch: Partial<T>) => {
      setDrafts((prev) => {
        const parts = key.split(":");
        const field = parts[0] as keyof Drafts;
        if (field === "course") {
          return { ...prev, course: { ...(prev.course || {}), ...patch } as Partial<Course> };
        }
        const id = parts[1];
        const bucket = (prev[field] as Record<string, Partial<T>> | undefined) || {};
        const current = bucket[id] || {};
        return { ...prev, [field]: { ...bucket, [id]: { ...current, ...patch } } };
      });
      setDirty((prev) => new Set(prev).add(key));
      scheduleDebouncedAutoSave();
    },
    [scheduleDebouncedAutoSave]
  );

  const discardDirty = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setDrafts(emptyDrafts());
    setDirty(new Set());
  }, []);

  // Flush on unmount if dirty
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setIsMutating(true);
    try {
      return await fn();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? (error as { message?: string }).message || String(error)
            : String(error);
      toast.error(message || "Unable to update the course.");
      return undefined;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const selectCourse = useCallback((id: string) => {
    setSelectedCourseId(id);
    setSelection({ type: "course" });
  }, []);

  const select = useCallback((sel: Selection) => {
    setSelection(sel);
  }, []);

  const updateCourseData = useCallback(
    (patch: Partial<Course>) => updateDraft(courseDirtyKey(), patch),
    [updateDraft]
  );

  const updateModuleData = useCallback(
    (id: string, patch: Partial<Module>) => updateDraft(moduleDirtyKey(id), patch),
    [updateDraft]
  );

  const updateLessonData = useCallback(
    (id: string, patch: Partial<Lesson>) => updateDraft(lessonDirtyKey(id), patch),
    [updateDraft]
  );

  const updateExamData = useCallback(
    (id: string, patch: Partial<ModuleExam>) => updateDraft(examDirtyKey(id), patch),
    [updateDraft]
  );

  const updateQuestionData = useCallback(
    (id: string, patch: Partial<ModuleExamQuestionUI>) => updateDraft(questionDirtyKey(id), patch),
    [updateDraft]
  );

  // Structural operations flush pending drafts before mutating structure
  const addModule = useCallback(async (title?: string) => {
    if (!selectedCourseId) {
      toast.error("No course selected. Please select a course first.");
      return;
    }
    if (dirtyRef.current.size > 0) {
      await silentSaveRef.current();
    }
    await withLoading(async () => {
      const result = await createModuleWithDefaults(selectedCourseId, title);
      if (!result.success) throw new Error(result.error);
      await mutateCourse();
      mutate(COURSES_KEY, async () => {
        const res = await listCourses();
        if (!res.success) throw new Error(res.error);
        return res.data.map(dbCourseToUI);
      });
      toast.success(t("moduleCreated") || "Module created successfully.");
    });
  }, [selectedCourseId, withLoading, mutateCourse, t]);

  const removeModule = useCallback(
    async (id: string) => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      await withLoading(async () => {
        const result = await deleteModule(id);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const moveModule = useCallback(
    async (id: string, direction: "up" | "down") => {
      const currentCourse = serverCourseRef.current;
      if (!currentCourse) return;
      const index = currentCourse.modules.findIndex((m) => m.id === id);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === currentCourse.modules.length - 1) return;
      const next = cloneCourse(currentCourse);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [next.modules[index], next.modules[swapIndex]] = [next.modules[swapIndex], next.modules[index]];
      mutateCourse(next, { revalidate: false });
      await withLoading(async () => {
        const result = await reorderModules(next.modules.map((m) => m.id));
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [mutateCourse, withLoading]
  );

  const addLesson = useCallback(
    async (moduleId: string) => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      await withLoading(async () => {
        const result = await createLesson(moduleId);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const removeLesson = useCallback(
    async (moduleId: string, lessonId: string) => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      await withLoading(async () => {
        const result = await deleteLesson(lessonId);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const moveLesson = useCallback(
    async (moduleId: string, lessonId: string, direction: "up" | "down") => {
      const currentCourse = serverCourseRef.current;
      if (!currentCourse) return;
      const mod = currentCourse.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const index = mod.lessons.findIndex((l) => l.id === lessonId);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === mod.lessons.length - 1) return;
      const next = cloneCourse(currentCourse);
      const nextMod = next.modules.find((m) => m.id === moduleId)!;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [nextMod.lessons[index], nextMod.lessons[swapIndex]] = [nextMod.lessons[swapIndex], nextMod.lessons[index]];
      mutateCourse(next, { revalidate: false });
      await withLoading(async () => {
        const result = await reorderLessons(nextMod.lessons.map((l) => l.id));
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [mutateCourse, withLoading]
  );

  const addExam = useCallback(
    async (moduleId: string) => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      await withLoading(async () => {
        const result = await createExamSettings(moduleId);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const removeExam = useCallback(
    async (id: string) => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      await withLoading(async () => {
        const result = await deleteExamSettings(id);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const addQuestion = useCallback(
    async (moduleId: string, type: ModuleExamQuestionType): Promise<string | null> => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      return (await withLoading(async () => {
        const initial: Partial<import("@/lib/database.types").ModuleExamQuestion> =
          type === "true_false"
            ? { type, question: "", correct_answer: "A", points: 1 }
            : { type, question: "", correct_answer: "A", points: 1 };
        const result = await createExamQuestion(moduleId, initial);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
        return result.data.id;
      })) ?? null;
    },
    [withLoading, mutateCourse]
  );

  const removeQuestion = useCallback(
    async (id: string) => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      await withLoading(async () => {
        const result = await deleteExamQuestion(id);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const duplicateQuestion = useCallback(
    async (questionId: string): Promise<string | null> => {
      if (dirtyRef.current.size > 0) {
        await silentSaveRef.current();
      }
      return (await withLoading(async () => {
        const source = course?.modules
          .flatMap((m) => m.exam?.questions || [])
          .find((q) => q.id === questionId);
        const mod = course?.modules.find((m) => m.exam?.questions.some((q) => q.id === questionId));
        if (!source || !mod) throw new Error("Question not found");
        const result = await createExamQuestion(mod.id, uiQuestionToDB(source));
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
        return result.data.id;
      })) ?? null;
    },
    [course, withLoading, mutateCourse]
  );

  const moveQuestion = useCallback(
    async (questionId: string, direction: "up" | "down") => {
      const currentCourse = serverCourseRef.current;
      if (!currentCourse) return;
      const exam = currentCourse.modules.find((m) => m.exam?.questions.some((q) => q.id === questionId))?.exam;
      if (!exam) return;
      const index = exam.questions.findIndex((q) => q.id === questionId);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === exam.questions.length - 1) return;
      const next = cloneCourse(currentCourse);
      const nextMod = next.modules.find((m) => m.exam?.questions.some((q) => q.id === questionId));
      if (!nextMod?.exam) return;
      const nextExam = nextMod.exam;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [nextExam.questions[index], nextExam.questions[swapIndex]] = [nextExam.questions[swapIndex], nextExam.questions[index]];
      mutateCourse(next, { revalidate: false });
      await withLoading(async () => {
        const result = await reorderExamQuestions(nextExam.questions.map((q) => q.id));
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [mutateCourse, withLoading]
  );

  return {
    courses: courses || [],
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
    discardDirty,
    actions: {
      updateCourse: updateCourseData,
      updateModule: updateModuleData,
      updateLesson: updateLessonData,
      updateExam: updateExamData,
      updateQuestion: updateQuestionData,
      addModule,
      removeModule,
      moveModule,
      addLesson,
      removeLesson,
      moveLesson,
      addExam,
      removeExam,
      addQuestion,
      removeQuestion,
      duplicateQuestion,
      moveQuestion,
      reorderQuestions: async (questionIds: string[]) => {
        const currentCourse = serverCourseRef.current;
        if (!currentCourse) return;
        const next = cloneCourse(currentCourse);
        const exam = next.modules.find((m) => m.exam?.questions.some((q) => questionIds.includes(q.id)))?.exam;
        if (!exam) return;
        const ordered = questionIds
          .map((id) => exam.questions.find((q) => q.id === id))
          .filter(Boolean) as ModuleExamQuestionUI[];
        exam.questions = ordered;
        mutateCourse(next, { revalidate: false });
        await withLoading(async () => {
          const result = await reorderExamQuestions(questionIds);
          if (!result.success) throw new Error(result.error);
          await mutateCourse();
        });
      },
    },
  };
}
