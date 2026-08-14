"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/database.types";

export interface ChatConversationViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  params: URLSearchParams;
}

export function ChatConversationView({ navigate, params }: ChatConversationViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const conversationId = params.get("id") || "";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherParty, setOtherParty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!conversationId || !user) return;
      setLoading(true);

      try {
        const supabase = createClient();

        const { data: conv } = await supabase
          .from("chat_conversations")
          .select("driver_id, student_id")
          .eq("id", conversationId)
          .single();

        if (conv) {
          const otherId = conv.driver_id === user.id ? conv.student_id : conv.driver_id;
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", otherId)
            .maybeSingle();
          setOtherParty(profile);
        }

        // Fetch messages via API route (handles delivered_at marking and error recovery)
        const msgRes = await fetch(`/api/chat/messages?conversation_id=${conversationId}`);
        const msgData = await msgRes.json();
        if (msgData.messages) {
          setMessages(msgData.messages as ChatMessage[]);
        }

        await fetch("/api/chat/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId }),
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (!conversationId) return;

    const supabase = createClient();
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
          if (newMsg.sender_id !== user?.id) {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;

    const msgText = newMessage.trim();
    setNewMessage("");
    setSending(true);
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
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(t("failedToSendMessage"));
      setNewMessage(msgText);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("chat")} className="rounded-lg p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {otherParty?.avatar_url ? (
          <img src={otherParty.avatar_url} alt="" className="h-10 w-10 rounded-full" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            {(otherParty?.full_name || otherParty?.username || "?")[0].toUpperCase()}
          </div>
        )}
        <h2 className="font-bold">{otherParty?.full_name || otherParty?.username || t("user")}</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{t("noMessagesYet")}</p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <div
                    className={`mt-1 flex items-center gap-1 text-xs ${
                      isOwn ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"
                    }`}
                  >
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isOwn && (
                      msg.is_read ? (
                        <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
                      ) : msg.delivered_at ? (
                        <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/50" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("typeMessage")}
          className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
