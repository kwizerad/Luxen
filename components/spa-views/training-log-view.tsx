"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Loader2, Star, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { TrainingLog } from "@/lib/database.types";

export interface TrainingLogViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function TrainingLogView({ navigate }: TrainingLogViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [logs, setLogs] = useState<(TrainingLog & { student?: any })[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    duration_minutes: 0,
    skills_practiced: "",
    location: "",
    notes: "",
    rating: 0,
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const supabase = createClient();

    const { data: logData } = await supabase
      .from("training_logs")
      .select("*, student:student_id(id, full_name, username, avatar_url)")
      .eq("driver_id", user.id)
      .order("session_date", { ascending: false });
    setLogs((logData || []) as any);

    const { data: appData } = await supabase
      .from("driver_applications")
      .select("student:student_id(id, full_name, username)")
      .eq("driver_id", user.id)
      .eq("status", "accepted");

    const uniqueStudents = Array.from(
      new Map((appData || []).map((a: any) => [a.student?.id, a.student])).values()
    ).filter((s: any) => s?.id);
    setStudents(uniqueStudents as any[]);

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.student_id || !form.session_date) return;

    try {
      await fetch("/api/training-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({
        student_id: "",
        session_date: new Date().toISOString().split("T")[0],
        start_time: "",
        end_time: "",
        duration_minutes: 0,
        skills_practiced: "",
        location: "",
        notes: "",
        rating: 0,
      });
      fetchData();
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

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("trainingLog")}</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("addLog")}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noLogsYet")}</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{log.student?.full_name || log.student?.username || t("student")}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.session_date).toLocaleDateString()}
                      {log.start_time && <span>— {log.start_time}</span>}
                      {log.duration_minutes ? <span>({log.duration_minutes} min)</span> : null}
                    </div>
                  </div>
                  {log.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold">{log.rating}</span>
                    </div>
                  ) : null}
                </div>
                {log.skills_practiced && (
                  <p className="mt-2 text-sm"><span className="text-muted-foreground">{t("skills")}:</span> {log.skills_practiced}</p>
                )}
                {log.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-bold">{t("addLog")}</h2>
              <div className="space-y-3">
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">{t("selectStudent")}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name || s.username}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <input
                  type="number"
                  value={form.duration_minutes || ""}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                  placeholder={t("durationMinutes")}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={form.skills_practiced}
                  onChange={(e) => setForm({ ...form, skills_practiced: e.target.value })}
                  placeholder={t("skillsPracticed")}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={t("sessionLocation")}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t("sessionNotes")}
                  rows={3}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t("sessionRating")}:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setForm({ ...form, rating: s })}>
                      <Star className={`h-6 w-6 ${s <= form.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
