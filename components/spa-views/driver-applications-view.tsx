"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, X, Loader2, MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export interface DriverApplicationsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function DriverApplicationsView({ navigate }: DriverApplicationsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApps();
  }, [user]);

  const fetchApps = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("driver_applications")
      .select("*, student:student_id(id, full_name, username, avatar_url), driver_plans(*)")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  const handleAction = async (appId: string, status: "accepted" | "declined") => {
    setActionLoading(appId);
    try {
      await fetch("/api/driver/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, status }),
      });
      fetchApps();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = async (studentId: string) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_id: user?.id, student_id: studentId }),
      });
      const data = await res.json();
      if (data.conversation) {
        navigate("chat/conversation", { id: data.conversation.id });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => navigate("driver-panel")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToDriverPanel")}
        </button>

        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("applications")}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : apps.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noApplications")}</p>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <div key={app.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {app.student?.avatar_url ? (
                      <img src={app.student.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {(app.student?.full_name || "S")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{app.student?.full_name || app.student?.username || t("student")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t(app.duration_type)} × {app.duration_count} — {app.total_price} RWF
                      </p>
                      {app.driver_plans?.title && (
                        <p className="text-xs text-muted-foreground">{app.driver_plans.title}</p>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    app.status === "pending" ? "bg-orange-500/10 text-orange-600" :
                    app.status === "accepted" ? "bg-green-500/10 text-green-600" :
                    "bg-red-500/10 text-red-600"
                  }`}>
                    {t(app.status)}
                  </span>
                </div>

                {app.student_note && (
                  <p className="mt-2 text-sm text-muted-foreground italic">"{app.student_note}"</p>
                )}

                {app.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAction(app.id, "accepted")}
                      disabled={actionLoading === app.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {t("accept")}
                    </button>
                    <button
                      onClick={() => handleAction(app.id, "declined")}
                      disabled={actionLoading === app.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      {t("decline")}
                    </button>
                    <button
                      onClick={() => handleMessage(app.student_id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t("message")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
