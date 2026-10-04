"use client";

import { mutate } from "swr";
import { toast } from "sonner";
import { Course, Module, Lesson, LessonTopic } from "@/lib/courses-store";
import type { TranslationJobRecord, TranslationStepLog } from "@/app/api/admin/courses/translation-jobs/route";

export type { TranslationJobRecord, TranslationStepLog };

type Listener = (jobs: TranslationJobRecord[]) => void;

const STORAGE_KEY = "navo_translation_jobs_cache_v1";
const STEP_TIMEOUT_MS = 180_000; // 3 minutes per step max to prevent infinite hangs

class TranslationQueueManager {
  private jobs: TranslationJobRecord[] = [];
  private listeners: Set<Listener> = new Set();
  private cancelledIds: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private loadedFromServer = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.jobs = parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
      this.syncFromServer();
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.jobs]);
    if (!this.loadedFromServer && typeof window !== "undefined") {
      this.syncFromServer();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs.slice(0, 60)));
      } catch {
        // ignore quota errors
      }
    }
    const snapshot = [...this.jobs];
    this.listeners.forEach((fn) => fn(snapshot));
  }

  public async syncFromServer(): Promise<TranslationJobRecord[]> {
    if (typeof window === "undefined") return this.jobs;
    try {
      const res = await fetch("/api/admin/courses/translation-jobs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs)) {
          this.loadedFromServer = true;
          const serverJobs: TranslationJobRecord[] = data.jobs;
          const localRunningMap = new Map<string, TranslationJobRecord>();
          for (const j of this.jobs) {
            if (j.status === "running" && this.abortControllers.has(j.id)) {
              localRunningMap.set(j.id, j);
            }
          }

          const merged: TranslationJobRecord[] = [];
          const seen = new Set<string>();

          for (const rj of localRunningMap.values()) {
            merged.push(rj);
            seen.add(rj.id);
          }

          for (const sj of serverJobs) {
            if (!seen.has(sj.id)) {
              // If server says running, but it's not actively running in our browser memory and hasn't updated in > 2 minutes, mark cancelled/interrupted so user can click Continue
              if (
                sj.status === "running" &&
                !this.abortControllers.has(sj.id) &&
                Date.now() - new Date(sj.updatedAt || sj.startedAt).getTime() > 2 * 60 * 1000
              ) {
                sj.status = "cancelled";
                sj.currentStepMessage = "Translation paused / interrupted — click Continue to resume";
              }
              merged.push(sj);
              seen.add(sj.id);
            }
          }

          this.jobs = merged.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
          this.notify();
        }
      }
    } catch {
      // ignore network error
    }
    return this.jobs;
  }

  private async persistJobToServer(job: TranslationJobRecord) {
    if (typeof window === "undefined") return;
    try {
      await fetch("/api/admin/courses/translation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      });
    } catch {
      // ignore persistence error
    }
  }

  public getJobs(): TranslationJobRecord[] {
    return [...this.jobs];
  }

  public cancelJob(jobId: string) {
    this.cancelledIds.add(jobId);
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      try {
        controller.abort();
      } catch {}
      this.abortControllers.delete(jobId);
    }
    const job = this.jobs.find((j) => j.id === jobId);
    if (job && job.status === "running") {
      job.status = "cancelled";
      job.currentStepMessage = "Paused / Cancelled — click Continue to resume from where it stopped";
      job.completedAt = new Date().toISOString();
      job.durationMs = Date.now() - new Date(job.startedAt).getTime();
      this.notify();
      this.persistJobToServer(job);
      toast.info(`Translation paused: ${job.scopeTitle}. You can continue anytime.`);
    }
  }

  public async deleteJob(jobId: string) {
    this.cancelledIds.add(jobId);
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      try {
        controller.abort();
      } catch {}
      this.abortControllers.delete(jobId);
    }
    this.jobs = this.jobs.filter((j) => j.id !== jobId);
    this.notify();
    try {
      await fetch("/api/admin/courses/translation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", jobId }),
      });
    } catch {
      // ignore
    }
  }

  public async clearCompletedJobs() {
    this.jobs = this.jobs.filter((j) => j.status === "running");
    this.notify();
    try {
      await fetch("/api/admin/courses/translation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_completed" }),
      });
    } catch {
      // ignore
    }
  }

  private updateJobState(jobId: string, updater: (job: TranslationJobRecord) => void, persist = false) {
    const idx = this.jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return;
    const job: TranslationJobRecord = {
      ...this.jobs[idx],
      steps: [...this.jobs[idx].steps],
      stats: { ...this.jobs[idx].stats },
      checkpoint: this.jobs[idx].checkpoint ? { ...this.jobs[idx].checkpoint! } : undefined,
    };
    updater(job);
    job.updatedAt = new Date().toISOString();
    job.durationMs = Date.now() - new Date(job.startedAt).getTime();
    this.jobs[idx] = job;
    this.notify();
    if (persist) {
      this.persistJobToServer(job);
    }
  }

  private async fetchTranslateStep(jobId: string, payload: Record<string, any>) {
    const MAX_STEP_ATTEMPTS = 2;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= MAX_STEP_ATTEMPTS; attempt++) {
      const jobController = this.abortControllers.get(jobId);
      const stepController = new AbortController();

      const onJobAbort = () => stepController.abort();
      if (jobController) {
        if (jobController.signal.aborted || this.cancelledIds.has(jobId)) {
          throw new Error("CANCELLED_BY_USER");
        }
        jobController.signal.addEventListener("abort", onJobAbort, { once: true });
      }

      const timer = setTimeout(() => {
        stepController.abort();
      }, STEP_TIMEOUT_MS);

      try {
        const res = await fetch("/api/admin/courses/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: stepController.signal,
        });
        const data = await this.safeParseResponse(res);
        if (!res.ok && attempt < MAX_STEP_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return { res, data };
      } catch (err: any) {
        lastErr = err;
        if (this.cancelledIds.has(jobId) || jobController?.signal.aborted || err?.message === "CANCELLED_BY_USER") {
          throw new Error("CANCELLED_BY_USER");
        }
        if (attempt < MAX_STEP_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (err?.name === "AbortError") {
          throw new Error("Step timed out after 3 minutes. Click Continue to resume.");
        }
        throw err;
      } finally {
        clearTimeout(timer);
        if (jobController) {
          jobController.signal.removeEventListener("abort", onJobAbort);
        }
      }
    }

    throw lastErr || new Error("Translation step failed");
  }

  private async safeParseResponse(res: Response) {
    const rawText = await res.text();
    try {
      return JSON.parse(rawText);
    } catch {
      const preview = rawText
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140);
      throw new Error(
        res.status === 504 || rawText.includes("timeout") || rawText.includes("An error occurred")
          ? `Server timeout (${res.status}): ${preview || "Request took too long."}`
          : `Server returned non-JSON response (${res.status}): ${preview || "Unknown error"}`
      );
    }
  }

  private getLanguageLabel(lang: string) {
    if (lang === "French") return "Français";
    if (lang === "Kinyarwanda") return "Kinyarwanda";
    return "English";
  }

  private invalidateCourseCaches(onReloadCourses?: (targetCourseId?: string) => void, targetCourseId?: string) {
    mutate("admin/courses");
    mutate((key) => typeof key === "string" && (key.startsWith("admin/course") || key.includes("courses")));
    if (onReloadCourses && targetCourseId) {
      onReloadCourses(targetCourseId);
    }
  }

  private calculateTotalSteps(
    type: "course" | "module" | "lesson" | "topic",
    sourceCourse: Course,
    activeModule?: Module | null,
    activeLesson?: Lesson | null
  ): number {
    if (type === "topic") return 1;
    if (type === "lesson" && activeLesson) {
      const tCount = activeLesson.topics?.length || 0;
      return Math.max(1, 1 + tCount); // 1 lesson_meta + each topic
    }
    if (type === "module" && activeModule) {
      const lessons = activeModule.lessons || [];
      let steps = 1; // module_meta
      for (const l of lessons) {
        const tc = l.topics?.length || 0;
        steps += 1 + tc; // 1 lesson_meta + each topic
      }
      return Math.max(1, steps);
    }
    if (type === "course") {
      const modules = sourceCourse.modules || [];
      let steps = 0;
      for (const m of modules) {
        steps += 1; // module_meta
        for (const l of m.lessons || []) {
          const tc = l.topics?.length || 0;
          steps += 1 + tc; // 1 lesson_meta + each topic
        }
      }
      return Math.max(1, steps);
    }
    return 1;
  }

  /**
   * Enqueue and immediately start a background translation job (Topic, Lesson, Module, or Whole Course).
   */
  public startTranslationJob(params: {
    type: "course" | "module" | "lesson" | "topic";
    sourceCourse: Course;
    targetCourse?: Course;
    targetLang: "English" | "French" | "Kinyarwanda";
    activeModule?: Module | null;
    activeLesson?: Lesson | null;
    activeTopic?: LessonTopic | null;
    moduleIndex?: number;
    lessonIndex?: number;
    topicIndex?: number;
    onReloadCourses?: (targetCourseId?: string) => void;
    onSelectCourse?: (courseId: string) => void;
    onViewTranslationTab?: () => void;
  }): TranslationJobRecord {
    const {
      type,
      sourceCourse,
      targetCourse,
      targetLang,
      activeModule,
      activeLesson,
      activeTopic,
      moduleIndex = 0,
      lessonIndex = 0,
      topicIndex = 0,
      onViewTranslationTab,
    } = params;

    const jobId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    let scopeTitle = sourceCourse.title;
    if (type === "topic" && activeTopic) {
      scopeTitle = activeTopic.title;
    } else if (type === "lesson" && activeLesson) {
      scopeTitle = activeLesson.title;
    } else if (type === "module" && activeModule) {
      scopeTitle = activeModule.title;
    } else if (type === "course") {
      scopeTitle = `${sourceCourse.title} (${sourceCourse.language} → ${targetLang})`;
    }

    const totalSteps = this.calculateTotalSteps(type, sourceCourse, activeModule, activeLesson);

    const newJob: TranslationJobRecord = {
      id: jobId,
      type,
      sourceLang: sourceCourse.language,
      targetLang,
      sourceCourseId: sourceCourse.id,
      targetCourseId: targetCourse?.id,
      scopeTitle,
      moduleTitle: activeModule?.title,
      lessonTitle: activeLesson?.title,
      topicTitle: activeTopic?.title,
      moduleIndex,
      lessonIndex,
      topicIndex,
      checkpoint: {
        moduleIndex: type === "course" ? 0 : moduleIndex,
        lessonIndex: type === "course" || type === "module" ? 0 : lessonIndex,
        topicIndex: type === "topic" ? topicIndex : 0,
      },
      status: "running",
      progressPercent: 0,
      completedSteps: 0,
      totalSteps,
      currentStepMessage: `Starting ${type} translation to ${this.getLanguageLabel(targetLang)} in background...`,
      startedAt: now,
      updatedAt: now,
      stats: {
        modulesTranslated: 0,
        lessonsTranslated: 0,
        topicsTranslated: 0,
        failedItems: 0,
      },
      steps: [],
    };

    this.cancelledIds.delete(jobId);
    this.abortControllers.set(jobId, new AbortController());
    this.jobs.unshift(newJob);
    this.notify();
    this.persistJobToServer(newJob);

    toast.info(
      `Background translation started: "${scopeTitle}" → ${this.getLanguageLabel(targetLang)}`,
      {
        description: "Running in background. Check the Translation tab for live progress and detailed report.",
        duration: 6000,
        action: onViewTranslationTab
          ? {
              label: "View Progress",
              onClick: onViewTranslationTab,
            }
          : undefined,
      }
    );

    this.runJobInternal(newJob.id, params).catch((err) => {
      console.error("Background translation unhandled error:", err);
    });

    return newJob;
  }

  /**
   * Resumes a cancelled or failed translation job from its exact checkpoint without re-translating already finished lessons/topics.
   */
  public resumeTranslationJob(
    jobId: string,
    params: {
      sourceCourse: Course;
      targetCourse: Course;
      onReloadCourses?: (targetCourseId?: string) => void;
      onViewTranslationTab?: () => void;
    }
  ): TranslationJobRecord | null {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    const { sourceCourse, targetCourse, onReloadCourses, onViewTranslationTab } = params;
    const modIdx = job.checkpoint?.moduleIndex ?? job.moduleIndex ?? 0;
    const lesIdx = job.checkpoint?.lessonIndex ?? job.lessonIndex ?? 0;
    const topIdx = job.checkpoint?.topicIndex ?? job.topicIndex ?? 0;

    const activeModule =
      sourceCourse.modules?.[modIdx] ||
      sourceCourse.modules?.find((m) => m.title === job.moduleTitle) ||
      sourceCourse.modules?.[0] ||
      null;
    const activeLesson =
      activeModule?.lessons?.[lesIdx] ||
      activeModule?.lessons?.find((l) => l.title === job.lessonTitle) ||
      activeModule?.lessons?.[0] ||
      null;
    const activeTopic =
      activeLesson?.topics?.[topIdx] ||
      activeLesson?.topics?.find((t) => t.title === job.topicTitle) ||
      activeLesson?.topics?.[0] ||
      null;

    this.cancelledIds.delete(jobId);
    this.abortControllers.set(jobId, new AbortController());

    const totalSteps = this.calculateTotalSteps(job.type, sourceCourse, activeModule, activeLesson);

    this.updateJobState(
      jobId,
      (j) => {
        j.status = "running";
        j.error = undefined;
        j.completedAt = undefined;
        j.totalSteps = Math.max(j.totalSteps, totalSteps);
        j.currentStepMessage = `Resuming ${j.type} translation into ${this.getLanguageLabel(j.targetLang)}...`;
      },
      true
    );

    toast.info(`Resuming translation: "${job.scopeTitle}"`, {
      description: "Continuing from the last completed step in background.",
      duration: 5000,
    });

    this.runJobInternal(
      jobId,
      {
        type: job.type,
        sourceCourse,
        targetCourse,
        targetLang: job.targetLang as "English" | "French" | "Kinyarwanda",
        activeModule,
        activeLesson,
        activeTopic,
        moduleIndex: job.moduleIndex ?? modIdx,
        lessonIndex: job.lessonIndex ?? lesIdx,
        topicIndex: job.topicIndex ?? topIdx,
        onReloadCourses,
        onViewTranslationTab,
      },
      true
    ).catch((err) => {
      console.error("Resume translation unhandled error:", err);
    });

    return this.jobs.find((j) => j.id === jobId) || null;
  }

  private async runJobInternal(
    jobId: string,
    params: {
      type: "course" | "module" | "lesson" | "topic";
      sourceCourse: Course;
      targetCourse?: Course;
      targetLang: "English" | "French" | "Kinyarwanda";
      activeModule?: Module | null;
      activeLesson?: Lesson | null;
      activeTopic?: LessonTopic | null;
      moduleIndex?: number;
      lessonIndex?: number;
      topicIndex?: number;
      onReloadCourses?: (targetCourseId?: string) => void;
      onSelectCourse?: (courseId: string) => void;
      onViewTranslationTab?: () => void;
    },
    isResuming = false
  ) {
    const {
      type,
      sourceCourse,
      targetCourse,
      targetLang,
      activeModule,
      activeLesson,
      activeTopic,
      moduleIndex = 0,
      lessonIndex = 0,
      topicIndex = 0,
      onReloadCourses,
      onViewTranslationTab,
    } = params;

    const isCancelled = () => this.cancelledIds.has(jobId);

    const recordStep = (
      step: Omit<TranslationStepLog, "id" | "timestamp">,
      incrementCompleted = true,
      persist = true
    ) => {
      this.updateJobState(
        jobId,
        (job) => {
          const entry: TranslationStepLog = {
            ...step,
            id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
          };
          job.steps.push(entry);
          if (incrementCompleted && (step.status === "completed" || step.status === "failed")) {
            job.completedSteps = Math.min(job.totalSteps, job.completedSteps + 1);
            job.progressPercent = Math.min(
              99,
              Math.round((job.completedSteps / Math.max(1, job.totalSteps)) * 100)
            );
          }
          if (step.status === "failed") {
            job.stats.failedItems += 1;
          }
        },
        persist
      );
    };

    const currentJob = this.jobs.find((j) => j.id === jobId);
    const resumeModIdx = isResuming ? (currentJob?.checkpoint?.moduleIndex ?? 0) : 0;
    const resumeLesIdx = isResuming ? (currentJob?.checkpoint?.lessonIndex ?? 0) : 0;
    const resumeTopIdx = isResuming ? (currentJob?.checkpoint?.topicIndex ?? 0) : 0;

    try {
      // =========================================================================
      // CASE 1: TOPIC TRANSLATION
      // =========================================================================
      if (type === "topic" && activeTopic) {
        const stepStart = Date.now();
        this.updateJobState(jobId, (j) => {
          j.currentStepMessage = `Translating topic "${activeTopic.title}"...`;
        });

        const { res, data } = await this.fetchTranslateStep(jobId, {
          type: "topic",
          sourceLang: sourceCourse.language,
          targetLang,
          topic: {
            id: activeTopic.id,
            title: activeTopic.title,
            content: activeTopic.content,
          },
          saveToDatabase: Boolean(targetCourse),
          targetCourseId: targetCourse?.id,
          sourceCourseId: sourceCourse.id,
          sourceModuleIndex: Math.max(0, moduleIndex),
          sourceLessonIndex: Math.max(0, lessonIndex),
          sourceTopicIndex: Math.max(0, topicIndex),
          sourceModuleTitle: activeModule?.title || undefined,
          sourceModuleDescription: activeModule?.description || undefined,
          sourceLessonTitle: activeLesson?.title || undefined,
        });

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Topic translation failed");
        }

        const translatedTitle = data.translatedTopic?.title || activeTopic.title;
        recordStep({
          itemType: "topic",
          sourceTitle: activeTopic.title,
          translatedTitle,
          moduleTitle: activeModule?.title,
          lessonTitle: activeLesson?.title,
          status: "completed",
          durationMs: Date.now() - stepStart,
        });

        this.updateJobState(
          jobId,
          (j) => {
            j.stats.topicsTranslated += 1;
            j.status = "completed";
            j.progressPercent = 100;
            j.completedSteps = j.totalSteps;
            j.completedAt = new Date().toISOString();
            j.currentStepMessage = `Topic "${translatedTitle}" translated into ${this.getLanguageLabel(targetLang)}!`;
          },
          true
        );

        this.abortControllers.delete(jobId);
        this.invalidateCourseCaches(onReloadCourses, targetCourse?.id);
        toast.success(`Background translation complete: "${translatedTitle}"`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }

      // =========================================================================
      // CASE 2: LESSON TRANSLATION (Always lesson_meta + topic-by-topic)
      // =========================================================================
      if (type === "lesson" && activeLesson && targetCourse) {
        const topicsList = Array.isArray(activeLesson.topics) ? activeLesson.topics : [];
        let targetModId = isResuming ? currentJob?.checkpoint?.targetModuleId : undefined;
        let targetLesId = isResuming ? currentJob?.checkpoint?.targetLessonId : undefined;
        let transModTitle = isResuming ? currentJob?.checkpoint?.translatedModuleTitle : activeModule?.title;
        let transLesTitle = isResuming ? currentJob?.checkpoint?.translatedLessonTitle : activeLesson.title;

        if (!isResuming || resumeTopIdx === 0 || !targetLesId) {
          const metaStart = Date.now();
          this.updateJobState(jobId, (j) => {
            j.currentStepMessage = `Translating lesson header "${activeLesson.title}"...`;
            j.checkpoint = {
              moduleIndex: Math.max(0, moduleIndex),
              lessonIndex: Math.max(0, lessonIndex),
              topicIndex: 0,
            };
          });

          const { res: metaRes, data: metaData } = await this.fetchTranslateStep(jobId, {
            type: "lesson_meta",
            sourceLang: sourceCourse.language,
            targetLang,
            lesson: {
              id: activeLesson.id,
              title: activeLesson.title,
              content_type: (activeLesson as any).content_type || "rich_text",
            },
            saveToDatabase: true,
            targetCourseId: targetCourse.id,
            sourceCourseId: sourceCourse.id,
            sourceModuleIndex: Math.max(0, moduleIndex),
            sourceLessonIndex: Math.max(0, lessonIndex),
            sourceModuleTitle: activeModule?.title || undefined,
            sourceModuleDescription: activeModule?.description || undefined,
          });

          if (!metaRes.ok || !metaData.success) {
            throw new Error(metaData.error || `Failed translating lesson header "${activeLesson.title}"`);
          }

          targetModId = metaData.targetModuleId;
          targetLesId = metaData.targetLessonId;
          transModTitle = metaData.translatedModuleTitle || activeModule?.title;
          transLesTitle = metaData.translatedLessonTitle || activeLesson.title;

          recordStep({
            itemType: "lesson",
            sourceTitle: activeLesson.title,
            translatedTitle: transLesTitle,
            moduleTitle: transModTitle,
            status: "completed",
            durationMs: Date.now() - metaStart,
          });
        }

        const startTopic = isResuming ? resumeTopIdx : 0;
        for (let tIdx = startTopic; tIdx < topicsList.length; tIdx++) {
          if (isCancelled()) return;
          const tp = topicsList[tIdx];
          const stepStart = Date.now();

          this.updateJobState(
            jobId,
            (j) => {
              j.currentStepMessage = `Lesson "${transLesTitle}" • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
              j.checkpoint = {
                moduleIndex: Math.max(0, moduleIndex),
                lessonIndex: Math.max(0, lessonIndex),
                topicIndex: tIdx,
                targetModuleId: targetModId,
                targetLessonId: targetLesId,
                translatedModuleTitle: transModTitle,
                translatedLessonTitle: transLesTitle,
              };
            },
            true
          );

          const { res, data } = await this.fetchTranslateStep(jobId, {
            type: "topic",
            sourceLang: sourceCourse.language,
            targetLang,
            topic: {
              id: tp.id,
              title: tp.title,
              content: tp.content,
            },
            saveToDatabase: true,
            targetCourseId: targetCourse.id,
            sourceCourseId: sourceCourse.id,
            targetModuleId: targetModId,
            targetLessonId: targetLesId,
            translatedModuleTitle: transModTitle,
            translatedLessonTitle: transLesTitle,
            sourceModuleIndex: Math.max(0, moduleIndex),
            sourceLessonIndex: Math.max(0, lessonIndex),
            sourceTopicIndex: tIdx,
            sourceModuleTitle: activeModule?.title || undefined,
            sourceModuleDescription: activeModule?.description || undefined,
            sourceLessonTitle: activeLesson.title,
          });

          if (!res.ok || !data.success) {
            recordStep({
              itemType: "topic",
              sourceTitle: tp.title,
              moduleTitle: transModTitle,
              lessonTitle: transLesTitle,
              status: "failed",
              durationMs: Date.now() - stepStart,
              error: data.error || `Failed translating topic "${tp.title}"`,
            });
            throw new Error(data.error || `Failed on topic "${tp.title}"`);
          }

          recordStep({
            itemType: "topic",
            sourceTitle: tp.title,
            translatedTitle: data.translatedTopic?.title || tp.title,
            moduleTitle: transModTitle,
            lessonTitle: transLesTitle,
            status: "completed",
            durationMs: Date.now() - stepStart,
          });

          this.updateJobState(
            jobId,
            (j) => {
              j.stats.topicsTranslated += 1;
              j.checkpoint = {
                moduleIndex: Math.max(0, moduleIndex),
                lessonIndex: Math.max(0, lessonIndex),
                topicIndex: tIdx + 1,
                targetModuleId: targetModId,
                targetLessonId: targetLesId,
                translatedModuleTitle: transModTitle,
                translatedLessonTitle: transLesTitle,
              };
            },
            true
          );
        }

        this.updateJobState(
          jobId,
          (j) => {
            j.stats.lessonsTranslated += 1;
            j.status = "completed";
            j.progressPercent = 100;
            j.completedSteps = j.totalSteps;
            j.completedAt = new Date().toISOString();
            j.currentStepMessage = `Lesson "${transLesTitle}" translated into ${this.getLanguageLabel(targetLang)}!`;
          },
          true
        );

        this.abortControllers.delete(jobId);
        this.invalidateCourseCaches(onReloadCourses, targetCourse.id);
        toast.success(`Background translation complete: Lesson "${transLesTitle}"`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }

      // =========================================================================
      // CASE 3: MODULE TRANSLATION (module_meta -> each lesson_meta -> each topic)
      // =========================================================================
      if (type === "module" && activeModule && targetCourse) {
        const modIdx = Math.max(0, moduleIndex);
        const lessonsList = Array.isArray(activeModule.lessons) ? activeModule.lessons : [];
        let targetModId = isResuming ? currentJob?.checkpoint?.targetModuleId : undefined;
        let transModTitle = isResuming ? (currentJob?.checkpoint?.translatedModuleTitle || activeModule.title) : activeModule.title;

        if (!isResuming || (resumeLesIdx === 0 && resumeTopIdx === 0 && !targetModId)) {
          const metaStart = Date.now();
          this.updateJobState(jobId, (j) => {
            j.currentStepMessage = `Translating module header "${activeModule.title}"...`;
            j.checkpoint = {
              moduleIndex: modIdx,
              lessonIndex: 0,
              topicIndex: 0,
            };
          });

          const { res: metaRes, data: metaData } = await this.fetchTranslateStep(jobId, {
            type: "module_meta",
            sourceLang: sourceCourse.language,
            targetLang,
            module: {
              id: activeModule.id,
              title: activeModule.title,
              description: activeModule.description,
            },
            saveToDatabase: true,
            targetCourseId: targetCourse.id,
            sourceCourseId: sourceCourse.id,
            sourceModuleIndex: modIdx,
          });

          if (!metaRes.ok || !metaData.success) {
            throw new Error(metaData.error || "Module header translation failed");
          }

          targetModId = metaData.targetModuleId;
          transModTitle = metaData.translatedModuleTitle || activeModule.title;

          recordStep({
            itemType: "module",
            sourceTitle: activeModule.title,
            translatedTitle: transModTitle,
            status: "completed",
            durationMs: Date.now() - metaStart,
          });

          this.updateJobState(
            jobId,
            (j) => {
              j.stats.modulesTranslated += 1;
              j.checkpoint = {
                moduleIndex: modIdx,
                lessonIndex: 0,
                topicIndex: 0,
                targetModuleId: targetModId,
                translatedModuleTitle: transModTitle,
              };
            },
            true
          );
        }

        const startLesson = isResuming ? resumeLesIdx : 0;
        for (let lIdx = startLesson; lIdx < lessonsList.length; lIdx++) {
          if (isCancelled()) return;
          const les = lessonsList[lIdx];
          const topicsList = Array.isArray(les.topics) ? les.topics : [];
          const isResumingMidLesson = isResuming && lIdx === startLesson && resumeTopIdx > 0;

          let targetLesId = isResumingMidLesson ? currentJob?.checkpoint?.targetLessonId : undefined;
          let transLesTitle = isResumingMidLesson
            ? (currentJob?.checkpoint?.translatedLessonTitle || les.title)
            : les.title;

          if (!isResumingMidLesson || !targetLesId) {
            const lesMetaStart = Date.now();
            this.updateJobState(
              jobId,
              (j) => {
                j.currentStepMessage = `Module "${transModTitle}" • Preparing Lesson ${lIdx + 1}/${lessonsList.length}: "${les.title}"...`;
                j.checkpoint = {
                  moduleIndex: modIdx,
                  lessonIndex: lIdx,
                  topicIndex: 0,
                  targetModuleId: targetModId,
                  translatedModuleTitle: transModTitle,
                };
              },
              true
            );

            const { res: lesMetaRes, data: lesMetaData } = await this.fetchTranslateStep(jobId, {
              type: "lesson_meta",
              sourceLang: sourceCourse.language,
              targetLang,
              lesson: {
                id: les.id,
                title: les.title,
                content_type: (les as any).content_type || "rich_text",
              },
              saveToDatabase: true,
              targetCourseId: targetCourse.id,
              sourceCourseId: sourceCourse.id,
              targetModuleId: targetModId,
              translatedModuleTitle: transModTitle,
              sourceModuleIndex: modIdx,
              sourceLessonIndex: lIdx,
              sourceModuleTitle: activeModule.title,
              sourceModuleDescription: activeModule.description,
            });

            if (!lesMetaRes.ok || !lesMetaData.success) {
              recordStep({
                itemType: "lesson",
                sourceTitle: les.title,
                moduleTitle: transModTitle,
                status: "failed",
                durationMs: Date.now() - lesMetaStart,
                error: lesMetaData.error || `Failed translating lesson header "${les.title}"`,
              });
              throw new Error(lesMetaData.error || `Failed translating lesson header "${les.title}"`);
            }

            targetModId = lesMetaData.targetModuleId || targetModId;
            targetLesId = lesMetaData.targetLessonId;
            transLesTitle = lesMetaData.translatedLessonTitle || les.title;

            recordStep({
              itemType: "lesson",
              sourceTitle: les.title,
              translatedTitle: transLesTitle,
              moduleTitle: transModTitle,
              status: "completed",
              durationMs: Date.now() - lesMetaStart,
            });
          }

          const startTopic = isResumingMidLesson ? resumeTopIdx : 0;
          for (let tIdx = startTopic; tIdx < topicsList.length; tIdx++) {
            if (isCancelled()) return;
            const tp = topicsList[tIdx];
            const stepStart = Date.now();

            this.updateJobState(
              jobId,
              (j) => {
                j.currentStepMessage = `Lesson ${lIdx + 1}/${lessonsList.length} ("${transLesTitle}") • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
                j.checkpoint = {
                  moduleIndex: modIdx,
                  lessonIndex: lIdx,
                  topicIndex: tIdx,
                  targetModuleId: targetModId,
                  targetLessonId: targetLesId,
                  translatedModuleTitle: transModTitle,
                  translatedLessonTitle: transLesTitle,
                };
              },
              true
            );

            const { res: tpRes, data: tpData } = await this.fetchTranslateStep(jobId, {
              type: "topic",
              sourceLang: sourceCourse.language,
              targetLang,
              topic: {
                id: tp.id,
                title: tp.title,
                content: tp.content,
              },
              saveToDatabase: true,
              targetCourseId: targetCourse.id,
              sourceCourseId: sourceCourse.id,
              targetModuleId: targetModId,
              targetLessonId: targetLesId,
              translatedModuleTitle: transModTitle,
              translatedLessonTitle: transLesTitle,
              sourceModuleIndex: modIdx,
              sourceLessonIndex: lIdx,
              sourceTopicIndex: tIdx,
              sourceModuleTitle: activeModule.title,
              sourceModuleDescription: activeModule.description,
              sourceLessonTitle: les.title,
            });

            if (!tpRes.ok || !tpData.success) {
              recordStep({
                itemType: "topic",
                sourceTitle: tp.title,
                moduleTitle: transModTitle,
                lessonTitle: transLesTitle,
                status: "failed",
                durationMs: Date.now() - stepStart,
                error: tpData.error || `Failed translating topic "${tp.title}"`,
              });
              throw new Error(tpData.error || `Failed translating topic "${tp.title}"`);
            }

            recordStep({
              itemType: "topic",
              sourceTitle: tp.title,
              translatedTitle: tpData.translatedTopic?.title || tp.title,
              moduleTitle: transModTitle,
              lessonTitle: transLesTitle,
              status: "completed",
              durationMs: Date.now() - stepStart,
            });

            this.updateJobState(
              jobId,
              (j) => {
                j.stats.topicsTranslated += 1;
                j.checkpoint = {
                  moduleIndex: modIdx,
                  lessonIndex: lIdx,
                  topicIndex: tIdx + 1,
                  targetModuleId: targetModId,
                  targetLessonId: targetLesId,
                  translatedModuleTitle: transModTitle,
                  translatedLessonTitle: transLesTitle,
                };
              },
              true
            );
          }

          this.updateJobState(
            jobId,
            (j) => {
              j.stats.lessonsTranslated += 1;
              j.checkpoint = {
                moduleIndex: modIdx,
                lessonIndex: lIdx + 1,
                topicIndex: 0,
                targetModuleId: targetModId,
                translatedModuleTitle: transModTitle,
              };
            },
            true
          );
        }

        this.updateJobState(
          jobId,
          (j) => {
            j.status = "completed";
            j.progressPercent = 100;
            j.completedSteps = j.totalSteps;
            j.completedAt = new Date().toISOString();
            j.currentStepMessage = `Module "${transModTitle}" (${lessonsList.length} lessons) translated into ${this.getLanguageLabel(targetLang)}!`;
          },
          true
        );

        this.abortControllers.delete(jobId);
        this.invalidateCourseCaches(onReloadCourses, targetCourse.id);
        toast.success(`Background translation complete: Module "${transModTitle}"`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }

      // =========================================================================
      // CASE 4: WHOLE COURSE TRANSLATION (module_meta -> lesson_meta -> each topic)
      // =========================================================================
      if (type === "course" && targetCourse) {
        const modulesList = Array.isArray(sourceCourse.modules) ? sourceCourse.modules : [];
        const startModule = isResuming ? resumeModIdx : 0;

        for (let mIdx = startModule; mIdx < modulesList.length; mIdx++) {
          if (isCancelled()) return;
          const mod = modulesList[mIdx];
          const isResumingMidModule = isResuming && mIdx === startModule && (resumeLesIdx > 0 || resumeTopIdx > 0);

          let targetModId = isResumingMidModule ? currentJob?.checkpoint?.targetModuleId : undefined;
          let transModTitle = isResumingMidModule
            ? (currentJob?.checkpoint?.translatedModuleTitle || mod.title)
            : mod.title;

          if (!isResumingMidModule || !targetModId) {
            const metaStart = Date.now();
            this.updateJobState(
              jobId,
              (j) => {
                j.currentStepMessage = `Module ${mIdx + 1}/${modulesList.length}: "${mod.title}"...`;
                j.checkpoint = {
                  moduleIndex: mIdx,
                  lessonIndex: 0,
                  topicIndex: 0,
                };
              },
              true
            );

            const { res: metaRes, data: metaData } = await this.fetchTranslateStep(jobId, {
              type: "module_meta",
              sourceLang: sourceCourse.language,
              targetLang,
              module: {
                id: mod.id,
                title: mod.title,
                description: mod.description,
              },
              saveToDatabase: true,
              targetCourseId: targetCourse.id,
              sourceCourseId: sourceCourse.id,
              sourceModuleIndex: mIdx,
            });

            if (!metaRes.ok || !metaData.success) {
              recordStep({
                itemType: "module",
                sourceTitle: mod.title,
                status: "failed",
                durationMs: Date.now() - metaStart,
                error: metaData.error || `Failed on module "${mod.title}"`,
              });
              throw new Error(metaData.error || `Failed on module "${mod.title}"`);
            }

            targetModId = metaData.targetModuleId;
            transModTitle = metaData.translatedModuleTitle || mod.title;

            recordStep({
              itemType: "module",
              sourceTitle: mod.title,
              translatedTitle: transModTitle,
              status: "completed",
              durationMs: Date.now() - metaStart,
            });

            this.updateJobState(
              jobId,
              (j) => {
                j.stats.modulesTranslated += 1;
                j.checkpoint = {
                  moduleIndex: mIdx,
                  lessonIndex: 0,
                  topicIndex: 0,
                  targetModuleId: targetModId,
                  translatedModuleTitle: transModTitle,
                };
              },
              true
            );
          }

          const lessonsList = Array.isArray(mod.lessons) ? mod.lessons : [];
          const startLesson = isResuming && mIdx === startModule ? resumeLesIdx : 0;

          for (let lIdx = startLesson; lIdx < lessonsList.length; lIdx++) {
            if (isCancelled()) return;
            const les = lessonsList[lIdx];
            const topicsList = Array.isArray(les.topics) ? les.topics : [];
            const isResumingMidLesson =
              isResuming && mIdx === startModule && lIdx === startLesson && resumeTopIdx > 0;

            let targetLesId = isResumingMidLesson ? currentJob?.checkpoint?.targetLessonId : undefined;
            let transLesTitle = isResumingMidLesson
              ? (currentJob?.checkpoint?.translatedLessonTitle || les.title)
              : les.title;

            if (!isResumingMidLesson || !targetLesId) {
              const lesMetaStart = Date.now();
              this.updateJobState(
                jobId,
                (j) => {
                  j.currentStepMessage = `Module ${mIdx + 1}/${modulesList.length} • Lesson ${lIdx + 1}/${lessonsList.length}: "${les.title}"...`;
                  j.checkpoint = {
                    moduleIndex: mIdx,
                    lessonIndex: lIdx,
                    topicIndex: 0,
                    targetModuleId: targetModId,
                    translatedModuleTitle: transModTitle,
                  };
                },
                true
              );

              const { res: lesMetaRes, data: lesMetaData } = await this.fetchTranslateStep(jobId, {
                type: "lesson_meta",
                sourceLang: sourceCourse.language,
                targetLang,
                lesson: {
                  id: les.id,
                  title: les.title,
                  content_type: (les as any).content_type || "rich_text",
                },
                saveToDatabase: true,
                targetCourseId: targetCourse.id,
                sourceCourseId: sourceCourse.id,
                targetModuleId: targetModId,
                translatedModuleTitle: transModTitle,
                sourceModuleIndex: mIdx,
                sourceLessonIndex: lIdx,
                sourceModuleTitle: mod.title,
                sourceModuleDescription: mod.description,
              });

              if (!lesMetaRes.ok || !lesMetaData.success) {
                recordStep({
                  itemType: "lesson",
                  sourceTitle: les.title,
                  moduleTitle: transModTitle,
                  status: "failed",
                  durationMs: Date.now() - lesMetaStart,
                  error: lesMetaData.error || `Failed on lesson "${les.title}"`,
                });
                throw new Error(lesMetaData.error || `Failed on lesson "${les.title}"`);
              }

              targetModId = lesMetaData.targetModuleId || targetModId;
              targetLesId = lesMetaData.targetLessonId;
              transLesTitle = lesMetaData.translatedLessonTitle || les.title;

              recordStep({
                itemType: "lesson",
                sourceTitle: les.title,
                translatedTitle: transLesTitle,
                moduleTitle: transModTitle,
                status: "completed",
                durationMs: Date.now() - lesMetaStart,
              });
            }

            const startTopic = isResumingMidLesson ? resumeTopIdx : 0;
            for (let tIdx = startTopic; tIdx < topicsList.length; tIdx++) {
              if (isCancelled()) return;
              const tp = topicsList[tIdx];
              const stepStart = Date.now();

              this.updateJobState(
                jobId,
                (j) => {
                  j.currentStepMessage = `M${mIdx + 1}/${modulesList.length} • L${lIdx + 1}/${lessonsList.length} • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
                  j.checkpoint = {
                    moduleIndex: mIdx,
                    lessonIndex: lIdx,
                    topicIndex: tIdx,
                    targetModuleId: targetModId,
                    targetLessonId: targetLesId,
                    translatedModuleTitle: transModTitle,
                    translatedLessonTitle: transLesTitle,
                  };
                },
                true
              );

              const { res: tpRes, data: tpData } = await this.fetchTranslateStep(jobId, {
                type: "topic",
                sourceLang: sourceCourse.language,
                targetLang,
                topic: {
                  id: tp.id,
                  title: tp.title,
                  content: tp.content,
                },
                saveToDatabase: true,
                targetCourseId: targetCourse.id,
                sourceCourseId: sourceCourse.id,
                targetModuleId: targetModId,
                targetLessonId: targetLesId,
                translatedModuleTitle: transModTitle,
                translatedLessonTitle: transLesTitle,
                sourceModuleIndex: mIdx,
                sourceLessonIndex: lIdx,
                sourceTopicIndex: tIdx,
                sourceModuleTitle: mod.title,
                sourceModuleDescription: mod.description,
                sourceLessonTitle: les.title,
              });

              if (!tpRes.ok || !tpData.success) {
                recordStep({
                  itemType: "topic",
                  sourceTitle: tp.title,
                  moduleTitle: transModTitle,
                  lessonTitle: transLesTitle,
                  status: "failed",
                  durationMs: Date.now() - stepStart,
                  error: tpData.error || `Failed on topic "${tp.title}"`,
                });
                throw new Error(tpData.error || `Failed on topic "${tp.title}"`);
              }

              recordStep({
                itemType: "topic",
                sourceTitle: tp.title,
                translatedTitle: tpData.translatedTopic?.title || tp.title,
                moduleTitle: transModTitle,
                lessonTitle: transLesTitle,
                status: "completed",
                durationMs: Date.now() - stepStart,
              });

              this.updateJobState(
                jobId,
                (j) => {
                  j.stats.topicsTranslated += 1;
                  j.checkpoint = {
                    moduleIndex: mIdx,
                    lessonIndex: lIdx,
                    topicIndex: tIdx + 1,
                    targetModuleId: targetModId,
                    targetLessonId: targetLesId,
                    translatedModuleTitle: transModTitle,
                    translatedLessonTitle: transLesTitle,
                  };
                },
                true
              );
            }

            this.updateJobState(
              jobId,
              (j) => {
                j.stats.lessonsTranslated += 1;
                j.checkpoint = {
                  moduleIndex: mIdx,
                  lessonIndex: lIdx + 1,
                  topicIndex: 0,
                  targetModuleId: targetModId,
                  translatedModuleTitle: transModTitle,
                };
              },
              true
            );
          }

          this.updateJobState(
            jobId,
            (j) => {
              j.checkpoint = {
                moduleIndex: mIdx + 1,
                lessonIndex: 0,
                topicIndex: 0,
              };
            },
            true
          );
        }

        this.updateJobState(
          jobId,
          (j) => {
            j.status = "completed";
            j.progressPercent = 100;
            j.completedSteps = j.totalSteps;
            j.completedAt = new Date().toISOString();
            j.currentStepMessage = `Full course (${modulesList.length} modules) translated into ${this.getLanguageLabel(targetLang)}!`;
          },
          true
        );

        this.abortControllers.delete(jobId);
        this.invalidateCourseCaches(onReloadCourses, targetCourse.id);
        toast.success(`Background translation complete: Full Course (${this.getLanguageLabel(targetLang)})`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }
    } catch (error: any) {
      this.abortControllers.delete(jobId);
      if (isCancelled() || error?.message === "CANCELLED_BY_USER") return;
      const errMsg = error?.message || "Unexpected translation failure";
      this.updateJobState(
        jobId,
        (j) => {
          j.status = "failed";
          j.error = errMsg;
          j.completedAt = new Date().toISOString();
          j.currentStepMessage = `Failed: ${errMsg} — click Continue to resume`;
        },
        true
      );
      toast.error(`Background translation paused: ${errMsg}`, {
        description: "Open the Translation tab and click Continue to resume from the exact step.",
        action: onViewTranslationTab
          ? { label: "View Details", onClick: onViewTranslationTab }
          : undefined,
      });
    }
  }
}

export const translationQueue = new TranslationQueueManager();
