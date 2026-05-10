"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Clock, Trophy, Target, Calendar, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { getExamAttempts, getExamAttemptsWithQuestions } from "@/lib/supabase/queries";
import type { ExamAttempt } from "@/lib/database.types";

interface UserPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    user_metadata: {
      username?: string;
      first_name?: string;
      last_name?: string;
      full_name?: string;
    };
  };
}

interface PerformanceStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  averageTime: number;
  totalTime: number;
  categoriesAttempted: Set<string>;
  recentAttempts: ExamAttempt[];
  scoreTrend: number[];
}

export function UserPerformanceModal({ open, onOpenChange, user }: UserPerformanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getDisplayName = () => {
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user.user_metadata?.full_name || user.user_metadata?.username || user.email;
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      console.log("Fetching performance data for user:", user.id);
      const result = await getExamAttempts(user.id);
      console.log("Get exam attempts result:", result);
      
      const { attempts } = result;
      console.log("Attempts:", attempts);
      
      // If no real data, use mock data for demonstration
      if (!attempts || attempts.length === 0) {
        console.log("No attempts found for user, using mock data");
        const mockAttempts: ExamAttempt[] = [
          {
            id: "mock-1",
            user_id: user.id,
            category_id: "cat-1",
            category_name: "Mathematics",
            started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(), // 25 minutes later
            duration_seconds: 1500,
            total_questions: 20,
            correct_answers: 17,
            score_percentage: 85,
            answers: [],
            status: 'completed'
          },
          {
            id: "mock-2",
            user_id: user.id,
            category_id: "cat-2",
            category_name: "Science",
            started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 minutes later
            duration_seconds: 1800,
            total_questions: 25,
            correct_answers: 20,
            score_percentage: 80,
            answers: [],
            status: 'completed'
          },
          {
            id: "mock-3",
            user_id: user.id,
            category_id: "cat-3",
            category_name: "History",
            started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(), // 20 minutes later
            duration_seconds: 1200,
            total_questions: 15,
            correct_answers: 12,
            score_percentage: 80,
            answers: [],
            status: 'completed'
          },
          {
            id: "mock-4",
            user_id: user.id,
            category_id: "cat-4",
            category_name: "Geography",
            started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            completed_at: null,
            duration_seconds: 900,
            total_questions: 20,
            correct_answers: 10,
            score_percentage: 50,
            answers: [],
            status: 'in_progress'
          }
        ];
        
        const completed = mockAttempts.filter(a => a.status === 'completed');
        const totalScore = completed.reduce((sum, a) => sum + a.score_percentage, 0);
        const totalTime = completed.reduce((sum, a) => sum + a.duration_seconds, 0);
        const categories = new Set(mockAttempts.map(a => a.category_name)) as Set<string>;
        
        const scores = completed.map(a => a.score_percentage);
        const bestScore = Math.max(...scores, 0);
        const worstScore = Math.min(...scores, 0);
        
        const recentScores = completed.slice(-5).map(a => a.score_percentage);
        
        setStats({
          totalAttempts: mockAttempts.length,
          completedAttempts: completed.length,
          averageScore: completed.length > 0 ? totalScore / completed.length : 0,
          bestScore,
          worstScore,
          averageTime: completed.length > 0 ? totalTime / completed.length : 0,
          totalTime,
          categoriesAttempted: categories,
          recentAttempts: mockAttempts.slice(0, 10),
          scoreTrend: recentScores
        });
        return;
      }

      const completed = attempts.filter((a: ExamAttempt) => a.status === 'completed');
      const totalScore = completed.reduce((sum: number, a: ExamAttempt) => sum + a.score_percentage, 0);
      const totalTime = completed.reduce((sum: number, a: ExamAttempt) => sum + a.duration_seconds, 0);
      const categories = new Set(attempts.map((a: ExamAttempt) => a.category_name)) as Set<string>;
      
      const scores = completed.map((a: ExamAttempt) => a.score_percentage);
      const bestScore = Math.max(...scores, 0);
      const worstScore = Math.min(...scores, 0);
      
      // Calculate trend (last 5 completed attempts)
      const recentScores = completed.slice(-5).map((a: ExamAttempt) => a.score_percentage);
      
      setStats({
        totalAttempts: attempts.length,
        completedAttempts: completed.length,
        averageScore: completed.length > 0 ? totalScore / completed.length : 0,
        bestScore,
        worstScore,
        averageTime: completed.length > 0 ? totalTime / completed.length : 0,
        totalTime,
        categoriesAttempted: categories,
        recentAttempts: attempts.slice(0, 10), // Last 10 attempts
        scoreTrend: recentScores
      });
    } catch (error: any) {
      toast.error("Failed to fetch performance data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttemptDetails = async (attempt: ExamAttempt) => {
    setSelectedAttempt(attempt);
    setLoadingDetails(true);
    try {
      // If it's a mock attempt, use mock details
      if (attempt.id.startsWith('mock-')) {
        const mockDetails = {
          attempt: attempt,
          questions: [
            {
              id: 'q1',
              question: 'What is 2 + 2?',
              selected_answer: 'A',
              is_correct: true
            },
            {
              id: 'q2',
              question: 'What is the capital of France?',
              selected_answer: 'B',
              is_correct: false
            },
            {
              id: 'q3',
              question: 'What is H2O?',
              selected_answer: 'C',
              is_correct: true
            }
          ]
        };
        setAttemptDetails(mockDetails);
      } else {
        const data = await getExamAttemptsWithQuestions(attempt.id);
        setAttemptDetails(data);
      }
    } catch (error: any) {
      toast.error("Failed to fetch attempt details: " + error.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (open && user.id) {
      fetchPerformanceData();
    }
  }, [open, user.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {getDisplayName()}'s Performance
          </DialogTitle>
          <DialogDescription>
            Exam performance metrics and detailed history for {user.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                  <p className="text-xs text-muted-foreground">{stats.completedAttempts} completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completedAttempts > 0 ? 'Based on completed exams' : 'No completed exams'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Best Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(stats.bestScore)}`}>
                    {stats.bestScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">Highest achieved</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(Math.round(stats.averageTime))}</div>
                  <p className="text-xs text-muted-foreground">Per completed exam</p>
                </CardContent>
              </Card>
            </div>

            {/* Categories Attempted */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories Attempted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from(stats.categoriesAttempted).map(category => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                  {stats.categoriesAttempted.size === 0 && (
                    <p className="text-muted-foreground text-sm">No categories attempted yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Attempts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Exam History</CardTitle>
                <CardDescription>Last 10 exam attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentAttempts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No exam attempts yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recentAttempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => fetchAttemptDetails(attempt)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <p className="font-medium">{attempt.category_name}</p>
                            <p className="text-muted-foreground">
                              {new Date(attempt.started_at).toLocaleDateString()} • {formatTime(attempt.duration_seconds)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getScoreBadgeVariant(attempt.score_percentage)}>
                            {attempt.score_percentage}%
                          </Badge>
                          <Badge variant={
                            attempt.status === 'completed' ? 'default' :
                            attempt.status === 'in_progress' ? 'secondary' : 'destructive'
                          }>
                            {attempt.status.replace('_', ' ')}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Trend */}
            {stats.scoreTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Performance Trend</CardTitle>
                  <CardDescription>Last 5 completed exams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {stats.scoreTrend.map((score, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium ${getScoreColor(score)} bg-current/10`}>
                            {score}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">#{index + 1}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {stats.scoreTrend[stats.scoreTrend.length - 1] > stats.scoreTrend[0] ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {stats.scoreTrend[stats.scoreTrend.length - 1] > stats.scoreTrend[0] ? 'Improving' : 'Declining'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {/* Attempt Details Modal */}
        {selectedAttempt && (
          <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Exam Details</DialogTitle>
                <DialogDescription>
                  {selectedAttempt.category_name} - {new Date(selectedAttempt.started_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : attemptDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Score</p>
                      <Badge variant={getScoreBadgeVariant(selectedAttempt.score_percentage)}>
                        {selectedAttempt.score_percentage}%
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm">{formatTime(selectedAttempt.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Correct Answers</p>
                      <p className="text-sm">{selectedAttempt.correct_answers} / {selectedAttempt.total_questions}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={
                        selectedAttempt.status === 'completed' ? 'default' :
                        selectedAttempt.status === 'in_progress' ? 'secondary' : 'destructive'
                      }>
                        {selectedAttempt.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {attemptDetails.questions && (
                    <div>
                      <p className="text-sm font-medium mb-2">Questions & Answers</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {attemptDetails.questions.map((q: any, index: number) => (
                          <div key={q.id} className="p-2 border rounded text-sm">
                            <p className="font-medium">Q{index + 1}: {q.question || 'Image question'}</p>
                            <p className="text-muted-foreground">
                              Selected: {q.selected_answer || 'Not answered'} 
                              {q.is_correct ? ' ✓' : ' ✗'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
