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
import { FileText, Plus, BookOpen, CheckCircle, Image as ImageIcon, X, Edit, Trash2, Loader2, ChevronDown, Settings, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ExamCategory, ExamQuestion } from "@/lib/database.types";
import { ImageUpload } from "@/components/image-upload";
import { createClient } from "@/lib/supabase/client";
import { isAdmin, canAddQuestions, canViewQuestions } from "@/lib/permissions";

export default function ExamManagementPage() {
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [categoryQuestionCounts, setCategoryQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [canViewQuestionsTab, setCanViewQuestionsTab] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Category form state
  const [categoryName, setCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  
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

  useEffect(() => {
    const checkPermissions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !isAdmin(user)) {
        router.push("/Admin");
        return;
      }

      // Check if user has permission to add questions
      if (!canAddQuestions(user)) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      setHasPermission(true);
      setCanViewQuestionsTab(canViewQuestions(user));
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
        // Close modal and reset form
        closeQuestionModal();
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
                  You don't have permission to add questions. Please contact the primary administrator for access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exam Management</h1>
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
          <Button onClick={() => setShowCategoryForm(!showCategoryForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showCategoryForm ? "Cancel" : "Add Category"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Create Category Form */}
        {showCategoryForm && (
          <Card className={cardHoverClass}>
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

        {/* Categories List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={`${cardHoverClass} cursor-pointer ${
                activeCategory === category.id ? "border-primary ring-1 ring-primary" : ""
              }`}
              onClick={() => selectCategory(category.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {category.name}
                </CardTitle>
                <CardDescription className="text-xs flex items-center justify-between">
                  <span>Created: {new Date(category.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {categoryQuestionCounts[category.id] || 0} questions
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ))}
        </div>

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}
