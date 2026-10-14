"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, FileText, UserPlus, Trophy, Settings, Swords, Users, UserCheck, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationQuery,
  type Notification,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  exam: FileText,
  system: Info,
  user_joined: UserPlus,
  exam_submitted: Trophy,
  admin_update: Settings,
  announcement: Info,
  language_published: Info,
  module_published: Info,
  lesson_published: Info,
  exam_result: Trophy,
  course_updated: Info,
  reminder: Info,
  admin_message: Info,
  exam_challenge_invite: Swords,
  friend_request: Users,
  friend_request_accepted: CheckCircle,
  friend_request_rejected: XCircle,
};

const typeColors: Record<string, string> = {
  info: "text-blue-500 bg-blue-50",
  success: "text-green-500 bg-green-50",
  warning: "text-amber-500 bg-amber-50",
  error: "text-red-500 bg-red-50",
  exam: "text-purple-500 bg-purple-50",
  system: "text-gray-500 bg-gray-50",
  user_joined: "text-cyan-500 bg-cyan-50",
  exam_submitted: "text-orange-500 bg-orange-50",
  admin_update: "text-indigo-500 bg-indigo-50",
  announcement: "text-red-500 bg-red-50",
  admin_message: "text-blue-500 bg-blue-50",
  exam_challenge_invite: "text-purple-500 bg-purple-50",
  friend_request: "text-cyan-500 bg-cyan-50",
  friend_request_accepted: "text-green-500 bg-green-50",
  friend_request_rejected: "text-red-500 bg-red-50",
};

const priorityColors = {
  urgent: "border-l-4 border-red-500",
  normal: "border-l-4 border-blue-500",
  low: "border-l-4 border-gray-300",
};

function isNotificationForUser(notification: Notification, user: { id: string; role?: string } | null) {
  if (!user?.id) return false;
  const userIsAdmin = isAdmin(user);

  if (!userIsAdmin) {
    const type = (notification.type || "").toLowerCase();
    const entityType = (notification.related_entity_type || "").toLowerCase();
    const title = (notification.title || "").toLowerCase();
    const msg = (notification.message || "").toLowerCase();
    if (
      type === "new_module" ||
      type === "new_lesson" ||
      type === "module" ||
      type === "lesson" ||
      type === "course_update" ||
      entityType === "module" ||
      entityType === "lesson" ||
      entityType === "course" ||
      title.includes("new module") ||
      title.includes("new lesson") ||
      title.includes("module nshya") ||
      title.includes("isomo rishya") ||
      title.includes("nouveau module") ||
      title.includes("nouvelle leçon") ||
      msg.includes("new module") ||
      msg.includes("new lesson") ||
      msg.includes("module nshya") ||
      msg.includes("isomo rishya")
    ) {
      return false;
    }
  }

  if (notification.target_user_id && notification.target_user_id === user.id) return true;
  if (notification.target_role === "all") return true;
  if (notification.target_role === "student" && !userIsAdmin) return true;
  if (notification.target_role === "admin" && userIsAdmin) return true;
  return false;
}

export function NotificationsDropdown() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const getDismissedIds = useCallback((userId: string): Set<string> => {
    if (typeof window === "undefined" || !userId) return new Set();
    try {
      const raw = localStorage.getItem(`dismissed_notifs_${userId}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }, []);

  const getLastSeenTime = useCallback((userId: string): number => {
    if (typeof window === "undefined" || !userId) return 0;
    try {
      const val = localStorage.getItem(`notifs_last_seen_${userId}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const data = await getNotifications();
      const dismissed = getDismissedIds(user.id);
      const lastSeen = getLastSeenTime(user.id);
      const rawList: Notification[] = data.notifications || [];
      const validNotifications = rawList.filter((n) => !dismissed.has(n.id));

      setNotifications(validNotifications);

      // Unread counter resets to 0 once user views them; only count notifications created after last seen
      const newUnread = validNotifications.filter((n) => {
        if (n.is_read) return false;
        if (!lastSeen) return true;
        const createdMs = new Date(n.created_at).getTime();
        return createdMs > lastSeen;
      }).length;

      setUnreadCount(newUnread);
    } catch (error: any) {
      if (error?.message?.includes("Auth session missing") || error?.name === "AuthSessionMissingError") {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [user, getDismissedIds, getLastSeenTime]);

  useEffect(() => {
    fetchNotifications();

    const handleFriendRequestUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener("friend-request-updated", handleFriendRequestUpdate);
    return () => {
      window.removeEventListener("friend-request-updated", handleFriendRequestUpdate);
    };
  }, [fetchNotifications]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Real-time subscription — single instance, unique channel name per mount
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notif-rt-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload: any) => {
          const currentUser = userRef.current;
          if (!currentUser?.id) return;

          if (payload.eventType === "INSERT") {
            const newNotification = payload.new as Notification;
            if (!isNotificationForUser(newNotification, currentUser)) return;

            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotification.id)) return prev;
              return [newNotification, ...prev];
            });
            setUnreadCount((prev) => prev + 1);

            playNotificationSound();
            toast.success(newNotification.title, {
              description: newNotification.message,
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as Notification;
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const now = audioContext.currentTime;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.08); // E5
      oscillator.frequency.setValueAtTime(783.99, now + 0.16); // G5

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      oscillator.start(now);
      oscillator.stop(now + 0.35);
    } catch {
      // Audio not supported or blocked; ignore silently
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    setOpen(false);
    
    // Navigate to action URL if provided
    if (notification.action_url) {
      const url = notification.action_url;
      if (typeof window !== "undefined" && window.location.pathname === "/dashboard" && url.startsWith("/dashboard")) {
        if (url.includes("#")) {
          const hashPart = url.slice(url.indexOf("#"));
          window.location.hash = hashPart;
        } else if (url.startsWith("/dashboard/exam")) {
          const qIdx = url.indexOf("?");
          window.location.hash = qIdx !== -1 ? `#exam${url.slice(qIdx)}` : "#exam";
        } else if (url.startsWith("/dashboard/course")) {
          const qIdx = url.indexOf("?");
          window.location.hash = qIdx !== -1 ? `#course${url.slice(qIdx)}` : "#course";
        } else if (url.startsWith("/dashboard/services/live-exam")) {
          window.location.hash = "#services/live-exam";
        } else if (url.startsWith("/dashboard/services")) {
          window.location.hash = "#services";
        } else if (url.startsWith("/dashboard/settings")) {
          window.location.hash = "#settings";
        } else {
          window.location.hash = "#home";
        }
        window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
        return;
      }
      window.location.href = url;
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success(t("notifications.allMarkedRead"));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleAcceptFriendRequest = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    const requestId = notification.related_entity_id || notification.data?.request_id || notification.data?.requestId;
    if (!requestId) {
      handleNotificationClick(notification);
      return;
    }
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success(t("requestAccepted") || "Friend request accepted");
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, message: `${notification.message} (Accepted)` }
              : n
          )
        );
        window.dispatchEvent(new CustomEvent("friend-request-updated"));
      } else {
        const data = await res.json();
        toast.error(data.error || t("failedToRespondRequest") || "Failed to respond");
      }
    } catch {
      toast.error(t("failedToRespondRequest") || "Failed to respond");
    }
  };

  const handleRejectFriendRequest = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    const requestId = notification.related_entity_id || notification.data?.request_id || notification.data?.requestId;
    if (!requestId) {
      handleNotificationClick(notification);
      return;
    }
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}/reject`, { method: "POST" });
      if (res.ok) {
        toast.success(t("requestRejected") || "Friend request declined");
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, message: `${notification.message} (Declined)` }
              : n
          )
        );
        window.dispatchEvent(new CustomEvent("friend-request-updated"));
      } else {
        const data = await res.json();
        toast.error(data.error || t("failedToRespondRequest") || "Failed to respond");
      }
    } catch {
      toast.error(t("failedToRespondRequest") || "Failed to respond");
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && user?.id) {
      // User clicked on notification icon: mark all current notifications as seen and start counter from 0
      setUnreadCount(0);
      if (typeof window !== "undefined") {
        localStorage.setItem(`notifs_last_seen_${user.id}`, String(Date.now()));
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      void markAllNotificationsAsRead().catch(() => {});
    }
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (typeof window !== "undefined" && user?.id) {
      try {
        const stored = localStorage.getItem(`dismissed_notifs_${user.id}`);
        const set = new Set(stored ? JSON.parse(stored) : []);
        set.add(notificationId);
        localStorage.setItem(`dismissed_notifs_${user.id}`, JSON.stringify(Array.from(set)));
      } catch {}
    }
    try {
      await deleteNotificationQuery(notificationId);
    } catch {
      // Suppress permission error if non-admin; dismissed list handles user-level deletion
    }
    toast.success(t("notifications.deleted") || "Notification removed");
  };

  const clearAllNotifications = () => {
    if (notifications.length === 0) return;
    const allIds = notifications.map((n) => n.id);
    setNotifications([]);
    setUnreadCount(0);
    if (typeof window !== "undefined" && user?.id) {
      try {
        const stored = localStorage.getItem(`dismissed_notifs_${user.id}`);
        const set = new Set(stored ? JSON.parse(stored) : []);
        allIds.forEach((id) => set.add(id));
        localStorage.setItem(`dismissed_notifs_${user.id}`, JSON.stringify(Array.from(set)));
      } catch {}
    }
    toast.success(t("notifications.allDeleted") || "All notifications cleared");
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative overflow-visible">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full bg-red-600 text-white text-[11px] font-black leading-none ring-2 ring-background shadow-md z-20 animate-in zoom-in-50 duration-200"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[420px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b gap-2">
          <h3 className="font-semibold text-sm">{t("notifications")}</h3>
          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Clear all notifications"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span>{t("clearAll") || "Clear All"}</span>
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7 px-2 text-primary"
              >
                <Check className="h-3 w-3 mr-1" />
                {t("markAllRead")}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("notifications.empty")}</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Info;
              const priorityClass = priorityColors[notification.priority] || priorityColors.normal;
              const colorClass = typeColors[notification.type] || typeColors.info;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`group flex flex-col items-start p-3 cursor-pointer ${priorityClass} ${
                    !notification.is_read ? "bg-muted/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!notification.is_read ? "font-semibold" : ""}`}>
                          {notification.title}
                        </p>
                        {notification.priority === 'urgent' && (
                          <span className="text-xs text-red-500 font-semibold">{t("notifications.urgent")}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.type === "friend_request" && !notification.is_read && (
                        <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => handleAcceptFriendRequest(e, notification)}
                            className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            {t("accept") || "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleRejectFriendRequest(e, notification)}
                            className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            {t("reject") || "Decline"}
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {!notification.is_read && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {t("new")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title={t("delete") || "Delete notification"}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
