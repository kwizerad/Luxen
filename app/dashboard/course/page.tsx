"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  BookOpen,
  Lock,
  CheckCircle,
  Play,
  Clock,
  Target,
  ChevronRight,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import type { CourseModule, CourseLesson, StudentModuleProgress, StudentLessonProgress } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  getCourseModules,
  getCourseLessons,
  getStudentModuleProgress,
  getStudentLessonProgress,
  getModuleExamSettings,
} from "@/lib/supabase/queries";

export default function CoursePage() {
  const { config } = useBrandingConfig();
  const router = useRouter();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Record<string, CourseLesson[]>>({});
  const [moduleProgress, setModuleProgress] = useState<Record<string, StudentModuleProgress>>({});
  const [lessonProgress, setLessonProgress] = useState<Record<string, StudentLessonProgress>>({});
  const [examSettings, setExamSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Load modules
      const modulesData = await getCourseModules();
      setModules(modulesData.modules);

      // Load lessons for each module
      const lessonsData: Record<string, CourseLesson[]> = {};
      for (const module of modulesData.modules) {
        const moduleLessons = await getCourseLessons(module.id);
        lessonsData[module.id] = moduleLessons.lessons;
      }
      setLessons(lessonsData);

      // Load module progress
      const progressData = await getStudentModuleProgress();
      const progressMap: Record<string, StudentModuleProgress> = {};
      progressData.progress.forEach((p: StudentModuleProgress) => {
        progressMap[p.module_id] = p;
      });
      setModuleProgress(progressMap);

      // Load lesson progress
      const lessonProgressData = await getStudentLessonProgress();
      const lessonProgressMap: Record<string, StudentLessonProgress> = {};
      lessonProgressData.progress.forEach((p: StudentLessonProgress) => {
        lessonProgressMap[p.lesson_id] = p;
      });
      setLessonProgress(lessonProgressMap);

      // Load exam settings for each module
      const settingsMap: Record<string, any> = {};
      for (const module of modulesData.modules) {
        try {
          const settings = await getModuleExamSettings(module.id);
          settingsMap[module.id] = settings.settings;
        } catch {
          // Use defaults if settings not found
          settingsMap[module.id] = {
            question_count: 20,
            duration_minutes: 20,
            passing_score: 70,
          };
        }
      }
      setExamSettings(settingsMap);
    } catch (error: any) {
      toast.error("Failed to load course data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isModuleUnlocked = (module: CourseModule, index: number) => {
    // First module is always unlocked
    if (index === 0) return true;

    // Module is unlocked if the previous module's exam is passed
    const previousModule = modules[index - 1];
    const previousProgress = moduleProgress[previousModule.id];
    return previousProgress?.exam_passed || false;
  };

  const canTakeExam = (moduleId: string) => {
    const progress = moduleProgress[moduleId];
    const moduleLessons = lessons[moduleId] || [];
    const completedLessons = moduleLessons.filter(
      (l) => lessonProgress[l.id]?.completed
    ).length;

    // Can take exam if all lessons are completed OR if lessons were completed before
    return progress?.lessons_completed === moduleLessons.length && moduleLessons.length > 0;
  };

  const getModuleProgress = (moduleId: string) => {
    const progress = moduleProgress[moduleId];
    const moduleLessons = lessons[moduleId] || [];
    const completedLessons = moduleLessons.filter(
      (l) => lessonProgress[l.id]?.completed
    ).length;

    return {
      lessonsCompleted: completedLessons,
      totalLessons: moduleLessons.length,
      examPassed: progress?.exam_passed || false,
      examAttempts: progress?.exam_attempts || 0,
      bestScore: progress?.best_score,
    };
  };

  const openLesson = (lesson: CourseLesson) => {
    setActiveLesson(lesson);
  };

  const takeExam = (moduleId: string) => {
    router.push(`/dashboard/course/${moduleId}/exam`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (activeLesson) {
    return (
      <div className="min-h-screen bg-background">
        <Watermark />
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Button variant="ghost" onClick={() => setActiveLesson(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{activeLesson.title}</CardTitle>
              <CardDescription>
                {activeLesson.content_type === 'video' && 'Video Lesson'}
                {activeLesson.content_type === 'image' && 'Image Lesson'}
                {activeLesson.content_type === 'document' && 'Document Lesson'}
                {activeLesson.content_type === 'text' && 'Text Lesson'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeLesson.content_type === 'video' && activeLesson.media_url && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video controls className="w-full h-full">
                    <source src={activeLesson.media_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {activeLesson.content_type === 'image' && activeLesson.media_url && (
                <img
                  src={activeLesson.media_url}
                  alt={activeLesson.title}
                  className="w-full rounded-lg"
                />
              )}

              {activeLesson.content_type === 'document' && activeLesson.media_url && (
                <div className="p-4 border rounded-lg">
                  <a
                    href={activeLesson.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText className="h-5 w-5" />
                    Open Document
                  </a>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{activeLesson.content}</p>
              </div>

              <Button
                onClick={async () => {
                  try {
                    const supabase = createClient();
                    const { markLessonComplete } = await import("@/lib/supabase/queries");
                    await markLessonComplete(activeLesson.id, activeLesson.module_id);
                    toast.success("Lesson completed!");
                    setActiveLesson(null);
                    loadData();
                  } catch (error: any) {
                    toast.error("Failed to mark lesson as complete: " + error.message);
                  }
                }}
                disabled={lessonProgress[activeLesson.id]?.completed}
                className="w-full"
              >
                {lessonProgress[activeLesson.id]?.completed ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Watermark />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Traffic School Course</h1>
          <p className="text-muted-foreground mt-1">
            Complete all modules and pass the exams to finish the course
          </p>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Course Content Available</h3>
              <p className="text-muted-foreground">
                Course modules will appear here once they are published by administrators.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {modules.map((module, index) => {
              const unlocked = isModuleUnlocked(module, index);
              const progress = getModuleProgress(module.id);
              const settings = examSettings[module.id];
              const moduleLessons = lessons[module.id] || [];

              return (
                <Card key={module.id} className={!unlocked ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{module.title}</CardTitle>
                          {!unlocked && (
                            <Badge variant="secondary">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                          {progress.examPassed && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          )}
                        </div>
                        {module.description && (
                          <CardDescription>{module.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress bar */}
                    {moduleLessons.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Lessons: {progress.lessonsCompleted} / {progress.totalLessons}
                          </span>
                          <span className="font-medium">
                            {Math.round((progress.lessonsCompleted / progress.totalLessons) * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(progress.lessonsCompleted / progress.totalLessons) * 100}
                        />
                      </div>
                    )}

                    {/* Lessons list */}
                    {unlocked && moduleLessons.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Lessons</h4>
                        {moduleLessons.map((lesson) => {
                          const isCompleted = lessonProgress[lesson.id]?.completed;
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                              onClick={() => openLesson(lesson)}
                            >
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Play className="h-5 w-5 text-muted-foreground" />
                                )}
                                <span className={isCompleted ? "line-through text-muted-foreground" : ""}>
                                  {lesson.title}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Exam section */}
                    {unlocked && canTakeExam(module.id) && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="font-medium">Module Exam</span>
                              {progress.examAttempts > 0 && (
                                <Badge variant="outline">
                                  {progress.examAttempts} attempt{progress.examAttempts > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {settings?.question_count || 20} questions
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {settings?.duration_minutes || 20} minutes
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {settings?.passing_score || 70}% to pass
                              </span>
                            </div>
                            {progress.bestScore !== undefined && (
                              <p className="text-sm">
                                Best score: <span className="font-medium">{progress.bestScore}%</span>
                              </p>
                            )}
                          </div>
                          <Button onClick={() => takeExam(module.id)}>
                            {progress.examPassed ? "Retake Exam" : "Take Exam"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!unlocked && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Complete the previous module to unlock this one.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
