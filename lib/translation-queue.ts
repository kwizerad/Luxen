"use client";

import { mutate } from "swr";
import { toast } from "sonner";
import { Course, Module, Lesson, LessonTopic } from "@/lib/courses-store";
import type { TranslationJobRecord, TranslationStepLog } from "@/app/api/admin/courses/translation-jobs/route";

export type { TranslationJobRecord, TranslationStepLog };

type Listener = (jobs: TranslationJobRecord[]) => void;

const STORAGE_KEY = "navo_translation_jobs_cache_v1";

class TranslationQueueManager {
  private jobs: TranslationJobRecord[] = [];
  private listeners: Set<Listener> = new Set();
  private cancelledIds: Set<string> = new Set();
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
          // Merge running local jobs with server jobs so active in-memory progress is never overwritten by a slightly older server snapshot
          const serverJobs: TranslationJobRecord[] = data.jobs;
          const localRunningMap = new Map<string, TranslationJobRecord>();
          for (const j of this.jobs) {
            if (j.status === "running") {
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
              // If server says running, but it's not in our localRunningMap and hasn't been updated in > 5 minutes, mark it failed/interrupted
              if (
                sj.status === "running" &&
                Date.now() - new Date(sj.updatedAt || sj.startedAt).getTime() > 5 * 60 * 1000
              ) {
                sj.status = "failed";
                sj.error = "Translation interrupted (browser session closed or timed out)";
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
    const job = this.jobs.find((j) => j.id === jobId);
    if (job && job.status === "running") {
      job.status = "cancelled";
      job.currentStepMessage = "Cancelled by administrator";
      job.completedAt = new Date().toISOString();
      job.durationMs = Date.now() - new Date(job.startedAt).getTime();
      this.notify();
      this.persistJobToServer(job);
      toast.info(`Cancelled translation: ${job.scopeTitle}`);
    }
  }

  public async deleteJob(jobId: string) {
    this.cancelledIds.add(jobId);
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
    const job = { ...this.jobs[idx], steps: [...this.jobs[idx].steps], stats: { ...this.jobs[idx].stats } };
    updater(job);
    job.updatedAt = new Date().toISOString();
    job.durationMs = Date.now() - new Date(job.startedAt).getTime();
    this.jobs[idx] = job;
    this.notify();
    if (persist) {
      this.persistJobToServer(job);
    }
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

  /**
   * Enqueue and immediately start a background translation job (Topic, Lesson, Module, or Whole Course).
   * Runs asynchronously in the background even if the user switches tabs or edits other courses.
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
      onReloadCourses,
      onViewTranslationTab,
    } = params;

    const jobId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    let scopeTitle = sourceCourse.title;
    let totalSteps = 1;

    if (type === "topic" && activeTopic) {
      scopeTitle = activeTopic.title;
      totalSteps = 1;
    } else if (type === "lesson" && activeLesson) {
      scopeTitle = activeLesson.title;
      const tCount = activeLesson.topics?.length || 0;
      totalSteps = tCount > 3 ? tCount : 1;
    } else if (type === "module" && activeModule) {
      scopeTitle = activeModule.title;
      const lessons = activeModule.lessons || [];
      let steps = 1; // module header
      for (const l of lessons) {
        const tc = l.topics?.length || 0;
        steps += tc > 3 ? tc : 1;
      }
      totalSteps = Math.max(1, steps);
    } else if (type === "course") {
      scopeTitle = `${sourceCourse.title} (${sourceCourse.language} → ${targetLang})`;
      const modules = sourceCourse.modules || [];
      let steps = 0;
      for (const m of modules) {
        steps += 1; // module_meta
        for (const l of m.lessons || []) {
          const tc = l.topics?.length || 0;
          steps += tc > 3 ? tc : 1;
        }
      }
      totalSteps = Math.max(1, steps);
    }

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

    // Run job asynchronously without blocking UI
    this.runJobInternal(newJob.id, params).catch((err) => {
      console.error("Background translation unhandled error:", err);
    });

    return newJob;
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
    }
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

    try {
      // =========================================================================
      // CASE 1: TOPIC TRANSLATION
      // =========================================================================
      if (type === "topic" && activeTopic) {
        const stepStart = Date.now();
        this.updateJobState(jobId, (j) => {
          j.currentStepMessage = `Translating topic "${activeTopic.title}"...`;
        });

        const res = await fetch("/api/admin/courses/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          }),
        });

        const data = await this.safeParseResponse(res);
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

        this.invalidateCourseCaches(onReloadCourses, targetCourse?.id);
        toast.success(`Background translation complete: "${translatedTitle}"`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }

      // =========================================================================
      // CASE 2: LESSON TRANSLATION
      // =========================================================================
      if (type === "lesson" && activeLesson && targetCourse) {
        const topicsList = Array.isArray(activeLesson.topics) ? activeLesson.topics : [];

        if (topicsList.length <= 3) {
          const stepStart = Date.now();
          this.updateJobState(jobId, (j) => {
            j.currentStepMessage = `Translating lesson "${activeLesson.title}" (${topicsList.length} topics)...`;
          });

          const res = await fetch("/api/admin/courses/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "lesson",
              sourceLang: sourceCourse.language,
              targetLang,
              lesson: activeLesson,
              saveToDatabase: true,
              targetCourseId: targetCourse.id,
              sourceCourseId: sourceCourse.id,
              sourceModuleIndex: Math.max(0, moduleIndex),
              sourceLessonIndex: Math.max(0, lessonIndex),
              sourceModuleTitle: activeModule?.title || undefined,
              sourceModuleDescription: activeModule?.description || undefined,
            }),
          });

          const data = await this.safeParseResponse(res);
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Lesson translation failed");
          }

          const transTitle = data.translatedLesson?.title || activeLesson.title;
          recordStep({
            itemType: "lesson",
            sourceTitle: activeLesson.title,
            translatedTitle: transTitle,
            moduleTitle: activeModule?.title,
            status: "completed",
            durationMs: Date.now() - stepStart,
          });

          this.updateJobState(jobId, (j) => {
            j.stats.lessonsTranslated += 1;
            j.stats.topicsTranslated += topicsList.length;
          });
        } else {
          for (let tIdx = 0; tIdx < topicsList.length; tIdx++) {
            if (isCancelled()) return;
            const tp = topicsList[tIdx];
            const stepStart = Date.now();

            this.updateJobState(jobId, (j) => {
              j.currentStepMessage = `Translating topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
            });

            const res = await fetch("/api/admin/courses/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
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
                sourceModuleIndex: Math.max(0, moduleIndex),
                sourceLessonIndex: Math.max(0, lessonIndex),
                sourceTopicIndex: tIdx,
                sourceModuleTitle: activeModule?.title || undefined,
                sourceModuleDescription: activeModule?.description || undefined,
                sourceLessonTitle: activeLesson.title,
              }),
            });

            const data = await this.safeParseResponse(res);
            if (!res.ok || !data.success) {
              recordStep({
                itemType: "topic",
                sourceTitle: tp.title,
                moduleTitle: activeModule?.title,
                lessonTitle: activeLesson.title,
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
              moduleTitle: activeModule?.title,
              lessonTitle: activeLesson.title,
              status: "completed",
              durationMs: Date.now() - stepStart,
            });

            this.updateJobState(jobId, (j) => {
              j.stats.topicsTranslated += 1;
            });
          }

          this.updateJobState(jobId, (j) => {
            j.stats.lessonsTranslated += 1;
          });
        }

        this.updateJobState(
          jobId,
          (j) => {
            j.status = "completed";
            j.progressPercent = 100;
            j.completedSteps = j.totalSteps;
            j.completedAt = new Date().toISOString();
            j.currentStepMessage = `Lesson "${activeLesson.title}" translated into ${this.getLanguageLabel(targetLang)}!`;
          },
          true
        );

        this.invalidateCourseCaches(onReloadCourses, targetCourse.id);
        toast.success(`Background translation complete: Lesson "${activeLesson.title}"`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }

      // =========================================================================
      // CASE 3: MODULE TRANSLATION
      // =========================================================================
      if (type === "module" && activeModule && targetCourse) {
        const modIdx = Math.max(0, moduleIndex);
        const lessonsList = Array.isArray(activeModule.lessons) ? activeModule.lessons : [];
        const metaStart = Date.now();

        this.updateJobState(jobId, (j) => {
          j.currentStepMessage = `Translating module header "${activeModule.title}"...`;
        });

        const metaRes = await fetch("/api/admin/courses/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          }),
        });

        const metaData = await this.safeParseResponse(metaRes);
        if (!metaRes.ok || !metaData.success) {
          throw new Error(metaData.error || "Module header translation failed");
        }

        const transModTitle = metaData.translatedModuleTitle || activeModule.title;
        recordStep({
          itemType: "module",
          sourceTitle: activeModule.title,
          translatedTitle: transModTitle,
          status: "completed",
          durationMs: Date.now() - metaStart,
        });

        this.updateJobState(jobId, (j) => {
          j.stats.modulesTranslated += 1;
        });

        for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
          if (isCancelled()) return;
          const les = lessonsList[lIdx];
          const topicsList = Array.isArray(les.topics) ? les.topics : [];

          if (topicsList.length <= 3) {
            const stepStart = Date.now();
            this.updateJobState(jobId, (j) => {
              j.currentStepMessage = `Module "${transModTitle}" • Lesson ${lIdx + 1}/${lessonsList.length}: "${les.title}"...`;
            });

            const lesRes = await fetch("/api/admin/courses/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "lesson",
                sourceLang: sourceCourse.language,
                targetLang,
                lesson: les,
                saveToDatabase: true,
                targetCourseId: targetCourse.id,
                sourceCourseId: sourceCourse.id,
                sourceModuleIndex: modIdx,
                sourceLessonIndex: lIdx,
                sourceModuleTitle: activeModule.title,
                sourceModuleDescription: activeModule.description,
              }),
            });

            const lesData = await this.safeParseResponse(lesRes);
            if (!lesRes.ok || !lesData.success) {
              recordStep({
                itemType: "lesson",
                sourceTitle: les.title,
                moduleTitle: transModTitle,
                status: "failed",
                durationMs: Date.now() - stepStart,
                error: lesData.error || `Failed translating lesson "${les.title}"`,
              });
              throw new Error(lesData.error || `Failed translating lesson "${les.title}"`);
            }

            recordStep({
              itemType: "lesson",
              sourceTitle: les.title,
              translatedTitle: lesData.translatedLesson?.title || les.title,
              moduleTitle: transModTitle,
              status: "completed",
              durationMs: Date.now() - stepStart,
            });

            this.updateJobState(jobId, (j) => {
              j.stats.lessonsTranslated += 1;
              j.stats.topicsTranslated += topicsList.length;
            });
          } else {
            for (let tIdx = 0; tIdx < topicsList.length; tIdx++) {
              if (isCancelled()) return;
              const tp = topicsList[tIdx];
              const stepStart = Date.now();

              this.updateJobState(jobId, (j) => {
                j.currentStepMessage = `Lesson ${lIdx + 1}/${lessonsList.length} • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
              });

              const tpRes = await fetch("/api/admin/courses/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
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
                  sourceModuleIndex: modIdx,
                  sourceLessonIndex: lIdx,
                  sourceTopicIndex: tIdx,
                  sourceModuleTitle: activeModule.title,
                  sourceModuleDescription: activeModule.description,
                  sourceLessonTitle: les.title,
                }),
              });

              const tpData = await this.safeParseResponse(tpRes);
              if (!tpRes.ok || !tpData.success) {
                recordStep({
                  itemType: "topic",
                  sourceTitle: tp.title,
                  moduleTitle: transModTitle,
                  lessonTitle: les.title,
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
                lessonTitle: les.title,
                status: "completed",
                durationMs: Date.now() - stepStart,
              });

              this.updateJobState(jobId, (j) => {
                j.stats.topicsTranslated += 1;
              });
            }

            this.updateJobState(jobId, (j) => {
              j.stats.lessonsTranslated += 1;
            });
          }
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

        this.invalidateCourseCaches(onReloadCourses, targetCourse.id);
        toast.success(`Background translation complete: Module "${transModTitle}"`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }

      // =========================================================================
      // CASE 4: WHOLE COURSE TRANSLATION
      // =========================================================================
      if (type === "course" && targetCourse) {
        const modulesList = Array.isArray(sourceCourse.modules) ? sourceCourse.modules : [];

        for (let mIdx = 0; mIdx < modulesList.length; mIdx++) {
          if (isCancelled()) return;
          const mod = modulesList[mIdx];
          const metaStart = Date.now();

          this.updateJobState(jobId, (j) => {
            j.currentStepMessage = `Module ${mIdx + 1}/${modulesList.length}: "${mod.title}"...`;
          });

          const metaRes = await fetch("/api/admin/courses/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
            }),
          });

          const metaData = await this.safeParseResponse(metaRes);
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

          const transModTitle = metaData.translatedModuleTitle || mod.title;
          recordStep({
            itemType: "module",
            sourceTitle: mod.title,
            translatedTitle: transModTitle,
            status: "completed",
            durationMs: Date.now() - metaStart,
          });

          this.updateJobState(jobId, (j) => {
            j.stats.modulesTranslated += 1;
          });

          const lessonsList = Array.isArray(mod.lessons) ? mod.lessons : [];
          for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
            if (isCancelled()) return;
            const les = lessonsList[lIdx];
            const topicsList = Array.isArray(les.topics) ? les.topics : [];

            if (topicsList.length <= 3) {
              const stepStart = Date.now();
              this.updateJobState(jobId, (j) => {
                j.currentStepMessage = `Module ${mIdx + 1}/${modulesList.length} • Lesson ${lIdx + 1}/${lessonsList.length}: "${les.title}"...`;
              });

              const lesRes = await fetch("/api/admin/courses/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "lesson",
                  sourceLang: sourceCourse.language,
                  targetLang,
                  lesson: les,
                  saveToDatabase: true,
                  targetCourseId: targetCourse.id,
                  sourceCourseId: sourceCourse.id,
                  sourceModuleIndex: mIdx,
                  sourceLessonIndex: lIdx,
                  sourceModuleTitle: mod.title,
                  sourceModuleDescription: mod.description,
                }),
              });

              const lesData = await this.safeParseResponse(lesRes);
              if (!lesRes.ok || !lesData.success) {
                recordStep({
                  itemType: "lesson",
                  sourceTitle: les.title,
                  moduleTitle: transModTitle,
                  status: "failed",
                  durationMs: Date.now() - stepStart,
                  error: lesData.error || `Failed on lesson "${les.title}"`,
                });
                throw new Error(lesData.error || `Failed on lesson "${les.title}"`);
              }

              recordStep({
                itemType: "lesson",
                sourceTitle: les.title,
                translatedTitle: lesData.translatedLesson?.title || les.title,
                moduleTitle: transModTitle,
                status: "completed",
                durationMs: Date.now() - stepStart,
              });

              this.updateJobState(jobId, (j) => {
                j.stats.lessonsTranslated += 1;
                j.stats.topicsTranslated += topicsList.length;
              });
            } else {
              for (let tIdx = 0; tIdx < topicsList.length; tIdx++) {
                if (isCancelled()) return;
                const tp = topicsList[tIdx];
                const stepStart = Date.now();

                this.updateJobState(jobId, (j) => {
                  j.currentStepMessage = `M${mIdx + 1}/${modulesList.length} • L${lIdx + 1}/${lessonsList.length} • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
                });

                const tpRes = await fetch("/api/admin/courses/translate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
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
                    sourceModuleIndex: mIdx,
                    sourceLessonIndex: lIdx,
                    sourceTopicIndex: tIdx,
                    sourceModuleTitle: mod.title,
                    sourceModuleDescription: mod.description,
                    sourceLessonTitle: les.title,
                  }),
                });

                const tpData = await this.safeParseResponse(tpRes);
                if (!tpRes.ok || !tpData.success) {
                  recordStep({
                    itemType: "topic",
                    sourceTitle: tp.title,
                    moduleTitle: transModTitle,
                    lessonTitle: les.title,
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
                  lessonTitle: les.title,
                  status: "completed",
                  durationMs: Date.now() - stepStart,
                });

                this.updateJobState(jobId, (j) => {
                  j.stats.topicsTranslated += 1;
                });
              }

              this.updateJobState(jobId, (j) => {
                j.stats.lessonsTranslated += 1;
              });
            }
          }
        }

        this.updateJobState(
          jobId,
          (j) => {
            j.status = "completed";
            j.progressPercent = 100;
            j.completedSteps = j.totalSteps;
            j.completedAt = new Date().toISOString();
            j.currentStepMessage = `Full course translated into ${this.getLanguageLabel(targetLang)}!`;
          },
          true
        );

        this.invalidateCourseCaches(onReloadCourses, targetCourse.id);
        toast.success(`Background translation complete: Full Course (${this.getLanguageLabel(targetLang)})`, {
          action: onViewTranslationTab
            ? { label: "View Report", onClick: onViewTranslationTab }
            : undefined,
        });
        return;
      }
    } catch (err: any) {
      if (isCancelled()) return;
      const errMsg = err?.message || "Translation failed";
      this.updateJobState(
        jobId,
        (j) => {
          j.status = "failed";
          j.error = errMsg;
          j.completedAt = new Date().toISOString();
          j.currentStepMessage = `Error: ${errMsg}`;
        },
        true
      );
      toast.error(`Translation failed: ${errMsg}`, {
        action: onViewTranslationTab
          ? { label: "View Error Report", onClick: onViewTranslationTab }
          : undefined,
      });
    }
  }
}

export const translationQueue = new TranslationQueueManager();
