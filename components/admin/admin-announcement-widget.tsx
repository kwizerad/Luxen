"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, Send, Sparkles, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { getNotifications, markNotificationAsRead, type Notification } from "@/lib/notifications";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/permissions";

const supabase = createClient();

export interface AdminAnnouncementWidgetProps {
  isAdminMode?: boolean;
  className?: string;
  onClose?: () => void;
}

export function AdminAnnouncementWidget({
  isAdminMode,
  className = "",
  onClose,
}: AdminAnnouncementWidgetProps) {
  const { user } = useAuth();
  const userIsAdmin = isAdminMode ?? (user ? isAdmin(user) : false);

  const [announcement, setAnnouncement] = useState<Notification | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin posting form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [targetRole, setTargetRole] = useState<"all" | "student">("all");
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchActiveAnnouncement = async () => {
    try {
      setLoading(true);
      const { notifications } = await getNotifications(false, 25);
      if (notifications && notifications.length > 0) {
        const active = notifications.find(
          (n) =>
            n.type === "announcement" ||
            n.type === "admin_broadcast" ||
            n.related_entity_type === "announcement" ||
            (n.title && n.title.toLowerCase().includes("announcement")) ||
            (n.title && n.title.toLowerCase().includes("itangazo"))
        );
        setAnnouncement(active || null);
      } else {
        setAnnouncement(null);
      }
    } catch (err) {
      console.error("Error loading announcement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAnnouncement();
    window.addEventListener("notifications-updated", fetchActiveAnnouncement);
    return () => {
      window.removeEventListener("notifications-updated", fetchActiveAnnouncement);
    };
  }, []);

  const handleDismiss = async (id: string) => {
    setDismissedId(id);
    if (onClose) onClose();
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error("Failed to mark announcement read:", err);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setPostError("Please enter both a title and announcement message.");
      return;
    }

    try {
      setPosting(true);
      setPostError(null);

      const senderName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "Administration";

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          title: title.trim(),
          message: message.trim(),
          type: "announcement",
          priority,
          target_role: targetRole,
          sender_name: senderName,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setTitle("");
      setMessage("");
      setPostSuccess(true);
      setShowCreateForm(false);
      fetchActiveAnnouncement();

      window.dispatchEvent(new CustomEvent("notifications-updated"));

      setTimeout(() => {
        setPostSuccess(false);
      }, 4000);
    } catch (err: any) {
      setPostError(err?.message || "Failed to publish announcement");
    } finally {
      setPosting(false);
    }
  };

  const isVisible = Boolean(
    announcement && dismissedId !== announcement.id && !loading
  );

  // If not in Admin edit mode AND no active announcement exists (or is dismissed), render NOTHING
  if (!userIsAdmin && !isVisible) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Admin Post Announcement Creator Bar (Rendered for Admins) */}
      {userIsAdmin && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                Admin Announcement Management
              </h4>
            </div>

            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-xs font-semibold gap-1.5 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showCreateForm ? "Cancel" : "Post New Announcement"}</span>
            </Button>
          </div>

          {postSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Announcement published successfully to student desktops!</span>
            </div>
          )}

          {/* Create Announcement Form */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handlePostAnnouncement}
                className="space-y-3 pt-2 border-t border-amber-500/20"
              >
                {postError && (
                  <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{postError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground font-mono uppercase">
                    Announcement Headline
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Schedule Update: National Driving Theory Test Dates"
                    className="rounded-xl text-xs bg-background/80 dark:bg-zinc-900/80 border-amber-500/30 focus:border-amber-500"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground font-mono uppercase">
                    Short Announcement Message
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a clear short message for learners..."
                    rows={3}
                    className="rounded-xl text-xs bg-background/80 dark:bg-zinc-900/80 border-amber-500/30 focus:border-amber-500 resize-none"
                    maxLength={400}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground font-medium">Priority:</label>
                    <button
                      type="button"
                      onClick={() => setPriority("normal")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        priority === "normal"
                          ? "bg-amber-500 text-black border-amber-500"
                          : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority("urgent")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        priority === "urgent"
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                    >
                      Urgent Notice
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={posting}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-none"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{posting ? "Publishing..." : "Publish to Students"}</span>
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Active Announcement Card (Rendered only when active announcement exists) */}
      <AnimatePresence mode="wait">
        {isVisible && announcement && (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="relative p-5 rounded-2xl border border-amber-500/40 dark:border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 backdrop-blur-xl shadow-none space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>
                    {announcement.priority === "urgent"
                      ? "Urgent Admin Notice"
                      : "Admin Announcement"}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(announcement.id)}
                title="Close Announcement"
                className="p-1 rounded-lg text-amber-700/60 dark:text-amber-300/60 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-500/20 transition-colors cursor-pointer shadow-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground dark:text-white">
                {announcement.title}
              </h4>
              <p className="text-xs text-muted-foreground dark:text-zinc-300 leading-relaxed">
                {announcement.message}
              </p>
            </div>

            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-amber-700/80 dark:text-amber-300/80 font-mono">
              <span>From: {announcement.sender_name || "Administration"}</span>
              <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminAnnouncementWidget;
