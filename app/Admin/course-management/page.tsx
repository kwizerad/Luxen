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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Layers,
  GripVertical,
  FileText,
  ArrowLeft,
  Globe,
  Settings,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import type { CourseModule, CourseLesson, CourseLanguageCourse } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";
import { Reorder } from "framer-motion";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;
const DEFAULT_LANGUAGES = ["English", "Kinyarwanda", "French"] as const;
type CourseLanguage = string; // Dynamic language support

const getTranslation = (value: string, translations: Record<string, string> | undefined | null, lang: CourseLanguage) => {
  if (lang === "English") return value;
  return translations?.[lang] || "";
};

export default function CourseManagementPage() {
  const { config } = useBrandingConfig();
  const router = useRouter();

  const [languageCourses, setLanguageCourses] = useState<CourseLanguageCourse[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Language course form state
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [editingLanguageCourse, setEditingLanguageCourse] = useState<CourseLanguageCourse | null>(null);
  const [languageForm, setLanguageForm] = useState({
    language: "",
    is_published: false,
  });

  // Module form state
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleEditingLanguage, setModuleEditingLanguage] = useState<CourseLanguage>("English");
  const [moduleForm, setModuleForm] = useState({
    language_id: "",
    title: "",
    description: "",
    title_translations: {} as Record<string, string>,
    description_translations: {} as Record<string, string>,
    is_published: false,
  });

  // Lesson form state
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [lessonEditingLanguage, setLessonEditingLanguage] = useState<CourseLanguage>("English");
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content: "",
    title_translations: {} as Record<string, string>,
    content_translations: {} as Record<string, string>,
    content_type: "text" as "text" | "video" | "image" | "document" | "mixed",
    media_url: "",
    image_url: "",
    is_published: false,
  });

  const [showLessonPreviewDialog, setShowLessonPreviewDialog] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<CourseLesson | null>(null);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadData();
    }
  }, [hasPermission, activeModule]);

  // Auto-select first language course if none selected
  useEffect(() => {
    if (languageCourses.length > 0 && !activeLanguage) {
      setActiveLanguage(languageCourses[0].id);
    }
  }, [languageCourses]);

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
    return accessToken ? { "Authorization": `Bearer ${accessToken}` } : {} as Record<string, string>;
  };

  // Localized field helpers for modules
  const getModuleTitle = () =>
    moduleEditingLanguage === "English"
      ? moduleForm.title
      : moduleForm.title_translations[moduleEditingLanguage] || "";
  const setModuleTitle = (value: string) =>
    moduleEditingLanguage === "English"
      ? setModuleForm({ ...moduleForm, title: value })
      : setModuleForm({
          ...moduleForm,
          title_translations: { ...moduleForm.title_translations, [moduleEditingLanguage]: value },
        });

  const getModuleDescription = () =>
    moduleEditingLanguage === "English"
      ? moduleForm.description
      : moduleForm.description_translations[moduleEditingLanguage] || "";
  const setModuleDescription = (value: string) =>
    moduleEditingLanguage === "English"
      ? setModuleForm({ ...moduleForm, description: value })
      : setModuleForm({
          ...moduleForm,
          description_translations: { ...moduleForm.description_translations, [moduleEditingLanguage]: value },
        });

  // Localized field helpers for lessons
  const getLessonTitle = () =>
    lessonEditingLanguage === "English"
      ? lessonForm.title
      : lessonForm.title_translations[lessonEditingLanguage] || "";
  const setLessonTitle = (value: string) =>
    lessonEditingLanguage === "English"
      ? setLessonForm({ ...lessonForm, title: value })
      : setLessonForm({
          ...lessonForm,
          title_translations: { ...lessonForm.title_translations, [lessonEditingLanguage]: value },
        });

  const getLessonContent = () =>
    lessonEditingLanguage === "English"
      ? lessonForm.content
      : lessonForm.content_translations[lessonEditingLanguage] || "";
  const setLessonContent = (value: string) =>
    lessonEditingLanguage === "English"
      ? setLessonForm({ ...lessonForm, content: value })
      : setLessonForm({
          ...lessonForm,
          content_translations: { ...lessonForm.content_translations, [lessonEditingLanguage]: value },
        });

  const loadData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      // Load language courses
      try {
        const languagesResponse = await fetch("/api/course-languages", { headers });
        const languagesData = await languagesResponse.json();
        setLanguageCourses(languagesData.languages || []);
      } catch (error: any) {
        console.error("Failed to load language courses:", error);
        setLanguageCourses([]);
      }

      // Load modules via API
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);

      // Load lessons if module is selected
      if (activeModule) {
        const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons || []);
      } else {
        setLessons([]);
      }
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLanguage = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/course-languages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(languageForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to create language course");

      toast.success("Language course created successfully");
      setShowLanguageDialog(false);
      setLanguageForm({ language: "", is_published: false });
      
      // Reload language courses
      const languagesResponse = await fetch("/api/course-languages", { headers });
      const languagesData = await languagesResponse.json();
      setLanguageCourses(languagesData.languages || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateLanguage = async () => {
    if (!editingLanguageCourse) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-languages/${editingLanguageCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(languageForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update language course");

      // Check if language was just published
      const wasJustPublished = !editingLanguageCourse.is_published && languageForm.is_published;
      
      toast.success("Language course updated successfully");
      setShowLanguageDialog(false);
      setEditingLanguageCourse(null);
      setLanguageForm({ language: "", is_published: false });
      
      // Reload language courses
      const languagesResponse = await fetch("/api/course-languages", { headers });
      const languagesData = await languagesResponse.json();
      setLanguageCourses(languagesData.languages || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteLanguage = async (languageId: string) => {
    if (!confirm("Are you sure you want to delete this language course? This will also delete all associated modules and lessons.")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-languages/${languageId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to delete language course");

      toast.success("Language course deleted successfully");
      
      // Reload language courses
      const languagesResponse = await fetch("/api/course-languages", { headers });
      const languagesData = await languagesResponse.json();
      setLanguageCourses(languagesData.languages || []);
      
      // Reset active language if it was deleted
      if (activeLanguage === languageId) {
        setActiveLanguage(null);
      }
    } catch (error: any) {
      toast.error(error.message);
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
      setModuleForm({
        language_id: "",
        title: "",
        description: "",
        title_translations: {},
        description_translations: {},
        is_published: false,
      });
      setEditingModule(null);
      
      // Reload modules
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

      // Check if module was just published
      const wasJustPublished = !editingModule.is_published && moduleForm.is_published;
      
      toast.success("Module updated successfully");
      setShowModuleDialog(false);
      setModuleForm({
        language_id: "",
        title: "",
        description: "",
        title_translations: {},
        description_translations: {},
        is_published: false,
      });
      setEditingModule(null);
      
      // Reload modules
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);

      // Notify all students if module was just published
      if (wasJustPublished) {
        try {
          const languageData = languageCourses.find(l => l.id === editingModule.language_id);
          const headers = await getAuthHeaders();
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
              title: 'New Module Available',
              message: `A new module "${moduleForm.title}" is now available in ${languageData?.title || 'your course'}!`,
              type: 'module_published',
              target_role: 'student',
              data: { module_id: editingModule.id, language_id: editingModule.language_id, title: moduleForm.title }
            }),
          });
        } catch (error) {
          console.error("Failed to send notifications:", error);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module? This will also delete all associated lessons.")) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/course-modules/${moduleId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to delete module");

      toast.success("Module deleted successfully");
      
      // Reload modules
      const modulesResponse = await fetch("/api/course-modules", { headers });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);
      
      // Reset active module if it was deleted
      if (activeModule === moduleId) {
        setActiveModule(null);
        setLessons([]);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateLesson = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/course-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(lessonForm),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to create lesson");

      toast.success("Lesson created successfully");
      setShowLessonDialog(false);
      setLessonForm({
        title: "",
        content: "",
        title_translations: {},
        content_translations: {},
        content_type: "text",
        media_url: "",
        image_url: "",
        is_published: false,
      });
      setEditingLesson(null);
      
      // Reload lessons
      if (activeModule) {
        const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons || []);
      }
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

      // Check if lesson was just published
      const wasJustPublished = !editingLesson.is_published && lessonForm.is_published;
      
      toast.success("Lesson updated successfully");
      setShowLessonDialog(false);
      setLessonForm({
        title: "",
        content: "",
        title_translations: {},
        content_translations: {},
        content_type: "text",
        media_url: "",
        image_url: "",
        is_published: false,
      });
      setEditingLesson(null);
      
      // Reload lessons
      if (activeModule) {
        const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons || []);
      }

      // Notify all students if lesson was just published
      if (wasJustPublished) {
        try {
          const moduleData = modules.find(m => m.id === editingLesson.module_id);
          const headers = await getAuthHeaders();
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
              title: 'New Lesson Available',
              message: `A new lesson "${lessonForm.title}" is now available in ${moduleData?.title || 'your course'}!`,
              type: 'lesson_published',
              target_role: 'student',
              data: { lesson_id: editingLesson.id, module_id: editingLesson.module_id, title: lessonForm.title }
            }),
          });
        } catch (error) {
          console.error("Failed to send notifications:", error);
        }
      }
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
      
      // Reload lessons
      if (activeModule) {
        const lessonsResponse = await fetch(`/api/course-lessons?module_id=${activeModule}`, { headers });
        const lessonsData = await lessonsResponse.json();
        setLessons(lessonsData.lessons || []);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReorderModules = (newModules: CourseModule[]) => {
    setModules(newModules);
    // Update order_index in backend
    newModules.forEach((module, index) => {
      fetch(`/api/course-modules/${module.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: index }),
      });
    });
  };

  const handleReorderLessons = (newLessons: CourseLesson[]) => {
    setLessons(newLessons);
    // Update order_index in backend
    newLessons.forEach((lesson, index) => {
      fetch(`/api/course-lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: index }),
      });
    });
  };

  const openLanguageDialog = (languageCourse?: CourseLanguageCourse) => {
    if (languageCourse) {
      setEditingLanguageCourse(languageCourse);
      setLanguageForm({
        language: languageCourse.language,
        is_published: languageCourse.is_published,
      });
    } else {
      setEditingLanguageCourse(null);
      setLanguageForm({ language: "", is_published: false });
    }
    setShowLanguageDialog(true);
  };

  const openModuleDialog = (module?: CourseModule) => {
    if (module) {
      setEditingModule(module);
      setModuleForm({
        language_id: module.language_id || "",
        title: module.title,
        description: module.description || "",
        title_translations: module.title_translations || {},
        description_translations: module.description_translations || {},
        is_published: module.is_published,
      });
    } else {
      setEditingModule(null);
      setModuleForm({
        language_id: activeLanguage || "",
        title: "",
        description: "",
        title_translations: {},
        description_translations: {},
        is_published: false,
      });
    }
    setShowModuleDialog(true);
  };

  const openLessonDialog = (lesson?: CourseLesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        content: lesson.content,
        title_translations: lesson.title_translations || {},
        content_translations: lesson.content_translations || {},
        content_type: lesson.content_type,
        media_url: lesson.media_url || "",
        image_url: lesson.image_url || "",
        is_published: lesson.is_published,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: "",
        content: "",
        title_translations: {},
        content_translations: {},
        content_type: "text",
        media_url: "",
        image_url: "",
        is_published: false,
      });
    }
    setShowLessonDialog(true);
  };

  const openLessonPreview = (lesson: CourseLesson) => {
    setPreviewLesson(lesson);
    setShowLessonPreviewDialog(true);
  };

  const activeLanguageData = languageCourses.find(l => l.id === activeLanguage);
  const activeModuleData = modules.find(m => m.id === activeModule);

  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="flex items-start gap-4 p-6">
            <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Access Denied</h3>
              <p className="text-destructive/80 mt-1">
                You don't have permission to manage courses. Please contact the administrator for access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Watermark />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Course Management</h1>
            <p className="text-muted-foreground">
              {activeModuleData
                ? `${activeLanguageData?.title || 'Course'} > ${activeModuleData.title} > Lessons`
                : activeLanguageData
                ? `${activeLanguageData.title} > Modules`
                : "Select a language course to manage its modules and lessons"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeModule && (
              <Button variant="outline" onClick={() => setActiveModule(null)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Modules
              </Button>
            )}
            <Link href="/Admin">
              <Button variant="outline">Admin</Button>
            </Link>
          </div>
        </div>

        {/* Language Course Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {languageCourses.map((lang) => (
            <Card
              key={lang.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${activeLanguage === lang.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveLanguage(lang.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      {lang.language}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {lang.title || lang.language}
                    </CardDescription>
                  </div>
                  <Badge variant={lang.is_published ? "default" : "secondary"}>
                    {lang.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {modules.filter(m => m.language_id === lang.id).length} modules
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLanguageDialog(lang);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-dashed"
            onClick={() => openLanguageDialog()}
          >
            <CardHeader>
              <div className="flex items-center justify-center min-h-[100px]">
                <div className="text-center">
                  <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Add Language Course</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Module List for Selected Language */}
        {activeLanguage && !activeModule && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modules</CardTitle>
                  <CardDescription>
                    {activeLanguageData ? `Modules for ${activeLanguageData.title}` : "Select a language course first"}
                  </CardDescription>
                </div>
                <Button onClick={() => openModuleDialog()} disabled={!activeLanguage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!activeLanguage ? (
                <p className="text-center text-muted-foreground py-8">Please select a language course to view its modules.</p>
              ) : modules.filter(m => m.language_id === activeLanguage).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No modules yet for this language. Create your first module to get started.</p>
              ) : (
                <Reorder.Group axis="y" values={modules.filter(m => m.language_id === activeLanguage)} onReorder={handleReorderModules}>
                  <div className="space-y-3">
                    {modules.filter(m => m.language_id === activeLanguage).map((module, index) => (
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
                            onClick={() => setActiveModule(module.id)}
                          >
                            <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{module.title}</span>
                                <Badge variant={module.is_published ? "default" : "secondary"}>
                                  {module.is_published ? "Published" : "Draft"}
                                </Badge>
                              </div>
                              {module.description && (
                                <p className="text-sm text-muted-foreground">{module.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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

        {/* Lessons for Selected Module */}
        {activeModule && activeModuleData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {activeModuleData.title} - Lessons
                  </CardTitle>
                  <CardDescription>
                    Manage lessons for this module
                  </CardDescription>
                </div>
                <Button onClick={() => openLessonDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No lessons yet for this module. Create your first lesson to get started.</p>
              ) : (
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
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
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
                                <Badge variant={lesson.is_published ? "default" : "secondary"}>
                                  {lesson.is_published ? "Published" : "Draft"}
                                </Badge>
                                {lesson.content_type !== "text" && (
                                  <Badge variant="outline" className="text-xs">
                                    {lesson.content_type}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {lesson.content.substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openLessonPreview(lesson)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Language Dialog */}
        <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
          <DialogContent className="sm:max-w-[425px] max-w-[95vw] w-full">
            <DialogHeader>
              <DialogTitle>{editingLanguageCourse ? "Edit Language Course" : "Create Language Course"}</DialogTitle>
              <DialogDescription>
                {editingLanguageCourse ? "Update the language course details" : "Create a new language course"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="language-name">Language Name</Label>
                <Input
                  id="language-name"
                  value={languageForm.language}
                  onChange={(e) => setLanguageForm({ ...languageForm, language: e.target.value })}
                  placeholder="e.g., English, Kinyarwanda, French, Spanish..."
                  disabled={!!editingLanguageCourse}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editingLanguageCourse ? "Language name cannot be changed after creation" : "Enter a unique language name"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="language-published"
                  checked={languageForm.is_published}
                  onCheckedChange={(checked) => setLanguageForm({ ...languageForm, is_published: checked })}
                />
                <Label htmlFor="language-published">Published</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={editingLanguageCourse ? handleUpdateLanguage : handleCreateLanguage}
                  className="flex-1"
                >
                  {editingLanguageCourse ? "Update Language Course" : "Create Language Course"}
                </Button>
                {editingLanguageCourse && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowLanguageDialog(false);
                      handleDeleteLanguage(editingLanguageCourse.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
              <DialogDescription>
                {editingLesson ? "Update the lesson content" : `Create a new lesson for ${activeModuleData?.title || 'selected module'}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Language Course</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Layers className="h-4 w-4" />
                  <span className="font-medium">{activeLanguageData?.title || 'Not selected'}</span>
                </div>
              </div>
              <div>
                <Label>Module</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">{activeModuleData?.title || 'Not selected'}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="lesson-language">Translation Language</Label>
                <Select value={lessonEditingLanguage} onValueChange={(value) => setLessonEditingLanguage(value as CourseLanguage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lesson-title">Title ({lessonEditingLanguage})</Label>
                <Input
                  id="lesson-title"
                  value={getLessonTitle()}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Lesson title..."
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="lesson-content">Content ({lessonEditingLanguage})</Label>
                <Textarea
                  id="lesson-content"
                  value={getLessonContent()}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Lesson content..."
                  rows={6}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="lesson-content-type">Content Type</Label>
                <Select value={lessonForm.content_type} onValueChange={(value) => setLessonForm({ ...lessonForm, content_type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(lessonForm.content_type === "video" || lessonForm.content_type === "mixed") && (
                <div>
                  <Label htmlFor="lesson-media-url">Media URL</Label>
                  <Input
                    id="lesson-media-url"
                    value={lessonForm.media_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, media_url: e.target.value })}
                    placeholder="https://..."
                    autoComplete="off"
                  />
                </div>
              )}
              {(lessonForm.content_type === "image" || lessonForm.content_type === "mixed") && (
                <div>
                  <Label htmlFor="lesson-image-url">Image URL</Label>
                  <Input
                    id="lesson-image-url"
                    value={lessonForm.image_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, image_url: e.target.value })}
                    placeholder="https://..."
                    autoComplete="off"
                  />
                </div>
              )}
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

        {/* Lesson Preview Dialog */}
        <Dialog open={showLessonPreviewDialog} onOpenChange={setShowLessonPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lesson Preview</DialogTitle>
              <DialogDescription>
                Preview of "{previewLesson?.title}"
              </DialogDescription>
            </DialogHeader>
            {previewLesson && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{previewLesson.title}</h3>
                  {previewLesson.content_type !== "text" && (
                    <Badge variant="outline" className="mt-2">
                      {previewLesson.content_type}
                    </Badge>
                  )}
                </div>
                {previewLesson.content_type === "video" && previewLesson.media_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video controls className="w-full h-full">
                      <source src={previewLesson.media_url} />
                    </video>
                  </div>
                )}
                {previewLesson.content_type === "image" && previewLesson.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={previewLesson.image_url} alt={previewLesson.title} className="w-full" />
                  </div>
                )}
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: previewLesson.content }} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Module Dialog */}
        <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingModule ? "Edit Module" : "Create Module"}</DialogTitle>
              <DialogDescription>
                {editingModule ? "Update the module details" : `Create a new module for ${activeLanguageData?.title || 'selected language'}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Language Course</Label>
                <Select 
                  value={moduleForm.language_id} 
                  onValueChange={(value) => setModuleForm({ ...moduleForm, language_id: value })}
                  disabled={!!editingModule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language course" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageCourses.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="module-language">Translation Language</Label>
                <Select value={moduleEditingLanguage} onValueChange={(value) => setModuleEditingLanguage(value as CourseLanguage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="module-title">Title ({moduleEditingLanguage})</Label>
                <Input
                  id="module-title"
                  value={getModuleTitle()}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="Module title..."
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="module-description">Description ({moduleEditingLanguage})</Label>
                <Textarea
                  id="module-description"
                  value={getModuleDescription()}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  placeholder="Module description..."
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
      </div>
    </>
  );
}