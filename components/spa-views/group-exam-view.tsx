"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Trophy, Plus, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ChallengeCard } from "@/components/challenge-card";
import { GroupExamViewSkeleton } from "@/components/skeletons";
import type { ExamChallenge, ExamChallengeParticipant } from "@/lib/database.types";
import { toast } from "sonner";

interface FriendProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
}

interface ChallengeWithParticipants extends ExamChallenge {
  participants?: (ExamChallengeParticipant & { profile?: FriendProfile })[];
  creator_profile?: FriendProfile;
}

export interface GroupExamViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function GroupExamView({ navigate }: GroupExamViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examCategories, setExamCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/exam-challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/classmate-requests");
      const data = await res.json();
      const acceptedFriends = (data.requests || [])
        .filter((r: any) => r.status === "accepted")
        .map((r: any) => r.other_user)
        .filter(Boolean);
      setFriends(acceptedFriends);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    Promise.all([fetchChallenges(), fetchFriends()]).finally(() => setLoading(false));
  }, [fetchChallenges, fetchFriends]);

  // Realtime subscription for challenge updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("group-exam-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges" },
        () => fetchChallenges()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants" },
        () => fetchChallenges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchChallenges]);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    if (examCategories.length === 0) {
      try {
        const { data } = await supabase
          .from("exam_categories")
          .select("id, name")
          .eq("is_published", true)
          .order("name", { ascending: true });
        setExamCategories(data || []);
      } catch {
        // ignore
      }
    }
  };

  const handleCreateChallenge = async () => {
    if (!selectedCategory) {
      toast.error(t("selectExamCategory"));
      return;
    }
    if (selectedInvitees.size === 0) {
      toast.error(t("selectAtLeastOneFriend"));
      return;
    }
    setCreatingChallenge(true);
    try {
      const category = examCategories.find((c) => c.id === selectedCategory);
      const res = await fetch("/api/exam-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCategory,
          category_name: category?.name || "",
          invite_user_ids: Array.from(selectedInvitees),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("challengeCreated"));
        setShowCreateModal(false);
        setSelectedCategory("");
        setSelectedInvitees(new Set());
        fetchChallenges();
      } else {
        toast.error(data.error || t("failedToCreateChallenge"));
      }
    } catch {
      toast.error(t("failedToCreateChallenge"));
    } finally {
      setCreatingChallenge(false);
    }
  };

  const pendingChallenges = challenges.filter((c) => c.status === "pending");
  const activeChallenges = challenges.filter((c) => c.status === "active");
  const completedChallenges = challenges.filter((c) => c.status === "completed" || c.status === "cancelled");

  if (loading) return <GroupExamViewSkeleton />;

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate("services")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("services")}
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {t("groupExamService")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("groupExamServiceDesc")}</p>
          </div>
          <Button onClick={openCreateModal} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            {t("createGroupExam")}
          </Button>
        </div>

        {/* Pending invitations */}
        {pendingChallenges.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("pendingInvitations")} ({pendingChallenges.length})
            </h2>
            <div className="space-y-3">
              {pendingChallenges.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  currentUserId={user?.id || ""}
                  onActionComplete={fetchChallenges}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active challenges */}
        {activeChallenges.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {t("activeChallenges")} ({activeChallenges.length})
            </h2>
            <div className="space-y-3">
              {activeChallenges.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  currentUserId={user?.id || ""}
                  onActionComplete={fetchChallenges}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed challenges */}
        {completedChallenges.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("completedChallenges")} ({completedChallenges.length})
            </h2>
            <div className="space-y-3">
              {completedChallenges.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  currentUserId={user?.id || ""}
                  onActionComplete={fetchChallenges}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {challenges.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{t("noGroupExamsYet")}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              {t("noGroupExamsDesc")}
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" />
              {t("createGroupExam")}
            </Button>
          </div>
        )}
      </div>

      {/* Create Group Exam Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t("inviteToGroupExam")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category Select */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("selectExamCategory")}</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">—</option>
                {examCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Friend Multi-Select */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("selectFriends")}</label>
              <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">{t("noFriendsToInvite")}</p>
                ) : (
                  friends.map((friend) => (
                    <label
                      key={friend.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedInvitees.has(friend.id)}
                        onCheckedChange={(checked) => {
                          setSelectedInvitees((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(friend.id);
                            else next.delete(friend.id);
                            return next;
                          });
                        }}
                      />
                      {friend.avatar_url ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar_url} alt="" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {(friend.full_name || friend.username || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {(friend.full_name || friend.username || "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm flex-1">
                        {friend.full_name || friend.username}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateChallenge} disabled={creatingChallenge}>
              {creatingChallenge ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trophy className="h-4 w-4 mr-2" />
              )}
              {t("createChallenge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
