"use client";

import { useState, useRef, useMemo, useEffect, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { getLessonThumbnail } from "@/lib/course-media";
import type { CourseLanguageCourse, CourseModule, CourseLesson } from "@/lib/database.types";
import {
  BookOpen,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  GripVertical,
  Globe,
  Lock,
  Eye,
  Pencil,
  Check,
  Loader2,
  Search,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  FolderTree,
  Table2,
  Clock,
} from "lucide-react";

export interface TreeModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
}

export interface TreeCourseWithCounts extends CourseLanguageCourse {
  moduleCount: number;
  lessonCount: number;
}

interface ParsedTopicPreview {
  id: string;
  title: string;
  estimated_minutes?: number;
}

function parseLessonTopics(raw: unknown): ParsedTopicPreview[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      return [];
    }
  } else {
    return [];
  }

  return list
    .map((item, idx): ParsedTopicPreview | null => {
      if (typeof item === "string") {
        try {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === "object") {
            return {
              id: String(parsed.id || `topic-${idx}`),
              title: String(parsed.title || `Topic ${idx + 1}`),
              estimated_minutes: Number(parsed.estimated_minutes) || 0,
            };
          }
        } catch {
          return { id: `topic-${idx}`, title: item, estimated_minutes: 0 };
        }
      }
      if (item && typeof item === "object") {
        const obj = item as { id?: string; title?: string; estimated_minutes?: number };
        return {
          id: String(obj.id || `topic-${idx}`),
          title: String(obj.title || `Topic ${idx + 1}`),
          estimated_minutes: Number(obj.estimated_minutes) || 0,
        };
      }
      return null;
    })
    .filter((t): t is ParsedTopicPreview => t !== null);
}

type DragItem =
  | { type: "module"; moduleId: string }
  | { type: "lesson"; lessonId: string; sourceModuleId: string };

type DropTarget =
  | { kind: "module"; moduleId: string; position: "before" | "after" | "inside" }
  | { kind: "lesson"; moduleId: string; lessonId: string; position: "before" | "after" };

interface CourseTreeBuilderProps {
  course: TreeCourseWithCounts;
  modules: TreeModuleWithLessons[];
  loading: boolean;
  updatingId: string | null;
  isReordering: boolean;
  expandedModules: Set<string>;
  viewMode: "tree" | "table";
  onViewModeChange: (mode: "tree" | "table") => void;
  onToggleModule: (moduleId: string) => void;
  onExpandModule: (moduleId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onReorderModules: (newModuleIds: string[]) => Promise<void>;
  onReorderLessons: (moduleId: string, newLessonIds: string[]) => Promise<void>;
  onMoveLessonToModule: (
    lessonId: string,
    sourceModuleId: string,
    targetModuleId: string,
    targetIndex: number
  ) => Promise<void>;
  onModuleStatusChange: (moduleId: string, status: "draft" | "published") => void;
  onLessonStatusChange: (moduleId: string, lessonId: string, status: "draft" | "published") => void;
  onPublishAllLessons: (moduleId: string) => void;
  onDraftAllLessons: (moduleId: string) => void;
  onPreviewCourse: () => void;
  onPreviewModule: (mod: TreeModuleWithLessons) => void;
  onPreviewLesson: (mod: TreeModuleWithLessons, lesson: CourseLesson) => void;
  onCreateModule: (title: string) => Promise<void>;
  onCreateLesson: (moduleId: string, title: string) => Promise<void>;
  onClose: () => void;
  tableContent?: React.ReactNode;
}

export function CourseTreeBuilder({
  course,
  modules,
  loading,
  updatingId,
  isReordering,
  expandedModules,
  viewMode,
  onViewModeChange,
  onToggleModule,
  onExpandModule,
  onExpandAll,
  onCollapseAll,
  onReorderModules,
  onReorderLessons,
  onMoveLessonToModule,
  onModuleStatusChange,
  onLessonStatusChange,
  onPublishAllLessons,
  onDraftAllLessons,
  onPreviewCourse,
  onPreviewModule,
  onPreviewLesson,
  onCreateModule,
  onCreateLesson,
  onClose,
  tableContent,
}: CourseTreeBuilderProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  // Inline create states
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [creatingModule, setCreatingModule] = useState(false);
  const [addingLessonModuleId, setAddingLessonModuleId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  // Drag-and-drop state + ref to avoid stale reads during rapid drag events
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const dragItemRef = useRef<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoExpandTargetRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
    };
  }, []);

  const isSearching = searchQuery.trim().length > 0;
  const dndDisabled = isSearching || isReordering;

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules
      .map((mod) => {
        const modMatch = mod.title.toLowerCase().includes(q);
        const matchingLessons = mod.lessons.filter((les) => {
          if (les.title.toLowerCase().includes(q)) return true;
          return parseLessonTopics(les.topics).some((tp) => tp.title.toLowerCase().includes(q));
        });
        if (modMatch) return mod;
        if (matchingLessons.length > 0) return { ...mod, lessons: matchingLessons };
        return null;
      })
      .filter((m): m is TreeModuleWithLessons => Boolean(m));
  }, [modules, searchQuery]);

  const stats = useMemo(() => {
    let lessons = 0;
    let topics = 0;
    let publishedModules = 0;
    for (const m of modules) {
      if (m.status === "published") publishedModules++;
      lessons += m.lessons.length;
      for (const l of m.lessons) {
        topics += parseLessonTopics(l.topics).length;
      }
    }
    return { modules: modules.length, publishedModules, lessons, topics };
  }, [modules]);

  const toggleLessonTopics = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const clearDragState = () => {
    setDragItem(null);
    dragItemRef.current = null;
    setDropTarget(null);
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
  };

  const scheduleAutoExpandModule = (moduleId: string) => {
    if (expandedModules.has(moduleId)) return;
    if (autoExpandTargetRef.current === moduleId) return;
    if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
    autoExpandTargetRef.current = moduleId;
    autoExpandTimerRef.current = setTimeout(() => {
      onExpandModule(moduleId);
      autoExpandTargetRef.current = null;
    }, 450);
  };

  // --- Module Drag Handlers ---
  const handleModuleDragStart = (e: DragEvent<HTMLElement>, moduleId: string) => {
    if (dndDisabled) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    const item: DragItem = { type: "module", moduleId };
    dragItemRef.current = item;
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `module:${moduleId}`);
  };

  const handleModuleDragOver = (e: DragEvent<HTMLDivElement>, moduleId: string) => {
    const active = dragItemRef.current;
    if (!active || dndDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (active.type === "module") {
      if (active.moduleId === moduleId) {
        setDropTarget(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
      setDropTarget({ kind: "module", moduleId, position });
    } else if (active.type === "lesson") {
      setDropTarget({ kind: "module", moduleId, position: "inside" });
      scheduleAutoExpandModule(moduleId);
    }
  };

  const handleModuleDrop = async (e: DragEvent<HTMLDivElement>, targetModuleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const active = dragItemRef.current;
    const currentDrop = dropTarget;
    clearDragState();
    if (!active || dndDisabled) return;

    if (active.type === "module") {
      if (active.moduleId === targetModuleId) return;
      const ids = modules.map((m) => m.id);
      const fromIdx = ids.indexOf(active.moduleId);
      if (fromIdx === -1) return;
      const next = [...ids];
      next.splice(fromIdx, 1);
      let insertIdx = next.indexOf(targetModuleId);
      if (insertIdx === -1) return;
      if (currentDrop?.kind === "module" && currentDrop.moduleId === targetModuleId && currentDrop.position === "after") {
        insertIdx += 1;
      }
      next.splice(insertIdx, 0, active.moduleId);
      await onReorderModules(next);
    } else if (active.type === "lesson") {
      const targetMod = modules.find((m) => m.id === targetModuleId);
      if (!targetMod) return;
      if (active.sourceModuleId === targetModuleId) {
        const ids = targetMod.lessons.map((l) => l.id).filter((id) => id !== active.lessonId);
        ids.push(active.lessonId);
        await onReorderLessons(targetModuleId, ids);
      } else {
        onExpandModule(targetModuleId);
        await onMoveLessonToModule(
          active.lessonId,
          active.sourceModuleId,
          targetModuleId,
          targetMod.lessons.length
        );
      }
    }
  };

  // --- Lesson Drag Handlers ---
  const handleLessonDragStart = (
    e: DragEvent<HTMLElement>,
    moduleId: string,
    lessonId: string
  ) => {
    if (dndDisabled) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    const item: DragItem = { type: "lesson", lessonId, sourceModuleId: moduleId };
    dragItemRef.current = item;
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `lesson:${lessonId}`);
  };

  const handleLessonDragOver = (
    e: DragEvent<HTMLDivElement>,
    moduleId: string,
    lessonId: string
  ) => {
    const active = dragItemRef.current;
    if (!active || active.type !== "lesson" || dndDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (active.lessonId === lessonId) {
      setDropTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDropTarget({ kind: "lesson", moduleId, lessonId, position });
  };

  const handleLessonDrop = async (
    e: DragEvent<HTMLDivElement>,
    targetModuleId: string,
    targetLessonId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const active = dragItemRef.current;
    const currentDrop = dropTarget;
    clearDragState();
    if (!active || active.type !== "lesson" || dndDisabled) return;
    if (active.lessonId === targetLessonId) return;

    const targetMod = modules.find((m) => m.id === targetModuleId);
    if (!targetMod) return;

    const position =
      currentDrop?.kind === "lesson" && currentDrop.lessonId === targetLessonId
        ? currentDrop.position
        : "after";

    if (active.sourceModuleId === targetModuleId) {
      const ids = targetMod.lessons.map((l) => l.id).filter((id) => id !== active.lessonId);
      let insertIdx = ids.indexOf(targetLessonId);
      if (insertIdx === -1) return;
      if (position === "after") insertIdx += 1;
      ids.splice(insertIdx, 0, active.lessonId);
      await onReorderLessons(targetModuleId, ids);
    } else {
      const targetIdsWithout = targetMod.lessons.map((l) => l.id);
      let insertIdx = targetIdsWithout.indexOf(targetLessonId);
      if (insertIdx === -1) insertIdx = targetIdsWithout.length;
      else if (position === "after") insertIdx += 1;
      onExpandModule(targetModuleId);
      await onMoveLessonToModule(active.lessonId, active.sourceModuleId, targetModuleId, insertIdx);
    }
  };

  // --- Accessible Button / Keyboard Move Helpers ---
  const moveModuleByStep = async (moduleId: string, delta: -1 | 1) => {
    if (isReordering) return;
    const ids = modules.map((m) => m.id);
    const idx = ids.indexOf(moduleId);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= ids.length) return;
    const next = [...ids];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    await onReorderModules(next);
  };

  const moveLessonByStep = async (moduleId: string, lessonId: string, delta: -1 | 1) => {
    if (isReordering) return;
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const ids = mod.lessons.map((l) => l.id);
    const idx = ids.indexOf(lessonId);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= ids.length) return;
    const next = [...ids];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    await onReorderLessons(moduleId, next);
  };

  const handleModuleKeyDown = (e: KeyboardEvent<HTMLDivElement>, moduleId: string) => {
    if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault();
      void moveModuleByStep(moduleId, -1);
    } else if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      void moveModuleByStep(moduleId, 1);
    }
  };

  const handleLessonKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    moduleId: string,
    lessonId: string
  ) => {
    if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault();
      void moveLessonByStep(moduleId, lessonId, -1);
    } else if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      void moveLessonByStep(moduleId, lessonId, 1);
    }
  };

  const submitCreateModule = async () => {
    const title = newModuleTitle.trim();
    if (!title || creatingModule) return;
    setCreatingModule(true);
    try {
      await onCreateModule(title);
      setNewModuleTitle("");
      setAddingModule(false);
    } finally {
      setCreatingModule(false);
    }
  };

  const submitCreateLesson = async (moduleId: string) => {
    const title = newLessonTitle.trim();
    if (!title || creatingLesson) return;
    setCreatingLesson(true);
    try {
      await onCreateLesson(moduleId, title);
      setNewLessonTitle("");
      setAddingLessonModuleId(null);
    } finally {
      setCreatingLesson(false);
    }
  };

  const isCoursePublished = course.status === "published";

  return (
    <div className="admin-card !rounded-[5px] overflow-hidden border border-[var(--admin-border)]">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--admin-border)] bg-[var(--admin-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)] flex items-center justify-center shrink-0">
              <FolderTree className="h-4 w-4 text-[var(--admin-primary)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold truncate text-[var(--admin-text)]">
                {course.title} — {t("courseTreeBuilder") || "Course Tree Builder"}
              </h3>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--admin-muted)] tabular-nums">
                <span>{stats.modules} {t("modules") || "modules"}</span>
                <span aria-hidden="true">·</span>
                <span>{stats.lessons} {t("lessons") || "lessons"}</span>
                <span aria-hidden="true">·</span>
                <span>{stats.topics} {t("topics") || "topics"}</span>
                <span aria-hidden="true">·</span>
                <span className={isCoursePublished ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                  {isCoursePublished ? (t("published") || "Published") : (t("draft") || "Draft")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {isReordering && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-primary)] font-medium px-2 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t("savingOrder") || "Saving order..."}</span>
              </span>
            )}

            {/* Segmented Mode Switcher: Tree Builder | Table */}
            <div
              className="inline-flex items-center p-0.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]"
              role="group"
              aria-label="Course structure view mode"
            >
              <button
                type="button"
                onClick={() => onViewModeChange("tree")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                  viewMode === "tree"
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-xs"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                )}
              >
                <FolderTree className="h-3.5 w-3.5" />
                <span>Tree Builder</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("table")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                  viewMode === "table"
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-xs"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                )}
              >
                <Table2 className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPreviewCourse}
              className="h-8 gap-1.5 text-xs whitespace-nowrap shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{t("preview") || "Preview"}</span>
            </Button>

            <Link href={`/Admin/course?tab=studio&courseId=${course.id}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs whitespace-nowrap shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>{t("openStudio") || "Open Studio"}</span>
              </Button>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] whitespace-nowrap shrink-0"
            >
              {t("close") || "Close"}
            </Button>
          </div>
        </div>

        {/* Tree Controls Row: Search, Expand/Collapse, Add Module, Drag Hint */}
        {viewMode === "tree" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[var(--admin-border)]/60">
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchCourseTree") || "Filter modules, lessons, or topics..."}
                  className="h-8 text-xs pl-8 pr-7 bg-[var(--admin-input-bg)] border-[var(--admin-border)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] text-[var(--admin-muted)] mr-1 hidden xl:inline">
                {isSearching
                  ? "Clear filter to drag and reorder"
                  : "Drag modules or lessons to reorder, or drop a lesson onto another module"}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExpandAll}
                disabled={modules.length === 0}
                className="h-8 gap-1 text-xs whitespace-nowrap shrink-0"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span>{t("expandAll") || "Expand All"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCollapseAll}
                disabled={modules.length === 0}
                className="h-8 gap-1 text-xs whitespace-nowrap shrink-0"
              >
                <ChevronsDownUp className="h-3.5 w-3.5" />
                <span>{t("collapseAll") || "Collapse All"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setAddingModule((prev) => !prev)}
                className="h-8 gap-1.5 text-xs whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("addModule") || "Add Module"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Inline Add Module Form */}
        {viewMode === "tree" && addingModule && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-[var(--admin-primary)]/40 bg-[var(--admin-primary)]/5">
            <Input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitCreateModule();
                } else if (e.key === "Escape") {
                  setAddingModule(false);
                }
              }}
              placeholder={t("newModuleTitlePlaceholder") || "New module title (creates Lesson 1 & Exam automatically)..."}
              autoFocus
              className="h-8 text-xs flex-1 bg-[var(--admin-card)] border-[var(--admin-border)]"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                disabled={!newModuleTitle.trim() || creatingModule}
                onClick={() => void submitCreateModule()}
                className="h-8 text-xs gap-1"
              >
                {creatingModule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>{t("create") || "Create"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddingModule(false)}
                className="h-8 text-xs"
              >
                {t("cancel") || "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-4 sm:p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--admin-border)] p-3.5 space-y-2.5">
              <div className="admin-skeleton h-5 w-64 rounded" />
              <div className="pl-6 space-y-2">
                <div className="admin-skeleton h-4 w-48 rounded" />
                <div className="admin-skeleton h-4 w-56 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && modules.length === 0 && (
        <div className="p-8 sm:p-10 text-center space-y-3">
          <FolderTree className="h-10 w-10 mx-auto text-[var(--admin-muted)] opacity-40" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--admin-text)]">
              {t("noModulesYet") || "No modules in this course yet"}
            </p>
            <p className="text-xs text-[var(--admin-muted)] max-w-md mx-auto">
              Create your first module to start organizing lessons in the hierarchical course tree.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddingModule(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("addFirstModule") || "Add First Module"}</span>
          </Button>
        </div>
      )}

      {/* Visual Tree View */}
      {!loading && modules.length > 0 && viewMode === "tree" && (
        <div className="p-4 sm:p-5 space-y-3">
          {/* Course Root Trunk Header */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/50">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className={cn("h-4 w-4 shrink-0", isCoursePublished ? "text-green-600 dark:text-green-400" : "text-[var(--admin-primary)]")} />
              <span className="text-xs sm:text-sm font-semibold text-[var(--admin-text)] truncate">
                {course.title}
              </span>
              <span className="text-xs text-[var(--admin-muted)] hidden sm:inline">
                ({course.language})
              </span>
            </div>
            <span className="text-[11px] text-[var(--admin-muted)] tabular-nums shrink-0">
              {stats.publishedModules}/{stats.modules} {t("published") || "published"}
            </span>
          </div>

          {filteredModules.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--admin-border)] rounded-lg space-y-2.5">
              <p className="text-xs text-[var(--admin-muted)]">
                No modules, lessons, or topics match &ldquo;{searchQuery}&rdquo;.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-7 text-xs"
              >
                Clear Filter
              </Button>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-6 border-l border-[var(--admin-border)] space-y-3 ml-3">
              {filteredModules.map((mod, modIdx) => {
                const modPublished = mod.status === "published";
                const isExpanded = isSearching || expandedModules.has(mod.id);
                const isDraggingThisMod =
                  dragItem?.type === "module" && dragItem.moduleId === mod.id;
                const isModDropBefore =
                  dropTarget?.kind === "module" &&
                  dropTarget.moduleId === mod.id &&
                  dropTarget.position === "before";
                const isModDropAfter =
                  dropTarget?.kind === "module" &&
                  dropTarget.moduleId === mod.id &&
                  dropTarget.position === "after";
                const isModDropInside =
                  dropTarget?.kind === "module" &&
                  dropTarget.moduleId === mod.id &&
                  dropTarget.position === "inside";

                const allLessonsPublished =
                  mod.lessons.length > 0 && mod.lessons.every((l) => l.status === "published");
                const allLessonsDraft =
                  mod.lessons.length > 0 && mod.lessons.every((l) => l.status === "draft");

                return (
                  <div key={mod.id} className="relative">
                    {/* Horizontal Tree Elbow Connector from Course Trunk to Module Node */}
                    <span
                      aria-hidden="true"
                      className="absolute -left-4 sm:-left-6 top-6 w-4 sm:w-6 h-px bg-[var(--admin-border)]"
                    />

                    {/* Drop indicator BEFORE module */}
                    {isModDropBefore && (
                      <div className="h-0.5 bg-[var(--admin-primary)] rounded-full mb-1.5 relative">
                        <span className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-[var(--admin-primary)]" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] transition-all",
                        isDraggingThisMod && "opacity-45 border-dashed",
                        isModDropInside && "ring-2 ring-[var(--admin-primary)] bg-[var(--admin-primary)]/5"
                      )}
                    >
                      {/* Module Header Row */}
                      <div
                        draggable={!dndDisabled}
                        onDragStart={(e) => handleModuleDragStart(e, mod.id)}
                        onDragOver={(e) => handleModuleDragOver(e, mod.id)}
                        onDrop={(e) => void handleModuleDrop(e, mod.id)}
                        onDragEnd={clearDragState}
                        onKeyDown={(e) => handleModuleKeyDown(e, mod.id)}
                        tabIndex={0}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 hover:bg-[var(--admin-hover-bg)]/60 rounded-t-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Drag Handle */}
                          <span
                            className={cn(
                              "inline-flex items-center justify-center p-1 rounded text-[var(--admin-muted)] shrink-0",
                              dndDisabled
                                ? "opacity-30 cursor-not-allowed"
                                : "cursor-grab active:cursor-grabbing hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                            )}
                            title={dndDisabled ? "Clear search to reorder" : "Drag module to reorder (or Alt+Up/Down)"}
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>

                          {/* Expand/Collapse Toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleModule(mod.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse module" : "Expand module"}
                            className="p-1 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] shrink-0 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          {/* Module Ordinal */}
                          <span className="text-xs font-mono tabular-nums text-[var(--admin-muted)] shrink-0">
                            {String(modIdx + 1).padStart(2, "0")}
                          </span>

                          <Layers
                            className={cn(
                              "h-4 w-4 shrink-0",
                              modPublished
                                ? "text-green-600 dark:text-green-400"
                                : "text-[var(--admin-primary)]"
                            )}
                          />

                          <button
                            type="button"
                            onClick={() => onToggleModule(mod.id)}
                            className="min-w-0 text-left flex-1 cursor-pointer"
                          >
                            <span className="block text-sm font-semibold text-[var(--admin-text)] truncate">
                              {mod.title}
                            </span>
                            <span className="flex items-center flex-wrap gap-x-1.5 text-[11px] text-[var(--admin-muted)] tabular-nums">
                              <span>{mod.lessons.length} {t("lessons") || "lessons"}</span>
                              <span aria-hidden="true">·</span>
                              <span className={modPublished ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                                {modPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
                              </span>
                              {isModDropInside && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[var(--admin-primary)] font-semibold">
                                    Drop to move lesson into this module
                                  </span>
                                </>
                              )}
                            </span>
                          </button>
                        </div>

                        {/* Module Actions */}
                        <div className="flex items-center flex-wrap gap-1 shrink-0 pl-8 sm:pl-0">
                          {!isSearching && (
                            <>
                              <button
                                type="button"
                                disabled={modIdx === 0 || isReordering}
                                onClick={() => void moveModuleByStep(mod.id, -1)}
                                title="Move module up"
                                aria-label="Move module up"
                                className="p-1.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={modIdx === modules.length - 1 || isReordering}
                                onClick={() => void moveModuleByStep(mod.id, 1)}
                                title="Move module down"
                                aria-label="Move module down"
                                className="p-1.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onExpandModule(mod.id);
                              setAddingLessonModuleId((prev) => (prev === mod.id ? null : mod.id));
                              setNewLessonTitle("");
                            }}
                            title={t("addLesson") || "Add Lesson"}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t("lesson") || "Lesson"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === mod.id}
                            onClick={() => onModuleStatusChange(mod.id, modPublished ? "draft" : "published")}
                            title={modPublished ? (t("draftModule") || "Move to Draft") : (t("publishModule") || "Publish Module")}
                            className={cn(
                              "p-1.5 rounded hover:bg-[var(--admin-hover-bg)] cursor-pointer",
                              modPublished
                                ? "text-green-600 dark:text-green-400"
                                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                            )}
                          >
                            {updatingId === mod.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : modPublished ? (
                              <Globe className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {mod.lessons.length > 0 && (
                            <>
                              <button
                                type="button"
                                disabled={updatingId === `all-${mod.id}` || allLessonsPublished}
                                onClick={() => onPublishAllLessons(mod.id)}
                                title={t("publishAllLessons") || "Publish All Lessons"}
                                className="p-1.5 rounded text-green-600 dark:text-green-400 hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 cursor-pointer"
                              >
                                {updatingId === `all-${mod.id}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === `all-${mod.id}` || allLessonsDraft}
                                onClick={() => onDraftAllLessons(mod.id)}
                                title={t("draftAllLessons") || "Draft All Lessons"}
                                className="p-1.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 cursor-pointer"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onPreviewModule(mod)}
                            title={t("preview") || "Preview"}
                            className="p-1.5 rounded text-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/10 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <Link
                            href={`/Admin/course?tab=studio&courseId=${course.id}`}
                            title={t("editInStudio") || "Edit in Course Studio"}
                            className="p-1.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Expanded Lessons Branch */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-[var(--admin-border)]/60">
                          {/* Inline Add Lesson Form */}
                          {addingLessonModuleId === mod.id && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 mb-2.5 rounded-md border border-[var(--admin-primary)]/40 bg-[var(--admin-primary)]/5">
                              <Input
                                value={newLessonTitle}
                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void submitCreateLesson(mod.id);
                                  } else if (e.key === "Escape") {
                                    setAddingLessonModuleId(null);
                                  }
                                }}
                                placeholder={t("newLessonTitlePlaceholder") || "New lesson title..."}
                                autoFocus
                                className="h-8 text-xs flex-1 bg-[var(--admin-card)] border-[var(--admin-border)]"
                              />
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!newLessonTitle.trim() || creatingLesson}
                                  onClick={() => void submitCreateLesson(mod.id)}
                                  className="h-8 text-xs gap-1"
                                >
                                  {creatingLesson ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span>{t("add") || "Add"}</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAddingLessonModuleId(null)}
                                  className="h-8 text-xs"
                                >
                                  {t("cancel") || "Cancel"}
                                </Button>
                              </div>
                            </div>
                          )}

                          {mod.lessons.length === 0 ? (
                            <div
                              onDragOver={(e) => {
                                const active = dragItemRef.current;
                                if (active?.type === "lesson" && !dndDisabled) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDropTarget({ kind: "module", moduleId: mod.id, position: "inside" });
                                }
                              }}
                              onDrop={(e) => void handleModuleDrop(e, mod.id)}
                              className={cn(
                                "ml-4 sm:ml-6 my-1 py-4 px-3 rounded-md border border-dashed text-center text-xs transition-colors",
                                isModDropInside
                                  ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] font-medium"
                                  : "border-[var(--admin-border)] text-[var(--admin-muted)]"
                              )}
                            >
                              {dragItem?.type === "lesson"
                                ? "Drop lesson here to add it to this module"
                                : (t("noLessonsYet") || "No lessons in this module yet.")}
                            </div>
                          ) : (
                            <div className="relative pl-4 sm:pl-6 ml-3 border-l border-[var(--admin-border)] space-y-1.5 pt-1">
                              {mod.lessons.map((lesson, lessonIdx) => {
                                const lessonPublished = lesson.status === "published";
                                const topics = parseLessonTopics(lesson.topics);
                                const hasTopics = topics.length > 0;
                                const isLessonExpanded = expandedLessons.has(lesson.id);
                                const hasVisualMedia = Boolean(getLessonThumbnail(lesson));
                                const isDraggingThisLesson =
                                  dragItem?.type === "lesson" && dragItem.lessonId === lesson.id;
                                const isLessonDropBefore =
                                  dropTarget?.kind === "lesson" &&
                                  dropTarget.lessonId === lesson.id &&
                                  dropTarget.position === "before";
                                const isLessonDropAfter =
                                  dropTarget?.kind === "lesson" &&
                                  dropTarget.lessonId === lesson.id &&
                                  dropTarget.position === "after";

                                return (
                                  <div key={lesson.id} className="relative">
                                    {/* Horizontal Tree Branch Connector */}
                                    <span
                                      aria-hidden="true"
                                      className="absolute -left-4 sm:-left-6 top-5 w-4 sm:w-6 h-px bg-[var(--admin-border)]"
                                    />

                                    {/* Drop indicator BEFORE lesson */}
                                    {isLessonDropBefore && (
                                      <div className="h-0.5 bg-[var(--admin-primary)] rounded-full my-1 relative">
                                        <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[var(--admin-primary)]" />
                                      </div>
                                    )}

                                    <div
                                      draggable={!dndDisabled}
                                      onDragStart={(e) => handleLessonDragStart(e, mod.id, lesson.id)}
                                      onDragOver={(e) => handleLessonDragOver(e, mod.id, lesson.id)}
                                      onDrop={(e) => void handleLessonDrop(e, mod.id, lesson.id)}
                                      onDragEnd={clearDragState}
                                      onKeyDown={(e) => handleLessonKeyDown(e, mod.id, lesson.id)}
                                      tabIndex={0}
                                      className={cn(
                                        "group flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 py-2 rounded-md border border-transparent hover:border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)]/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]",
                                        isDraggingThisLesson && "opacity-40 border-dashed border-[var(--admin-primary)]"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {/* Lesson Drag Handle */}
                                        <span
                                          className={cn(
                                            "inline-flex items-center justify-center p-1 rounded text-[var(--admin-muted)] shrink-0",
                                            dndDisabled
                                              ? "opacity-30 cursor-not-allowed"
                                              : "cursor-grab active:cursor-grabbing hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                                          )}
                                          title={
                                            dndDisabled
                                              ? "Clear search to reorder"
                                              : "Drag lesson within module or onto another module (or Alt+Up/Down)"
                                          }
                                        >
                                          <GripVertical className="h-3.5 w-3.5" />
                                        </span>

                                        {/* Topic Expand Button if Topics Exist */}
                                        {hasTopics ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleLessonTopics(lesson.id)}
                                            aria-expanded={isLessonExpanded}
                                            aria-label={isLessonExpanded ? "Hide topics" : "Show topics"}
                                            className="p-0.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] shrink-0 cursor-pointer"
                                          >
                                            {isLessonExpanded ? (
                                              <ChevronDown className="h-3.5 w-3.5" />
                                            ) : (
                                              <ChevronRight className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        ) : (
                                          <span className="w-4.5 shrink-0" aria-hidden="true" />
                                        )}

                                        {/* Lesson Ordinal */}
                                        <span className="text-[11px] font-mono tabular-nums text-[var(--admin-muted)] shrink-0">
                                          {modIdx + 1}.{lessonIdx + 1}
                                        </span>

                                        <FileText
                                          className={cn(
                                            "h-3.5 w-3.5 shrink-0",
                                            lessonPublished
                                              ? "text-green-600 dark:text-green-400"
                                              : "text-[var(--admin-muted)]"
                                          )}
                                        />

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs sm:text-[13px] font-medium text-[var(--admin-text)] truncate">
                                              {lesson.title}
                                            </span>
                                            {hasVisualMedia && (
                                              <ImageIcon
                                                className="h-3 w-3 text-[var(--admin-primary)] shrink-0"
                                                aria-label="Contains diagram or road sign image"
                                              />
                                            )}
                                          </div>
                                          <div className="flex items-center flex-wrap gap-x-1.5 text-[11px] text-[var(--admin-muted)] tabular-nums">
                                            <span>{topics.length} {t("topics") || "topics"}</span>
                                            <span aria-hidden="true">·</span>
                                            <span className={lessonPublished ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                                              {lessonPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Lesson Actions */}
                                      <div className="flex items-center gap-1 shrink-0 pl-8 sm:pl-0">
                                        {!isSearching && (
                                          <>
                                            <button
                                              type="button"
                                              disabled={lessonIdx === 0 || isReordering}
                                              onClick={() => void moveLessonByStep(mod.id, lesson.id, -1)}
                                              title="Move lesson up"
                                              aria-label="Move lesson up"
                                              className="p-1 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 cursor-pointer"
                                            >
                                              <ArrowUp className="h-3 w-3" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={lessonIdx === mod.lessons.length - 1 || isReordering}
                                              onClick={() => void moveLessonByStep(mod.id, lesson.id, 1)}
                                              title="Move lesson down"
                                              aria-label="Move lesson down"
                                              className="p-1 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 cursor-pointer"
                                            >
                                              <ArrowDown className="h-3 w-3" />
                                            </button>
                                          </>
                                        )}

                                        <button
                                          type="button"
                                          disabled={updatingId === lesson.id}
                                          onClick={() =>
                                            onLessonStatusChange(
                                              mod.id,
                                              lesson.id,
                                              lessonPublished ? "draft" : "published"
                                            )
                                          }
                                          title={
                                            lessonPublished
                                              ? t("draftLesson") || "Move to Draft"
                                              : t("publishLesson") || "Publish Lesson"
                                          }
                                          className={cn(
                                            "p-1 rounded hover:bg-[var(--admin-hover-bg)] cursor-pointer",
                                            lessonPublished
                                              ? "text-green-600 dark:text-green-400"
                                              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                                          )}
                                        >
                                          {updatingId === lesson.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : lessonPublished ? (
                                            <Globe className="h-3.5 w-3.5" />
                                          ) : (
                                            <Lock className="h-3.5 w-3.5" />
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => onPreviewLesson(mod, lesson)}
                                          title={t("preview") || "Preview"}
                                          className="p-1 rounded text-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/10 cursor-pointer"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Level 3: Topic Leaf Nodes */}
                                    {hasTopics && isLessonExpanded && (
                                      <div className="relative pl-5 sm:pl-7 ml-6 border-l border-[var(--admin-border)]/70 space-y-1 py-1">
                                        {topics.map((topic, tpIdx) => (
                                          <div
                                            key={topic.id}
                                            className="relative flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]/40"
                                          >
                                            <span
                                              aria-hidden="true"
                                              className="absolute -left-5 sm:-left-7 top-1/2 w-4 sm:w-6 h-px bg-[var(--admin-border)]/70"
                                            />
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="font-mono tabular-nums text-[10px] opacity-75 shrink-0">
                                                {modIdx + 1}.{lessonIdx + 1}.{tpIdx + 1}
                                              </span>
                                              <span className="truncate">{topic.title}</span>
                                            </div>
                                            {topic.estimated_minutes ? (
                                              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[10px] shrink-0">
                                                <Clock className="h-2.5 w-2.5" />
                                                {topic.estimated_minutes}m
                                              </span>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Drop indicator AFTER lesson */}
                                    {isLessonDropAfter && (
                                      <div className="h-0.5 bg-[var(--admin-primary)] rounded-full my-1 relative">
                                        <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[var(--admin-primary)]" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Drop indicator AFTER module */}
                    {isModDropAfter && (
                      <div className="h-0.5 bg-[var(--admin-primary)] rounded-full mt-1.5 relative">
                        <span className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-[var(--admin-primary)]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Table Mode Fallback View */}
      {!loading && modules.length > 0 && viewMode === "table" && tableContent}
    </div>
  );
}
