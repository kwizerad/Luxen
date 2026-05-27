"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
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
import { PerformanceCharts } from "@/components/performance-charts";
import { QuickActions } from "@/components/quick-actions";
import { ActivityFeed } from "@/components/activity-feed";
import { ProfileCompletion } from "@/components/profile-completion";
import { calculateExamStats, groupByCategory, formatDuration, formatRelativeTime, generateActivityFeed, calculateStreak } from "@/lib/dashboard-utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const supabase = createClient();
    
    // Add a safety timeout to prevent indefinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Dashboard loading timeout - setting loading to false");
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    const checkUser = async () => {
      try {
        // First try getSession which is more reliable immediately after login
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // Suppress lock errors
          if (!sessionError.message?.includes("lock") && !sessionError.message?.includes("Lock")) {
            console.log("Session error:", sessionError.message);
          }
        }
        
        let user = session?.user || null;
        
        // If no session, try getUser as fallback
        if (!user) {
          const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            // Suppress lock errors
            if (userError.message?.includes("lock") || userError.message?.includes("Lock")) {
              if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkUser, 100 * retryCount);
                return;
              }
              console.warn("Auth lock timeout after retries, continuing...");
            } else {
              console.log("User error:", userError.message);
            }
          }
          user = userData || null;
        }
        
        if (!isMounted) return;
        
        if (!user) {
          // Retry a few times in case session is still loading
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`No user found, retrying (${retryCount}/${maxRetries})...`);
            setTimeout(checkUser, 800 * retryCount);
            return;
          }
          router.push("/");
          return;
        }
        
        if (user) {
          setUser(user);
          // Load exam data and limit
          try {
            await Promise.all([loadExamData(), loadExamLimit()]);
          } catch (dataError) {
            console.error("Failed to load exam data after user check:", dataError);
            // Don't block on data load failures - still set loading to false
          }
        }
      } catch (error: any) {
        // Ignore lock errors - they're internal Supabase timing issues
        if (error?.message?.includes("lock")) {
          console.warn("Supabase auth lock error (non-critical):", error.message);
        } else {
          console.error("Error checking user:", error);
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkUser, 800 * retryCount);
            return;
          }
          router.push("/");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user: any } | null) => {
      console.log("Dashboard auth state changed:", event);
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("User signed in via auth state change in dashboard");
        setUser(session.user);
        Promise.all([loadExamData(), loadExamLimit()]);
      }
    });

    checkUser();
    
    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [router]);

  const loadExamData = async () => {
    try {
      // Load exam attempts
      const attemptsData = await getExamAttempts();
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

      // Load categories
      const categoriesData = await getExamCategories();
      if (categoriesData.categories) {
        setExamCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error("Failed to load exam data:", error);
    }
  };

  // Delete an attempt and refresh
  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm("Delete this attempt? This action cannot be undone.")) return;
    try {
      await deleteExamAttempt(attemptId);
      await loadExamData();
    } catch (err) {
      console.error("Failed to delete attempt:", err);
      alert("Failed to delete attempt");
    }
  };

  const loadExamLimit = async () => {
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">Loading your dashboard...</p>
          <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-background/95 backdrop-blur-sm shadow-lg p-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 pt-14 md:pt-6 pb-20 md:pb-6 space-y-4">
        
        {/* Enhanced Header with Greeting and Stats */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("welcome")}, {getDisplayName().split(' ')[0]}! 👋</h1>
              <p className="text-sm text-muted-foreground mt-1">Your learning dashboard overview</p>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KPICard
              title="Total Exams"
              value={examStats.totalExams}
              unit="taken"
              icon={<Trophy className="h-4 w-4" />}
              description="All completed exams"
            />
            <KPICard
              title="Average Score"
              value={examStats.averageScore}
              unit="%"
              icon={<BarChart3 className="h-4 w-4" />}
              description="Your overall performance"
            />
            <KPICard
              title="Best Score"
              value={examStats.bestScore}
              unit="%"
              icon={<Award className="h-4 w-4" />}
              description="Highest score achieved"
            />
            <KPICard
              title="Pass Rate"
              value={examStats.passRate}
              unit="%"
              icon={<CheckCircle2 className="h-4 w-4" />}
              description="Exams passed (≥50%)"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
          <QuickActions />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column - Primary Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Performance Charts */}
            {examStats.totalExams > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Performance Analytics</h2>
                <PerformanceCharts
                  categoryPerformance={groupByCategory(examAttempts)}
                  loading={loading}
                />
              </div>
            )}

            {examStats.totalExams === 0 && (
              <Card className="border border-border">
                <CardContent className="pt-6">
                  <EmptyState
                    icon={<Brain className="h-12 w-12" />}
                    title="No Exams Yet"
                    description="Start taking exams to see your performance analytics and track your progress"
                    action={{
                      label: "Take First Exam",
                      onClick: () => router.push("/dashboard/exam"),
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Recent Attempts - Compact */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Attempts</h2>
              <Card className="border border-border">
                <CardContent className="p-4">
                  {examAttempts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No attempts yet</p>
                  ) : (
                    <div className="space-y-2">
                      {examAttempts.slice(0, 3).map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-accent transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{a.category_name}</div>
                            <div className="text-xs text-muted-foreground">{formatRelativeTime(a.completed_at)} · {formatDuration(a.duration_seconds)}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-sm font-semibold text-primary">{a.score_percentage}%</span>
                            <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/exam-attempts/${a.id}`)}>
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                      {examAttempts.length > 3 && (
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          View All Attempts
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
              <div>
                <h2 className="text-lg font-semibold mb-3">Score Distribution</h2>
                <Card className="border border-border">
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Excellent (90-100%)', 
                              value: examAttempts.filter(a => a.score_percentage >= 90).length,
                              fill: '#10b981'
                            },
                            { 
                              name: 'Good (75-89%)', 
                              value: examAttempts.filter(a => a.score_percentage >= 75 && a.score_percentage < 90).length,
                              fill: '#3b82f6'
                            },
                            { 
                              name: 'Fair (50-74%)', 
                              value: examAttempts.filter(a => a.score_percentage >= 50 && a.score_percentage < 75).length,
                              fill: '#f59e0b'
                            },
                            { 
                              name: 'Below 50%', 
                              value: examAttempts.filter(a => a.score_percentage < 50).length,
                              fill: '#ef4444'
                            }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {[].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-4">
            {/* Profile Completion */}
            <ProfileCompletion
              userMetadata={user?.user_metadata || {}}
              onEditClick={() => router.push("/dashboard/settings")}
              isLoading={loading}
            />

            {/* Exam Limit Info */}
            {examLimit.is_limited && (
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Daily Limit
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="text-muted-foreground">Used</span>
                      <span className="font-semibold">{examLimit.attempts_today}/{examLimit.daily_limit}</span>
                    </div>
                    <div className="bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(examLimit.attempts_today / examLimit.daily_limit) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {examLimit.remaining_attempts} left
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
      
      <MobileBottomNav />
    </div>
  );
}
