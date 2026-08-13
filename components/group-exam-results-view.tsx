"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Medal, Clock, CheckCircle, XCircle, Loader2, ArrowLeft, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { GroupExamResultsSkeleton } from "@/components/skeletons";
import type { ExamChallenge, ExamChallengeParticipant, ExamQuestion, ExamAttempt } from "@/lib/database.types";

interface GroupExamResultsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  params: URLSearchParams;
}

interface ParticipantWithProfile extends ExamChallengeParticipant {
  profile?: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  exam_attempt?: ExamAttempt | null;
}

interface RankedParticipant {
  participant: ParticipantWithProfile;
  rank: number;
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  durationSeconds: number;
  completedAt: string;
}

export function GroupExamResultsView({ navigate, params }: GroupExamResultsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const challengeId = params.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ExamChallenge | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [viewMode, setViewMode] = useState<"all" | "group" | "individual">("all");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");

  const fetchData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}`);
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
        const enrichedParticipants = data.participants || [];
        setParticipants(enrichedParticipants);

        const completedWithAttempts = enrichedParticipants.filter(
          (p: ParticipantWithProfile) => p.status === "completed" && p.exam_attempt
        );
        if (completedWithAttempts.length > 0) {
          const firstAttempt = completedWithAttempts[0].exam_attempt;
          if (firstAttempt) {
            const { data: questionsData } = await supabase
              .from("exam_questions")
              .select("*")
              .eq("category_id", data.challenge.category_id)
              .order("created_at", { ascending: true });
            setQuestions(questionsData || []);
          }
        }

        const firstCompleted = enrichedParticipants.find(
          (p: ParticipantWithProfile) => p.status === "completed"
        );
        if (firstCompleted) {
          setSelectedParticipantId(firstCompleted.user_id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch challenge results:", error);
    } finally {
      setLoading(false);
    }
  }, [challengeId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!challengeId) return;
    const channel = supabase
      .channel(`challenge-results-${challengeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `challenge_id=eq.${challengeId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges", filter: `id=eq.${challengeId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, supabase, fetchData]);

  const completedParticipants = participants.filter((p) => p.status === "completed" && p.exam_attempt);
  const incompleteParticipants = participants.filter((p) => p.status !== "completed" && p.status !== "rejected");
  const joinedParticipants = participants.filter((p) => ["joined", "ready", "completed"].includes(p.status));
  const allCompleted = joinedParticipants.length > 0 && joinedParticipants.every((p) => p.status === "completed");

  const ranked: RankedParticipant[] = completedParticipants
    .map((p) => ({
      participant: p,
      rank: 0,
      scorePercentage: p.exam_attempt?.score_percentage || 0,
      correctAnswers: p.exam_attempt?.correct_answers || 0,
      totalQuestions: p.exam_attempt?.total_questions || 0,
      durationSeconds: p.exam_attempt?.duration_seconds || 0,
      completedAt: p.completed_at || p.exam_attempt?.completed_at || "",
    }))
    .sort((a, b) => {
      if (b.scorePercentage !== a.scorePercentage) return b.scorePercentage - a.scorePercentage;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    })
    .map((rp, idx) => ({ ...rp, rank: idx + 1 }));

  const winner = allCompleted && ranked.length > 0 ? ranked[0] : null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getOptionText = (q: ExamQuestion, option: string) => {
    const key = `option_${option.toLowerCase()}` as keyof ExamQuestion;
    return q[key] as string;
  };

  const getOptionImage = (q: ExamQuestion, option: string) => {
    const key = `option_${option.toLowerCase()}_image` as keyof ExamQuestion;
    return q[key] as string | undefined;
  };

  const getParticipantsForOption = (questionId: string, option: string) => {
    return completedParticipants.filter((p) => {
      if (!p.exam_attempt?.answers) return false;
      const answer = p.exam_attempt.answers.find((a) => a.question_id === questionId);
      return answer?.selected_answer === option;
    });
  };

  const selectedParticipant = participants.find((p) => p.user_id === selectedParticipantId);
  const selectedParticipantAttempt = selectedParticipant?.exam_attempt;

  const filteredQuestions = questions.filter((q) => {
    if (questionFilter === "all") return true;
    if (!selectedParticipantAttempt?.answers) return false;
    const answer = selectedParticipantAttempt.answers.find((a) => a.question_id === q.id);
    if (questionFilter === "correct") return answer?.is_correct === true;
    if (questionFilter === "incorrect") return answer && !answer.is_correct;
    if (questionFilter === "unanswered") return !answer || answer.selected_answer === null;
    return true;
  });

  if (loading) return <GroupExamResultsSkeleton />;

  if (!challenge) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <p className="text-muted-foreground">{t("challengeCompleted")}</p>
      </div>
    );
  }

  const ProfileAvatar = ({ profile, size = "h-8 w-8" }: { profile?: any; size?: string }) => {
    if (!profile) return <div className={`${size} rounded-full bg-muted animate-pulse`} />;
    return (
      <Avatar className={size}>
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
        <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>
          {(profile.full_name || profile.username || "?")[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 sm:pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("classmates")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {challenge.category_name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {completedParticipants.length} {t("xOfYCompleted")} {joinedParticipants.length} {t("participants")}
            </p>
          </div>
        </div>

        {/* Congratulations Banner */}
        {winner && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-yellow-400/20 via-amber-400/20 to-orange-400/20 border border-yellow-400/30 p-4 flex items-center gap-3">
            <PartyPopper className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="font-bold text-sm sm:text-base">
                {t("congratulationsWinner")} 🏆
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {winner.participant.profile?.full_name || winner.participant.profile?.username} —{" "}
                {winner.scorePercentage}% ({winner.correctAnswers}/{winner.totalQuestions})
              </p>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4 w-fit">
          {(["all", "group", "individual"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                viewMode === mode ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              {mode === "all" ? t("allResults") : mode === "group" ? t("groupResults") : t("individualResults")}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="mb-6 rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Medal className="h-4 w-4 text-primary" />
              {t("leaderboard")}
            </h2>
          </div>
          <div className="divide-y">
            {ranked.map((rp) => (
              <div
                key={rp.participant.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  rp.participant.user_id === user?.id ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm shrink-0">
                  {rp.rank === 1 && <Medal className="h-5 w-5 text-yellow-500" />}
                  {rp.rank === 2 && <Medal className="h-5 w-5 text-gray-400" />}
                  {rp.rank === 3 && <Medal className="h-5 w-5 text-orange-400" />}
                  {rp.rank > 3 && <span className="text-muted-foreground">{rp.rank}</span>}
                </div>
                <ProfileAvatar profile={rp.participant.profile} size="h-8 w-8" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rp.participant.profile?.full_name || rp.participant.profile?.username}
                    {rp.participant.user_id === user?.id && (
                      <span className="ml-1.5 text-xs text-primary">({t("user")})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rp.correctAnswers}/{rp.totalQuestions} {t("correct")} · {formatDuration(rp.durationSeconds)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold text-sm ${
                      rp.scorePercentage >= 80
                        ? "text-green-500"
                        : rp.scorePercentage >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {rp.scorePercentage}%
                  </span>
                </div>
              </div>
            ))}
            {incompleteParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <ProfileAvatar profile={p.profile} size="h-8 w-8" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.profile?.full_name || p.profile?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("stillTakingExam")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Results — Floating Usernames */}
        {(viewMode === "all" || viewMode === "group") && questions.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t("groupResults")}
            </h2>
            <div className="space-y-3">
              {questions.map((q, qIdx) => {
                const correctOption = q.correct_answer;
                const options = ["A", "B", "C", "D"];
                return (
                  <div key={q.id} className="rounded-xl border bg-card p-3 sm:p-4">
                    <p className="text-sm font-medium mb-2">
                      {qIdx + 1}. {q.question}
                    </p>
                    {q.question_image && (
                      <img src={q.question_image} alt="" className="mb-3 max-h-40 rounded-lg" />
                    )}
                    <div className="space-y-2">
                      {options.map((opt) => {
                        const optText = getOptionText(q, opt);
                        const optImg = getOptionImage(q, opt);
                        const isCorrect = opt === correctOption;
                        const choosers = getParticipantsForOption(q.id, opt);

                        return (
                          <div
                            key={opt}
                            className={`rounded-lg border p-2.5 ${
                              isCorrect ? "border-green-500 bg-green-50/50" : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  isCorrect ? "bg-green-500 text-white" : "bg-muted"
                                }`}
                              >
                                {opt}
                              </span>
                              <span className="text-sm flex-1">{optText || (optImg && "📷")}</span>
                              {optImg && <img src={optImg} alt="" className="h-8 w-8 rounded object-cover" />}
                            </div>
                            {/* Floating usernames */}
                            {choosers.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2 ml-8">
                                {choosers.slice(0, 3).map((c) => (
                                  <span
                                    key={c.id}
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      isCorrect
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {c.profile?.username || c.profile?.full_name?.split(" ")[0]}
                                  </span>
                                ))}
                                {choosers.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{choosers.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual Results */}
        {(viewMode === "all" || viewMode === "individual") && completedParticipants.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              {t("individualResults")}
            </h2>

            {/* Participant tabs */}
            <div className="flex gap-1 overflow-x-auto mb-3 pb-1">
              {completedParticipants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedParticipantId(p.user_id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedParticipantId === p.user_id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p.profile?.username || p.profile?.full_name?.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Selected participant's review */}
            {selectedParticipantAttempt && (
              <div className="rounded-xl border bg-card p-3 sm:p-4">
                <div className="flex items-center gap-3 mb-4">
                  <ProfileAvatar profile={selectedParticipant?.profile} size="h-10 w-10" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedParticipant?.profile?.full_name || selectedParticipant?.profile?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedParticipantAttempt.correct_answers}/{selectedParticipantAttempt.total_questions} ·{" "}
                      {selectedParticipantAttempt.score_percentage}% ·{" "}
                      {formatDuration(selectedParticipantAttempt.duration_seconds)}
                    </p>
                  </div>
                  <Badge
                    variant={selectedParticipantAttempt.score_percentage >= 50 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {selectedParticipantAttempt.score_percentage >= 50 ? t("success") : t("failed")}
                  </Badge>
                </div>

                {/* Question filter */}
                <div className="flex gap-1 mb-3">
                  {(["all", "correct", "incorrect", "unanswered"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setQuestionFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        questionFilter === f ? "bg-muted text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {f === "all" ? t("filter") : f === "correct" ? t("correctAnswer") : f === "incorrect" ? t("wrongAnswer") : t("no")}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {filteredQuestions.map((q, qIdx) => {
                    const answer = selectedParticipantAttempt.answers?.find((a) => a.question_id === q.id);
                    const isCorrect = answer?.is_correct;
                    const selectedOption = answer?.selected_answer;

                    return (
                      <div
                        key={q.id}
                        className={`rounded-lg border p-2.5 ${
                          isCorrect === true
                            ? "border-green-500/50 bg-green-50/30"
                            : isCorrect === false
                            ? "border-red-500/50 bg-red-50/30"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-muted-foreground mt-0.5">{qIdx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{q.question}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              {isCorrect === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {isCorrect === false && <XCircle className="h-4 w-4 text-red-500" />}
                              <span className="text-xs">
                                {selectedOption
                                  ? `${t("yourAnswer")}: ${selectedOption}`
                                  : t("no")}
                                {" · "}
                                <span className="text-green-600">{t("correctAnswer")}: {q.correct_answer}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return <Trophy className={className} />;
}
