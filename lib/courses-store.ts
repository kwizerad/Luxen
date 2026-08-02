"use client";

import {
  CourseLanguage,
  CourseLanguageCourse,
  CourseModule,
  CourseLesson,
  ModuleExamSettings,
  ModuleExamQuestion,
} from "@/lib/database.types";

export type { CourseLanguage };
export type CourseStatus = "draft" | "published" | "archived";
export type ModuleExamQuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "matching";

export interface LessonTopic {
  id: string;
  title: string;
  content: string; // Tiptap JSON string
  estimated_minutes?: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: string; // Tiptap JSON string
  status: CourseStatus;
  topics: LessonTopic[];
}

export interface ModuleExamOption {
  id: string;
  text: string;
  image?: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  leftImage?: string;
  right: string;
  rightImage?: string;
}

export interface ShortAnswerSettings {
  acceptedAnswers: string[];
  caseSensitive: boolean;
  ignorePunctuation: boolean;
  ignoreWhitespace: boolean;
  keywordMatching: boolean;
  minChars?: number;
  maxChars?: number;
}

export interface ModuleExamQuestionUI {
  id: string;
  type: ModuleExamQuestionType;
  text: string; // Tiptap JSON string
  image?: string;
  options: ModuleExamOption[];
  correctOptionId: string; // MC / T/F
  correctOptionIds: string[]; // Multiple select
  explanation: string; // Tiptap JSON string
  points: number;
  partialScoring: boolean; // Multiple select
  matchingPairs: MatchingPair[];
  shortAnswer: ShortAnswerSettings;
  tags: string[];
  randomizeAnswerOrder: boolean;
}

export interface ModuleExamSettingsUI {
  passingPercentage: number;
  maxAttempts: number | null;
  retakeLimit: number | null;
  durationMinutes: number;
  randomizeQuestionOrder: boolean;
  randomizeAnswerChoices: boolean;
  showResultsImmediately: boolean;
  showExplanations: boolean;
  allowReview: boolean;
  questionCount: number;
  examType: string[];
}

export interface ModuleExam {
  id: string;
  title: string;
  status: CourseStatus;
  settings: ModuleExamSettingsUI;
  questions: ModuleExamQuestionUI[];
}

export interface Module {
  id: string;
  title: string;
  status: CourseStatus;
  lessons: Lesson[];
  exam?: ModuleExam;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  language: CourseLanguage;
  status: CourseStatus;
  modules: Module[];
  midtermEnabled: boolean;
  midtermInterval: number;
  midtermQuestionCount: number;
  midtermDurationMinutes: number;
}

export const defaultExamSettings = (): ModuleExamSettingsUI => ({
  passingPercentage: 70,
  maxAttempts: 2,
  retakeLimit: 2,
  durationMinutes: 20,
  randomizeQuestionOrder: false,
  randomizeAnswerChoices: false,
  showResultsImmediately: true,
  showExplanations: true,
  allowReview: true,
  questionCount: 20,
  examType: [],
});

export const createModuleExam = (title = "Module Exam"): ModuleExam => ({
  id: "",
  title,
  status: "draft",
  settings: defaultExamSettings(),
  questions: [],
});

const defaultOptionsForType = (type: ModuleExamQuestionType): ModuleExamOption[] => {
  if (type === "true_false") {
    return [
      { id: "A", text: "True" },
      { id: "B", text: "False" },
    ];
  }
  if (type === "multiple_select" || type === "multiple_choice") {
    return [
      { id: "A", text: "" },
      { id: "B", text: "" },
      { id: "C", text: "" },
      { id: "D", text: "" },
    ];
  }
  return [];
};

const defaultShortAnswer = (): ShortAnswerSettings => ({
  acceptedAnswers: [""],
  caseSensitive: false,
  ignorePunctuation: true,
  ignoreWhitespace: true,
  keywordMatching: false,
});

export const createModuleExamQuestion = (
  type: ModuleExamQuestionType = "multiple_choice",
  defaults?: Partial<ModuleExamQuestionUI>
): ModuleExamQuestionUI => {
  const base: ModuleExamQuestionUI = {
    id: "",
    type,
    text: "",
    options: defaultOptionsForType(type),
    correctOptionId: type === "true_false" ? "A" : "A",
    correctOptionIds: type === "true_false" ? ["A"] : [],
    explanation: "",
    points: 1,
    partialScoring: false,
    matchingPairs: [
      { id: "p1", left: "", right: "" },
      { id: "p2", left: "", right: "" },
    ],
    shortAnswer: defaultShortAnswer(),
    tags: [],
    randomizeAnswerOrder: false,
  };
  return { ...base, ...defaults, id: defaults?.id || base.id };
};

export function extractTextFromTiptapJSON(value: string | object | undefined): string {
  if (!value) return "";
  try {
    const doc = typeof value === "string" ? JSON.parse(value) : value;
    const texts: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const n = node as Record<string, unknown>;
      if (typeof n.text === "string") texts.push(n.text);
      if (Array.isArray(n.content)) walk(n.content);
    };
    walk(doc);
    return texts.join(" ");
  } catch {
    return typeof value === "string" ? value : "";
  }
}

export function totalLessons(course: Course): number {
  return course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export function totalQuestions(course: Course): number {
  return course.modules.reduce((sum, m) => sum + (m.exam?.questions.length || 0), 0);
}

export function findModule(course: Course, moduleId: string): Module | undefined {
  return course.modules.find((m) => m.id === moduleId);
}

export function findLesson(module: Module, lessonId: string): Lesson | undefined {
  return module.lessons.find((l) => l.id === lessonId);
}

export function hasModuleExam(module: Module): boolean {
  return !!module.exam;
}

// ============================================================================
// Database <-> UI transforms
// ============================================================================

const DB_OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"] as const;
const DB_OPTION_IMAGE_KEYS = ["option_a_image", "option_b_image", "option_c_image", "option_d_image"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const tiptapEmptyDoc = () =>
  JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

export function dbQuestionToUI(q: ModuleExamQuestion): ModuleExamQuestionUI {
  const meta = (q.metadata || {}) as Record<string, unknown>;
  const savedOptions = Array.isArray(meta.options) ? meta.options as ModuleExamOption[] : null;
  const options: ModuleExamOption[] = savedOptions || [];
  if (!savedOptions) {
    for (let i = 0; i < 4; i++) {
      const text = (q[DB_OPTION_KEYS[i]] || "").trim();
      const image = q[DB_OPTION_IMAGE_KEYS[i]] || undefined;
      if (text || image || i < 2 || q.type === "multiple_select" || q.type === "multiple_choice") {
        options.push({ id: OPTION_LETTERS[i], text, image });
      }
    }
  }
  return {
    id: q.id,
    type: q.type,
    text: q.question || tiptapEmptyDoc(),
    image: q.question_image || undefined,
    options,
    correctOptionId: q.correct_answer || "A",
    correctOptionIds: Array.isArray(meta.correctOptionIds) ? (meta.correctOptionIds as string[]) : [],
    explanation: q.explanation || tiptapEmptyDoc(),
    points: typeof q.points === "number" ? Number(q.points) : 1,
    partialScoring: meta.partialScoring === true,
    matchingPairs: Array.isArray(meta.matchingPairs) ? (meta.matchingPairs as MatchingPair[]) : [],
    shortAnswer: meta.shortAnswer ? (meta.shortAnswer as ShortAnswerSettings) : defaultShortAnswer(),
    tags: q.tags || [],
    randomizeAnswerOrder: q.randomize_answer_order || false,
  };
}

export function uiQuestionToDB(q: ModuleExamQuestionUI): Partial<ModuleExamQuestion> {
  const optionMap: Record<string, { text?: string; image?: string }> = {};
  for (const opt of q.options || []) {
    optionMap[opt.id] = { text: opt.text, image: opt.image };
  }
  return {
    type: q.type,
    question: q.text,
    question_image: q.image,
    option_a: optionMap["A"]?.text,
    option_a_image: optionMap["A"]?.image,
    option_b: optionMap["B"]?.text,
    option_b_image: optionMap["B"]?.image,
    option_c: optionMap["C"]?.text,
    option_c_image: optionMap["C"]?.image,
    option_d: optionMap["D"]?.text,
    option_d_image: optionMap["D"]?.image,
    correct_answer: q.type === "multiple_select" ? undefined : (q.correctOptionId as "A" | "B" | "C" | "D"),
    explanation: q.explanation,
    points: q.points,
    randomize_answer_order: q.randomizeAnswerOrder,
    tags: q.tags,
    metadata: {
      options: q.options || [],
      correctOptionIds: q.correctOptionIds,
      partialScoring: q.partialScoring,
      matchingPairs: q.matchingPairs,
      shortAnswer: q.shortAnswer,
    },
  };
}

export function dbExamSettingsToUI(s: ModuleExamSettings): ModuleExam {
  return {
    id: s.id,
    title: s.title,
    status: s.status,
    settings: {
      passingPercentage: s.passing_percentage ?? 70,
      maxAttempts: s.max_attempts ?? 2,
      retakeLimit: s.retake_limit ?? 2,
      durationMinutes: s.duration_minutes ?? 20,
      randomizeQuestionOrder: s.randomize_questions ?? false,
      randomizeAnswerChoices: s.randomize_answers ?? false,
      showResultsImmediately: s.show_results_immediately ?? true,
      showExplanations: s.show_explanations ?? true,
      allowReview: s.allow_review ?? true,
      questionCount: s.question_count ?? 20,
      examType: s.exam_type ? s.exam_type.split(",") : [],
    },
    questions: [],
  };
}

export function uiExamToDBSettings(exam: ModuleExam): Partial<ModuleExamSettings> {
  return {
    title: exam.title,
    status: exam.status,
    passing_percentage: exam.settings.passingPercentage,
    duration_minutes: exam.settings.durationMinutes,
    max_attempts: exam.settings.maxAttempts,
    retake_limit: exam.settings.retakeLimit,
    randomize_questions: exam.settings.randomizeQuestionOrder,
    randomize_answers: exam.settings.randomizeAnswerChoices,
    show_results_immediately: exam.settings.showResultsImmediately,
    show_explanations: exam.settings.showExplanations,
    allow_review: exam.settings.allowReview,
    question_count: exam.settings.questionCount,
    exam_type: exam.settings.examType.join(","),
  };
}

export function dbLessonToUI(l: CourseLesson): Lesson {
  const rawTopics = l.topics;
  let topics: LessonTopic[] = [];
  if (Array.isArray(rawTopics)) {
    // Support both old format (string[]) and new format (LessonTopic[])
    topics = rawTopics.map((t: any) =>
      typeof t === "string"
        ? { id: crypto.randomUUID(), title: t, content: tiptapEmptyDoc(), estimated_minutes: 0 }
        : { id: t.id || crypto.randomUUID(), title: t.title || "", content: t.content || tiptapEmptyDoc(), estimated_minutes: t.estimated_minutes || 0 }
    );
  }
  return {
    id: l.id,
    title: l.title,
    content: l.content || tiptapEmptyDoc(),
    status: l.status || "draft",
    topics,
  };
}

export function uiLessonToDB(l: Lesson): Partial<CourseLesson> {
  return {
    title: l.title,
    content: l.content,
    status: l.status,
    topics: l.topics as any,
  };
}

export function dbModuleToUI(m: CourseModule): Module {
  return {
    id: m.id,
    title: m.title,
    status: m.status || "draft",
    lessons: [],
  };
}

export function uiModuleToDB(m: Module): Partial<CourseModule> {
  return {
    title: m.title,
    status: m.status,
  };
}

export function dbCourseToUI(c: CourseLanguageCourse): Course {
  return {
    id: c.id,
    title: c.title,
    description: c.description || "",
    thumbnailUrl: c.thumbnail_url,
    bannerUrl: c.banner_url,
    language: c.language,
    status: c.status || "draft",
    modules: [],
    midtermEnabled: c.midterm_enabled ?? false,
    midtermInterval: c.midterm_interval ?? 3,
    midtermQuestionCount: c.midterm_question_count ?? 30,
    midtermDurationMinutes: c.midterm_duration_minutes ?? 30,
  };
}

export function uiCourseToDB(c: Course): Partial<CourseLanguageCourse> {
  return {
    title: c.title,
    description: c.description,
    thumbnail_url: c.thumbnailUrl,
    banner_url: c.bannerUrl,
    status: c.status,
    midterm_enabled: c.midtermEnabled,
    midterm_interval: c.midtermInterval,
    midterm_question_count: c.midtermQuestionCount,
    midterm_duration_minutes: c.midtermDurationMinutes,
  };
}
