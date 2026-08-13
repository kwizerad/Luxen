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
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, FileText, UserPlus, Trophy, Settings, Swords, Users } from "lucide-react";
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
};

const priorityColors = {
  urgent: "border-l-4 border-red-500",
  normal: "border-l-4 border-blue-500",
  low: "border-l-4 border-gray-300",
};

function isNotificationForUser(notification: Notification, user: { id: string; role?: string } | null) {
  if (!user?.id) return false;
  const userIsAdmin = isAdmin(user);
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
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
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
    
    // Navigate to action URL if provided
    if (notification.action_url) {
      window.location.href = notification.action_url;
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

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationQuery(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success(t("notifications.deleted"));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">{t("notifications")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-8"
            >
              <Check className="h-3 w-3 mr-1" />
              {t("markAllRead")}
            </Button>
          )}
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
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
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
