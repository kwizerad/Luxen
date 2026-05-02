"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Plus, BookOpen, CheckCircle, Image as ImageIcon, X, Edit, Trash2, Loader2, ChevronDown, Settings, Eye, EyeOff, AlertTriangle, Trophy, Users } from "lucide-react";
import { Watermark } from "@/components/watermark";
import { toast } from "sonner";
import type { ExamCategory, ExamQuestion, ExamQuestionSortingMode } from "@/lib/database.types";
import { ImageUpload } from "@/components/image-upload";
import { createClient } from "@/lib/supabase/client";
import { isAdmin, canAddQuestions, canViewQuestions, canManageExamSettings } from "@/lib/permissions";
import { DEFAULT_EXAM_SETTINGS } from "@/lib/exam-settings";

const ADMIN_EMAIL = "Navo@admin.jn";

export default function ExamManagementPage() {
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
  
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByImage, setFilterByImage] = useState<"all" | "with" | "without">("all");
  
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
    sorting_mode: DEFAULT_EXAM_SETTINGS.sorting_mode as ExamQuestionSortingMode,
  });

  useEffect(() => {
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
      const res = await fetch("/api/exam/categories");
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
        // Load question counts for each category
        const counts: Record<string, number> = {};
        for (const category of data.categories) {
          const qRes = await fetch(`/api/exam/questions?categoryId=${category.id}`);
          const qData = await qRes.json();
          counts[category.id] = qData.questions?.length || 0;
        }
        setCategoryQuestionCounts(counts);
      }
    } catch (error) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/exam/questions?categoryId=${categoryId}`);
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        setFilteredQuestions(data.questions);
        // Update the count for this category
        setCategoryQuestionCounts(prev => ({
          ...prev,
          [categoryId]: data.questions.length
        }));
      }
    } catch (error) {
      toast.error("Failed to load questions");
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

    setFilteredQuestions(filtered);
  }, [questions, searchQuery, filterByImage]);

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
      const res = await fetch(`/api/exam/settings?categoryId=${category.id}`);
      const data = await res.json();
      if (data?.settings) {
        const s = data.settings;
        const always = !s.available_from && !s.available_to;
        setSettingsForm({
          alwaysAvailable: always,
          available_from: s.available_from ? toLocalInputValue(s.available_from) : "",
          available_to: s.available_to ? toLocalInputValue(s.available_to) : "",
          question_count: s.question_count ?? DEFAULT_EXAM_SETTINGS.question_count,
          duration_minutes: s.duration_minutes ?? DEFAULT_EXAM_SETTINGS.duration_minutes,
          sorting_mode: (s.sorting_mode ?? DEFAULT_EXAM_SETTINGS.sorting_mode) as ExamQuestionSortingMode,
        });
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to load exam settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveExamSettings = async () => {
    if (!settingsCategory) return;
    setSavingSettings(true);
    try {
      const payload = {
        categoryId: settingsCategory.id,
        question_count: settingsForm.question_count,
        duration_minutes: settingsForm.duration_minutes,
        sorting_mode: settingsForm.sorting_mode,
        available_from: settingsForm.alwaysAvailable || !settingsForm.available_from ? null : new Date(settingsForm.available_from).toISOString(),
        available_to: settingsForm.alwaysAvailable || !settingsForm.available_to ? null : new Date(settingsForm.available_to).toISOString(),
      };
      const res = await fetch("/api/exam/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.settings) {
        toast.success("Exam settings saved");
        setShowSettingsModal(false);
      } else {
        toast.error(data?.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await fetch("/api/exam/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });

      const data = await res.json();
      if (data.category) {
        toast.success("Category created successfully");
        setCategories([data.category, ...categories]);
        setCategoryName("");
      } else {
        toast.error(data.error || "Failed to create category");
      }
    } catch (error) {
      toast.error("Failed to create category");
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
      toast.error("Category name is required");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await fetch("/api/exam/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCategory.id, name: editCategoryName }),
      });

      const data = await res.json();
      if (data.category) {
        toast.success("Category updated successfully");
        setCategories(categories.map(c => c.id === editingCategory.id ? data.category : c));
        setShowEditCategoryModal(false);
        setEditingCategory(null);
        setEditCategoryName("");
      } else {
        toast.error(data.error || "Failed to update category");
      }
    } catch (error) {
      toast.error("Failed to update category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This will also delete all questions in this category.")) return;

    setDeletingCategory(categoryId);
    try {
      const res = await fetch(`/api/exam/categories?id=${categoryId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Category deleted successfully");
        setCategories(categories.filter(c => c.id !== categoryId));
        if (activeCategory === categoryId) {
          setActiveCategory(null);
          setQuestions([]);
          setFilteredQuestions([]);
        }
      } else {
        toast.error(data.error || "Failed to delete category");
      }
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setDeletingCategory(null);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) {
      toast.error("Please select a category first");
      return;
    }

    setCreatingQuestion(true);
    try {
      const res = await fetch("/api/exam/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionForm,
          category_id: activeCategory,
        }),
      });

      const data = await res.json();
      if (data.question) {
        toast.success("Question added successfully");
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
      } else {
        toast.error(data.error || "Failed to add question");
      }
    } catch (error) {
      toast.error("Failed to add question");
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
      const res = await fetch("/api/exam/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingQuestion,
          ...questionForm,
        }),
      });

      const data = await res.json();
      if (data.question) {
        toast.success("Question updated successfully");
        setQuestions(questions.map(q => q.id === editingQuestion ? data.question : q));
        closeQuestionModal();
        // If came from questions page, go back
        if (returnTo === "questions") {
          router.push("/Admin/questions");
        }
      } else {
        toast.error(data.error || "Failed to update question");
      }
    } catch (error) {
      toast.error("Failed to update question");
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    setDeletingQuestion(questionId);
    try {
      const res = await fetch(`/api/exam/questions?id=${questionId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Question deleted successfully");
        setQuestions(questions.filter(q => q.id !== questionId));
        // Update category question count
        if (activeCategory) {
          setCategoryQuestionCounts(prev => ({
            ...prev,
            [activeCategory]: Math.max(0, (prev[activeCategory] || 0) - 1)
          }));
        }
      } else {
        toast.error(data.error || "Failed to delete question");
      }
    } catch (error) {
      toast.error("Failed to delete question");
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
      const res = await fetch(`/api/exam/questions`);
      const data = await res.json();
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
            correct_answer: q.correct_answer as "A" | "B" | "C" | "D",
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
    } catch (error) {
      toast.error("Failed to load question for editing");
    }
  };

  const loadExamResults = async () => {
    setLoadingResults(true);
    try {
      const res = await fetch("/api/exam/attempts");
      const data = await res.json();
      if (data.attempts) {
        setExamAttempts(data.attempts);
      }
    } catch {
      toast.error("Failed to load exam results");
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Exam Management</h1>
        </div>
        <Card className="border-destructive/20 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--destructive)/0.3)] hover:-translate-y-1 hover:border-destructive transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">Access Denied</h3>
                <p className="text-destructive/80 mt-1">
                  You don't have permission to manage exams. Please contact the primary administrator for access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <Watermark />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold brand-protected">Exam Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage exam categories and questions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canViewQuestionsTab && (
            <Button variant="outline" onClick={() => router.push("/Admin/questions")}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Questions
            </Button>
          )}
          <Button variant="outline" onClick={openResultsModal}>
            <Trophy className="h-4 w-4 mr-2" />
            View Results
          </Button>
          <Button onClick={() => setShowCategoryForm(!showCategoryForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showCategoryForm ? "Cancel" : "Add Category"}
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
                Create New Category
              </CardTitle>
              <CardDescription>
                Add a new exam category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="categoryName">Category Name *</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Mathematics, Science, History"
                    required
                  />
                </div>
                <Button type="submit" disabled={creatingCategory}>
                  {creatingCategory ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Category
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
                Edit Category
              </DialogTitle>
              <DialogDescription>
                Update the category name
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="editCategoryName">Category Name *</Label>
                <Input
                  id="editCategoryName"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder="e.g., Mathematics, Science, History"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creatingCategory} className="flex-1">
                  {creatingCategory ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Category
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditCategoryModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Categories List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {category.name}
                    </CardTitle>
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
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardDescription className="text-xs flex items-center justify-between">
                    <span>Created: {new Date(category.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {categoryQuestionCounts[category.id] || 0} questions
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
                    Add Questions
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
                    Settings
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
                Questions - {categories.find(c => c.id === activeCategory)?.name}
              </CardTitle>
              <CardDescription>
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search questions, options, or explanations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterByImage} onValueChange={(v: any) => setFilterByImage(v)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Questions</SelectItem>
                    <SelectItem value="with">With Images</SelectItem>
                    <SelectItem value="without">Without Images</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => openAddQuestionModal(activeCategory)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {/* Questions Grid */}
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || filterByImage !== "all" ? "No questions match your filters" : "No questions in this category yet"}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Correct: {question.correct_answer}</Badge>
                            {(question.question_image || question.option_a_image || question.option_b_image || 
                              question.option_c_image || question.option_d_image) && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Has Images
                              </Badge>
                            )}
                          </div>
                          {question.question && (
                            <p className="text-sm mb-2">{question.question}</p>
                          )}
                          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                            <div>A: {question.option_a || "(image only)"}</div>
                            <div>B: {question.option_b || "(image only)"}</div>
                            <div>C: {question.option_c || "(image only)"}</div>
                            <div>D: {question.option_d || "(image only)"}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
              <DialogTitle>Exam Settings</DialogTitle>
              <DialogDescription>
                {settingsCategory ? `Category: ${settingsCategory.name}` : "Configure exam rules"}
              </DialogDescription>
            </DialogHeader>

            {loadingSettings ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading settings...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">Always available</div>
                    <div className="text-sm text-muted-foreground">If disabled, set an availability window</div>
                  </div>
                  <Switch
                    checked={settingsForm.alwaysAvailable}
                    onCheckedChange={(v) => setSettingsForm((p) => ({ ...p, alwaysAvailable: v }))}
                  />
                </div>

                {!settingsForm.alwaysAvailable && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="available_from">Available from</Label>
                      <Input
                        id="available_from"
                        type="datetime-local"
                        value={settingsForm.available_from}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, available_from: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="available_to">Available to</Label>
                      <Input
                        id="available_to"
                        type="datetime-local"
                        value={settingsForm.available_to}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, available_to: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="question_count">Questions number</Label>
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
                    <Label htmlFor="duration_minutes">Time (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min={1}
                      max={300}
                      value={settingsForm.duration_minutes}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Question sorting</Label>
                  <Select
                    value={settingsForm.sorting_mode}
                    onValueChange={(v) => setSettingsForm((p) => ({ ...p, sorting_mode: v as ExamQuestionSortingMode }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RANDOM">Random</SelectItem>
                      <SelectItem value="TEXT_ONLY">Texts only</SelectItem>
                      <SelectItem value="WITH_PICTURE">With picture</SelectItem>
                      <SelectItem value="MIXED_50">Mixed 50%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveExamSettings} disabled={savingSettings}>
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
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
              No categories yet. Create your first category above.
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
                  Edit Question
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Add New Question
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Category: {categories.find(c => c.id === activeCategory)?.name}
              {editingQuestion && " (Editing mode)"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="space-y-6 mt-4">
            {/* Question */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="question">Question Text *</Label>
                <Textarea
                  id="question"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  placeholder="Enter your question text here..."
                  rows={3}
                  required
                />
              </div>
              
              {/* Question Image Toggle */}
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-normal cursor-pointer" htmlFor="question-image-toggle">
                    Add question image
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
                  <Label>Question Image (Optional)</Label>
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
              <Label className="text-base font-semibold">Options *</Label>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Option A */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">A</span>
                    Option A
                  </Label>
                  <Input
                    value={questionForm.option_a}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                    placeholder="Enter option A text..."
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-a-image-toggle">
                      Add image
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

                {/* Option B */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">B</span>
                    Option B
                  </Label>
                  <Input
                    value={questionForm.option_b}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                    placeholder="Enter option B text..."
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-b-image-toggle">
                      Add image
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

                {/* Option C */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">C</span>
                    Option C
                  </Label>
                  <Input
                    value={questionForm.option_c}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                    placeholder="Enter option C text..."
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-c-image-toggle">
                      Add image
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

                {/* Option D */}
                <div className="grid gap-3 p-4 bg-secondary rounded-lg border border-border">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">D</span>
                    Option D
                  </Label>
                  <Input
                    value={questionForm.option_d}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                    placeholder="Enter option D text..."
                    required
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="option-d-image-toggle">
                      Add image
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
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="correct-answer">Correct Answer *</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value: "A" | "B" | "C" | "D") =>
                    setQuestionForm({ ...questionForm, correct_answer: value })
                  }
                >
                  <SelectTrigger id="correct-answer">
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Option A</SelectItem>
                    <SelectItem value="B">Option B</SelectItem>
                    <SelectItem value="C">Option C</SelectItem>
                    <SelectItem value="D">Option D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={creatingQuestion} className="flex-1">
                {creatingQuestion ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {editingQuestion ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    {editingQuestion ? (
                      <><Edit className="h-4 w-4 mr-2" /> Update Question</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Add Question</>
                    )}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel
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
              Exam Results
            </DialogTitle>
            <DialogDescription>
              View all user exam attempts and results
            </DialogDescription>
          </DialogHeader>

          {loadingResults ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedAttempt ? (
            <div className="space-y-4">
              <Button variant="outline" onClick={() => setSelectedAttempt(null)}>
                ← Back to all results
              </Button>
              
              <Card className="navo-card-brand">
                <CardHeader>
                  <CardTitle>{selectedAttempt.category_name}</CardTitle>
                  <CardDescription>
                    User ID: {selectedAttempt.user_id} · Completed: {new Date(selectedAttempt.completed_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-primary">{selectedAttempt.score_percentage}%</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedAttempt.correct_answers}</div>
                      <div className="text-xs text-muted-foreground">Correct</div>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{selectedAttempt.total_questions - selectedAttempt.correct_answers}</div>
                      <div className="text-xs text-muted-foreground">Incorrect</div>
                    </div>
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <div className="text-2xl font-bold">{Math.floor(selectedAttempt.duration_seconds / 60)}:{String(selectedAttempt.duration_seconds % 60).padStart(2, "0")}</div>
                      <div className="text-xs text-muted-foreground">Time</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Answer Breakdown</h4>
                    {selectedAttempt.answers.map((answer: any, idx: number) => (
                      <div key={answer.question_id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={answer.is_correct ? "default" : "destructive"}>
                            {answer.is_correct ? "Correct" : "Incorrect"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Question {idx + 1}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Selected: </span>
                          <span className={answer.is_correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {answer.selected_answer || "Not answered"}
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
                  <p className="text-muted-foreground">No exam results yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {examAttempts.map((attempt) => (
                    <Card key={attempt.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => viewAttemptDetails(attempt)}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">{attempt.category_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(attempt.completed_at).toLocaleString()} · User: {attempt.user_id.slice(0, 8)}...
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${attempt.score_percentage >= 80 ? 'text-green-600' : attempt.score_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {attempt.score_percentage}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {attempt.correct_answers}/{attempt.total_questions} correct
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
  );
}
