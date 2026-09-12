"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Trophy, Plus, Loader2, Users, ShieldAlert, Search, CheckSquare, Square, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { isGroupExamEnabled } from "@/lib/feature-flags";
import { ChallengeCard } from "@/components/challenge-card";
import { GroupExamViewSkeleton } from "@/components/skeletons";
import type { ExamChallenge, ExamChallengeParticipant } from "@/lib/database.types";
import { toast } from "sonner";

interface ClassmateProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
  is_friend?: boolean;
}

interface ChallengeWithParticipants extends ExamChallenge {
  participants?: (ExamChallengeParticipant & { profile?: ClassmateProfile })[];
  creator_profile?: ClassmateProfile;
}

export interface GroupExamViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function GroupExamView({ navigate }: GroupExamViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [loading, setLoading] = useState(true);
  const [groupExamOn, setGroupExamOn] = useState<boolean>(true);
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [classmates, setClassmates] = useState<ClassmateProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examCategories, setExamCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalTab, setModalTab] = useState<"all" | "friends" | "classmates">("all");

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/exam-challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchClassmates = useCallback(async () => {
    if (!user) return;
    try {
      const [requestsRes, classmatesRes] = await Promise.all([
        fetch("/api/classmate-requests").then((r) => r.json()).catch(() => ({ requests: [] })),
        fetch("/api/classmate-requests/classmates?exclude_friends=false").then((r) => r.json()).catch(() => ({ classmates: [] })),
      ]);

      const requestsData = requestsRes as { requests?: any[] };
      const allRequests: any[] = requestsData.requests || [];
      const acceptedFriendIds = new Set(
        allRequests
          .filter((r) => r.status === "accepted" && r.other_user?.id)
          .map((r) => r.other_user.id)
      );

      const classmatesList: any[] = (classmatesRes as any)?.classmates || [];
      const combinedMap = new Map<string, ClassmateProfile>();

      for (const c of classmatesList) {
        if (!c?.id || c.id === user.id) continue;
        combinedMap.set(c.id, {
          id: c.id,
          full_name: c.full_name || c.username || "Student",
          username: c.username,
          avatar_url: c.avatar_url,
          last_seen: c.last_seen,
          is_friend: acceptedFriendIds.has(c.id),
        });
      }

      for (const r of allRequests) {
        if (r.status === "accepted" && r.other_user && r.other_user.id !== user.id) {
          const u = r.other_user;
          if (!combinedMap.has(u.id)) {
            combinedMap.set(u.id, {
              id: u.id,
              full_name: u.full_name || u.username || "Friend",
              username: u.username,
              avatar_url: u.avatar_url,
              last_seen: u.last_seen,
              is_friend: true,
            });
          } else {
            combinedMap.get(u.id)!.is_friend = true;
          }
        }
      }

      const mergedList = Array.from(combinedMap.values()).sort((a, b) => {
        if (a.is_friend && !b.is_friend) return -1;
        if (!a.is_friend && b.is_friend) return 1;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });

      setClassmates(mergedList);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    isGroupExamEnabled()
      .then((enabled) => {
        setGroupExamOn(enabled);
        if (enabled) {
          return Promise.all([fetchChallenges(), fetchClassmates()]);
        }
      })
      .finally(() => setLoading(false));
  }, [fetchChallenges, fetchClassmates]);

  // Realtime subscription for challenge updates
  useEffect(() => {
    if (!user) return;
    const channelName = `group-exam-changes-${user.id || "anon"}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
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
      if (res.ok && data.challenge?.id) {
        toast.success(t("challengeCreated") || "Group exam created!");
        setShowCreateModal(false);
        const catId = selectedCategory;
        setSelectedCategory("");
        setSelectedInvitees(new Set());
        window.location.href = `/dashboard/exam?challenge_id=${data.challenge.id}&category_id=${catId}&from=services`;
      } else {
        toast.error(data.error || t("failedToCreateChallenge"));
      }
    } catch {
      toast.error(t("failedToCreateChallenge"));
    } finally {
      setCreatingChallenge(false);
    }
  };

  const isWithin60Min = (c: ChallengeWithParticipants) => {
    if (!c.created_at) return true;
    return Date.now() - new Date(c.created_at).getTime() <= 60 * 60 * 1000;
  };

  const validChallenges = challenges.filter(isWithin60Min);

  const pendingChallenges = validChallenges.filter((c) => {
    const myP = c.participants?.find((p) => p.user_id === user?.id);
    const hasCompleted = myP?.status === "completed" || Boolean(myP?.exam_attempt_id) || c.status === "completed";
    return c.status === "pending" && !hasCompleted;
  });

  const activeChallenges = validChallenges.filter((c) => {
    const myP = c.participants?.find((p) => p.user_id === user?.id);
    const hasCompleted = myP?.status === "completed" || Boolean(myP?.exam_attempt_id) || c.status === "completed";
    return c.status === "active" && !hasCompleted;
  });

  const completedChallenges = validChallenges.filter((c) => {
    const myP = c.participants?.find((p) => p.user_id === user?.id);
    const hasCompleted = myP?.status === "completed" || Boolean(myP?.exam_attempt_id) || c.status === "completed";
    return hasCompleted || c.status === "cancelled";
  });

  if (loading) return <GroupExamViewSkeleton />;

  if (!groupExamOn) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24">
        <div className="container mx-auto max-w-xl px-4 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t("groupExamService") || "Group Exam"}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {t("groupExamDisabledMessage") || "Group exams are currently disabled by administration."}
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate("back", { fallback: "services" })} variant="default">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back") || t("backToHome") || "Back"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate("back", { fallback: "services" })}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("services") || "Back"}
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

            {/* Classmates/Friends Multi-Select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("selectInvitees") || "Select Classmates & Friends"}</label>
                {selectedInvitees.size > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {selectedInvitees.size} {t("selected") || "selected"}
                  </Badge>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setModalTab("all")}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition-all ${
                    modalTab === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {t("all") || "All"} ({classmates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("friends")}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition-all ${
                    modalTab === "friends" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {t("friends") || "Friends"} ({classmates.filter((c) => c.is_friend).length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("classmates")}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition-all ${
                    modalTab === "classmates" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {t("classmatesList") || "Classmates"} ({classmates.filter((c) => !c.is_friend).length})
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("searchFriendsClassmates") || "Search by name or username..."}
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg"
                />
              </div>

              {/* List */}
              {(() => {
                const tabList =
                  modalTab === "friends"
                    ? classmates.filter((c) => c.is_friend)
                    : modalTab === "classmates"
                    ? classmates.filter((c) => !c.is_friend)
                    : classmates;

                const filtered = tabList.filter((item) => {
                  if (!modalSearch) return true;
                  const q = modalSearch.toLowerCase();
                  return item.full_name?.toLowerCase().includes(q) || item.username?.toLowerCase().includes(q);
                });

                return (
                  <div className="max-h-52 overflow-y-auto rounded-lg border divide-y">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-4 text-center">
                        {modalSearch ? t("noResults") || "No students found" : t("noClassmatesFound") || "No classmates found"}
                      </p>
                    ) : (
                      filtered.map((item) => {
                        const isSelected = selectedInvitees.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2.5 p-2 hover:bg-muted/50 cursor-pointer text-xs"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                setSelectedInvitees((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(item.id);
                                  else next.delete(item.id);
                                  return next;
                                });
                              }}
                            />
                            <Avatar className="h-7 w-7 ring-1 ring-border/40 shrink-0">
                              {item.avatar_url ? (
                                <AvatarImage src={item.avatar_url} alt="" />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {(item.full_name || item.username || "?")[0]?.toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground truncate">
                                  {item.full_name || item.username}
                                </span>
                                {item.is_friend ? (
                                  <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary px-1 py-0 h-4">
                                    {t("friend") || "Friend"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0 h-4">
                                    {t("classmate") || "Classmate"}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate block">@{item.username || "student"}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                );
              })()}
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
