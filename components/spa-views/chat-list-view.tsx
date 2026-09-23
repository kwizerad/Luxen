"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";

export interface ChatListViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  embedded?: boolean;
}

export function ChatListView({ navigate, embedded = false }: ChatListViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/chat/conversations");
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  const content = (
    <>
      {!embedded && (
        <div className="mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("messages")}</h1>
        </div>
      )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("noConversations")}</p>
            <button
              onClick={() => navigate("services/drivers")}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              {t("browseDrivers")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate("chat/conversation", { id: conv.id })}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left hover:border-primary transition-colors"
              >
                {conv.other_party?.avatar_url ? (
                  <img src={conv.other_party.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {(conv.other_party?.full_name || conv.other_party?.username || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">
                      {conv.other_party?.full_name || conv.other_party?.username || t("user")}
                    </h3>
                    {conv.last_message_time && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(conv.last_message_time).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.last_message || t("noMessagesYet")}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
    </>
  );

  if (embedded) {
    return <div className="py-4">{content}</div>;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate("back", { fallback: "home" })}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("backToHome") || "Back"}
        </button>
        {content}
      </div>
    </div>
  );
}
