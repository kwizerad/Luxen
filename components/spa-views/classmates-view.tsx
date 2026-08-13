"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, Loader2, Users, UserPlus, MessageCircle, Trophy, X, Check, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ChallengeCard } from "@/components/challenge-card";
import { ClassmatesViewSkeleton } from "@/components/skeletons";
import type { ChatMessage, ExamChallenge, ExamChallengeParticipant } from "@/lib/database.types";
import { toast } from "sonner";

interface ClassmatesViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface FriendProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
}

interface ClassmateRequestWithProfile {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  other_user: FriendProfile;
  direction: "sent" | "received";
}

interface ChallengeWithParticipants extends ExamChallenge {
  participants?: (ExamChallengeParticipant & { profile?: FriendProfile })[];
  creator_profile?: FriendProfile;
}

export function ClassmatesView({ navigate }: ClassmatesViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"friends" | "classmates">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [classmates, setClassmates] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<ClassmateRequestWithProfile[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<Map<string, string>>(new Map());
  const [isPublic, setIsPublic] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [examCategories, setExamCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [showRequests, setShowRequests] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageChannelRef = useRef<ReturnType<typeof createClient> extends infer T ? any : any>(null);

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [classmatesRes, requestsRes] = await Promise.all([
        fetch("/api/classmate-requests/classmates").then((r) => r.json()),
        fetch("/api/classmate-requests").then((r) => r.json()),
      ]);

      const classmatesData = classmatesRes as { classmates?: FriendProfile[]; error?: string };
      const requestsData = requestsRes as { requests?: ClassmateRequestWithProfile[]; is_public?: boolean };
      const allRequests: ClassmateRequestWithProfile[] = requestsData.requests || [];

      const acceptedFriends = allRequests
        .filter((r) => r.status === "accepted")
        .map((r) => r.other_user);

      const friendIds = new Set(acceptedFriends.map((f) => f.id));
      const sentMap = new Map<string, string>();
      allRequests.filter((r) => r.direction === "sent" && r.status === "pending").forEach((r) => {
        sentMap.set(r.other_user.id, r.id);
      });

      setFriends(acceptedFriends);
      setSentRequestIds(sentMap);
      setRequests(allRequests.filter((r) => r.status === "pending"));
      setIsPublic(requestsData.is_public ?? true);

      const classmatesList = classmatesData.classmates || [];
      const filteredClassmates = classmatesList.filter((c: FriendProfile) => !friendIds.has(c.id));
      setClassmates(filteredClassmates);
    } catch (error) {
      console.error("Failed to fetch classmates data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchChallenges = useCallback(async (otherUserId: string) => {
    try {
      const res = await fetch(`/api/exam-challenges?with_user=${otherUserId}`);
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    }
  }, []);

  const openChat = async (friend: FriendProfile) => {
    if (!user) return;
    setLoadingChat(true);
    setSelectedFriend(friend);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer_id: friend.id }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setMessages([]);

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", data.conversation.id)
          .order("created_at", { ascending: true })
          .limit(100);
        setMessages((msgs || []) as ChatMessage[]);

        await fetch("/api/chat/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: data.conversation.id }),
        });

        fetchChallenges(friend.id);
      }
    } catch (error) {
      console.error("Failed to open chat:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat_messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          if (payload.new.sender_id !== user?.id) {
            fetch("/api/chat/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation_id: conversationId }),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, supabase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;
    setSendingMessage(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, message: newMessage }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setNewMessage("");
    } catch {
      // ignore
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendRequest = async (classmateId: string) => {
    try {
      const res = await fetch("/api/classmate-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: classmateId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("classmateRequestSent"));
        if (data.request?.id) {
          setSentRequestIds((prev) => new Map([...prev, [classmateId, data.request.id]]));
        }
      } else {
        toast.error(data.error || t("failedToSendRequest"));
      }
    } catch {
      toast.error(t("failedToSendRequest"));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success(t("requestAccepted"));
        fetchData();
      } else {
        toast.error(t("failedToRespondRequest"));
      }
    } catch {
      toast.error(t("failedToRespondRequest"));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}/reject`, { method: "POST" });
      if (res.ok) {
        toast.success(t("requestRejected"));
        fetchData();
      } else {
        toast.error(t("failedToRespondRequest"));
      }
    } catch {
      toast.error(t("failedToRespondRequest"));
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("requestCancelled"));
        fetchData();
      }
    } catch {
      toast.error(t("failedToRespondRequest"));
    }
  };

  const handleToggleVisibility = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    try {
      const res = await fetch("/api/classmate-requests/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: newValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(t("visibilityUpdated"));
    } catch (error) {
      setIsPublic(!newValue);
      const message = error instanceof Error ? error.message : "Failed";
      toast.error(`${t("failedToUpdateVisibility")}: ${message}`);
    }
  };

  const openInviteModal = async () => {
    setShowInviteModal(true);
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
    if (selectedFriend) {
      setSelectedInvitees(new Set([selectedFriend.id]));
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
        setShowInviteModal(false);
        setSelectedCategory("");
        setSelectedInvitees(new Set());
        if (selectedFriend) {
          fetchChallenges(selectedFriend.id);
        }
      } else {
        toast.error(data.error || t("failedToCreateChallenge"));
      }
    } catch {
      toast.error(t("failedToCreateChallenge"));
    } finally {
      setCreatingChallenge(false);
    }
  };

  const pendingReceivedRequests = requests.filter((r) => r.direction === "received");
  const pendingSentRequests = requests.filter((r) => r.direction === "sent");

  const filteredFriends = friends.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.full_name?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q)
    );
  });

  const filteredClassmates = classmates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q)
    );
  });

  if (loading) return <ClassmatesViewSkeleton />;

  const getAvatarUrl = (profile?: FriendProfile | null) => {
    if (!profile) return undefined;
    return profile.avatar_url || undefined;
  };

  const getInitials = (profile?: FriendProfile | null) => {
    if (!profile) return "?";
    const name = profile.full_name || profile.username || "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const ProfileAvatar = ({ profile, size = "h-10 w-10" }: { profile?: FriendProfile | null; size?: string }) => {
    if (!profile) return <div className={`${size} rounded-full bg-muted animate-pulse`} />;
    const url = getAvatarUrl(profile);
    return (
      <Avatar className={size}>
        {url && <AvatarImage src={url} alt={profile.full_name || ""} />}
        <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>{getInitials(profile)}</AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Sidebar */}
      <div className="w-full sm:w-80 border-r flex flex-col bg-background">
        {/* Tab Switcher + Visibility */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab("friends")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "friends" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t("friends")}
                {pendingReceivedRequests.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {pendingReceivedRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("classmates")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "classmates" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t("classmatesList")}
              </button>
            </div>
            <button
              onClick={handleToggleVisibility}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              title={isPublic ? t("youArePublic") : t("youArePrivate")}
            >
              {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "friends" ? t("searchFriends") : t("searchClassmates")}
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "friends" ? (
            <>
              {/* Pending Requests */}
              {pendingReceivedRequests.length > 0 && showRequests && (
                <div className="border-b">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("pendingRequests")} ({pendingReceivedRequests.length})
                    </span>
                    <button
                      onClick={() => setShowRequests(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {pendingReceivedRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                      <ProfileAvatar profile={req.other_user} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.other_user.full_name || req.other_user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{req.other_user.username}</p>
                      </div>
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sent Requests */}
              {pendingSentRequests.length > 0 && (
                <div className="border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2 block">
                    {t("requestSent")} ({pendingSentRequests.length})
                  </span>
                  {pendingSentRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                      <ProfileAvatar profile={req.other_user} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.other_user.full_name || req.other_user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{req.other_user.username}</p>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                        title={t("cancelRequest")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List */}
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">{t("noFriendsYet")}</p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => openChat(friend)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left ${
                      selectedFriend?.id === friend.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="relative">
                      <ProfileAvatar profile={friend} size="h-10 w-10" />
                      {isOnline(friend.last_seen) && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {friend.full_name || friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isOnline(friend.last_seen) ? t("online") : `@${friend.username}`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              {filteredClassmates.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">{t("noClassmatesFound")}</p>
                </div>
              ) : (
                filteredClassmates.map((classmate) => (
                  <div
                    key={classmate.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <ProfileAvatar profile={classmate} size="h-10 w-10" />
                      {isOnline(classmate.last_seen) && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {classmate.full_name || classmate.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{classmate.username}</p>
                    </div>
                    {sentRequestIds.has(classmate.id) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelRequest(sentRequestIds.get(classmate.id)!)}
                        className="text-xs h-7 text-muted-foreground hover:text-red-600"
                      >
                        <X className="h-3 w-3 mr-1" />
                        {t("cancelRequest")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendRequest(classmate.id)}
                        className="text-xs h-7"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        {t("addClassmate")}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div className="hidden sm:flex flex-1 flex-col bg-background">
        {!selectedFriend ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{t("selectFriendToChat")}</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="border-b px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedFriend(null);
                  setConversationId(null);
                  setMessages([]);
                  setChallenges([]);
                }}
                className="sm:hidden rounded-lg p-1 hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <ProfileAvatar profile={selectedFriend} size="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">
                  {selectedFriend.full_name || selectedFriend.username}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isOnline(selectedFriend.last_seen) ? t("online") : `@${selectedFriend.username}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={openInviteModal} className="text-xs">
                <Trophy className="h-3.5 w-3.5 mr-1.5" />
                {t("inviteToGroupExam")}
              </Button>
            </div>

            {/* Challenge Cards */}
            {challenges.length > 0 && (
              <div className="px-4 pt-3 max-h-[40%] overflow-y-auto">
                {challenges.map((ch) => (
                  <ChallengeCard
                    key={ch.id}
                    challenge={ch}
                    currentUserId={user?.id || ""}
                    onActionComplete={() => selectedFriend && fetchChallenges(selectedFriend.id)}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingChat ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">{t("noMessagesYet")}</p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p
                          className={`mt-1 text-xs ${
                            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <div className="border-t px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={t("typeMessage")}
                className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Chat Overlay */}
      {selectedFriend && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-background">
          <div className="border-b px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedFriend(null);
                setConversationId(null);
                setMessages([]);
                setChallenges([]);
              }}
              className="rounded-lg p-1 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <ProfileAvatar profile={selectedFriend} size="h-10 w-10" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate">
                {selectedFriend.full_name || selectedFriend.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isOnline(selectedFriend.last_seen) ? t("online") : `@${selectedFriend.username}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={openInviteModal} className="text-xs">
              <Trophy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {challenges.length > 0 && (
            <div className="px-4 pt-3 max-h-[35%] overflow-y-auto">
              {challenges.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  currentUserId={user?.id || ""}
                  onActionComplete={() => selectedFriend && fetchChallenges(selectedFriend.id)}
                  navigate={navigate}
                />
              ))}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {loadingChat ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("noMessagesYet")}</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`mt-1 text-xs ${
                          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t px-4 py-3 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={t("typeMessage")}
              className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
            >
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Invite to Group Exam Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
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
                      <ProfileAvatar profile={friend} size="h-8 w-8" />
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
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
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
