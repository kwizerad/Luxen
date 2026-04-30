"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { FileText, Edit, Trash2, Loader2, Search, ArrowLeft, Image as ImageIcon, AlertTriangle, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import type { ExamCategory, ExamQuestion } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { isAdmin, hasReadWriteQuestionAccess, hasReadOnlyQuestionAccess } from "@/lib/permissions";

export default function QuestionManagementPage() {
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

  useEffect(() => {
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
      const res = await fetch("/api/exam/categories");
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

  const loadAllQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/exam/questions");
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
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
      } else {
        toast.error(data.error || "Failed to delete question");
      }
    } catch (error) {
      toast.error("Failed to delete question");
    } finally {
      setDeletingQuestion(null);
    }
  };

  const handleChangeCategory = async (questionId: string, newCategoryId: string) => {
    try {
      const res = await fetch("/api/exam/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: questionId,
          category_id: newCategoryId,
        }),
      });
      const data = await res.json();
      if (data.question) {
        toast.success("Question category updated successfully");
        setQuestions(questions.map(q => q.id === questionId ? data.question : q));
        loadAllQuestions();
      } else {
        toast.error(data.error || "Failed to update question category");
      }
    } catch (error) {
      toast.error("Failed to update question category");
    }
  };

  const filteredQuestions = questions.filter(q => {
    // Category filter
    const matchesCategory = selectedCategory === "all" || q.category_id === selectedCategory;
    // Search filter
    const matchesSearch = searchQuery === "" || 
      q.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.option_a?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.option_b?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.option_c?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.option_d?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(q.category_id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
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
        closeEditModal();
      } else {
        toast.error(data.error || "Failed to update question");
      }
    } catch (error) {
      toast.error("Failed to update question");
    } finally {
      setUpdatingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/Admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Question Management</h1>
          </div>
        </div>
        <Card className="border-destructive/20 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--destructive)/0.3)] hover:-translate-y-1 hover:border-destructive transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">Access Denied</h3>
                <p className="text-destructive/80 mt-1">
                  You don't have permission to view questions. Please contact the primary administrator for access.
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/Admin/exams")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Question Management</h1>
          <p className="text-muted-foreground mt-1">
            {isReadOnly ? "View all exam questions (Read Only)" : "View, edit, delete, and manage all exam questions"}
          </p>
        </div>
        {isReadOnly && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full text-sm">
            <Eye className="h-4 w-4" />
            <span>Read Only Mode</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Filter Questions
              </CardTitle>
              <CardDescription>
                Total questions: {filteredQuestions.length}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
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
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
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

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogTitle>Image Preview</DialogTitle>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Preview"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Question Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Question Details
            </DialogTitle>
            <DialogDescription>
              Category: {viewingQuestion ? getCategoryName(viewingQuestion.category_id) : ""}
            </DialogDescription>
          </DialogHeader>
          
          {viewingQuestion && (
            <div className="space-y-6 mt-4">
              {/* Question Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {viewingQuestion.question_image && (
                    <div>
                      <img 
                        src={viewingQuestion.question_image} 
                        alt="Question" 
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
                  <CardTitle className="text-lg">Options</CardTitle>
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
                              : "bg-primary text-white"
                          }`}>
                            {option}
                          </span>
                          <div className="flex-1 space-y-2">
                            {optionImage && (
                              <img 
                                src={optionImage as string} 
                                alt={`Option ${option}`} 
                                className="w-full h-auto rounded border cursor-pointer"
                                onClick={() => setSelectedImage(optionImage as string)}
                              />
                            )}
                            <p className="text-sm">{optionText}</p>
                          </div>
                          {isCorrect && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              ✓ Correct
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
                    <CardTitle className="text-lg">Explanation</CardTitle>
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
                    Edit Question
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowViewModal(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Question Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Question
            </DialogTitle>
            <DialogDescription>
              Category: {getCategoryName(questionForm.category_id)}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateQuestion} className="space-y-6 mt-4">
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
              <Button type="submit" disabled={updatingQuestion} className="flex-1">
                {updatingQuestion ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Question
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              {selectedCategory === "all" && searchQuery === ""
                ? "No questions found" 
                : `No questions match your filters`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead className="min-w-[150px]">Question</TableHead>
                  <TableHead className="min-w-[100px]">Option A</TableHead>
                  <TableHead className="min-w-[100px]">Option B</TableHead>
                  <TableHead className="min-w-[100px]">Option C</TableHead>
                  <TableHead className="min-w-[100px]">Option D</TableHead>
                  <TableHead className="w-[80px]">Answer</TableHead>
                  <TableHead className="w-[250px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((q, index) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {q.question_image ? (
                          <button
                            onClick={() => setSelectedImage(q.question_image!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">View Image</span>
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
                            <span className="text-xs">View</span>
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
                            <span className="text-xs">View</span>
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
                            <span className="text-xs">View</span>
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
                            <span className="text-xs">View</span>
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
                                Edit
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
                                    Delete
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {isReadOnly && (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Lock className="h-3 w-3" />
                              <span>Read Only</span>
                            </div>
                          )}
                        </div>
                        {!isReadOnly && (
                          <Select
                            value={q.category_id}
                            onValueChange={(value) => handleChangeCategory(q.id, value)}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder="Switch Category" />
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
  );
}
