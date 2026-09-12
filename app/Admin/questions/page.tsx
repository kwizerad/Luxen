"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/image-upload";
import { FileText, Edit, Trash2, Loader2, Search, ArrowLeft, Image as ImageIcon, AlertTriangle, Eye, Lock, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Watermark } from "@/components/watermark";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";
import type { ExamCategory, ExamQuestion } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { isAdmin, hasReadWriteQuestionAccess, hasReadOnlyQuestionAccess } from "@/lib/permissions";
import { getExamCategories, getExamQuestions, updateExamQuestion, deleteExamQuestion } from "@/lib/supabase/queries";

export default function QuestionManagementPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const router = useRouter();
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [updatingQuestion, setUpdatingQuestion] = useState(false);
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
    category_id: "",
  });
  const [showQuestionImage, setShowQuestionImage] = useState(false);
  const [showOptionImages, setShowOptionImages] = useState<{[key: string]: boolean}>({
    A: false, B: false, C: false, D: false
  });

  // View modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState<ExamQuestion | null>(null);

  // Bulk selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);

  // Sorting state
  type SortField = 'question' | 'category' | 'correct_answer' | 'created_at';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkPermissions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !isAdmin(user)) {
        router.push("/");
        return;
      }

      // Check if user has any question access
      if (!hasReadWriteQuestionAccess(user) && !hasReadOnlyQuestionAccess(user)) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      setHasPermission(true);
      setIsReadOnly(hasReadOnlyQuestionAccess(user));
      
      loadCategories();
      loadAllQuestions();
    };

    checkPermissions();
  }, [router]);

  const loadCategories = async () => {
    try {
      const data = await getExamCategories();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error: any) {
      toast.error(t("failedToLoadCategories") + ": " + error.message);
    }
  };

  const loadAllQuestions = async () => {
    try {
      setLoading(true);
      const data = await getExamQuestions();
      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch (error: any) {
      toast.error(t("failedToLoadQuestions") + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm(t("confirmDeleteQuestion"))) return;

    setDeletingQuestion(questionId);
    try {
      await deleteExamQuestion(questionId);
      toast.success(t("questionDeletedSuccess"));
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error: any) {
      toast.error(t("failedToDeleteQuestion") + ": " + error.message);
    } finally {
      setDeletingQuestion(null);
    }
  };

  const handleChangeCategory = async (questionId: string, newCategoryId: string) => {
    try {
      const data = await updateExamQuestion(questionId, { category_id: newCategoryId });
      toast.success(t("questionCategoryUpdatedSuccess"));
      setQuestions(questions.map(q => q.id === questionId ? data.question : q));
      loadAllQuestions();
    } catch (error: any) {
      toast.error(t("failedToUpdateQuestionCategory") + ": " + error.message);
    }
  };

  // Helper function defined before use to avoid hoisting issues
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || t("unknown");
  };

  const filteredQuestions = useMemo(() => questions.filter(q => {
    // Category filter
    const matchesCategory = selectedCategory === "all" || q.category_id === selectedCategory;
    // Search filter - safely check each field
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchQuery === "" || 
      (q.question && q.question.toLowerCase().includes(searchLower)) ||
      (q.option_a && q.option_a.toLowerCase().includes(searchLower)) ||
      (q.option_b && q.option_b.toLowerCase().includes(searchLower)) ||
      (q.option_c && q.option_c.toLowerCase().includes(searchLower)) ||
      (q.option_d && q.option_d.toLowerCase().includes(searchLower)) ||
      getCategoryName(q.category_id).toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  }), [questions, selectedCategory, searchQuery, categories, t]);

  // Sort questions
  const sortedQuestions = useMemo(() => [...filteredQuestions].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'question':
        comparison = (a.question || '').localeCompare(b.question || '');
        break;
      case 'category':
        comparison = getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id));
        break;
      case 'correct_answer':
        comparison = a.correct_answer.localeCompare(b.correct_answer);
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [filteredQuestions, sortField, sortDirection, categories, t]);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const toggleSelectQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(t("confirmBulkDeleteQuestions").replace("{count}", String(selectedQuestions.size)))) return;

    setBulkDeleting(true);
    try {
      const promises = Array.from(selectedQuestions).map(id => deleteExamQuestion(id));
      await Promise.all(promises);
      toast.success(t("bulkDeleteQuestionsSuccess").replace("{count}", String(selectedQuestions.size)));
      setSelectedQuestions(new Set());
      loadAllQuestions();
    } catch (error: any) {
      toast.error(t("failedToDeleteSomeQuestions") + ": " + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkMove = async (newCategoryId: string) => {
    setBulkMoving(true);
    try {
      const promises = Array.from(selectedQuestions).map(id =>
        updateExamQuestion(id, { category_id: newCategoryId })
      );
      await Promise.all(promises);
      toast.success(t("bulkMoveQuestionsSuccess").replace("{count}", String(selectedQuestions.size)));
      setSelectedQuestions(new Set());
      loadAllQuestions();
    } catch (error: any) {
      toast.error(t("failedToMoveSomeQuestions") + ": " + error.message);
    } finally {
      setBulkMoving(false);
    }
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 text-primary" /> : <ArrowDown className="h-4 w-4 text-primary" />;
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
      category_id: q.category_id,
    });
    setShowQuestionImage(!!q.question_image);
    setShowOptionImages({
      A: !!q.option_a_image,
      B: !!q.option_b_image,
      C: !!q.option_c_image,
      D: !!q.option_d_image,
    });
    setShowEditModal(true);
  };

  const handleViewQuestion = (q: ExamQuestion) => {
    setViewingQuestion(q);
    setShowViewModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
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
      category_id: "",
    });
    setShowQuestionImage(false);
    setShowOptionImages({ A: false, B: false, C: false, D: false });
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setUpdatingQuestion(true);
    try {
      const data = await updateExamQuestion(editingQuestion, questionForm);
      toast.success(t("questionUpdatedSuccess"));
      setQuestions(questions.map(q => q.id === editingQuestion ? data.question : q));
      closeEditModal();
    } catch (error: any) {
      toast.error(t("failedToUpdateQuestion") + ": " + error.message);
    } finally {
      setUpdatingQuestion(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/Admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("questionManagement")}</h1>
          </div>
        </div>
        <Card className="border-destructive/20 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--destructive)/0.3)] hover:-translate-y-1 hover:border-destructive transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">{t("accessDenied")}</h3>
                <p className="text-destructive/80 mt-1">
                  {t("questionManagementNoPermission")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/Admin/exams")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("questionManagement")}</h1>
          <p className="text-muted-foreground mt-1">
            {isReadOnly ? t("viewQuestionsReadOnly") : t("viewQuestionsDescription")}
          </p>
        </div>
        {isReadOnly && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full text-sm">
            <Eye className="h-4 w-4" />
            <span>{t("readOnlyMode")}</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("filterQuestions")}
              </CardTitle>
              <CardDescription>
                {t("totalQuestions")}: {filteredQuestions.length}
                {selectedQuestions.size > 0 && ` • ${selectedQuestions.size} ${t("selected").toLowerCase()}`}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchQuestionsPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[250px]"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={t("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allQuestions")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedQuestions.size > 0 && !isReadOnly && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedQuestions.size} {t("questionsSelected")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select onValueChange={handleBulkMove} disabled={bulkMoving}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("moveToCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {t("deleteSelected")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestions(new Set())}
                >
                  {t("clearSelection")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] w-full max-h-[90vh] overflow-auto">
          <DialogTitle>{t("imagePreview")}</DialogTitle>
          {selectedImage && (
            <Image
              src={selectedImage}
              alt={t("preview")}
              width={1200}
              height={800}
              unoptimized
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Question Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {t("questionDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("category")}: {viewingQuestion ? getCategoryName(viewingQuestion.category_id) : ""}
            </DialogDescription>
          </DialogHeader>
          
          {viewingQuestion && (
            <div className="space-y-6 mt-4">
              {/* Question Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">{t("question")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {viewingQuestion.question_image && (
                    <div>
                      <Image 
                        src={viewingQuestion.question_image} 
                        alt={t("question")} 
                        width={800}
                        height={600}
                        unoptimized
                        className="w-full h-auto rounded-lg border cursor-pointer"
                        onClick={() => setSelectedImage(viewingQuestion.question_image!)}
                      />
                    </div>
                  )}
                  <p className="text-base">{viewingQuestion.question}</p>
                </CardContent>
              </Card>

              {/* Options Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">{t("options")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const optionText = viewingQuestion[`option_${option.toLowerCase()}` as keyof ExamQuestion];
                    const optionImage = viewingQuestion[`option_${option.toLowerCase()}_image` as keyof ExamQuestion];
                    const isCorrect = viewingQuestion.correct_answer === option;
                    
                    return (
                      <div 
                        key={option}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isCorrect 
                            ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500" 
                            : "bg-secondary border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                            isCorrect 
                              ? "bg-green-500 text-white" 
                              : "bg-primary text-primary-foreground"
                          }`}>
                            {option}
                          </span>
                          <div className="flex-1 space-y-2">
                            {optionImage && (
                              <Image 
                                src={optionImage as string} 
                                alt={`Option ${option}`} 
                                width={800}
                                height={600}
                                unoptimized
                                className="w-full h-auto rounded border cursor-pointer"
                                onClick={() => setSelectedImage(optionImage as string)}
                              />
                            )}
                            <p className="text-sm">{optionText}</p>
                          </div>
                          {isCorrect && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              ✓ {t("correct")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Explanation Card */}
              {viewingQuestion.explanation && (
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">{t("explanation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewingQuestion.explanation}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {!isReadOnly && (
                  <Button 
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditQuestion(viewingQuestion);
                    }}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t("editQuestion")}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowViewModal(false)} className="flex-1">
                  {t("close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Question Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-4xl max-w-[98vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              {t("editQuestion")}
            </DialogTitle>
            <DialogDescription>
              {t("category")}: {getCategoryName(questionForm.category_id)}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateQuestion} className="space-y-6 mt-4">
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
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Option A */}
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

                {/* Option B */}
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

                {/* Option C */}
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

                {/* Option D */}
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
            <div className="grid md:grid-cols-2 gap-4">
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
              <Button type="submit" disabled={updatingQuestion} className="flex-1">
                {updatingQuestion ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("updating")}
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    {t("updateQuestion")}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeEditModal}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {sortedQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              {selectedCategory === "all" && searchQuery === ""
                ? t("noQuestionsFound") 
                : t("noQuestionsMatchFilters")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center"
                      title={selectedQuestions.size === filteredQuestions.length ? t("deselectAll") : t("selectAll")}
                    >
                      {selectedQuestions.size === filteredQuestions.length ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-4 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead className="min-w-[150px] cursor-pointer" onClick={() => handleSort('question')}>
                    <div className="flex items-center gap-1">{t("question")} {getSortIcon('question')}</div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">{t("optionA")}</TableHead>
                  <TableHead className="min-w-[100px]">{t("optionB")}</TableHead>
                  <TableHead className="min-w-[100px]">{t("optionC")}</TableHead>
                  <TableHead className="min-w-[100px]">{t("optionD")}</TableHead>
                  <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('correct_answer')}>
                    <div className="flex items-center gap-1">{t("answer")} {getSortIcon('correct_answer')}</div>
                  </TableHead>
                  <TableHead className="w-[250px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuestions.map((q, index) => (
                  <TableRow key={q.id} className={selectedQuestions.has(q.id) ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => toggleSelectQuestion(q.id)}
                        className="flex items-center justify-center"
                        title={selectedQuestions.has(q.id) ? t("deselect") : t("select")}
                      >
                        {selectedQuestions.has(q.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-4 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {q.question_image ? (
                          <button
                            onClick={() => setSelectedImage(q.question_image!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">{t("viewImage")}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewQuestion(q)}
                            className="text-sm truncate max-w-[150px] text-left hover:text-primary transition-colors"
                            title={q.question || ""}
                          >
                            {q.question || "-"}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {q.option_a_image ? (
                          <button
                            onClick={() => setSelectedImage(q.option_a_image!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">{t("view")}</span>
                          </button>
                        ) : (
                          <p className="text-sm truncate max-w-[100px]" title={q.option_a || ""}>
                            {q.option_a || "-"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {q.option_b_image ? (
                          <button
                            onClick={() => setSelectedImage(q.option_b_image!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">{t("view")}</span>
                          </button>
                        ) : (
                          <p className="text-sm truncate max-w-[100px]" title={q.option_b || ""}>
                            {q.option_b || "-"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {q.option_c_image ? (
                          <button
                            onClick={() => setSelectedImage(q.option_c_image!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">{t("view")}</span>
                          </button>
                        ) : (
                          <p className="text-sm truncate max-w-[100px]" title={q.option_c || ""}>
                            {q.option_c || "-"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {q.option_d_image ? (
                          <button
                            onClick={() => setSelectedImage(q.option_d_image!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">{t("view")}</span>
                          </button>
                        ) : (
                          <p className="text-sm truncate max-w-[100px]" title={q.option_d || ""}>
                            {q.option_d || "-"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[rgb(0_101_35/28%)] text-green-800">
                        {q.correct_answer}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {!isReadOnly && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditQuestion(q)}
                                disabled={deletingQuestion === q.id}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {t("edit")}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteQuestion(q.id)}
                                disabled={deletingQuestion === q.id}
                              >
                                {deletingQuestion === q.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {t("delete")}
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {isReadOnly && (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Lock className="h-3 w-3" />
                              <span>{t("readOnly")}</span>
                            </div>
                          )}
                        </div>
                        {!isReadOnly && (
                          <Select
                            value={q.category_id}
                            onValueChange={(value) => handleChangeCategory(q.id, value)}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder={t("switchCategory")} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
