"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Car, Star, Loader2, Search } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import type { Driver } from "@/lib/database.types";

export interface DriversListViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  embedded?: boolean;
}

export function DriversListView({ navigate, embedded = false }: DriversListViewProps) {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<(Driver & { avg_rating?: number; rating_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("is_active", true)
          .eq("is_approved", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const driversWithRatings = await Promise.all(
          (data || []).map(async (driver: any) => {
            const { data: ratings } = await supabase
              .from("driver_ratings")
              .select("rating")
              .eq("driver_id", driver.id);

            const ratingCount = ratings?.length || 0;
            const avgRating = ratingCount > 0
              ? Math.round((ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratingCount) * 10) / 10
              : 0;

            return { ...driver as Driver, avg_rating: avgRating, rating_count: ratingCount };
          })
        );

        setDrivers(driversWithRatings);
      } catch (err) {
        console.error("Failed to load drivers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const locations = [...new Set(drivers.map((d) => d.training_location).filter(Boolean))];

  const filtered = drivers.filter((d) => {
    const matchesSearch = !search ||
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle_type?.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = !locationFilter || d.training_location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const content = (
    <>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("findDriver")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("findDriverDesc")}</p>
        </div>
      )}

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
          {locations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">{t("allLocations")}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noDriversFound")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((driver) => (
              <button
                key={driver.id}
                onClick={() => navigate("services/driver-detail", { id: driver.id })}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5 text-left"
              >
                <div className="flex items-center gap-3">
                  {driver.avatar_url ? (
                    <img src={driver.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {(driver.full_name || "D")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate">{driver.full_name || t("driver")}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {driver.training_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {driver.training_location}
                        </span>
                      )}
                      {driver.vehicle_type && (
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {driver.vehicle_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{driver.avg_rating || "N/A"}</span>
                    {driver.rating_count ? (
                      <span className="text-xs text-muted-foreground">({driver.rating_count})</span>
                    ) : null}
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {driver.price_per_day ? `${driver.price_per_day} RWF/${t("day")}` : t("viewDetails")}
                  </div>
                </div>

                {driver.years_experience != null && (
                  <p className="text-xs text-muted-foreground">
                    {driver.years_experience} {t("yearsExperience")}
                  </p>
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
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => navigate("services")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToServices")}
        </button>
        {content}
      </div>
    </div>
  );
}
