"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, Clock, TrendingUp, Play, Eye, CheckCircle, XCircle } from "lucide-react";
import { Watermark } from "@/components/watermark";
import type { ExamAttempt } from "@/lib/database.types";

export default function UserExamsPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttempts = async () => {
      try {
        const res = await fetch("/api/exam/attempts");
        const data = await res.json();
        if (data.attempts) {
          setAttempts(data.attempts);
        }
      } catch {
        toast.error("Failed to load exam history");
      } finally {
        setLoading(false);
      }
    };
    loadAttempts();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    return "destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const averageScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / completedAttempts.length)
    : 0;

  return (
    <div className="space-y-6 relative">
      <Watermark />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold brand-protected">My Exams</h1>
          <p className="text-muted-foreground mt-1">View your exam history and results</p>
        </div>
        <Button onClick={() => window.location.href = "/dashboard/exam"}>
          <Play className="h-4 w-4 mr-2" />
          Take New Exam
        </Button>
      </div>

      {/* Stats Overview */}
      {completedAttempts.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="navo-card-brand">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedAttempts.length}</div>
            </CardContent>
          </Card>
          <Card className="navo-card-brand">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>{averageScore}%</div>
            </CardContent>
          </Card>
          <Card className="navo-card-brand">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatTime(completedAttempts.reduce((sum, a) => sum + a.duration_seconds, 0))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exam History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Exam History</h2>
        
        {attempts.length === 0 ? (
          <Card className="navo-card-brand">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No exams taken yet. Start your first exam!
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.location.href = "/dashboard/exam"}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Take Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {attempts.map((attempt) => (
              <Card 
                key={attempt.id}
                className="hover:shadow-md transition-shadow navo-card-brand"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {attempt.category_name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(attempt.started_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge variant={getScoreBadge(attempt.score_percentage)} className="text-lg px-4 py-1">
                      {attempt.score_percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Correct</div>
                        <div className="font-semibold">{attempt.correct_answers}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Incorrect</div>
                        <div className="font-semibold">{attempt.total_questions - attempt.correct_answers}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Time</div>
                        <div className="font-semibold">{formatTime(attempt.duration_seconds)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Questions</div>
                        <div className="font-semibold">{attempt.total_questions}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

