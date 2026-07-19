"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Check, Trash2, Loader2, Info, CheckCircle, AlertTriangle, XCircle, FileText, UserPlus, Trophy, Settings, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification as deleteNotificationQuery } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "exam" | "system" | "user_joined" | "exam_submitted" | "admin_update";
  priority: "urgent" | "normal" | "low";
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  target_user_id?: string;
  target_role?: string;
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  exam: FileText,
  system: Info,
  user_joined: UserPlus,
  exam_submitted: Trophy,
  admin_update: Settings,
};

const typeColors = {
  info: "text-blue-500 bg-blue-50",
  success: "text-green-500 bg-green-50",
  warning: "text-amber-500 bg-amber-50",
  error: "text-red-500 bg-red-50",
  exam: "text-purple-500 bg-purple-50",
  system: "text-gray-500 bg-gray-50",
  user_joined: "text-cyan-500 bg-cyan-50",
  exam_submitted: "text-orange-500 bg-orange-50",
  admin_update: "text-indigo-500 bg-indigo-50",
};

const priorityColors = {
  urgent: "border-l-4 border-red-500",
  normal: "border-l-4 border-blue-500",
  low: "border-l-4 border-gray-300",
};

function isNotificationForUser(notification: Notification, user: any) {
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
  const channelRef = useRef<any>(null);
  const isSetupRef = useRef(false);
  const supabaseRef = useRef<any>(null);

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications...');
      const data = await getNotifications();
      console.log('Fetched notifications:', data);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      console.error('Error details:', error.message);
      // Set empty state on error so loading stops
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Just fetch notifications on mount and when user changes
    // Disable real-time for now to fix the subscription error
    console.log('Fetching notifications for user:', user?.id);
    fetchNotifications();
  }, [user]);

  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Silently fail if audio not supported
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
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
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
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("notifications.empty")}</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const priorityClass = priorityColors[notification.priority] || priorityColors.normal;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`group flex flex-col items-start p-3 cursor-pointer ${priorityClass} ${
                    !notification.is_read ? "bg-muted/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded-full ${typeColors[notification.type]}`}>
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
