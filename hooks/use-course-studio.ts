"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
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
  createModule,
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
  if (!result.success) throw new Error(result.error);
  return result.data.map(dbCourseToUI);
}

async function fetchFullCourse(courseId: string): Promise<Course> {
  const result = await loadFullCourse(courseId);
  if (!result.success) throw new Error(result.error);
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
  return `module:${id}`;
}
function lessonDirtyKey(id: string): DirtyKey {
  return `lesson:${id}`;
}
function examDirtyKey(id: string): DirtyKey {
  return `exam:${id}`;
}
function questionDirtyKey(id: string): DirtyKey {
  return `question:${id}`;
}

export function useCourseStudio(initialCourseId?: string) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || "");
  const [selection, setSelection] = useState<Selection>({ type: "course" });
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts);
  const [dirty, setDirty] = useState<Set<DirtyKey>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

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

  const course = useMemo(() => applyDrafts(serverCourse, drafts), [serverCourse, drafts]);

  useEffect(() => {
    if (courses && !selectedCourseId) {
      setSelectedCourseId(courses[0]?.id || "");
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    const channel = supabase
      .channel(`course-studio:${selectedCourseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_modules", filter: `language_id=eq.${selectedCourseId}` },
        () => mutateCourse()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "course_lessons" }, () => mutateCourse())
      .on("postgres_changes", { event: "*", schema: "public", table: "module_exam_settings" }, () => mutateCourse())
      .on("postgres_changes", { event: "*", schema: "public", table: "module_exam_questions" }, () => mutateCourse())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedCourseId, mutateCourse]);

  const selectedModule = useMemo(() => {
    if (!course) return null;
    if (selection.type === "module") return course.modules.find((m) => m.id === selection.moduleId) || null;
    if (selection.type === "lesson") {
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
    if (!selectedModule || selection.type !== "lesson") return null;
    return selectedModule.lessons.find((l) => l.id === selection.lessonId) || null;
  }, [selectedModule, selection]);

  const selectedExam = useMemo(() => {
    if (!selectedModule || selection.type !== "exam") return null;
    return selectedModule.exam?.id === selection.examId ? selectedModule.exam : null;
  }, [selectedModule, selection]);

  const hasUnsavedChanges = useMemo(() => dirty.size > 0, [dirty]);

  const updateDraft = useCallback(
    <T>(key: DirtyKey, patch: Partial<T>) => {
      setDrafts((prev) => {
        // Merge patch into existing draft
        const parts = key.split(":");
        const field = parts[0] as keyof Drafts;
        if (field === "course") {
          return { ...prev, course: { ...(prev.course || {}), ...patch } as Partial<Course> };
        }
        const id = parts[1];
        const current = (prev[field] as Record<string, Partial<T>>)[id] || {};
        return { ...prev, [field]: { ...prev[field], [id]: { ...current, ...patch } } };
      });
      setDirty((prev) => new Set(prev).add(key));
    },
    []
  );

  const discardDirty = useCallback(() => {
    setDrafts(emptyDrafts());
    setDirty(new Set());
  }, []);

  const clearDirtyKeys = useCallback((keys: DirtyKey[]) => {
    setDirty((prev) => {
      const next = new Set(prev);
      for (const key of keys) next.delete(key);
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev, modules: { ...prev.modules }, lessons: { ...prev.lessons }, exams: { ...prev.exams }, questions: { ...prev.questions } };
      for (const key of keys) {
        const parts = key.split(":");
        const field = parts[0] as keyof Drafts;
        if (field === "course") {
          next.course = undefined;
        } else {
          const id = parts[1];
          delete (next[field] as Record<string, unknown>)[id];
        }
      }
      return next;
    });
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!serverCourse || dirty.size === 0) return true;
    setIsSaving(true);
    setJustSaved(false);
    try {
      const operations: { key: DirtyKey; promise: Promise<unknown> }[] = [];

      if (dirty.has(courseDirtyKey()) && drafts.course) {
        operations.push({
          key: courseDirtyKey(),
          promise: updateCourse(serverCourse.id, uiCourseToDB(drafts.course as Course)),
        });
      }

      for (const key of dirty) {
        const parts = key.split(":");
        if (parts.length !== 2) continue;
        const type = parts[0];
        const id = parts[1];
        if (type === "module" && drafts.modules[id]) {
          operations.push({ key, promise: updateModule(id, uiModuleToDB(drafts.modules[id] as Module)) });
        } else if (type === "lesson" && drafts.lessons[id]) {
          operations.push({ key, promise: updateLesson(id, uiLessonToDB(drafts.lessons[id] as Lesson)) });
        } else if (type === "exam" && drafts.exams[id]) {
          operations.push({ key, promise: updateExamSettings(id, uiExamToDBSettings(drafts.exams[id] as ModuleExam)) });
        } else if (type === "question" && drafts.questions[id]) {
          operations.push({ key, promise: updateExamQuestion(id, uiQuestionToDB(drafts.questions[id] as ModuleExamQuestionUI)) });
        }
      }

      const results = await Promise.all(operations.map((op) => op.promise));
      const failed = results
        .map((r, idx) => ({ result: r as { success: boolean; error?: string }, op: operations[idx] }))
        .filter((item) => !item.result.success);

      if (failed.length > 0) {
        const messages = failed.map((f) => f.op.key + ": " + (f.result.error || "failed")).join("; ");
        throw new Error(`Save failed for ${messages}`);
      }

      clearDirtyKeys(operations.map((op) => op.key));
      mutateCourse();
      mutate(COURSES_KEY);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || "Failed to save changes");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [serverCourse, dirty, drafts, clearDirtyKeys, mutateCourse]);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsMutating(true);
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || "Unable to update the course.");
      throw error;
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

  // Structural operations happen immediately but update local cache optimistically.
  const addModule = useCallback(async () => {
    if (!selectedCourseId) return;
    await withLoading(async () => {
      const result = await createModule(selectedCourseId);
      if (!result.success) throw new Error(result.error);
      await mutateCourse();
    });
  }, [selectedCourseId, withLoading, mutateCourse]);

  const removeModule = useCallback(
    async (id: string) => {
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
      if (!serverCourse) return;
      const index = serverCourse.modules.findIndex((m) => m.id === id);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === serverCourse.modules.length - 1) return;
      const next = cloneCourse(serverCourse);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [next.modules[index], next.modules[swapIndex]] = [next.modules[swapIndex], next.modules[index]];
      mutateCourse(next, { revalidate: false });
      await withLoading(async () => {
        const result = await reorderModules(next.modules.map((m) => m.id));
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [serverCourse, mutateCourse, withLoading]
  );

  const addLesson = useCallback(
    async (moduleId: string) => {
      await withLoading(async () => {
        const result = await createLesson(moduleId);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const removeLesson = useCallback(
    async (id: string) => {
      await withLoading(async () => {
        const result = await deleteLesson(id);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const moveLesson = useCallback(
    async (moduleId: string, lessonId: string, direction: "up" | "down") => {
      if (!serverCourse) return;
      const mod = serverCourse.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const index = mod.lessons.findIndex((l) => l.id === lessonId);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === mod.lessons.length - 1) return;
      const next = cloneCourse(serverCourse);
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
    [serverCourse, mutateCourse, withLoading]
  );

  const addExam = useCallback(
    async (moduleId: string) => {
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
      await withLoading(async () => {
        const result = await deleteExamSettings(id);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const addQuestion = useCallback(
    async (moduleId: string, type: ModuleExamQuestionType) => {
      return await withLoading(async () => {
        const initial: Partial<import("@/lib/database.types").ModuleExamQuestion> =
          type === "true_false"
            ? { type, question: "", correct_answer: "A", points: 1 }
            : type === "multiple_select"
            ? { type, question: "", correct_answer: undefined, points: 1 }
            : { type, question: "", correct_answer: "A" as const, points: 1 };
        const result = await createExamQuestion(moduleId, initial);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
        return result.data.id;
      });
    },
    [withLoading, mutateCourse]
  );

  const removeQuestion = useCallback(
    async (id: string) => {
      await withLoading(async () => {
        const result = await deleteExamQuestion(id);
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
      });
    },
    [withLoading, mutateCourse]
  );

  const duplicateQuestion = useCallback(
    async (questionId: string) => {
      return await withLoading(async () => {
        const source = serverCourse?.modules
          .flatMap((m) => m.exam?.questions || [])
          .find((q) => q.id === questionId);
        const mod = serverCourse?.modules.find((m) => m.exam?.questions.some((q) => q.id === questionId));
        if (!source || !mod) throw new Error("Question not found");
        const result = await createExamQuestion(mod.id, uiQuestionToDB(source));
        if (!result.success) throw new Error(result.error);
        await mutateCourse();
        return result.data.id;
      });
    },
    [serverCourse, withLoading, mutateCourse]
  );

  const moveQuestion = useCallback(
    async (questionId: string, direction: "up" | "down") => {
      if (!serverCourse) return;
      const exam = serverCourse.modules.find((m) => m.exam?.questions.some((q) => q.id === questionId))?.exam;
      if (!exam) return;
      const index = exam.questions.findIndex((q) => q.id === questionId);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === exam.questions.length - 1) return;
      const next = cloneCourse(serverCourse);
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
    [serverCourse, mutateCourse, withLoading]
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
    justSaved,
    save,
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
        if (!serverCourse) return;
        const next = cloneCourse(serverCourse);
        const exam = next.modules.find((m) => m.exam?.questions.some((q) => questionIds.includes(q.id)))?.exam;
        if (!exam) return;
        const ordered = questionIds
          .map((id) => exam.questions.find((q) => q.id === id))
          .filter(Boolean) as import("@/lib/courses-store").ModuleExamQuestionUI[];
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
