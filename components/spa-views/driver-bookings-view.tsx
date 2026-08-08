"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export interface DriverBookingsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function DriverBookingsView({ navigate }: DriverBookingsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("driver_bookings")
      .select("*, student:student_id(id, full_name, username, avatar_url)")
      .eq("driver_id", user.id)
      .order("booking_date", { ascending: true });
    setBookings(data || []);
    setLoading(false);
  };

  const handleAction = async (bookingId: string, action: "complete" | "no_show") => {
    try {
      await fetch("/api/driver/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action }),
      });
      fetchBookings();
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

        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("bookings")}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noBookings")}</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {b.student?.avatar_url ? (
                      <img src={b.student.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {(b.student?.full_name || "S")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{b.student?.full_name || b.student?.username || t("student")}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(b.booking_date).toLocaleDateString()}
                        {b.start_time && <span>— {b.start_time}</span>}
                        {b.queue_position != null && <span>#{b.queue_position}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    b.status === "booked" ? "bg-blue-500/10 text-blue-600" :
                    b.status === "completed" ? "bg-green-500/10 text-green-600" :
                    b.status === "cancelled" ? "bg-red-500/10 text-red-600" :
                    "bg-orange-500/10 text-orange-600"
                  }`}>
                    {t(b.status)}
                  </span>
                </div>

                {b.status === "booked" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleAction(b.id, "complete")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("markCompleted")}
                    </button>
                    <button
                      onClick={() => handleAction(b.id, "no_show")}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <XCircle className="h-4 w-4" />
                      {t("markNoShow")}
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
