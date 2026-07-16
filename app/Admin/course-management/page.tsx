"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  Settings,
  Eye,
  EyeOff,
  Layers,
  FileText,
  ArrowUpDown,
  GripVertical,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Shuffle,
} from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import type { CourseModule, CourseLesson, ModuleExamQuestion, ModuleExamSettings } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";
import { Reorder, motion, useDragControls } from "framer-motion";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

export default function CourseManagementPage() {
  const { config } = useBrandingConfig();
  const router = useRouter();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [questions, setQuestions] = useState<ModuleExamQuestion[]>([]);
  const [examSettings, setExamSettings] = useState<Record<string, ModuleExamSettings>>({});
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"modules" | "lessons" | "questions" | "settings">("modules");
  const [isDragging, setIsDragging] = useState(false);

  // Module form state
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", is_published: false });

  // Lesson form state
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content: "",
    content_type: "text" as "text" | "video" | "image" | "document",
    media_url: "",
    is_published: false,
  });

  // Question form state
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ModuleExamQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState<Record<string, any>>({
    question: "",
    question_image: "",
    option_a: "",
    option_a_image: "",
    option_b: "",
    option_b_image: "",
    option_c: "",
    option_c_image: "",
    option_d: "",
    option_d_image: "",
    correct_answer: "A" as "A" | "B" | "C" | "D",
    explanation: "",
    is_published: false,
  });

  // Settings form state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    question_count: 20,
    duration_minutes: 20,
    passing_score: 70,
    randomize_questions: true,
    randomize_answers: true,
    max_attempts: 3,
  });

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadData();
    }
  }, [hasPermission, activeModule]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle backspace or alt+left arrow to go back
      if ((e.key === 'Backspace' || (e.altKey && e.key === 'ArrowLeft')) && activeTab !== 'modules') {
        e.preventDefault();
        setActiveTab('modules');
        setActiveModule(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const checkPermission = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) {
      router.push("/Admin");
      return;
    }
    setHasPermission(true);
  };

  const getAuthHeaders = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    return accessToken ? { "Authorization": `Bearer ${accessToken}` } : {};
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      // Load modules via API
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);

      // Load lessons if module is selected
      if (activeModule) {
        const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons || []);

        // Load questions
        const questionsResponse = await fetch(`/api/module-exam-questions?module_id=${activeModule}`, { headers });
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions || []);

        // Load exam settings
        const settingsResponse = await fetch(`/api/module-exam-settings?module_id=${activeModule}`, { headers });
        const settingsData = await settingsResponse.json();
        if (settingsData.settings) {
          setExamSettings({ [activeModule]: settingsData.settings });
          setSettingsForm({
            question_count: settingsData.settings.question_count,
            duration_minutes: settingsData.settings.duration_minutes,
            passing_score: settingsData.settings.passing_score,
            randomize_questions: settingsData.settings.randomize_questions,
            randomize_answers: settingsData.settings.randomize_answers,
            max_attempts: settingsData.settings.max_attempts,
          });
        }
      } else {
        setLessons([]);
        setQuestions([]);
      }
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/course-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(moduleForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to create module");

      toast.success("Module created successfully");
      setShowModuleDialog(false);
      setModuleForm({ title: "", description: "", is_published: false });
      
      // Reload modules via API
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-modules/${editingModule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(moduleForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update module");

      toast.success("Module updated successfully");
      setShowModuleDialog(false);
      setEditingModule(null);
      setModuleForm({ title: "", description: "", is_published: false });
      
      // Reload modules via API
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module? This will also delete all lessons and questions.")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-modules/${moduleId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to delete module");

      toast.success("Module deleted successfully");
      
      // Reload modules via API
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);
      
      if (activeModule === moduleId) {
        setActiveModule(null);
        setActiveTab("modules");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateLesson = async () => {
    if (!activeModule) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/course-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ ...lessonForm, module_id: activeModule }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create lesson");
      }

      toast.success("Lesson created successfully");
      setShowLessonDialog(false);
      setLessonForm({ title: "", content: "", content_type: "text", media_url: "", is_published: false });
      
      // Reload lessons via API
      setTimeout(async () => {
        const headers = await getAuthHeaders();
        const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons || []);
      }, 500);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-lessons/${editingLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(lessonForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update lesson");

      toast.success("Lesson updated successfully");
      setShowLessonDialog(false);
      setEditingLesson(null);
      setLessonForm({ title: "", content: "", content_type: "text", media_url: "", is_published: false });
      
      // Reload lessons via API
      const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
      const lessonsData = await lessonsResponse.json();
      setLessons(lessonsData.lessons || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-lessons/${lessonId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to delete lesson");

      toast.success("Lesson deleted successfully");
      
      // Reload lessons via API
      const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
      const lessonsData = await lessonsResponse.json();
      setLessons(lessonsData.lessons || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateQuestion = async () => {
    if (!activeModule) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/module-exam-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ ...questionForm, module_id: activeModule }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to create question");

      toast.success("Question created successfully");
      setShowQuestionDialog(false);
      setQuestionForm({
        question: "",
        question_image: "",
        option_a: "",
        option_a_image: "",
        option_b: "",
        option_b_image: "",
        option_c: "",
        option_c_image: "",
        option_d: "",
        option_d_image: "",
        correct_answer: "A",
        explanation: "",
        is_published: false,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/module-exam-questions/${editingQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(questionForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update question");

      toast.success("Question updated successfully");
      setShowQuestionDialog(false);
      setEditingQuestion(null);
      setQuestionForm({
        question: "",
        question_image: "",
        option_a: "",
        option_a_image: "",
        option_b: "",
        option_b_image: "",
        option_c: "",
        option_c_image: "",
        option_d: "",
        option_d_image: "",
        correct_answer: "A",
        explanation: "",
        is_published: false,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/module-exam-questions/${questionId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to delete question");

      toast.success("Question deleted successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeModule) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/module-exam-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ ...settingsForm, module_id: activeModule }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to save settings");

      toast.success("Settings saved successfully");
      setShowSettingsDialog(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReorderModules = async (newModules: CourseModule[]) => {
    setIsDragging(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/course-modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          modules: newModules.map((module, index) => ({
            id: module.id,
            order_index: index,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to reorder modules");

      setModules(newModules);
      toast.success("Modules reordered successfully");
    } catch (error: any) {
      toast.error(error.message);
      // Reload modules via API on error
      const headers = await getAuthHeaders();
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);
    } finally {
      setTimeout(() => setIsDragging(false), 100);
    }
  };

  const handleReorderLessons = async (newLessons: CourseLesson[]) => {
    if (!activeModule) return;
    setIsDragging(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/course-lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          lessons: newLessons.map((lesson, index) => ({
            id: lesson.id,
            order_index: index,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to reorder lessons");

      setLessons(newLessons);
      toast.success("Lessons reordered successfully");
    } catch (error: any) {
      toast.error(error.message);
      // Reload lessons via API on error
      const headers = await getAuthHeaders();
      const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
      const lessonsData = await lessonsResponse.json();
      setLessons(lessonsData.lessons || []);
    } finally {
      setTimeout(() => setIsDragging(false), 100);
    }
  };

  const openModuleDialog = (module?: CourseModule) => {
    if (module) {
      setEditingModule(module);
      setModuleForm({
        title: module.title,
        description: module.description || "",
        is_published: module.is_published,
      });
    } else {
      setEditingModule(null);
      setModuleForm({ title: "", description: "", is_published: false });
    }
    setShowModuleDialog(true);
  };

  const openLessonDialog = (lesson?: CourseLesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        content: lesson.content,
        content_type: lesson.content_type,
        media_url: lesson.media_url || "",
        is_published: lesson.is_published,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({ title: "", content: "", content_type: "text", media_url: "", is_published: false });
    }
    setShowLessonDialog(true);
  };

  const openQuestionDialog = (question?: ModuleExamQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question: question.question || "",
        question_image: question.question_image || "",
        option_a: question.option_a || "",
        option_a_image: question.option_a_image || "",
        option_b: question.option_b || "",
        option_b_image: question.option_b_image || "",
        option_c: question.option_c || "",
        option_c_image: question.option_c_image || "",
        option_d: question.option_d || "",
        option_d_image: question.option_d_image || "",
        correct_answer: question.correct_answer,
        explanation: question.explanation || "",
        is_published: question.is_published,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        question: "",
        question_image: "",
        option_a: "",
        option_a_image: "",
        option_b: "",
        option_b_image: "",
        option_c: "",
        option_c_image: "",
        option_d: "",
        option_d_image: "",
        correct_answer: "A",
        explanation: "",
        is_published: false,
      });
    }
    setShowQuestionDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeModuleData = modules.find(m => m.id === activeModule);

  return (
    <div className="min-h-screen bg-background">
      <Watermark />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Course Management</h1>
            <p className="text-muted-foreground">Manage modules, lessons, and exams for your traffic school</p>
          </div>
          <Link href="/Admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        {/* Module List */}
        {activeTab === "modules" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modules</CardTitle>
                  <CardDescription>Create and manage course modules</CardDescription>
                </div>
                <Button onClick={() => openModuleDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No modules yet. Create your first module to get started.</p>
              ) : (
                <Reorder.Group axis="y" values={modules} onReorder={handleReorderModules}>
                  <div className="space-y-3">
                    {modules.map((module, index) => (
                      <Reorder.Item
                        key={module.id}
                        value={module}
                        initial={false}
                        whileDrag={{ scale: 1.02, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div 
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                            onClick={() => {
                              setActiveModule(module.id);
                              setActiveTab("lessons");
                            }}
                          >
                            <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{module.title}</span>
                              </div>
                              {module.description && (
                                <p className="text-sm text-muted-foreground">{module.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {module.is_published ? (
                            <Badge variant="default" className="bg-green-500">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openModuleDialog(module); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Reorder.Item>
                    ))}
                  </div>
                </Reorder.Group>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lessons Tab */}
        {activeTab === "lessons" && activeModuleData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <Button variant="ghost" onClick={() => setActiveTab("modules")} className="mr-2">
                      ←
                    </Button>
                    {activeModuleData.title} - Lessons
                  </CardTitle>
                  <CardDescription>Manage lessons for this module</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("questions")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Questions
                  </Button>
                  <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Exam Settings
                  </Button>
                  <Button onClick={() => openLessonDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lesson
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No lessons yet. Add your first lesson to get started.</p>
              ) : (
                <>
                  <div className="mb-2 text-sm text-muted-foreground">
                    Showing {lessons.length} lesson(s) for module: {modules.find(m => m.id === activeModule)?.title || 'Unknown Module'}
                  </div>
                  <Reorder.Group axis="y" values={lessons} onReorder={handleReorderLessons}>
                    <div className="space-y-3">
                      {lessons.map((lesson, index) => (
                        <Reorder.Item
                          key={lesson.id}
                          value={lesson}
                          initial={false}
                          whileDrag={{ scale: 1.02, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
                          onDragStart={() => setIsDragging(true)}
                          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
                          className="flex items-center justify-between p-4 border rounded-lg cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{lesson.title}</span>
                                  <Badge variant="outline">{lesson.content_type}</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {lesson.is_published ? (
                              <Badge variant="default" className="bg-green-500">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openLessonDialog(lesson)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Reorder.Item>
                      ))}
                    </div>
                  </Reorder.Group>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions Tab */}
        {activeTab === "questions" && activeModuleData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <Button variant="ghost" onClick={() => setActiveTab("lessons")} className="mr-2">
                      ←
                    </Button>
                    {activeModuleData.title} - Exam Questions
                  </CardTitle>
                  <CardDescription>Manage exam questions for this module</CardDescription>
                </div>
                <Button onClick={() => openQuestionDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No questions yet. Add your first question to get started.</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {question.question || "(Image-only question)"}
                            </span>
                            {question.is_published ? (
                              <Badge variant="default" className="bg-green-500">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Correct: {question.correct_answer} • {questions.length} total questions
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openQuestionDialog(question)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Module Dialog */}
        <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingModule ? "Edit Module" : "Create Module"}</DialogTitle>
              <DialogDescription>
                {editingModule ? "Update the module details" : "Create a new course module"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="module-title">Title</Label>
                <Input
                  id="module-title"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  placeholder="Module 1: Traffic Laws"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="module-description">Description</Label>
                <Textarea
                  id="module-description"
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  placeholder="Learn about traffic laws and regulations..."
                  rows={3}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="module-published"
                  checked={moduleForm.is_published}
                  onCheckedChange={(checked) => setModuleForm({ ...moduleForm, is_published: checked })}
                />
                <Label htmlFor="module-published">Published</Label>
              </div>
              <Button
                onClick={editingModule ? handleUpdateModule : handleCreateModule}
                className="w-full"
              >
                {editingModule ? "Update Module" : "Create Module"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
              <DialogDescription>
                {editingLesson ? "Update the lesson content" : "Create a new lesson"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="lesson-title">Title</Label>
                <Input
                  id="lesson-title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Introduction to Traffic Signs"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="lesson-type">Content Type</Label>
                <select
                  id="lesson-type"
                  value={lessonForm.content_type}
                  onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                  autoComplete="off"
                >
                  <option value="text">Text</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                </select>
              </div>
              {(lessonForm.content_type === "video" || lessonForm.content_type === "image" || lessonForm.content_type === "document") && (
                <div>
                  <Label htmlFor="lesson-media">Media URL</Label>
                  <Input
                    id="lesson-media"
                    value={lessonForm.media_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, media_url: e.target.value })}
                    placeholder="https://example.com/video.mp4"
                    autoComplete="off"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="lesson-content">Content</Label>
                <Textarea
                  id="lesson-content"
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  placeholder="Lesson content..."
                  rows={10}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="lesson-published"
                  checked={lessonForm.is_published}
                  onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_published: checked })}
                />
                <Label htmlFor="lesson-published">Published</Label>
              </div>
              <Button
                onClick={editingLesson ? handleUpdateLesson : handleCreateLesson}
                className="w-full"
              >
                {editingLesson ? "Update Lesson" : "Create Lesson"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Question Dialog */}
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Create Question"}</DialogTitle>
              <DialogDescription>
                {editingQuestion ? "Update the exam question" : "Create a new exam question"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="question-text">Question Text</Label>
                <Textarea
                  id="question-text"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  placeholder="What does a red traffic light mean?"
                  rows={2}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="question-image">Question Image URL (optional)</Label>
                <Input
                  id="question-image"
                  value={questionForm.question_image}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  autoComplete="off"
                />
              </div>
              {(["A", "B", "C", "D"] as const).map((opt) => (
                <div key={opt} className="space-y-2">
                  <Label>Option {opt}</Label>
                  <Input
                    value={questionForm[`option_${opt.toLowerCase()}` as any]}
                    onChange={(e) => setQuestionForm({ ...questionForm, [`option_${opt.toLowerCase()}`]: e.target.value } as any)}
                    placeholder={`Option ${opt} text`}
                    autoComplete="off"
                  />
                  <Input
                    value={questionForm[`option_${opt.toLowerCase()}_image` as any]}
                    onChange={(e) => setQuestionForm({ ...questionForm, [`option_${opt.toLowerCase()}_image`]: e.target.value } as any)}
                    placeholder={`Option ${opt} image URL (optional)`}
                    autoComplete="off"
                  />
                </div>
              ))}
              <div>
                <Label htmlFor="correct-answer">Correct Answer</Label>
                <select
                  id="correct-answer"
                  value={questionForm.correct_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                  autoComplete="off"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div>
                <Label htmlFor="explanation">Explanation (optional)</Label>
                <Textarea
                  id="explanation"
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explanation for why this is the correct answer..."
                  rows={2}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="question-published"
                  checked={questionForm.is_published}
                  onCheckedChange={(checked) => setQuestionForm({ ...questionForm, is_published: checked })}
                />
                <Label htmlFor="question-published">Published</Label>
              </div>
              <Button
                onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
                className="w-full"
              >
                {editingQuestion ? "Update Question" : "Create Question"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Module Exam Settings</DialogTitle>
              <DialogDescription>Configure the exam for this module</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="question-count">Number of Questions</Label>
                <Input
                  id="question-count"
                  type="number"
                  value={settingsForm.question_count}
                  onChange={(e) => setSettingsForm({ ...settingsForm, question_count: parseInt(e.target.value) || 20 })}
                  min={1}
                  max={200}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={settingsForm.duration_minutes}
                  onChange={(e) => setSettingsForm({ ...settingsForm, duration_minutes: parseInt(e.target.value) || 20 })}
                  min={1}
                  max={300}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="passing-score">Passing Score (%)</Label>
                <Input
                  id="passing-score"
                  type="number"
                  value={settingsForm.passing_score}
                  onChange={(e) => setSettingsForm({ ...settingsForm, passing_score: parseInt(e.target.value) || 70 })}
                  min={0}
                  max={100}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="max-attempts">Max Attempts</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  value={settingsForm.max_attempts}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_attempts: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="randomize-questions"
                  checked={settingsForm.randomize_questions}
                  onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, randomize_questions: checked })}
                />
                <Label htmlFor="randomize-questions">Randomize Questions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="randomize-answers"
                  checked={settingsForm.randomize_answers}
                  onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, randomize_answers: checked })}
                />
                <Label htmlFor="randomize-answers">Randomize Answer Choices</Label>
              </div>
              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
