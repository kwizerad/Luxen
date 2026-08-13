"use client";

import { useEffect, useState } from "react";
import { Car, GraduationCap, Flag, MessageSquare, ArrowLeft, FileCode, UserPlus } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useHashRouter } from "@/hooks/use-hash-router";
import { createClient } from "@/lib/supabase/client";
import { DriversListView } from "./drivers-list-view";
import { StudentTrainingView } from "./student-training-view";
import { MyReportsView } from "./my-reports-view";
import { ChatListView } from "./chat-list-view";
import { RequestCodeView } from "./request-code-view";
import { RegisterDriverForm } from "@/components/register-driver-form";

export interface DriverHubViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

type TabId = "drivers" | "training" | "reports" | "messages" | "exam-code" | "register";

export function DriverHubView({ navigate }: DriverHubViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { params } = useHashRouter();
  const [activeTab, setActiveTab] = useState<TabId>("drivers");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { role?: string } | null }) => {
        setIsDriver(data?.role === "Driver");
      });
  }, [user]);

  useEffect(() => {
    const tab = params.get("tab") as TabId | null;
    if (tab && ["drivers", "training", "reports", "messages", "exam-code", "register"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [params]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chat/conversations");
        const data = await res.json();
        const total = (data.conversations || []).reduce(
          (s: number, c: any) => s + (c.unread_count || 0),
          0
        );
        setUnreadCount(total);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const tabs: { id: TabId; labelKey: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "drivers", labelKey: "findDriver", icon: <Car className="h-4 w-4" /> },
    { id: "training", labelKey: "myTraining", icon: <GraduationCap className="h-4 w-4" /> },
    { id: "reports", labelKey: "myReports", icon: <Flag className="h-4 w-4" /> },
    { id: "messages", labelKey: "messages", icon: <MessageSquare className="h-4 w-4" />, badge: unreadCount },
    { id: "exam-code", labelKey: "requestCode", icon: <FileCode className="h-4 w-4" /> },
    ...(!isDriver ? [{ id: "register" as TabId, labelKey: "registerAsDriver", icon: <UserPlus className="h-4 w-4" /> }] : []),
  ];

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    navigate("driver-hub", { tab });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      {/* Sticky tab bar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            <button
              onClick={() => navigate("home")}
              className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
                {tab.badge ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="container mx-auto max-w-4xl px-4">
        {activeTab === "drivers" && <DriversListView navigate={navigate} embedded />}
        {activeTab === "training" && <StudentTrainingView navigate={navigate} embedded />}
        {activeTab === "reports" && <MyReportsView navigate={navigate} embedded />}
        {activeTab === "messages" && <ChatListView navigate={navigate} embedded />}
        {activeTab === "exam-code" && <RequestCodeView navigate={navigate} embedded />}
        {activeTab === "register" && (
          <div className="py-4">
            <RegisterDriverForm onSuccess={() => window.location.reload()} />
          </div>
        )}
      </div>
    </div>
  );
}
