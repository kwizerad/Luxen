"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Car, Star, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { canAccess, canWrite, type User as PermUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

export default function AdminDriversPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const checkPermAndFetch = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !canAccess(user as PermUser, "drivers")) {
        router.replace("/Admin");
        return;
      }
      setReadOnly(!canWrite(user as PermUser, "drivers"));
      fetchDrivers();
    };
    checkPermAndFetch();
  }, [router]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("drivers")
        .select("*, profile:user_id(full_name, username, email, avatar_url, role)")
        .order("created_at", { ascending: false });
      setDrivers(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (driverId: string, currentStatus: boolean) => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase
        .from("drivers")
        .update({ is_approved: !currentStatus })
        .eq("id", driverId);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, is_approved: !currentStatus } : d))
      );
    } catch {
      // ignore
    }
  };

  const toggleActive = async (driverId: string, currentStatus: boolean) => {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase
        .from("drivers")
        .update({ is_active: !currentStatus })
        .eq("id", driverId);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, is_active: !currentStatus } : d))
      );
    } catch {
      // ignore
    }
  };

  const filtered = drivers.filter((d) => {
    const matchesSearch = !search ||
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.profile?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "approved" && d.is_approved) ||
      (filter === "pending" && !d.is_approved) ||
      (filter === "active" && d.is_active) ||
      (filter === "inactive" && !d.is_active);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] pb-28">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("manageDrivers")}</h1>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchDrivers")}
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="all">{t("allLocations")}</option>
            <option value="approved">{t("approved")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="active">{t("active")}</option>
            <option value="inactive">{t("inactive")}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noDriversFound")}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((driver) => (
              <div key={driver.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {driver.profile?.avatar_url ? (
                      <img src={driver.profile.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {(driver.full_name || driver.profile?.full_name || "D")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{driver.full_name || driver.profile?.full_name || "Unknown"}</h3>
                      <p className="text-xs text-muted-foreground">{driver.profile?.email}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {driver.years_of_experience ? (
                          <span className="text-muted-foreground">{driver.years_of_experience} {t("yearsExperience")}</span>
                        ) : null}
                        {driver.training_location ? (
                          <span className="text-muted-foreground">• {driver.training_location}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleApproval(driver.id, driver.is_approved)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        driver.is_approved
                          ? "bg-green-500/10 text-green-600"
                          : "bg-orange-500/10 text-orange-600"
                      }`}
                    >
                      {driver.is_approved ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {driver.is_approved ? t("approved") : t("pending")}
                    </button>
                    <button
                      onClick={() => toggleActive(driver.id, driver.is_active)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        driver.is_active
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {driver.is_active ? t("active") : t("inactive")}
                    </button>
                  </div>
                </div>
                {driver.bio && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{driver.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
