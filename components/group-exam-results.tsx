"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Award, Clock, CheckCircle, XCircle, ArrowLeft, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { ExamReview } from "@/components/exam-review";
import type { ExamAttempt, ExamQuestion } from "@/lib/database.types";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  status: string;
  score: number | null;
  total_questions: number | null;
  duration_seconds: number | null;
  completed: boolean;
}

interface GroupExamResultsProps {
  challengeId: string;
  examResult: ExamAttempt;
  questions: ExamQuestion[];
  onReset: () => void;
  onRetake: () => void;
}

export function GroupExamResults({ challengeId, examResult, questions, onReset, onRetake }: GroupExamResultsProps) {
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, [challengeId]);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}/results`);
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (showReview) {
    return (
      <ExamReview
        examResult={examResult}
        questions={questions}
        onReset={onReset}
        onRetake={onRetake}
      />
    );
  }

  const completedCount = leaderboard.filter((e) => e.completed).length;
  const myEntry = leaderboard.find((e) => e.user_id === examResult.user_id);
  const myRank = myEntry ? leaderboard.findIndex((e) => e.user_id === examResult.user_id) + 1 : null;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-3">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{t("groupExamResults") || "Group Exam Results"}</h1>
          <p className="text-muted-foreground">
            {completedCount} {t("of")} {leaderboard.length} {t("participantsCompleted") || "participants completed"}
          </p>
        </div>

        {/* My Result Card */}
        {myEntry && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("yourScore") || "Your Score"}</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {myEntry.score ?? "—"} / {myEntry.total_questions ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("yourRank") || "Your Rank"}</p>
                  <p className="text-3xl font-bold mt-1">
                    #{myRank || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-amber-500" />
              {t("leaderboard") || "Leaderboard"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const medalColor = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-orange-600" : "";
                  const MedalIcon = rank === 1 ? Trophy : rank === 2 ? Medal : rank === 3 ? Award : null;

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isTop3 ? "border-amber-500/20 bg-amber-500/5" : "border-border"
                      } ${entry.user_id === examResult.user_id ? "ring-2 ring-primary/30" : ""}`}
                    >
                      {/* Rank */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center font-bold text-sm">
                        {MedalIcon ? (
                          <MedalIcon className={`h-6 w-6 ${medalColor}`} />
                        ) : (
                          <span className="text-muted-foreground">{rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-10 w-10">
                        {entry.avatar_url ? (
                          <AvatarImage src={entry.avatar_url} />
                        ) : (
                          <AvatarFallback>{getInitials(entry.full_name)}</AvatarFallback>
                        )}
                      </Avatar>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.full_name}
                          {entry.user_id === examResult.user_id && (
                            <span className="text-muted-foreground ml-1">({t("you") || "You"})</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.completed ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(entry.duration_seconds)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {t("notCompleted") || "Not completed"}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        {entry.completed ? (
                          <>
                            <p className="font-bold text-sm">
                              {entry.score} / {entry.total_questions}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                              {t("completed") || "Completed"}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {entry.status === "pending" ? (t("pending") || "Pending") :
                             entry.status === "joined" ? (t("joined") || "Joined") :
                             entry.status === "ready" ? (t("ready") || "Ready") :
                             (t("inProgress") || "In Progress")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => setShowReview(true)}
            variant="outline"
            className="flex-1"
          >
            {t("reviewAnswers") || "Review Answers"}
          </Button>
          <Button
            onClick={onReset}
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            {t("backToDashboard") || "Back to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
