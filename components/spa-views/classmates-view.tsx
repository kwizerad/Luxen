"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, Loader2, Users, UserPlus, MessageCircle, Trophy, X, Check, CheckCheck, ArrowLeft, Eye, EyeOff, Bell, Clock, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  participants?: (ExamChallengeParticipant & { 
    profile?: FriendProfile;
    exam_attempt?: { score?: number; percentage?: number };
  })[];
  creator_profile?: FriendProfile;
}

function MessageTicks({ msg }: { msg: ChatMessage }) {
  if (msg.is_read) {
    return <CheckCheck className="inline-block h-3 w-3 text-sky-500" />;
  } else if (msg.delivered_at) {
    return <CheckCheck className="inline-block h-3 w-3 text-muted-foreground" />;
  } else {
    return <Check className="inline-block h-3 w-3 text-muted-foreground" />;
  }
}

function ExamInvitationsContent({ user, supabase, t, navigate }: { user: any; supabase: any; t: any; navigate: (view: string, params?: Record<string, string>) => void }) {
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-2 p-3 border-b">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "pending"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("pending") || "Pending"}
        </button>
        <button
          onClick={() => setActiveTab("ongoing")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "ongoing"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("ongoing") || "Ongoing"}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "completed"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("completed") || "Completed"}
        </button>
      </div>

      {/* Challenges List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {activeTab === "pending"
                ? t("noPendingInvitations") || "No pending invitations"
                : activeTab === "ongoing"
                ? t("noOngoingExams") || "No ongoing exams"
                : t("noCompletedExams") || "No completed exams"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChallenges.map((challenge) => {
              const userParticipation = challenge.participants?.find((p) => p.user_id === user?.id);
              const isPending = userParticipation?.status === "pending";
              const isOngoing = userParticipation?.status === "joined" && challenge.status === "active";
              const isCompleted = challenge.status === "completed" || userParticipation?.status === "completed";

              return (
                <div key={challenge.id} className="bg-card border rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{challenge.category_name}</span>
                        <Badge variant={isPending ? "default" : isOngoing ? "secondary" : "outline"} className="text-xs">
                          {isPending ? t("pending") || "Pending" : isOngoing ? t("ongoing") || "Ongoing" : t("completed") || "Completed"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("createdBy") || "Created by"} {challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Unknown"}
                      </p>
                    </div>
                    {isPending && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRespondToInvitation(challenge.id, false)}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          {t("decline") || "Decline"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRespondToInvitation(challenge.id, true)}
                          className="h-7 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {t("accept") || "Accept"}
                        </Button>
                      </div>
                    )}
                    {isOngoing && (
                      <Button size="sm" onClick={() => window.location.href = `/dashboard/exam?challenge_id=${challenge.id}`} className="h-7 text-xs">
                        <Play className="h-3 w-3 mr-1" />
                        {t("joinExam") || "Join Exam"}
                      </Button>
                    )}
                    {isCompleted && (
                      <Button size="sm" variant="outline" onClick={() => window.location.href = `/dashboard/exam?challenge_id=${challenge.id}`} className="h-7 text-xs">
                        <Trophy className="h-3 w-3 mr-1" />
                        {t("viewRankings") || "View Rankings"}
                      </Button>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">{t("participants") || "Participants"}:</span>
                    <div className="flex -space-x-1">
                      {challenge.participants?.slice(0, 4).map((participant) => (
                        <Avatar key={participant.id} className="w-6 h-6 border-2 border-background">
                          {participant.profile?.avatar_url ? (
                            <AvatarImage src={participant.profile.avatar_url} />
                          ) : (
                            <AvatarFallback className="text-[8px]">{getInitials(participant.profile?.full_name)}</AvatarFallback>
                          )}
                        </Avatar>
                      ))}
                      {(challenge.participants?.length || 0) > 4 && (
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium">
                          +{(challenge.participants?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rankings for completed exams */}
                  {isCompleted && challenge.participants && (
                    <div className="space-y-1">
                      {challenge.participants
                        .filter((p) => p.status === "completed" && p.exam_attempt)
                        .sort((a, b) => (b.exam_attempt?.percentage || 0) - (a.exam_attempt?.percentage || 0))
                        .slice(0, 3)
                        .map((participant, index) => (
                          <div key={participant.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"} className="w-5 h-5 flex items-center justify-center p-0 text-[10px]">
                                {index + 1}
                              </Badge>
                              <span className="font-medium">{participant.profile?.full_name || participant.profile?.username || "Unknown"}</span>
                            </div>
                            <span className="font-bold">{participant.exam_attempt?.percentage || 0}%</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClassmatesView({ navigate }: ClassmatesViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"friends" | "classmates" | "invitations">("friends");
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
  const [pictureViewer, setPictureViewer] = useState<{ url: string; name: string } | null>(null);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<{ senderId: string; senderName: string; message: string; conversationId: string }[]>([]);
  const [friendLastMessages, setFriendLastMessages] = useState<Map<string, { message: string; time: string; unread: number }>>(new Map());

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageChannelRef = useRef<ReturnType<typeof createClient> extends infer T ? any : any>(null);

  // Auto-switch to classmates tab if friends tab is hidden
  useEffect(() => {
    if (!loading && friends.length === 0 && requests.filter((r) => r.status === "pending").length === 0) {
      setActiveTab("classmates");
    }
  }, [loading, friends.length, requests]);

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return null;
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return null;
    }
  };

  const getSortedFriends = (list: FriendProfile[]) => {
    return [...list].sort((a, b) => {
      const aOnline = isOnline(a.last_seen);
      const bOnline = isOnline(b.last_seen);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      // Both online or both offline: sort by last_seen descending (most recent first)
      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bTime - aTime;
    });
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

      // Double-check: ensure we don't include pending requests in friends
      const pendingRequestIds = new Set(
        allRequests.filter((r) => r.status === "pending").map((r) => r.other_user.id)
      );

      const friendIds = new Set(acceptedFriends.map((f) => f.id));
      const sentMap = new Map<string, string>();
      allRequests.filter((r) => r.direction === "sent" && r.status === "pending").forEach((r) => {
        sentMap.set(r.other_user.id, r.id);
      });

      // Filter out any users who have pending requests from being in friends
      const filteredFriends = acceptedFriends.filter((f) => !pendingRequestIds.has(f.id));
      setFriends(filteredFriends);
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

  // Global realtime subscription for new message notifications
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const channel = supabase
      .channel(`chat_notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload: any) => {
          const newMsg = payload.new;
          // Only notify for messages from others, not our own
          if (newMsg.sender_id === user.id) return;
          // Don't notify if we're currently viewing this conversation
          if (conversationId === newMsg.conversation_id) return;

          // Fetch conversation to get the friend ID
          const { data: conversation } = await supabase
            .from("chat_conversations")
            .select("driver_id, student_id")
            .eq("id", newMsg.conversation_id)
            .maybeSingle();

          if (!conversation) return;

          const friendId = conversation.driver_id === user.id ? conversation.student_id : conversation.driver_id;

          // Update friend last messages
          setFriendLastMessages((prev) => {
            const existing = prev.get(friendId);
            return new Map(prev).set(friendId, {
              message: newMsg.message,
              time: newMsg.created_at,
              unread: (existing?.unread || 0) + 1,
            });
          });

          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from("user_profiles")
            .select("full_name, username")
            .eq("id", newMsg.sender_id)
            .maybeSingle();

          const senderName = senderProfile?.full_name || senderProfile?.username || "Unknown";
          setUnreadNotifications((prev) => {
            // Keep only last 5 notifications, replace if same conversation
            const filtered = prev.filter((n) => n.conversationId !== newMsg.conversation_id);
            return [...filtered, {
              senderId: newMsg.sender_id,
              senderName,
              message: newMsg.message,
              conversationId: newMsg.conversation_id,
            }].slice(-5);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId, supabase]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (unreadNotifications.length === 0) return;
    const timer = setTimeout(() => setUnreadNotifications([]), 5000);
    return () => clearTimeout(timer);
  }, [unreadNotifications]);

  // Real-time subscription for classmate_requests and user_profiles
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    // Helper: enrich a raw classmate_request row with the other user's profile
    const enrichRequest = async (
      row: any,
      currentUserId: string
    ): Promise<ClassmateRequestWithProfile | null> => {
      const otherUserId = row.sender_id === currentUserId ? row.receiver_id : row.sender_id;
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, full_name, username, avatar_url, last_seen")
          .eq("id", otherUserId)
          .maybeSingle();
        if (!profile) return null;
        return {
          ...row,
          other_user: profile,
          direction: row.sender_id === currentUserId ? "sent" : "received",
        };
      } catch {
        return null;
      }
    };

    // Subscribe to classmate_requests changes
    const reqChannel = supabase
      .channel(`classmate_requests_rt:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classmate_requests" },
        async (payload: any) => {
          const row = payload.new;
          if (!row) return;

          // Only care about rows involving the current user
          if (row.sender_id !== user.id && row.receiver_id !== user.id) return;

          if (payload.eventType === "INSERT") {
            // New friend request
            const enriched = await enrichRequest(row, user.id);
            if (!enriched) return;

            if (enriched.direction === "received") {
              // Someone sent us a request
              setRequests((prev) => {
                if (prev.some((r) => r.id === row.id)) return prev;
                return [...prev, enriched];
              });
              toast.success(t("newFriendRequest"), {
                description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("wantsToBeYourFriend")}`,
              });
            } else {
              // We sent a request (update sent map)
              setSentRequestIds((prev) => new Map([...prev, [enriched.other_user.id, row.id]]));
            }
          } else if (payload.eventType === "UPDATE") {
            const oldRow = payload.old;
            const status = row.status;

            if (status === "accepted") {
              // A request was accepted — move from pending to friends
              const enriched = await enrichRequest(row, user.id);
              if (!enriched) return;

              setRequests((prev) => prev.filter((r) => r.id !== row.id));
              setSentRequestIds((prev) => {
                const next = new Map(prev);
                next.delete(enriched.other_user.id);
                return next;
              });
              setFriends((prev) => {
                if (prev.some((f) => f.id === enriched.other_user.id)) return prev;
                return [...prev, enriched.other_user];
              });
              // Remove from classmates list if present
              setClassmates((prev) => prev.filter((c) => c.id !== enriched.other_user.id));

              // Toast only if we were the sender (our request was accepted)
              if (oldRow?.sender_id === user.id) {
                toast.success(t("friendRequestAccepted"), {
                  description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("acceptedYourFriendRequest")}`,
                });
              } else if (oldRow?.receiver_id === user.id) {
                // We accepted it — no toast needed, we initiated the action
              }
            } else if (status === "rejected") {
              // A request was rejected — remove from pending
              const enriched = await enrichRequest(row, user.id);
              setRequests((prev) => prev.filter((r) => r.id !== row.id));
              setSentRequestIds((prev) => {
                if (!enriched) return prev;
                const next = new Map(prev);
                next.delete(enriched.other_user.id);
                return next;
              });

              // Toast if we were the sender (our request was rejected)
              if (oldRow?.sender_id === user.id && enriched) {
                toast.error(t("friendRequestRejected"), {
                  description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("declinedYourFriendRequest")}`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to user_profiles changes for online status updates
    const profileChannel = supabase
      .channel(`user_profiles_rt:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_profiles" },
        (payload: any) => {
          const updated = payload.new as FriendProfile;
          if (!updated?.id) return;

          // Update friends list
          setFriends((prev) =>
            prev.map((f) => (f.id === updated.id ? { ...f, last_seen: updated.last_seen } : f))
          );
          // Update classmates list
          setClassmates((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, last_seen: updated.last_seen } : c))
          );
          // Update selected friend
          setSelectedFriend((prev) =>
            prev?.id === updated.id ? { ...prev, last_seen: updated.last_seen } : prev
          );
          // Update requests other_user
          setRequests((prev) =>
            prev.map((r) =>
              r.other_user.id === updated.id
                ? { ...r, other_user: { ...r.other_user, last_seen: updated.last_seen } }
                : r
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id, supabase, t]);

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
    // Clear unread counter when opening chat
    setFriendLastMessages((prev) => {
      const existing = prev.get(friend.id);
      if (existing) {
        return new Map(prev).set(friend.id, { ...existing, unread: 0 });
      }
      return prev;
    });
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

        // Fetch messages via API route (handles delivered_at marking and error recovery)
        const msgRes = await fetch(`/api/chat/messages?conversation_id=${data.conversation.id}`);
        const msgData = await msgRes.json();
        if (msgData.messages) {
          setMessages(msgData.messages as ChatMessage[]);
          // Update last message from the most recent message
          const latestMessage = msgData.messages[msgData.messages.length - 1];
          if (latestMessage) {
            setFriendLastMessages((prev) => {
              return new Map(prev).set(friend.id, {
                message: latestMessage.message,
                time: latestMessage.created_at,
                unread: 0,
              });
            });
          }
        }

        // Mark messages as read
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
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Clear typing indicator when a message arrives
          setIsFriendTyping(false);
          if (newMsg.sender_id !== user?.id) {
            // Mark as read since we're viewing the chat
            fetch("/api/chat/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation_id: conversationId }),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const updatedMsg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload.payload?.userId !== user?.id) {
          setIsFriendTyping(true);
          // Auto-clear typing after 3 seconds
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsFriendTyping(false), 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload: any) => {
        if (payload.payload?.userId !== user?.id) {
          setIsFriendTyping(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setIsFriendTyping(false);
    };
  }, [conversationId, user?.id, supabase]);

  // Broadcast typing status
  const broadcastTyping = () => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat_messages:${conversationId}`);
    channel.send({ type: "broadcast", event: "typing", payload: { userId: user?.id } });
  };

  const broadcastStopTyping = () => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat_messages:${conversationId}`);
    channel.send({ type: "broadcast", event: "stop_typing", payload: { userId: user?.id } });
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      broadcastTyping();
    } else {
      broadcastStopTyping();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify layout to hide dock nav when chat is open (especially on small devices)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedFriend) {
      sessionStorage.setItem("chat-active", "true");
    } else {
      sessionStorage.removeItem("chat-active");
    }
    window.dispatchEvent(new CustomEvent("chat-state-change"));
  }, [selectedFriend]);

  // Clean up chat-active flag when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      sessionStorage.removeItem("chat-active");
      window.dispatchEvent(new CustomEvent("chat-state-change"));
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user || sendingMessage) return;
    const msgText = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, message: msgText }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("failedToSendMessage"));
        setNewMessage(msgText);
      } else if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message as ChatMessage];
        });
        // Update last message when we send a message
        if (selectedFriend) {
          setFriendLastMessages((prev) => {
            return new Map(prev).set(selectedFriend.id, {
              message: data.message.message,
              time: data.message.created_at,
              unread: 0,
            });
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(t("failedToSendMessage"));
      setNewMessage(msgText);
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

  const filteredFriends = getSortedFriends(
    friends.filter((f) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.full_name?.toLowerCase().includes(q) ||
        f.username?.toLowerCase().includes(q)
      );
    })
  );

  const filteredClassmates = getSortedFriends(
    classmates.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
      );
    })
  );

  const hasFriends = friends.length > 0;
  const hasPendingRequests = pendingReceivedRequests.length > 0 || pendingSentRequests.length > 0;
  const showFriendsTab = hasFriends || hasPendingRequests;

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
    if (url) {
      return (
        <button
          onClick={() => setPictureViewer({ url, name: profile.full_name || profile.username || "" })}
          className="rounded-full overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
          title={t("viewProfilePicture")}
        >
          <Avatar className={size}>
            <AvatarImage src={url} alt={profile.full_name || ""} />
            <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>{getInitials(profile)}</AvatarFallback>
          </Avatar>
        </button>
      );
    }
    return (
      <Avatar className={size}>
        <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>{getInitials(profile)}</AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Left Sidebar */}
      <div className={`${selectedFriend ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 border-r flex flex-col bg-background h-full`}>
        {/* Back button */}
        <div className="p-3 pb-0">
          <button
            onClick={() => navigate("home")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToHome")}
          </button>
        </div>
        {/* Tab Switcher + Visibility */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {showFriendsTab && (
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
              )}
              <button
                onClick={() => setActiveTab("classmates")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "classmates" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t("classmatesList")}
              </button>
              <button
                onClick={() => setActiveTab("invitations")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "invitations" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t("examInvitations") || "Exam Invitations"}
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === "friends" ? (
            <>
              {/* Invite to Group Exam button (available outside chat) */}
              {friends.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedInvitees(new Set());
                    openInviteModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 border-b bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                >
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{t("inviteToGroupExam")}</span>
                </button>
              )}

              {/* Pending Requests */}
              {pendingReceivedRequests.length > 0 && (
                <div className="border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2 block">
                    {t("pendingRequests")} ({pendingReceivedRequests.length})
                  </span>
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
                filteredFriends.map((friend) => {
                  const lastMessageData = friendLastMessages.get(friend.id);
                  return (
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
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {friend.full_name || friend.username}
                          </p>
                          {lastMessageData?.time && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(lastMessageData.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {lastMessageData?.message || (isOnline(friend.last_seen) ? t("online") : (formatLastSeen(friend.last_seen) || `@${friend.username}`))}
                          </p>
                          {lastMessageData?.unread && lastMessageData.unread > 0 && (
                            <span className="ml-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                              {lastMessageData.unread > 9 ? "9+" : lastMessageData.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          ) : activeTab === "invitations" ? (
            <ExamInvitationsContent user={user} supabase={supabase} t={t} navigate={navigate} />
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
                      <p className="text-xs text-muted-foreground truncate">
                        {isOnline(classmate.last_seen)
                          ? t("online")
                          : (formatLastSeen(classmate.last_seen) || `@${classmate.username}`)}
                      </p>
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
      <div className={`${selectedFriend ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-background fixed inset-0 sm:static z-20 sm:z-0`}>
        {!selectedFriend ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground overflow-y-auto">
            {pendingReceivedRequests.length > 0 ? (
              <div className="w-full max-w-md px-4 py-6">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">{t("pendingRequests")}</h2>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {pendingReceivedRequests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingReceivedRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <ProfileAvatar profile={req.other_user} size="h-12 w-12" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {req.other_user.full_name || req.other_user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{req.other_user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(req.id)}
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4" />
                        {t("accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(req.id)}
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        {t("deny")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{t("selectFriendToChat")}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="sticky top-0 z-10 shrink-0 border-b px-4 py-3 flex items-center gap-3 bg-background max-h-[60px]">
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
                  {isFriendTyping
                    ? t("typing")
                    : isOnline(selectedFriend.last_seen)
                    ? t("online")
                    : (formatLastSeen(selectedFriend.last_seen) || `@${selectedFriend.username}`)}
                </p>
              </div>
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
                    <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[80%] ${isOwn ? "self-end" : "self-start"}`}>
                      <div
                        className={`rounded-2xl px-3 py-1.5 text-sm ${
                          isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.message}</p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        </span>
                        {isOwn && <MessageTicks msg={msg} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Typing indicator */}
            {isFriendTyping && (
              <div className="px-4 pb-1 text-xs text-muted-foreground italic">
                {selectedFriend.full_name || selectedFriend.username} {t("isTyping")}
              </div>
            )}

            {/* Message Input */}
            <div className="border-t px-4 py-3 flex items-center gap-2">
              <button
                onClick={openInviteModal}
                title={t("inviteToGroupExam")}
                className="rounded-xl p-2.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
              >
                <Trophy className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={handleMessageInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                  else if (e.key === "Backspace" && !newMessage) broadcastStopTyping();
                }}
                placeholder={t("typeMessage")}
                className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  broadcastStopTyping();
                  handleSendMessage();
                }}
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
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
          <div className="sticky top-0 z-10 shrink-0 border-b px-4 py-3 flex items-center gap-3 bg-background">
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
                {isFriendTyping
                  ? t("typing")
                  : isOnline(selectedFriend.last_seen)
                  ? t("online")
                  : `@${selectedFriend.username}`}
              </p>
            </div>
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

            {/* Typing indicator */}
            {isFriendTyping && (
              <div className="px-4 pb-1 text-xs text-muted-foreground italic">
                {selectedFriend.full_name || selectedFriend.username} {t("isTyping")}
              </div>
            )}

          <div className="border-t px-4 py-3 flex items-center gap-2">
            <button
              onClick={openInviteModal}
              title={t("inviteToGroupExam")}
              className="rounded-xl p-2.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
            >
              <Trophy className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={handleMessageInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
                else if (e.key === "Backspace" && !newMessage) broadcastStopTyping();
              }}
              placeholder={t("typeMessage")}
              className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                broadcastStopTyping();
                handleSendMessage();
              }}
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

      {/* Profile Picture Viewer */}
      <Dialog open={!!pictureViewer} onOpenChange={(open) => !open && setPictureViewer(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 border-0 bg-black/90 shadow-none flex flex-col items-center justify-center gap-3 rounded-2xl overflow-hidden">
          <img
            src={pictureViewer?.url}
            alt={pictureViewer?.name || ""}
            className="max-h-[88vh] max-w-[93vw] w-auto h-auto object-contain rounded-lg"
            onClick={() => setPictureViewer(null)}
          />
          {pictureViewer?.name && (
            <p className="text-white text-sm font-medium drop-shadow-lg absolute bottom-4">{pictureViewer.name}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* New message notifications */}
      {unreadNotifications.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-xs">
          {unreadNotifications.map((notif, idx) => {
            const friend = friends.find((f) => f.id === notif.senderId);
            return (
              <button
                key={idx}
                onClick={() => {
                  if (friend) openChat(friend);
                  setUnreadNotifications([]);
                }}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-lg transition-all hover:shadow-xl text-left animate-in slide-in-from-bottom-2"
              >
                <div className="relative shrink-0">
                  <ProfileAvatar profile={friend} size="h-10 w-10" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{notif.senderName}</p>
                  <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
