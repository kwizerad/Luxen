"use client";

import { useState, useEffect } from "react";
import { Users, Trophy, Clock, Check, X, ArrowLeft, AlertCircle, Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ExamChallenge, ExamChallengeParticipant } from "@/lib/database.types";

interface ExamInvitationsViewProps {
  onBack: () => void;
}

interface ChallengeWithParticipants extends ExamChallenge {
  participants?: (ExamChallengeParticipant & { 
    profile?: { full_name?: string; username?: string; avatar_url?: string };
    exam_attempt?: { score?: number; percentage?: number };
  })[];
  creator_profile?: { full_name?: string; username?: string; avatar_url?: string };
}

export function ExamInvitationsView({ onBack }: ExamInvitationsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "ongoing" | "completed">("pending");

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/exam-challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
      toast.error(t("failedToLoadChallenges") || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime updates for exam challenges
    const channel = supabase
      .channel(`exam_challenges:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges" },
        () => fetchChallenges()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `user_id=eq.${user.id}` },
        () => fetchChallenges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const handleRespondToInvitation = async (challengeId: string, accept: boolean) => {
    try {
      const endpoint = accept ? `/api/exam-challenges/${challengeId}/join` : `/api/exam-challenges/${challengeId}/deny`;
      const res = await fetch(endpoint, { method: "POST" });
      
      if (res.ok) {
        toast.success(accept ? t("invitationAccepted") || "Invitation accepted" : t("invitationDeclined") || "Invitation declined");
        fetchChallenges();
      } else {
        const data = await res.json();
        toast.error(data.error || t("failedToRespond") || "Failed to respond");
      }
    } catch (error) {
      console.error("Failed to respond to invitation:", error);
      toast.error(t("failedToRespond") || "Failed to respond");
    }
  };

  const filteredChallenges = challenges.filter((challenge) => {
    const userParticipation = challenge.participants?.find((p) => p.user_id === user?.id);
    if (!userParticipation) return false;

    if (activeTab === "pending") return userParticipation.status === "pending";
    if (activeTab === "ongoing") return userParticipation.status === "joined" && challenge.status === "active";
    if (activeTab === "completed") return challenge.status === "completed" || userParticipation.status === "completed";
    return false;
  });

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back") || "Back"}
          </button>
          <h1 className="text-2xl font-bold mb-2">{t("examInvitations") || "Exam Invitations"}</h1>
          <p className="text-muted-foreground">{t("examInvitationsDescription") || "View and respond to group exam invitations"}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("pending") || "Pending"}
          </button>
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "ongoing"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("ongoing") || "Ongoing"}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "completed"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("completed") || "Completed"}
          </button>
        </div>

        {/* Challenges List */}
        {filteredChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {activeTab === "pending"
                  ? t("noPendingInvitations") || "No pending invitations"
                  : activeTab === "ongoing"
                  ? t("noOngoingExams") || "No ongoing exams"
                  : t("noCompletedExams") || "No completed exams"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredChallenges.map((challenge) => {
              const userParticipation = challenge.participants?.find((p) => p.user_id === user?.id);
              const isPending = userParticipation?.status === "pending";
              const isOngoing = userParticipation?.status === "joined" && challenge.status === "active";
              const isCompleted = challenge.status === "completed" || userParticipation?.status === "completed";

              return (
                <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{challenge.category_name}</CardTitle>
                          <Badge variant={isPending ? "default" : isOngoing ? "secondary" : "outline"}>
                            {isPending ? t("pending") || "Pending" : isOngoing ? t("ongoing") || "Ongoing" : t("completed") || "Completed"}
                          </Badge>
                        </div>
                        <CardDescription>
                          {t("createdBy") || "Created by"} {challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Unknown"}
                        </CardDescription>
                      </div>
                      {isPending && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRespondToInvitation(challenge.id, false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t("decline") || "Decline"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRespondToInvitation(challenge.id, true)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t("accept") || "Accept"}
                          </Button>
                        </div>
                      )}
                      {isOngoing && (
                        <Button size="sm" onClick={() => window.location.href = `/dashboard/exam?challenge_id=${challenge.id}`}>
                          <Play className="h-4 w-4 mr-1" />
                          {t("joinExam") || "Join Exam"}
                        </Button>
                      )}
                      {isCompleted && (
                        <Button size="sm" variant="outline" onClick={() => {
                          // Show ranking modal or navigate to results
                          toast.info(t("viewingResults") || "Viewing results...");
                        }}>
                          <Trophy className="h-4 w-4 mr-1" />
                          {t("viewRankings") || "View Rankings"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Participants */}
                      <div>
                        <p className="text-sm font-medium mb-2">{t("participants") || "Participants"}</p>
                        <div className="flex -space-x-2">
                          {challenge.participants?.slice(0, 5).map((participant) => (
                            <Avatar key={participant.id} className="w-8 h-8 border-2 border-background">
                              {participant.profile?.avatar_url ? (
                                <AvatarImage src={participant.profile.avatar_url} />
                              ) : (
                                <AvatarFallback className="text-xs">{getInitials(participant.profile?.full_name)}</AvatarFallback>
                              )}
                            </Avatar>
                          ))}
                          {(challenge.participants?.length || 0) > 5 && (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                              +{(challenge.participants?.length || 0) - 5}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rankings for completed exams */}
                      {isCompleted && challenge.participants && (
                        <div>
                          <p className="text-sm font-medium mb-2">{t("rankings") || "Rankings"}</p>
                          <div className="space-y-2">
                            {challenge.participants
                              .filter((p) => p.status === "completed" && p.exam_attempt)
                              .sort((a, b) => (b.exam_attempt?.percentage || 0) - (a.exam_attempt?.percentage || 0))
                              .slice(0, 3)
                              .map((participant, index) => (
                                <div key={participant.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"} className="w-6 h-6 flex items-center justify-center p-0">
                                      {index + 1}
                                    </Badge>
                                    <span className="font-medium">{participant.profile?.full_name || participant.profile?.username || "Unknown"}</span>
                                  </div>
                                  <span className="font-bold">{participant.exam_attempt?.percentage || 0}%</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Status info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{challenge.participants?.length || 0} {t("participants") || "participants"}</span>
                        </div>
                        {isOngoing && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{t("inProgress") || "In progress"}</span>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            <span>{t("completed") || "Completed"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
