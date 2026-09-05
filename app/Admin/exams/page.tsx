"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Plus, BookOpen, CheckCircle, Image as ImageIcon, X, Edit, Trash2, Loader2, ChevronDown, Settings, Eye, EyeOff, AlertTriangle, Trophy, Users, Globe, Lock, ArrowUpDown, Database } from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import type { ExamCategory, ExamQuestion, ExamQuestionSortingMode } from "@/lib/database.types";
import { ImageUpload } from "@/components/image-upload";
import { createClient } from "@/lib/supabase/client";
import {
  getExamCategories,
  getExamQuestions,
  createExamCategory,
  updateExamCategory,
  deleteExamCategory,
  toggleCategoryPublishStatus,
  createExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
  getExamSettings,
  updateExamSettings,
  getExamAttempts,
  getExamSavingConfig,
  updateExamSavingConfig,
} from "@/lib/supabase/queries";
import { isAdmin, canAddQuestions, canViewQuestions, canManageExamSettings } from "@/lib/permissions";
import { DEFAULT_EXAM_SETTINGS } from "@/lib/exam-settings";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

export default function ExamManagementPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<ExamQuestion[]>([]);
  const [categoryQuestionCounts, setCategoryQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [canAddQuestionPermission, setCanAddQuestionPermission] = useState(false);
  const [canViewQuestionsTab, setCanViewQuestionsTab] = useState(false);
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isPrimaryAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByImage, setFilterByImage] = useState<"all" | "with" | "without">("all");

  // Sorting state
  type SortField = 'question' | 'correct_answer' | 'created_at';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Exam results state
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  
  // Category form state
  const [categoryName, setCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExamCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");
  const editQuestionId = searchParams.get("edit");
  
  // Question form state
  const [questionForm, setQuestionForm] = useState({
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
  });
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showQuestionImage, setShowQuestionImage] = useState(false);
  const [showOptionImages, setShowOptionImages] = useState<{[key: string]: boolean}>({
    A: false, B: false, C: false, D: false
  });

  // Exam settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<ExamCategory | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    alwaysAvailable: true,
    available_from: "" as string,
    available_to: "" as string,
    question_count: DEFAULT_EXAM_SETTINGS.question_count,
    duration_minutes: DEFAULT_EXAM_SETTINGS.duration_minutes,
    passing_percentage: DEFAULT_EXAM_SETTINGS.passing_percentage,
    sorting_mode: DEFAULT_EXAM_SETTINGS.sorting_mode as ExamQuestionSortingMode,
  });

  // Exam Saving & Persistence configuration modal
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [saveIndividualExams, setSaveIndividualExams] = useState(true);
  const [saveGroupExams, setSaveGroupExams] = useState(true);
  const [loadingSavingConfig, setLoadingSavingConfig] = useState(false);
  const [savingPersistence, setSavingPersistence] = useState(false);

  const openSavingModal = async () => {
    setShowSavingModal(true);
    setLoadingSavingConfig(true);
    try {
      const config = await getExamSavingConfig();
      setSaveIndividualExams(config.saveIndividualExams);
      setSaveGroupExams(config.saveGroupExams);
    } catch (e: any) {
      toast.error("Failed to load exam saving config: " + e.message);
    } finally {
      setLoadingSavingConfig(false);
    }
  };

  const handleSavePersistenceConfig = async () => {
    setSavingPersistence(true);
    try {
      await updateExamSavingConfig({
        saveIndividualExams,
        saveGroupExams,
      });
      toast.success(t("examPersistenceSettingsSaved") || "Exam saving settings saved successfully");
      setShowSavingModal(false);
    } catch (e: any) {
      toast.error((t("failedToSaveSettings") || "Failed to save settings: ") + e.message);
    } finally {
      setSavingPersistence(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkPermissions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !isAdmin(user)) {
        router.push("/Admin");
        return;
      }

      setCurrentUser(user);

      const canAdd = canAddQuestions(user);
      const canView = canViewQuestions(user);
      const canManage = canManageExamSettings(user);
      const hasExamAccess = canAdd || canView || canManage;

      if (!hasExamAccess) {
        router.push("/Admin");
        return;
      }

      setHasPermission(hasExamAccess);
      setCanAddQuestionPermission(canAdd);
      setCanViewQuestionsTab(canView);
      setCanManageSettings(canManage);
      loadCategories();
      // Check if editing a question from query params
      if (editQuestionId) {
        loadQuestionForEdit(editQuestionId);
      }
    };

    checkPermissions();
  }, [editQuestionId, router]);

  const loadCategories = async () => {
    try {
      const data = await getExamCategories();
      if (data.categories) {
        setCategories(data.categories);
        // Load question counts for each category
        const counts: Record<string, number> = {};
        for (const category of data.categories) {
          const qData = await getExamQuestions(category.id);
          counts[category.id] = qData.questions?.length || 0;
        }
        setCategoryQuestionCounts(counts);
      }
    } catch (error: any) {
      toast.error(t("failedToLoadCategories") + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (categoryId: string) => {
    try {
      const data = await getExamQuestions(categoryId);
      if (data.questions) {
        setQuestions(data.questions);
        setFilteredQuestions(data.questions);
        // Update the count for this category
        setCategoryQuestionCounts(prev => ({
          ...prev,
          [categoryId]: data.questions.length
        }));
      }
    } catch (error: any) {
      toast.error(t("failedToLoadQuestions") + ": " + error.message);
    }
  };

  useEffect(() => {
    let filtered = questions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question?.toLowerCase().includes(query) ||
        q.option_a?.toLowerCase().includes(query) ||
        q.option_b?.toLowerCase().includes(query) ||
        q.option_c?.toLowerCase().includes(query) ||
        q.option_d?.toLowerCase().includes(query) ||
        q.explanation?.toLowerCase().includes(query)
      );
    }

    // Apply image filter
    if (filterByImage === "with") {
      filtered = filtered.filter(q => 
        q.question_image || q.option_a_image || q.option_b_image || 
        q.option_c_image || q.option_d_image
      );
    } else if (filterByImage === "without") {
      filtered = filtered.filter(q => 
        !q.question_image && !q.option_a_image && !q.option_b_image && 
        !q.option_c_image && !q.option_d_image
      );
    }

    // Sort questions
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'question':
          comparison = (a.question || '').localeCompare(b.question || '');
          break;
        case 'correct_answer':
          comparison = a.correct_answer.localeCompare(b.correct_answer);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredQuestions(sorted);
  }, [questions, searchQuery, filterByImage, sortField, sortDirection]);

  const toLocalInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openSettingsForCategory = async (category: ExamCategory) => {
    setSettingsCategory(category);
    setShowSettingsModal(true);
    setLoadingSettings(true);
    try {
      const data = await getExamSettings(category.id);
      if (data?.settings) {
        const s = data.settings;
        const always = !s.available_from && !s.available_to;
        setSettingsForm({
          alwaysAvailable: always,
          available_from: s.available_from ? toLocalInputValue(s.available_from) : "",
          available_to: s.available_to ? toLocalInputValue(s.available_to) : "",
          question_count: s.question_count ?? DEFAULT_EXAM_SETTINGS.question_count,
          duration_minutes: s.duration_minutes ?? DEFAULT_EXAM_SETTINGS.duration_minutes,
          passing_percentage: s.passing_percentage ?? DEFAULT_EXAM_SETTINGS.passing_percentage,
          sorting_mode: (s.sorting_mode ?? DEFAULT_EXAM_SETTINGS.sorting_mode) as ExamQuestionSortingMode,
        });
      }
    } catch (error: any) {
      toast.error(t("failedToLoadExamSettings") + ": " + error.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveExamSettings = async () => {
    if (!settingsCategory) return;
    setSavingSettings(true);
    try {
      const payload = {
        question_count: settingsForm.question_count,
        duration_minutes: settingsForm.duration_minutes,
        passing_percentage: settingsForm.passing_percentage,
        sorting_mode: settingsForm.sorting_mode,
        available_from: settingsForm.alwaysAvailable || !settingsForm.available_from ? null : new Date(settingsForm.available_from).toISOString(),
        available_to: settingsForm.alwaysAvailable || !settingsForm.available_to ? null : new Date(settingsForm.available_to).toISOString(),
      };
      await updateExamSettings(settingsCategory.id, payload);
      toast.success(t("examSettingsSaved"));
      setShowSettingsModal(false);
    } catch (error: any) {
      toast.error(t("failedToSaveSettings") + ": " + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error(t("categoryNameRequired"));
      return;
    }

    setCreatingCategory(true);
    try {
      const data = await createExamCategory(categoryName);
      toast.success(t("categoryCreatedSuccess"));
      setCategories([data.category, ...categories]);
      setCategoryName("");
    } catch (error: any) {
      toast.error(t("failedToCreateCategory") + ": " + error.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleEditCategory = (category: ExamCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setShowEditCategoryModal(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) {
      toast.error(t("categoryNameRequired"));
      return;
    }

    setCreatingCategory(true);
    try {
      const data = await updateExamCategory(editingCategory.id, editCategoryName);
      toast.success(t("categoryUpdatedSuccess"));
      setCategories(categories.map(c => c.id === editingCategory.id ? data.category : c));
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      setEditCategoryName("");
    } catch (error: any) {
      toast.error(t("failedToUpdateCategory") + ": " + error.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm(t("confirmDeleteCategory"))) return;

    setDeletingCategory(categoryId);
    try {
      await deleteExamCategory(categoryId);
      toast.success(t("categoryDeletedSuccess"));
      setCategories(categories.filter(c => c.id !== categoryId));
      if (activeCategory === categoryId) {
        setActiveCategory(null);
        setQuestions([]);
        setFilteredQuestions([]);
      }
    } catch (error: any) {
      toast.error(t("failedToDeleteCategory") + ": " + error.message);
    } finally {
      setDeletingCategory(null);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) {
      toast.error(t("pleaseSelectCategoryFirst"));
      return;
    }

    setCreatingQuestion(true);
    try {
      const data = await createExamQuestion({
        ...questionForm,
        category_id: activeCategory,
      });
      toast.success(t("questionAddedSuccess"));
      setQuestions([data.question, ...questions]);
      // Update category question count
      setCategoryQuestionCounts(prev => ({
        ...prev,
        [activeCategory]: (prev[activeCategory] || 0) + 1
      }));
      // Reset form but keep modal open for simultaneous inserts
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
      });
      setShowQuestionImage(false);
      setShowOptionImages({ A: false, B: false, C: false, D: false });
    } catch (error: any) {
      toast.error(t("failedToAddQuestion") + ": " + error.message);
    } finally {
      setCreatingQuestion(false);
    }
  };

  const selectCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    loadQuestions(categoryId);
  };

  const openAddQuestionModal = (categoryId: string) => {
    setActiveCategory(categoryId);
    loadQuestions(categoryId);
    closeQuestionModal();
    setTimeout(() => {
      openQuestionModal();
    }, 100);
  };

  const openQuestionModal = () => {
    setShowQuestionModal(true);
  };

  const closeQuestionModal = () => {
    setShowQuestionModal(false);
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
    });
    setShowQuestionImage(false);
    setShowOptionImages({ A: false, B: false, C: false, D: false });
  };

  const handleEditQuestion = (q: ExamQuestion) => {
    setEditingQuestion(q.id);
    setQuestionForm({
      question: q.question || "",
      question_image: q.question_image || "",
      option_a: q.option_a || "",
      option_a_image: q.option_a_image || "",
      option_b: q.option_b || "",
      option_b_image: q.option_b_image || "",
      option_c: q.option_c || "",
      option_c_image: q.option_c_image || "",
      option_d: q.option_d || "",
      option_d_image: q.option_d_image || "",
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
    });
    // Set image visibility based on existing data
    setShowQuestionImage(!!q.question_image);
    setShowOptionImages({
      A: !!q.option_a_image,
      B: !!q.option_b_image,
      C: !!q.option_c_image,
      D: !!q.option_d_image,
    });
    setShowQuestionModal(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setCreatingQuestion(true);
    try {
      const data = await updateExamQuestion(editingQuestion, {
        ...questionForm,
      });
      toast.success(t("questionUpdatedSuccess"));
      setQuestions(questions.map(q => q.id === editingQuestion ? data.question : q));
      closeQuestionModal();
      // If came from questions page, go back
      if (returnTo === "questions") {
        router.push("/Admin/questions");
      }
    } catch (error: any) {
      toast.error(t("failedToUpdateQuestion") + ": " + error.message);
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm(t("confirmDeleteQuestion"))) return;

    setDeletingQuestion(questionId);
    try {
      await deleteExamQuestion(questionId);
      toast.success(t("questionDeletedSuccess"));
      setQuestions(questions.filter(q => q.id !== questionId));
      // Update category question count
      if (activeCategory) {
        setCategoryQuestionCounts(prev => ({
          ...prev,
          [activeCategory]: Math.max(0, (prev[activeCategory] || 0) - 1)
        }));
      }
    } catch (error: any) {
      toast.error(t("failedToDeleteQuestion") + ": " + error.message);
    } finally {
      setDeletingQuestion(null);
    }
  };

  const handleCancelEdit = () => {
    closeQuestionModal();
    // If came from questions page, go back
    if (returnTo === "questions") {
      router.push("/Admin/questions");
    }
  };

  const loadQuestionForEdit = async (questionId: string) => {
    try {
      const data = await getExamQuestions();
      if (data.questions) {
        const q = data.questions.find((q: ExamQuestion) => q.id === questionId);
        if (q) {
          setEditingQuestion(q.id);
          setActiveCategory(q.category_id);
          loadQuestions(q.category_id);
          setQuestionForm({
            question: q.question || "",
            question_image: q.question_image || "",
            option_a: q.option_a || "",
            option_a_image: q.option_a_image || "",
            option_b: q.option_b || "",
            option_b_image: q.option_b_image || "",
            option_c: q.option_c || "",
            option_c_image: q.option_c_image || "",
            option_d: q.option_d || "",
            option_d_image: q.option_d_image || "",
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
          });
          // Set image visibility based on existing data
          setShowQuestionImage(!!q.question_image);
          setShowOptionImages({
            A: !!q.option_a_image,
            B: !!q.option_b_image,
            C: !!q.option_c_image,
            D: !!q.option_d_image,
          });
          // Open modal after a short delay
          setTimeout(() => {
            setShowQuestionModal(true);
          }, 100);
        }
      }
    } catch (error: any) {
      toast.error(t("failedToLoadQuestionForEdit") + ": " + error.message);
    }
  };

  const loadExamResults = async () => {
    setLoadingResults(true);
    try {
      const data = await getExamAttempts();
      if (data.attempts) {
        setExamAttempts(data.attempts);
      }
    } catch (error: any) {
      toast.error(t("failedToLoadExamResults") + ": " + error.message);
    } finally {
      setLoadingResults(false);
    }
  };

  const openResultsModal = () => {
    loadExamResults();
    setShowResultsModal(true);
  };

  const viewAttemptDetails = (attempt: any) => {
    setSelectedAttempt(attempt);
  };

  const togglePublishCategory = async (category: ExamCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newStatus = !category.is_published;
    
    try {
      await toggleCategoryPublishStatus(category.id, newStatus);
      toast.success(newStatus ? t("categoryPublished").replace("{name}", category.name) : t("categoryUnpublished").replace("{name}", category.name));
      // Update local state
      setCategories(prev => prev.map(c => 
        c.id === category.id ? { ...c, is_published: newStatus } : c
      ));
    } catch (error: any) {
      toast.error(t("failedToUpdatePublishStatus") + ": " + error.message);
    }
  };

  const cardHoverClass = "hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300";

  if (loading) {
    return null;
  }

  if (!hasPermission) {
    return (
      <>
        {/* Floating Navo Button */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 bg-card/70 backdrop-blur-[20px] border border-border/20 rounded-full shadow-glass dark:shadow-glass-dark p-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
              {config.logoUrl ? (
                <Image src={config.logoUrl} alt={config.systemName} width={32} height={32} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">{config.logoText || "N"}</span>
              )}
            </div>
            <span className="text-sm font-medium pr-1">{config.systemName}</span>
          </Link>
        </div>
        
        <div className="flex items-center justify-center min-h-screen">
          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">{t("accessDenied")}</h3>
                <p className="text-destructive/80 mt-1">
                  {t("examManagementNoPermission")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-card/70 backdrop-blur-[20px] border border-border/20 rounded-full shadow-glass dark:shadow-glass-dark p-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={config.systemName} width={32} height={32} unoptimized className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <div className="space-y-6 relative">
        <Watermark />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold brand-protected">{t("examManagement")}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t("examManagementDescription")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isPrimaryAdmin || canManageSettings) && (
            <Button variant="outline" onClick={openSavingModal}>
              <Database className="h-4 w-4 mr-2" />
              {t("examSavingControls") || "Exam Saving Controls"}
            </Button>
          )}
          <Button onClick={() => setShowCategoryForm(!showCategoryForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showCategoryForm ? t("cancel") : t("addCategory")}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Create Category Form */}
        {showCategoryForm && currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <Card className={`${cardHoverClass} navo-card-brand`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("createNewCategory")}
              </CardTitle>
              <CardDescription>
                {t("addNewExamCategory")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryName">{t("categoryName")}</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder={t("categoryNamePlaceholder")}
                    required
                  />
                </div>
                <Button type="submit" disabled={creatingCategory}>
                  {creatingCategory ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("creating")}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("createCategory")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Edit Category Modal */}
        <Dialog open={showEditCategoryModal} onOpenChange={setShowEditCategoryModal}>
          <DialogContent className="sm:max-w-[425px] max-w-[95vw] w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                {t("editCategory")}
              </DialogTitle>
              <DialogDescription>
                {t("editCategoryDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="editCategoryName">{t("categoryName")}</Label>
                <Input
                  id="editCategoryName"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder={t("categoryNamePlaceholder")}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creatingCategory} className="flex-1">
                  {creatingCategory ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("updating")}
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      {t("updateCategory")}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditCategoryModal(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Categories List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const isPrimaryAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            
            return (
              <Card
                key={category.id}
                className={`${cardHoverClass} cursor-pointer navo-card-brand ${
                  activeCategory === category.id ? "border-primary ring-1 ring-primary" : ""
                }`}
                onClick={() => selectCategory(category.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="truncate">{category.name}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={category.is_published ? "default" : "secondary"}
                          className={`text-xs ${category.is_published ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}`}
                        >
                          {category.is_published ? (
                            <><Globe className="h-3 w-3 mr-1" /> {t("published")}</>
                          ) : (
                            <><Lock className="h-3 w-3 mr-1" /> {t("draft")}</>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Publish Toggle */}
                      {(isPrimaryAdmin || canManageSettings) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => togglePublishCategory(category, e)}
                          className={category.is_published ? "text-green-600" : "text-gray-500"}
                          title={category.is_published ? t("unpublishCategory") : t("publishCategory")}
                        >
                          {category.is_published ? (
                            <Globe className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {isPrimaryAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs flex items-center justify-between mt-2">
                    <span>{t("created")}: {new Date(category.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {categoryQuestionCounts[category.id] || 0} {t("questions")}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {canAddQuestionPermission && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddQuestionModal(category.id);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addQuestions")}
                  </Button>
                )}
                {canManageSettings && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSettingsForCategory(category);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t("settings")}
                  </Button>
                )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Questions List for Selected Category */}
        {activeCategory && (
          <Card className={`${cardHoverClass} navo-card-brand`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("questions")} - {categories.find(c => c.id === activeCategory)?.name}
              </CardTitle>
              <CardDescription>
                {filteredQuestions.length} {filteredQuestions.length !== 1 ? t("questionsFoundPlural") : t("questionFoundSingular")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search, Filter, and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder={t("searchQuestionsPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterByImage} onValueChange={(v: any) => setFilterByImage(v)}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allQuestions")}</SelectItem>
                    <SelectItem value="with">{t("withImages")}</SelectItem>
                    <SelectItem value="without">{t("withoutImages")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={`${sortField}-${sortDirection}`}
                  onValueChange={(v: string) => {
                    const [field, direction] = v.split('-') as [SortField, SortDirection];
                    setSortField(field);
                    setSortDirection(direction);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={t("sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at-desc">{t("newestFirst")}</SelectItem>
                    <SelectItem value="created_at-asc">{t("oldestFirst")}</SelectItem>
                    <SelectItem value="question-asc">{t("questionAZ")}</SelectItem>
                    <SelectItem value="question-desc">{t("questionZA")}</SelectItem>
                    <SelectItem value="correct_answer-asc">{t("answerAD")}</SelectItem>
                    <SelectItem value="correct_answer-desc">{t("answerDA")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => openAddQuestionModal(activeCategory)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addQuestion")}
                </Button>
              </div>

              {/* Questions Grid */}
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || filterByImage !== "all" ? t("noQuestionsMatchFilters") : t("noQuestionsInCategory")}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{t("correct")}: {question.correct_answer}</Badge>
                            {(question.question_image || question.option_a_image || question.option_b_image ||
                              question.option_c_image || question.option_d_image) && (
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                <ImageIcon className="h-3 w-3" />
                                {t("hasImages")}
                              </Badge>
                            )}
                          </div>
                          {question.question && (
                            <p className="text-sm mb-2 break-words">{question.question}</p>
                          )}
                          <div className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>A: {question.option_a || t("imageOnly")}</div>
                            <div>B: {question.option_b || t("imageOnly")}</div>
                            <div>C: {question.option_c || t("imageOnly")}</div>
                            <div>D: {question.option_d || t("imageOnly")}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:self-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditQuestion(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            disabled={deletingQuestion === question.id}
                          >
                            {deletingQuestion === question.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exam Settings Modal */}
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent className="sm:max-w-lg max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("examSettings")}</DialogTitle>
              <DialogDescription>
                {settingsCategory ? `${t("category")}: ${settingsCategory.name}` : t("configureExamRules")}
              </DialogDescription>
            </DialogHeader>

            {loadingSettings ? (
              <div className="text-center py-8 text-muted-foreground">{t("loading") || "Loading..."}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">{t("alwaysAvailable")}</div>
                    <div className="text-sm text-muted-foreground">{t("alwaysAvailableDescription")}</div>
                  </div>
                  <Switch
                    checked={settingsForm.alwaysAvailable}
                    onCheckedChange={(v) => setSettingsForm((p) => ({ ...p, alwaysAvailable: v }))}
                  />
                </div>

                {!settingsForm.alwaysAvailable && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="available_from">{t("availableFrom")}</Label>
                      <Input
                        id="available_from"
                        type="datetime-local"
                        value={settingsForm.available_from}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, available_from: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="available_to">{t("availableTo")}</Label>
                      <Input
                        id="available_to"
                        type="datetime-local"
                        value={settingsForm.available_to}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, available_to: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="question_count">{t("questionsNumber")}</Label>
                    <Input
                      id="question_count"
                      type="number"
                      min={1}
                      max={200}
                      value={settingsForm.question_count}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, question_count: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration_minutes">{t("timeMinutes")}</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min={1}
                      max={300}
                      value={settingsForm.duration_minutes}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="passing_percentage">{t("passingPercentage") || "Passing Percentage (%)"}</Label>
                    <Input
                      id="passing_percentage"
                      type="number"
                      min={1}
                      max={100}
                      value={settingsForm.passing_percentage}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, passing_percentage: Math.min(100, Math.max(1, Number(e.target.value) || 60)) }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>{t("questionSorting")}</Label>
                  <Select
                    value={settingsForm.sorting_mode}
                    onValueChange={(v) => setSettingsForm((p) => ({ ...p, sorting_mode: v as ExamQuestionSortingMode }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectMode")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RANDOM">{t("sortingMode.random")}</SelectItem>
                      <SelectItem value="TEXT_ONLY">{t("sortingMode.textOnly")}</SelectItem>
                      <SelectItem value="WITH_PICTURE">{t("sortingMode.withPicture")}</SelectItem>
                      <SelectItem value="MIXED_50">{t("sortingMode.mixed50")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={saveExamSettings} disabled={savingSettings}>
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("saving")}
                      </>
                    ) : (
                      t("save")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Exam Saving & History Persistence Configuration Modal */}
        <Dialog open={showSavingModal} onOpenChange={setShowSavingModal}>
          <DialogContent className="sm:max-w-lg max-w-[95vw] w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                {t("examSavingPersistence") || "Exam Saving Controls"}
              </DialogTitle>
              <DialogDescription>
                {t("examSavingPersistenceDesc") || "Configure whether completed individual exams and multiplayer group exams are permanently stored in the database and user history."}
              </DialogDescription>
            </DialogHeader>

            {loadingSavingConfig ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {/* Individual Exams Toggle */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <Label htmlFor="admin-save-indiv" className="font-semibold cursor-pointer">
                        {t("saveIndividualExams") || "Save Individual Exams"}
                      </Label>
                    </div>
                    <Switch
                      id="admin-save-indiv"
                      checked={saveIndividualExams}
                      onCheckedChange={setSaveIndividualExams}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {saveIndividualExams
                      ? (t("individualExamsSavedHint") || "Active: Individual exam attempts, answers, scores, and timestamps are saved to Supabase database.")
                      : (t("individualExamsNotSavedHint") || "Disabled: Individual exams run in practice mode and are NOT saved to the database.")}
                  </p>
                </div>

                {/* Group Exams Toggle */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <Label htmlFor="admin-save-group" className="font-semibold cursor-pointer">
                        {t("saveGroupExams") || "Save Group Exams & Results"}
                      </Label>
                    </div>
                    <Switch
                      id="admin-save-group"
                      checked={saveGroupExams}
                      onCheckedChange={setSaveGroupExams}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {saveGroupExams
                      ? (t("groupExamsSavedHint") || "Active: Group challenges, participant scores, battle leaderboards, and attempts are permanently saved.")
                      : (t("groupExamsNotSavedHint") || "Disabled: Group challenges are temporary sessions and are not stored in permanent history.")}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowSavingModal(false)}>
                    {t("cancel") || "Cancel"}
                  </Button>
                  <Button onClick={handleSavePersistenceConfig} disabled={savingPersistence}>
                    {savingPersistence ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("saving") || "Saving..."}
                      </>
                    ) : (
                      t("saveSettings") || "Save Settings"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {categories.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("noCategoriesYet")}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="sm:max-w-4xl max-w-[98vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingQuestion ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  {t("editQuestion")}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  {t("addNewQuestion")}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("category")}: {categories.find(c => c.id === activeCategory)?.name}
              {editingQuestion && ` (${t("editingMode")})`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-6 mt-4">
            {/* Question */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="question">{t("questionText")}</Label>
                <Textarea
                  id="question"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  placeholder={t("questionTextPlaceholder")}
                  rows={3}
                  required
                />
              </div>
              
              {/* Question Image Toggle */}
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-normal cursor-pointer" htmlFor="question-image-toggle">
                    {t("addQuestionImage")}
                  </Label>
                </div>
                <Switch
                  id="question-image-toggle"
                  checked={showQuestionImage}
                  onCheckedChange={setShowQuestionImage}
                />
              </div>
              
              {showQuestionImage && (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                  <Label>{t("questionImageOptional")}</Label>
                  <ImageUpload
                    value={questionForm.question_image}
                    onChange={(url) => setQuestionForm({ ...questionForm, question_image: url || "" })}
                    folder="exam-questions"
                  />
                </div>
              )}
            </div>

            {/* Options - 2 per row */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">{t("options")}</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* {t("optionA")} */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">A</span>
                    {t("optionA")}
                  </Label>
                  <Input
                    value={questionForm.option_a}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                    placeholder={t("optionAPlaceholder")}
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-a-image-toggle">
                      {t("addImage")}
                    </Label>
                    <Switch
                      id="option-a-image-toggle"
                      checked={showOptionImages.A}
                      onCheckedChange={(checked) => setShowOptionImages({ ...showOptionImages, A: checked })}
                    />
                  </div>
                  {showOptionImages.A && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <ImageUpload
                        value={questionForm.option_a_image}
                        onChange={(url) => setQuestionForm({ ...questionForm, option_a_image: url || "" })}
                        folder="exam-options"
                      />
                    </div>
                  )}
                </div>

                {/* {t("optionB")} */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">B</span>
                    {t("optionB")}
                  </Label>
                  <Input
                    value={questionForm.option_b}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                    placeholder={t("optionBPlaceholder")}
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-b-image-toggle">
                      {t("addImage")}
                    </Label>
                    <Switch
                      id="option-b-image-toggle"
                      checked={showOptionImages.B}
                      onCheckedChange={(checked) => setShowOptionImages({ ...showOptionImages, B: checked })}
                    />
                  </div>
                  {showOptionImages.B && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <ImageUpload
                        value={questionForm.option_b_image}
                        onChange={(url) => setQuestionForm({ ...questionForm, option_b_image: url || "" })}
                        folder="exam-options"
                      />
                    </div>
                  )}
                </div>

                {/* {t("optionC")} */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">C</span>
                    {t("optionC")}
                  </Label>
                  <Input
                    value={questionForm.option_c}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                    placeholder={t("optionCPlaceholder")}
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-c-image-toggle">
                      {t("addImage")}
                    </Label>
                    <Switch
                      id="option-c-image-toggle"
                      checked={showOptionImages.C}
                      onCheckedChange={(checked) => setShowOptionImages({ ...showOptionImages, C: checked })}
                    />
                  </div>
                  {showOptionImages.C && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <ImageUpload
                        value={questionForm.option_c_image}
                        onChange={(url) => setQuestionForm({ ...questionForm, option_c_image: url || "" })}
                        folder="exam-options"
                      />
                    </div>
                  )}
                </div>

                {/* {t("optionD")} */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">D</span>
                    {t("optionD")}
                  </Label>
                  <Input
                    value={questionForm.option_d}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                    placeholder={t("optionDPlaceholder")}
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-d-image-toggle">
                      {t("addImage")}
                    </Label>
                    <Switch
                      id="option-d-image-toggle"
                      checked={showOptionImages.D}
                      onCheckedChange={(checked) => setShowOptionImages({ ...showOptionImages, D: checked })}
                    />
                  </div>
                  {showOptionImages.D && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <ImageUpload
                        value={questionForm.option_d_image}
                        onChange={(url) => setQuestionForm({ ...questionForm, option_d_image: url || "" })}
                        folder="exam-options"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Correct Answer & Explanation Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="correct-answer">{t("correctAnswer")}</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value: "A" | "B" | "C" | "D") =>
                    setQuestionForm({ ...questionForm, correct_answer: value })
                  }
                >
                  <SelectTrigger id="correct-answer">
                    <SelectValue placeholder={t("selectCorrectAnswer")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">{t("optionA")}</SelectItem>
                    <SelectItem value="B">{t("optionB")}</SelectItem>
                    <SelectItem value="C">{t("optionC")}</SelectItem>
                    <SelectItem value="D">{t("optionD")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="explanation">{t("explanationOptional")}</Label>
                <Textarea
                  id="explanation"
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder={t("explanationPlaceholder")}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={creatingQuestion} className="flex-1">
                {creatingQuestion ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {editingQuestion ? t("updating") : t("adding")}
                  </>
                ) : (
                  <>
                    {editingQuestion ? (
                      <><Edit className="h-4 w-4 mr-2" /> {t("updateQuestion")}</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> {t("addQuestion")}</>
                    )}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exam Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="sm:max-w-6xl max-w-[98vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t("examResults")}
            </DialogTitle>
            <DialogDescription>
              {t("examResultsDescription")}
            </DialogDescription>
          </DialogHeader>

          {loadingResults ? (
            <div className="text-center py-8 text-muted-foreground">{t("loading") || "Loading..."}</div>
          ) : selectedAttempt ? (
            <div className="space-y-4">
              <Button variant="outline" onClick={() => setSelectedAttempt(null)}>
                {t("backToAllResults")}
              </Button>
              
              <Card className="navo-card-brand">
                <CardHeader>
                  <CardTitle>{selectedAttempt.category_name}</CardTitle>
                  <CardDescription>
                    {t("userId")}: {selectedAttempt.user_id} · {t("completed")}: {new Date(selectedAttempt.completed_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-primary">{selectedAttempt.score_percentage}%</div>
                      <div className="text-xs text-muted-foreground">{t("score")}</div>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedAttempt.correct_answers}</div>
                      <div className="text-xs text-muted-foreground">{t("correct")}</div>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{selectedAttempt.total_questions - selectedAttempt.correct_answers}</div>
                      <div className="text-xs text-muted-foreground">{t("incorrect")}</div>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold">{Math.floor(selectedAttempt.duration_seconds / 60)}:{String(selectedAttempt.duration_seconds % 60).padStart(2, "0")}</div>
                      <div className="text-xs text-muted-foreground">{t("time")}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">{t("answerBreakdown")}</h4>
                    {selectedAttempt.answers.map((answer: any, idx: number) => (
                      <div key={answer.question_id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={answer.is_correct ? "default" : "destructive"}>
                            {answer.is_correct ? t("correct") : t("incorrect")}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{t("question")} {idx + 1}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t("selected")}: </span>
                          <span className={answer.is_correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {answer.selected_answer || t("notAnswered")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {examAttempts.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("noExamResultsYet")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {examAttempts.map((attempt) => (
                    <Card key={attempt.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => viewAttemptDetails(attempt)}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{attempt.category_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(attempt.completed_at).toLocaleDateString()} · {t("user")}: {attempt.user_id.slice(0, 8)}...
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${attempt.score_percentage >= 80 ? 'text-green-600' : attempt.score_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {attempt.score_percentage}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {attempt.correct_answers}/{attempt.total_questions} {t("correct")}
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
