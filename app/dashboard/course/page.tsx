"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";
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
  Languages,
  ChevronDown,
} from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import type { CourseModule, CourseLesson, StudentModuleProgress, StudentLessonProgress, CourseLanguageCourse } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  getCourseLanguages,
  getCourseModules,
  getCourseLessons,
  getStudentModuleProgress,
  getStudentLessonProgress,
  getModuleExamSettings,
  createNotification,
} from "@/lib/supabase/queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COURSE_LANGUAGES = ["English", "Kinyarwanda", "French"] as const;
type CourseLanguageEnum = (typeof COURSE_LANGUAGES)[number];

export default function CoursePage() {
  const { config } = useBrandingConfig();
  const { language, t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [selectedLanguageCourse, setSelectedLanguageCourse] = useState<CourseLanguageCourse | null>(null);
  const [lessonLanguage, setLessonLanguage] = useState<CourseLanguageEnum>(language as CourseLanguageEnum);
  const [userCourseLanguageId, setUserCourseLanguageId] = useState<string | null>(null);

  const getLocalized = (value: string, translations: Record<string, string> | undefined | null, lang: string) => {
    if (lang === "English") return value;
    return translations?.[lang] || value;
  };

  const getModuleTitle = (module: CourseModule) => getLocalized(module.title, module.title_translations, language);
  const getModuleDescription = (module: CourseModule) =>
    module.description ? getLocalized(module.description, module.description_translations, language) : undefined;
  const getLessonTitle = (lesson: CourseLesson) => getLocalized(lesson.title, lesson.title_translations, lessonLanguage);
  const getLessonContent = (lesson: CourseLesson) => getLocalized(lesson.content, lesson.content_translations, lessonLanguage);

  // Get available languages for a lesson (languages that have translations)
  const getAvailableLanguages = (lesson: CourseLesson): CourseLanguageEnum[] => {
    const available: CourseLanguageEnum[] = ['English']; // English is always available as default
    
    COURSE_LANGUAGES.forEach(lang => {
      if (lang === 'English') return;
      const hasTitleTranslation = lesson.title_translations?.[lang];
      const hasContentTranslation = lesson.content_translations?.[lang];
      if (hasTitleTranslation || hasContentTranslation) {
        available.push(lang);
      }
    });
    
    return available;
  };

  const [languageCourses, setLanguageCourses] = useState<CourseLanguageCourse[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Record<string, CourseLesson[]>>({});
  const [moduleProgress, setModuleProgress] = useState<Record<string, StudentModuleProgress>>({});
  const [lessonProgress, setLessonProgress] = useState<Record<string, StudentLessonProgress>>({});
  const [examSettings, setExamSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user: userData } } = await supabase.auth.getUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to load user:", error);
    }
  };

  useEffect(() => {
    // Default lesson language to system language
    setLessonLanguage(language as CourseLanguageEnum);
    // Load user's course language preference
    if (user?.user_metadata?.course_language_id) {
      setUserCourseLanguageId(user.user_metadata.course_language_id);
    }
  }, [language, user]);

  useEffect(() => {
    if (selectedLanguageCourse) {
      loadData();
    }
  }, [selectedLanguageCourse]);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Load published language courses
      const languagesData = await getCourseLanguages();
      setLanguageCourses(languagesData.languages);

      // Auto-select the user's preferred language course if none selected
      if (!selectedLanguageCourse && languagesData.languages.length > 0) {
        // First try to find the user's preferred language course by ID
        const userPreferredCourse = languagesData.languages.find((l: CourseLanguageCourse) =>
          l.is_published && l.id === userCourseLanguageId
        );

        // If no user preference, try to match system language
        const systemLanguageCourse = languagesData.languages.find((l: CourseLanguageCourse) =>
          l.is_published && l.language === language
        );

        // Fall back to first published course if neither preference nor system language match found
        const firstPublished = languagesData.languages.find((l: CourseLanguageCourse) => l.is_published);

        if (userPreferredCourse) {
          setSelectedLanguageCourse(userPreferredCourse);
        } else if (systemLanguageCourse) {
          setSelectedLanguageCourse(systemLanguageCourse);
        } else if (firstPublished) {
          setSelectedLanguageCourse(firstPublished);
        }
      }

      // Load modules for selected language course
      if (selectedLanguageCourse) {
        const modulesData = await getCourseModules(selectedLanguageCourse.id);
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
      } else {
        setModules([]);
        setLessons({});
        setModuleProgress({});
        setLessonProgress({});
        setExamSettings({});
      }
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

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleCourseLanguageChange = async (courseId: string) => {
    const selected = publishedCourses.find(c => c.id === courseId);
    if (selected) {
      setSelectedLanguageCourse(selected);
      // Save user's course language preference
      if (user) {
        try {
          const supabase = createClient();
          await supabase.auth.updateUser({
            data: { course_language_id: courseId }
          });
        } catch (error) {
          console.error("Failed to save course language preference:", error);
        }
      }
    }
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
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setActiveLesson(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToCourse")}
            </Button>
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <Select value={lessonLanguage} onValueChange={(v) => setLessonLanguage(v as CourseLanguageEnum)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableLanguages(activeLesson).map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{activeLesson ? getLessonTitle(activeLesson) : ""}</CardTitle>
              <CardDescription>
                {activeLesson.content_type === 'video' && t("lessonType.video")}
                {activeLesson.content_type === 'image' && t("lessonType.image")}
                {activeLesson.content_type === 'document' && t("lessonType.document")}
                {activeLesson.content_type === 'text' && t("lessonType.text")}
                {activeLesson.content_type === 'mixed' && t("lessonType.mixed")}
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
                  alt={activeLesson ? getLessonTitle(activeLesson) : ""}
                  className="w-full rounded-lg"
                />
              )}

              {activeLesson.content_type === 'mixed' && activeLesson.image_url && (
                <img
                  src={activeLesson.image_url}
                  alt={activeLesson ? getLessonTitle(activeLesson) : ""}
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
                    {t("openDocument")}
                  </a>
                </div>
              )}

              {(activeLesson.content_type === 'text' || activeLesson.content_type === 'mixed') && (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{activeLesson ? getLessonContent(activeLesson) : ""}</p>
                </div>
              )}

              <Button
                onClick={async () => {
                  try {
                    const supabase = createClient();
                    const { markLessonComplete } = await import("@/lib/supabase/queries");
                    await markLessonComplete(activeLesson.id, activeLesson.module_id);
                    toast.success(t("lessonCompleted"));
                    setActiveLesson(null);
                    loadData();
                  } catch (error: any) {
                    toast.error(`${t("failedToMarkLessonComplete")}: ${error.message}`);
                  }
                }}
                disabled={lessonProgress[activeLesson.id]?.completed}
                className="w-full"
              >
                {lessonProgress[activeLesson.id]?.completed ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("completed")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("markAsComplete")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const publishedCourses = languageCourses.filter(l => l.is_published);

  return (
    <div className="min-h-screen bg-background">
      <Watermark />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("trafficSchoolCourse")}</h1>
            <p className="text-muted-foreground mt-1">
              {selectedLanguageCourse
                ? `${selectedLanguageCourse.title}${t("course.completeModulesToFinish")}`
                : publishedCourses.length > 0
                  ? t("course.loadingYourCourse")
                  : t("course.contentAvailableSoon")
              }
            </p>
          </div>
          {publishedCourses.length > 1 && (
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <Select
                value={selectedLanguageCourse?.id || ""}
                onValueChange={handleCourseLanguageChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("language")} />
                </SelectTrigger>
                <SelectContent>
                  {publishedCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {publishedCourses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("courseContentComingSoon")}</h3>
              <p className="text-muted-foreground">
                {t("courseContentComingSoonDesc")}
              </p>
            </CardContent>
          </Card>
        ) : modules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("noCourseContentAvailable")}</h3>
              <p className="text-muted-foreground">
                {t("courseModulesWillAppear")}
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
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleModuleExpansion(module.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{getModuleTitle(module)}</CardTitle>
                          {!unlocked && (
                            <Badge variant="secondary">
                              <Lock className="h-3 w-3 mr-1" />
                              {t("locked")}
                            </Badge>
                          )}
                          {progress.examPassed && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t("passed")}
                            </Badge>
                          )}
                        </div>
                        {getModuleDescription(module) && (
                          <CardDescription>{getModuleDescription(module)}</CardDescription>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${expandedModules.has(module.id) ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress bar */}
                    {moduleLessons.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("lessons")}: {progress.lessonsCompleted} / {progress.totalLessons}
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

                    {/* Lessons list - shown only when expanded */}
                    {unlocked && expandedModules.has(module.id) && moduleLessons.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{t("lessons")}</h4>
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
                                  {getLessonTitle(lesson)}
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
                              <span className="font-medium">{t("moduleExam")}</span>
                              {progress.examAttempts > 0 && (
                                <Badge variant="outline">
                                  {progress.examAttempts} {progress.examAttempts > 1 ? t("attempts") : t("attempt")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {settings?.question_count || 20} {t("questions")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {settings?.duration_minutes || 20} {t("minutes")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {settings?.passing_score || 70}{t("percentToPass")}
                              </span>
                            </div>
                            {progress.bestScore !== undefined && (
                              <p className="text-sm">
                                {t("bestScoreLabel")} <span className="font-medium">{progress.bestScore}%</span>
                              </p>
                            )}
                          </div>
                          <Button onClick={() => takeExam(module.id)}>
                            {progress.examPassed ? t("retakeExam") : t("takeExam")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!unlocked && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          {t("completePreviousModuleUnlock")}
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
