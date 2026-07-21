"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getExamAttempts, getExamCategories, getExamLimits, getPublicExamQuestions, deleteExamAttempt } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Clock, Trophy, Settings, User, ChevronRight, Mail, Menu, LogOut, Play, TrendingUp, Target, Award, BarChart3, Eye, FileText, Zap, History, Star, CheckCircle2, Search, Copy, X, Hash, Infinity, Flame, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { FloatingUserSettings } from "@/components/floating-user-settings";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KPICard, EmptyState } from "@/components/dashboard-widgets";
import { QuickActions } from "@/components/quick-actions";
import { ActivityFeed } from "@/components/activity-feed";
import { ProfileCompletion } from "@/components/profile-completion";
import { calculateExamStats, groupByCategory, formatDuration, formatRelativeTime, generateActivityFeed, calculateStreak } from "@/lib/dashboard-utils";

// Dynamic imports for heavy components
// const PieChart = lazy(() => import("recharts").then(module => ({ default: module.PieChart })));
// const Pie = lazy(() => import("recharts").then(module => ({ default: module.Pie })));
// const Cell = lazy(() => import("recharts").then(module => ({ default: module.Cell })));
// const ResponsiveContainer = lazy(() => import("recharts").then(module => ({ default: module.ResponsiveContainer })));
// const Tooltip = lazy(() => import("recharts").then(module => ({ default: module.Tooltip })));

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
  const { user, loading: authLoading } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();
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
    passRate: 0,
  });
  const [examCategories, setExamCategories] = useState<any[]>([]);

  // Question search state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Exam limits state
  const [examLimit, setExamLimit] = useState({
    daily_limit: 5,
    attempts_today: 0,
    remaining_attempts: 5,
    is_limited: true,
    unlimited: false,
  });

  const loadExamData = useCallback(async () => {
    try {
      // Load exam attempts and categories in parallel
      const [attemptsData, categoriesData] = await Promise.all([
        getExamAttempts(),
        getExamCategories()
      ]);
      
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
        
        const passCount = completed.filter((a: ExamAttempt) => a.score_percentage >= 50).length;
        const passRate = totalExams > 0 ? Math.round((passCount / totalExams) * 100) : 0;

        setExamStats({
          totalExams,
          averageScore,
          bestScore,
          totalTime,
          completedExams: totalExams,
          passRate,
        });
      }

      if (categoriesData.categories) {
        setExamCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error("Failed to load exam data:", error);
    }
  }, []);

  const loadExamLimit = useCallback(async () => {
    try {
      const data = await getExamLimits();
      setExamLimit({
        daily_limit: data.daily_limit || 5,
        attempts_today: data.attempts_today || 0,
        remaining_attempts: data.remaining_attempts ?? (data.daily_limit || 5) - (data.attempts_today || 0),
        is_limited: data.is_limited ?? true,
        unlimited: data.unlimited || !data.is_limited,
      });
    } catch (error) {
      console.error("Failed to load exam limit:", error);
    }
  }, []);

  const scoreDistributionData = [
    {
      name: "scoreDistribution.excellent",
      value: examAttempts.filter((a) => a.score_percentage >= 90).length,
      fill: '#10b981',
    },
    {
      name: "scoreDistribution.good",
      value: examAttempts.filter((a) => a.score_percentage >= 75 && a.score_percentage < 90).length,
      fill: '#3b82f6',
    },
    {
      name: "scoreDistribution.fair",
      value: examAttempts.filter((a) => a.score_percentage >= 50 && a.score_percentage < 75).length,
      fill: '#f59e0b',
    },
    {
      name: "scoreDistribution.below50",
      value: examAttempts.filter((a) => a.score_percentage < 50).length,
      fill: '#ef4444',
    },
  ].filter((item) => item.value > 0);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading || !user) return;

    let isMounted = true;

    const loadData = async () => {
      try {
        await Promise.all([loadExamData(), loadExamLimit()]);
      } catch (dataError) {
        console.error("Failed to load exam data:", dataError);
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  // Delete an attempt and refresh
  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm(t("deleteAttemptConfirm"))) return;
    try {
      await deleteExamAttempt(attemptId);
      await loadExamData();
    } catch (err) {
      console.error("Failed to delete attempt:", err);
      alert(t("failedToDeleteAttempt"));
    }
  };

  // Load all questions for search
  const loadQuestions = async () => {
    try {
      const data = await getPublicExamQuestions();
      if (data.questions) {
        setQuestions(data.questions);
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

  // Filter questions based on search query (memoized)
  const queryLower = questionSearchQuery.trim().toLowerCase();
  const filteredQuestions = useMemo(() => {
    if (!queryLower) return questions;

    return questions.filter((q) => {
      return (
        q.question?.toLowerCase().includes(queryLower) ||
        q.option_a?.toLowerCase().includes(queryLower) ||
        q.option_b?.toLowerCase().includes(queryLower) ||
        q.option_c?.toLowerCase().includes(queryLower) ||
        q.option_d?.toLowerCase().includes(queryLower) ||
        q.explanation?.toLowerCase().includes(queryLower)
      );
    });
  }, [questions, queryLower]);



  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || t("user");
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

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-transparent gap-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">{t("loadingYourDashboard")}</p>
          <p className="text-sm text-muted-foreground">{t("pleaseWaitFetchingData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#3B82F6] text-primary-foreground flex items-center justify-center overflow-hidden shadow-md shadow-primary/25">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <main className="student-page">
        
        {/* Enhanced Header with Greeting and Stats */}
        <div className="student-section">
          <div className="student-page-header">
            <div>
              <h1 className="student-page-title">{t("welcome")}, {getDisplayName().split(' ')[0]}!</h1>
              <p className="student-page-description">{t("learningDashboard")}</p>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 lg:gap-4">
            <KPICard
              title={t("totalExamsTaken")}
              value={examStats.totalExams}
              unit={t("taken")}
              icon={<Trophy className="h-4 w-4" />}
              description={t("allCompletedExams")}
            />
            <KPICard
              title={t("averageScore")}
              value={examStats.averageScore}
              unit="%"
              icon={<BarChart3 className="h-4 w-4" />}
              description={t("yourOverallPerformance")}
            />
            <KPICard
              title={t("bestScore")}
              value={examStats.bestScore}
              unit="%"
              icon={<Award className="h-4 w-4" />}
              description={t("highestScoreAchieved")}
            />
            <KPICard
              title={t("passRate")}
              value={examStats.passRate}
              unit="%"
              icon={<CheckCircle2 className="h-4 w-4" />}
              description={t("examsPassed50")}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="student-section">
          <div className="student-section-header">
            <h2 className="student-section-title">{t("quickActions")}</h2>
          </div>
          <QuickActions />
        </div>

        {/* Main Content Grid */}
        <div className="student-content-grid">
          {/* Left Column - Primary Content */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-8">
            {/* Recent Attempts - Compact */}
            <div className="student-section">
              <div className="student-section-header">
                <h2 className="student-section-title">{t("recentAttempts")}</h2>
              </div>
              <Card className="rounded-[14px] sm:rounded-[24px]">
                <CardContent className="p-3 sm:p-4">
                  {examAttempts.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">{t("noExamsTakenYet")}</p>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      {examAttempts.slice(0, 3).map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 sm:gap-3 rounded-[12px] sm:rounded-[16px] border border-white/30 bg-background/25 p-2 sm:p-3 transition-colors hover:bg-accent/40 dark:border-white/10">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs sm:text-sm truncate">{a.category_name}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{formatRelativeTime(a.completed_at)} · {formatDuration(a.duration_seconds)}</div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 ml-2 shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-primary">{a.score_percentage}%</span>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => router.push(`/dashboard/exam-attempts/${a.id}`)}>
                              {t("view")}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {examAttempts.length > 3 && (
                        <Button variant="outline" size="sm" className="w-full mt-1.5 sm:mt-2">
                          {t("viewAll")}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed - Removed: read-only, no functionality */}

            {/* Score Distribution Chart */}
            {examStats.totalExams > 0 && (
              <div className="student-section">
                <div className="student-section-header">
                  <h2 className="student-section-title">{t("scoreDistribution")}</h2>
                </div>
                <Card className="rounded-[14px] sm:rounded-[24px]">
                  <CardContent className="p-3 sm:pt-4 sm:p-6">
                    <div className="space-y-1.5 sm:space-y-2">
                      {scoreDistributionData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-[10px] sm:rounded-[14px] border border-white/25 bg-background/25 p-2 sm:p-3 dark:border-white/10">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                            <span className="text-xs sm:text-sm truncate">{t(item.name)}</span>
                          </div>
                          <span className="font-semibold text-xs sm:text-sm shrink-0">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-4">
            {/* Profile Completion */}
            <ProfileCompletion
              userMetadata={user?.user_metadata || {}}
              onEditClick={() => router.push("/dashboard/settings")}
              isLoading={dataLoading || authLoading}
            />

            {/* Exam Limit Info */}
            {examLimit.is_limited && (
              <Card className="rounded-[14px] sm:rounded-[24px]">
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    {t("dailyLimit")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5 sm:space-y-2 p-3 pt-0 sm:p-6 sm:pt-0">
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">{t("used")}</span>
                      <span className="font-semibold">{examLimit.attempts_today}/{examLimit.daily_limit}</span>
                    </div>
                    <div className="bg-secondary rounded-full h-1.5 sm:h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(examLimit.attempts_today / examLimit.daily_limit) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {examLimit.remaining_attempts} {t("remaining")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Question Detail Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                {t("questionDetails")}
              </span>
              {selectedQuestion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedQuestion.question || "", "Question")}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copiedText === "Question" ? t("copied") : t("copyQuestion")}
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("category")}: {examCategories.find(c => c.id === selectedQuestion?.category_id)?.name || t("unknown")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-6 mt-4">
              {/* Question */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">{t("question")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedQuestion.question_image && (
                    <img 
                      src={selectedQuestion.question_image} 
                      alt={t("question")}
                      className="w-full max-h-[200px] object-contain rounded-lg mb-3 border"
                    />
                  )}
                  <p className="text-base">{selectedQuestion.question}</p>
                </CardContent>
              </Card>

              {/* Options */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">{t("options")}</CardTitle>
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
                          {copiedText === `Option ${option.key}` && <span className="ml-1 text-xs">{t("copied")}</span>}
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
                    <CardTitle className="text-lg">{t("explanation")}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedQuestion.explanation || "", "Explanation")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copiedText === "Explanation" ? t("copied") : t("copy")}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedQuestion.explanation}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowQuestionModal(false)} className="flex-1">
                  {t("close")}
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
      
      <MobileBottomNav hide />
    </div>
  );
}
