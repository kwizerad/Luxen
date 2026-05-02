"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Clock, Trophy, Settings, User, Moon, Sun, Monitor, Globe, ChevronRight, Mail, Menu, LogOut, Play, TrendingUp, Target, Award, BarChart3, Eye, FileText, Zap, History, Star, CheckCircle2, Search, Copy, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExamAttempt = {
  id: string;
  category_name: string;
  score_percentage: number;
  correct_answers: number;
  total_questions: number;
  duration_seconds: number;
  completed_at: string;
  status: string;
};

type Question = {
  id: string;
  category_id: string;
  question?: string;
  question_image?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { config } = useBrandingConfig();

  // Exam stats
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [examStats, setExamStats] = useState({
    totalExams: 0,
    averageScore: 0,
    bestScore: 0,
    totalTime: 0,
    completedExams: 0,
  });
  const [examCategories, setExamCategories] = useState<any[]>([]);

  // Question search state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }
        setUser(user);
        
        // Load exam data
        await loadExamData();
      } catch (error) {
        console.error("Error checking user:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const loadExamData = async () => {
    try {
      // Load exam attempts
      const attemptsRes = await fetch("/api/exam/attempts");
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        if (attemptsData.attempts) {
          setExamAttempts(attemptsData.attempts);
          
          // Calculate stats
          const completed = attemptsData.attempts.filter((a: ExamAttempt) => a.status === 'completed');
          const totalExams = completed.length;
          const averageScore = totalExams > 0 
            ? Math.round(completed.reduce((sum: number, a: ExamAttempt) => sum + a.score_percentage, 0) / totalExams)
            : 0;
          const bestScore = totalExams > 0 
            ? Math.max(...completed.map((a: ExamAttempt) => a.score_percentage))
            : 0;
          const totalTime = completed.reduce((sum: number, a: ExamAttempt) => sum + a.duration_seconds, 0);
          
          setExamStats({
            totalExams,
            averageScore,
            bestScore,
            totalTime,
            completedExams: totalExams,
          });
        }
      }

      // Load categories
      const categoriesRes = await fetch("/api/exam/categories");
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        if (categoriesData.categories) {
          setExamCategories(categoriesData.categories);
        }
      }
    } catch (error) {
      console.error("Failed to load exam data:", error);
    }
  };

  // Load all questions for search
  const loadQuestions = async () => {
    try {
      const res = await fetch("/api/exam/questions/public");
      if (res.ok) {
        const data = await res.json();
        if (data.questions) {
          setQuestions(data.questions);
        }
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
    }
  };

  // Toggle question search visibility
  const toggleQuestionSearch = () => {
    if (!showQuestionSearch) {
      loadQuestions();
    }
    setShowQuestionSearch(!showQuestionSearch);
    setQuestionSearchQuery("");
    setSelectedQuestion(null);
  };

  // Handle question selection
  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
    setShowQuestionSearch(false);
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  // Filter questions based on search query
  const filteredQuestions = questions.filter((q) => {
    const query = questionSearchQuery.toLowerCase();
    return (
      q.question?.toLowerCase().includes(query) ||
      q.option_a?.toLowerCase().includes(query) ||
      q.option_b?.toLowerCase().includes(query) ||
      q.option_c?.toLowerCase().includes(query) ||
      q.option_d?.toLowerCase().includes(query) ||
      q.explanation?.toLowerCase().includes(query)
    );
  });

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "User";
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.google_avatar_url || user?.user_metadata?.picture;

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{config.logoText || "N"}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{config.systemName}</h1>
              <p className="text-sm text-muted-foreground">{t("learningDashboard")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Desktop: Show avatar and dropdown */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowAccountDialog(true)}>
                <Avatar className="h-8 w-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
                  <AvatarFallback className="text-xs font-semibold">{getInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {getDisplayName()}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Theme Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Sun className="h-4 w-4 mr-2" />
                      {t("theme")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-accent" : ""}>
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-accent" : ""}>
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-accent" : ""}>
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Language Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Globe className="h-4 w-4 mr-2" />
                      {t("language")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setLanguage("English")} className={language === "English" ? "bg-accent" : ""}>
                        {t("language") === "Arabic" ? "العربية" : "English"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLanguage("Arabic")} className={language === "Arabic" ? "bg-accent" : ""}>
                        العربية
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      {t("settings")}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/");
              }}>{t("logout")}</Button>
            </div>

            {/* Mobile: Menu button */}
            <div className="md:hidden">
              <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowAccountDialog(true)}>
                    <User className="mr-2 h-4 w-4" />
                    {t("accountInfo")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    router.push("/");
                  }} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{t("welcomeBack")}</h2>
          <p className="text-muted-foreground">{t("learningDashboard")}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button onClick={() => router.push("/dashboard/exam")} className="gap-2">
            <Play className="h-4 w-4" />
            Take Exam
          </Button>
          <Button variant="outline" onClick={() => router.push("/userExam")} className="gap-2">
            <History className="h-4 w-4" />
            Exam History
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/settings")} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        {/* Exam Statistics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalExamsTaken")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{examStats.totalExams}</div>
              <p className="text-xs text-muted-foreground">{examStats.totalExams > 0 ? "Completed exams" : "No exams yet"}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("averageScore")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${examStats.averageScore >= 80 ? 'text-green-600' : examStats.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {examStats.averageScore}%
              </div>
              <p className="text-xs text-muted-foreground">
                {examStats.averageScore >= 80 ? 'Excellent performance!' : examStats.averageScore >= 60 ? 'Good progress' : 'Keep practicing'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("bestScore")}</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{examStats.bestScore}%</div>
              <p className="text-xs text-muted-foreground">Personal best</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalTimeSpent")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(examStats.totalTime / 3600)}h {Math.floor((examStats.totalTime % 3600) / 60)}m
              </div>
              <p className="text-xs text-muted-foreground">Across all exams</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Exam Activity */}
          <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  {t("recentExamActivity")}
                </CardTitle>
                <CardDescription>{t("yourLatestExamResults")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/userExam")}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {examAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("noExamsTakenYet")}</p>
                  <Button className="mt-4" onClick={() => router.push("/dashboard/exam")}>
                    <Play className="h-4 w-4 mr-2" />
                    Take Your First Exam
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {examAttempts.slice(0, 5).map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          attempt.score_percentage >= 80 ? 'bg-green-100 text-green-600' : 
                          attempt.score_percentage >= 60 ? 'bg-yellow-100 text-yellow-600' : 
                          'bg-red-100 text-red-600'
                        }`}>
                          {attempt.score_percentage >= 80 ? <Trophy className="h-5 w-5" /> : 
                           attempt.score_percentage >= 60 ? <Star className="h-5 w-5" /> : 
                           <Target className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{attempt.category_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attempt.completed_at).toLocaleDateString()} • {Math.floor(attempt.duration_seconds / 60)}m {attempt.duration_seconds % 60}s
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          attempt.score_percentage >= 80 ? 'text-green-600' : 
                          attempt.score_percentage >= 60 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {attempt.score_percentage}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.correct_answers}/{attempt.total_questions} correct
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t("performanceOverview")}
              </CardTitle>
              <CardDescription>{t("yourLearningProgress")}</CardDescription>
            </CardHeader>
            <CardContent>
              {examStats.totalExams === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("startExamsToSeeStats")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Score Distribution */}
                  <div>
                    <p className="text-sm font-medium mb-3">{t("scoreDistribution")}</p>
                    <div className="space-y-2">
                      {['90-100%', '80-89%', '70-79%', '60-69%', 'Below 60%'].map((range, idx) => {
                        const count = examAttempts.filter(a => {
                          if (idx === 0) return a.score_percentage >= 90;
                          if (idx === 1) return a.score_percentage >= 80 && a.score_percentage < 90;
                          if (idx === 2) return a.score_percentage >= 70 && a.score_percentage < 80;
                          if (idx === 3) return a.score_percentage >= 60 && a.score_percentage < 70;
                          return a.score_percentage < 60;
                        }).length;
                        const percentage = examStats.totalExams > 0 ? (count / examStats.totalExams) * 100 : 0;
                        const colors = ['bg-green-500', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-400'];
                        
                        return (
                          <div key={range} className="flex items-center gap-3">
                            <span className="text-xs w-16">{range}</span>
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full ${colors[idx]} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-xs w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{examStats.totalExams > 0 ? Math.round(examStats.totalTime / examStats.totalExams / 60) : 0}m</p>
                        <p className="text-xs text-muted-foreground">Avg. time per exam</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {examStats.totalExams > 0 
                            ? Math.round(examAttempts.reduce((sum, a) => sum + (a.correct_answers / a.total_questions * 100), 0) / examStats.totalExams)
                            : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Avg. accuracy</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Exam Categories */}
        {examCategories.length > 0 && (
          <Card className="mt-6 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {t("availableExamCategories")}
              </CardTitle>
              <CardDescription>{t("selectCategoryToStart")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {examCategories.map((category) => (
                  <div 
                    key={category.id} 
                    className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                    onClick={() => router.push("/dashboard/exam")}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{category.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {category.question_count || 0} questions available
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Play className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Search Section */}
        <Card className="mt-6 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search Questions
              </CardTitle>
              <CardDescription>Find and copy questions for reference</CardDescription>
            </div>
            <Button variant="outline" onClick={toggleQuestionSearch}>
              {showQuestionSearch ? (
                <><X className="h-4 w-4 mr-2" /> Close</>
              ) : (
                <><Search className="h-4 w-4 mr-2" /> Search</>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {showQuestionSearch && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions, options, or explanations..."
                    value={questionSearchQuery}
                    onChange={(e) => setQuestionSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {filteredQuestions.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredQuestions.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => handleSelectQuestion(q)}
                        className="p-3 border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                      >
                        <p className="font-medium line-clamp-2">{q.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Options: A) {q.option_a?.slice(0, 30)}... | Correct: {q.correct_answer}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : questionSearchQuery ? (
                  <p className="text-center text-muted-foreground py-4">No questions found matching your search</p>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Type to search questions</p>
                )}
              </div>
            )}
            {!showQuestionSearch && (
              <p className="text-muted-foreground">Click Search to browse and copy questions from the database</p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Question Detail Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Question Details
              </span>
              {selectedQuestion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedQuestion.question || "", "Question")}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copiedText === "Question" ? "Copied!" : "Copy Question"}
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Category: {examCategories.find(c => c.id === selectedQuestion?.category_id)?.name || "Unknown"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-6 mt-4">
              {/* Question */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Question</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedQuestion.question_image && (
                    <img 
                      src={selectedQuestion.question_image} 
                      alt="Question" 
                      className="w-full max-h-[200px] object-contain rounded-lg mb-3 border"
                    />
                  )}
                  <p className="text-base">{selectedQuestion.question}</p>
                </CardContent>
              </Card>

              {/* Options */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'A', text: selectedQuestion.option_a },
                    { key: 'B', text: selectedQuestion.option_b },
                    { key: 'C', text: selectedQuestion.option_c },
                    { key: 'D', text: selectedQuestion.option_d },
                  ].map((option) => {
                    const isCorrect = selectedQuestion.correct_answer === option.key;
                    return (
                      <div 
                        key={option.key}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          isCorrect 
                            ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500" 
                            : "bg-secondary border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                            isCorrect 
                              ? "bg-green-500 text-white" 
                              : "bg-primary text-white"
                          }`}>
                            {option.key}
                          </span>
                          <p className="text-sm">{option.text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(option.text || "", `Option ${option.key}`)}
                        >
                          <Copy className="h-4 w-4" />
                          {copiedText === `Option ${option.key}` && <span className="ml-1 text-xs">Copied!</span>}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Explanation */}
              {selectedQuestion.explanation && (
                <Card className="border-2 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Explanation</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedQuestion.explanation || "", "Explanation")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copiedText === "Explanation" ? "Copied!" : "Copy"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedQuestion.explanation}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowQuestionModal(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Info Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t("accountInformation")}
            </DialogTitle>
            <DialogDescription>
              {t("currentAccountDetails")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/50 border-2 border-primary/20 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-primary cursor-pointer" onClick={() => {
                  if (avatarUrl) {
                    window.open(avatarUrl, '_blank');
                  }
                }}>
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
                  <AvatarFallback className="text-xl font-semibold">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{getDisplayName()}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/20">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("gender")}</p>
                  <p className="font-medium capitalize">{user?.user_metadata?.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("nationality")}</p>
                  <p className="font-medium capitalize">{user?.user_metadata?.nationality || user?.user_metadata?.country || user?.user_metadata?.locale || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("dateOfBirth")}</p>
                  <p className="font-medium">{user?.user_metadata?.birthdate || user?.user_metadata?.date_of_birth || user?.user_metadata?.birthday || user?.user_metadata?.dob || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("role")}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                    {t(user?.user_metadata?.role?.toLowerCase() || "student")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
