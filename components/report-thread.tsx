"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { ReportComment } from "@/lib/database.types";

export interface ReportThreadProps {
  reportId: string;
  onBack: () => void;
}

export function ReportThread({ reportId, onBack }: ReportThreadProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [comments, setComments] = useState<(ReportComment & { user?: any })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/comments?report_id=${reportId}`);
        const data = await res.json();
        setComments(data.comments || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

    const supabase = createClient();
    const channel = supabase
      .channel(`report_comments:${reportId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "report_comments", filter: `report_id=eq.${reportId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    if (!newComment.trim()) return;

    setSending(true);
    try {
      await fetch("/api/reports/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, comment: newComment }),
      });
      setNewComment("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-bold">{t("reportDiscussion")}</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{t("noCommentsYet")}</p>
        ) : (
          comments.map((comment) => {
            const isOwn = comment.user_id === user?.id;
            return (
              <div
                key={comment.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {comment.is_admin && (
                    <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-yellow-400">
                      <Shield className="h-3 w-3" />
                      {t("admin")}
                    </div>
                  )}
                  <p className="text-sm">{comment.comment}</p>
                  <p className={`mt-1 text-xs ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {comment.user?.full_name || comment.user?.username || "User"}
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
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("writeComment")}
          className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newComment.trim()}
          className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
