"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Star, Calendar, Clock } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export interface StudentTrainingViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  embedded?: boolean;
}

export function StudentTrainingView({ navigate, embedded = false }: StudentTrainingViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("training_logs")
        .select("*, driver:driver_id(id, full_name, username, avatar_url)")
        .eq("student_id", user.id)
        .order("session_date", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();
  }, [user]);

  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((s: number, l: any) => s + (l.duration_minutes || 0), 0);
  const avgRating = totalSessions > 0
    ? Math.round((logs.filter((l: any) => l.rating).reduce((s: number, l: any) => s + l.rating, 0) / logs.filter((l: any) => l.rating).length) * 10) / 10
    : 0;

  const content = (
    <>
      {!embedded && <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("myTraining")}</h1>}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">{t("sessions")}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{totalMinutes}</p>
            <p className="text-xs text-muted-foreground">{t("totalMinutes")}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <p className="text-2xl font-bold">{avgRating || "N/A"}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t("avgRating")}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noTrainingLogs")}</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {log.driver?.avatar_url ? (
                      <img src={log.driver.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {(log.driver?.full_name || "D")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{log.driver?.full_name || log.driver?.username || t("driver")}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.session_date).toLocaleDateString()}
                        {log.start_time && <span>— {log.start_time}</span>}
                      </div>
                    </div>
                  </div>
                  {log.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold">{log.rating}</span>
                    </div>
                  ) : null}
                </div>
                {log.duration_minutes ? (
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {log.duration_minutes} {t("minutes")}
                  </p>
                ) : null}
                {log.skills_practiced && (
                  <p className="mt-1 text-sm"><span className="text-muted-foreground">{t("skills")}:</span> {log.skills_practiced}</p>
                )}
                {log.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p>
                )}
              </div>
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
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => navigate("home")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </button>
        {content}
      </div>
    </div>
  );
}
