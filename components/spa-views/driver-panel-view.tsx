"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Calendar, BookOpen, FileText, Loader2, Users, Clock, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export interface DriverPanelViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function DriverPanelView({ navigate }: DriverPanelViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, activeBookings: 0, pendingApps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const supabase = createClient();

      const [{ count: students }, { count: bookings }, { count: apps }] = await Promise.all([
        supabase.from("driver_applications").select("*", { count: "exact", head: true }).eq("driver_id", user.id),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("driver_id", user.id).eq("status", "booked"),
        supabase.from("driver_applications").select("*", { count: "exact", head: true }).eq("driver_id", user.id).eq("status", "pending"),
      ]);

      setStats({
        totalStudents: students || 0,
        activeBookings: bookings || 0,
        pendingApps: apps || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const menuItems = [
    { view: "driver-panel/plans", icon: ClipboardList, labelKey: "myPlans", descKey: "myPlansDesc" },
    { view: "driver-panel/applications", icon: Users, labelKey: "applications", descKey: "applicationsDesc" },
    { view: "driver-panel/bookings", icon: Calendar, labelKey: "bookings", descKey: "bookingsDesc" },
    { view: "driver-panel/training-log", icon: BookOpen, labelKey: "trainingLog", descKey: "trainingLogDesc" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => navigate("home")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("driverPanel")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("driverPanelDesc")}</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-card p-4 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
            <p className="text-xs text-muted-foreground">{t("totalStudents")}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <Calendar className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold">{stats.activeBookings}</p>
            <p className="text-xs text-muted-foreground">{t("activeBookings")}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold">{stats.pendingApps}</p>
            <p className="text-xs text-muted-foreground">{t("pendingApplications")}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="grid gap-4 sm:grid-cols-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => navigate(item.view)}
                className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">{t(item.labelKey)}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t(item.descKey)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
