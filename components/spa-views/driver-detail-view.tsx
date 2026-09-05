"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, MapPin, Car, Star, Clock, MessageSquare, Flag,
  Loader2, ShieldCheck, Award, Languages, CheckCircle2
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Driver, DriverPlan, DurationType } from "@/lib/database.types";
import { ProvisionCheckModal } from "@/components/provision-check-modal";
import { RatingModal } from "@/components/rating-modal";
import { ReportModal } from "@/components/report-modal";

export interface DriverDetailViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  params: URLSearchParams;
}

export function DriverDetailView({ navigate, params }: DriverDetailViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const driverId = params.get("id") || "";

  const [driver, setDriver] = useState<Driver | null>(null);
  const [plans, setPlans] = useState<DriverPlan[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [provisionVerified, setProvisionVerified] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<DurationType>("day");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [existingRating, setExistingRating] = useState<{ rating: number; review?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!driverId) return;
      setLoading(true);
      try {
        const supabase = createClient();

        const { data: driverData } = await supabase
          .from("drivers")
          .select("*")
          .eq("id", driverId)
          .single();
        setDriver(driverData as Driver);

        const { data: planData } = await supabase
          .from("driver_plans")
          .select("*")
          .eq("driver_id", driverId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        setPlans(planData as DriverPlan[] || []);

        const { data: ratingData } = await supabase
          .from("driver_ratings")
          .select("*, student:student_id(id, full_name, username, avatar_url)")
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false });
        const allRatings = ratingData || [];
        setRatings(allRatings);
        const count = allRatings.length;
        setRatingCount(count);
        setAvgRating(count > 0 ? Math.round((allRatings.reduce((s: number, r: any) => s + r.rating, 0) / count) * 10) / 10 : 0);

        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("provision_verified")
            .eq("id", user.id)
            .maybeSingle();
          setProvisionVerified(profile?.provision_verified || false);

          const { data: myRating } = await supabase
            .from("driver_ratings")
            .select("rating, review")
            .eq("driver_id", driverId)
            .eq("student_id", user.id)
            .maybeSingle();
          if (myRating) setExistingRating({ rating: myRating.rating, review: myRating.review });
        }
      } catch (err) {
        console.error("Failed to load driver:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [driverId, user]);

  const handleApply = async () => {
    if (!user) return;
    if (!provisionVerified) {
      setShowProvisionModal(true);
      return;
    }

    setApplying(true);
    setApplyResult(null);

    try {
      const price = selectedPlan
        ? plans.find((p) => p.id === selectedPlan)?.price
        : selectedDuration === "day"
        ? driver?.price_per_day
        : selectedDuration === "week"
        ? driver?.price_per_week
        : driver?.price_per_month;

      const res = await fetch("/api/driver/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driverId,
          plan_id: selectedPlan,
          duration_type: selectedDuration,
          duration_count: 1,
          total_price: price,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setApplyResult({ success: false, message: data.error });
      } else {
        setApplyResult({ success: true, message: t("applicationSubmitted") });
      }
    } catch {
      setApplyResult({ success: false, message: t("applicationFailed") });
    } finally {
      setApplying(false);
    }
  };

  const handleMessage = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const data = await res.json();
      if (data.conversation) {
        navigate("chat/conversation", { id: data.conversation.id });
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p className="text-center text-muted-foreground">{t("driverNotFound")}</p>
      </div>
    );
  }

  const durationOptions: { value: DurationType; price?: number; labelKey: string }[] = [
    { value: "day", price: driver.price_per_day, labelKey: "driverPerDay" },
    { value: "week", price: driver.price_per_week, labelKey: "driverPerWeek" },
    { value: "month", price: driver.price_per_month, labelKey: "driverPerMonth" },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => navigate("back", { fallback: "services/drivers" })}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("backToDrivers") || "Back"}
        </button>

        {/* Driver Profile Header */}
        <div className="mb-6 rounded-2xl border bg-card p-6">
          <div className="flex items-start gap-4">
            {driver.avatar_url ? (
              <img src={driver.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {(driver.full_name || "D")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{driver.full_name || t("driver")}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {driver.training_location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {driver.training_location}
                  </span>
                )}
                {driver.vehicle_type && (
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {driver.vehicle_type}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {avgRating || "N/A"} ({ratingCount})
                </span>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {driver.years_experience != null && (
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t("yearsExperience")}:</span>
                <span className="font-medium">{driver.years_experience}</span>
              </div>
            )}
            {driver.languages_spoken && driver.languages_spoken.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Languages className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t("languages")}:</span>
                <span className="font-medium">{driver.languages_spoken.join(", ")}</span>
              </div>
            )}
            {driver.certifications && (
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t("certifications")}:</span>
                <span className="font-medium">{driver.certifications}</span>
              </div>
            )}
            {driver.scheduling_mode && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t("schedulingMode")}:</span>
                <span className="font-medium">{t(driver.scheduling_mode === "scheduled" ? "scheduled" : "queue")}</span>
              </div>
            )}
          </div>

          {driver.specialties && driver.specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {driver.specialties.map((s) => (
                <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {s}
                </span>
              ))}
            </div>
          )}

          {driver.training_approach && (
            <p className="mt-3 text-sm text-muted-foreground">{driver.training_approach}</p>
          )}

          {driver.bio && (
            <p className="mt-2 text-sm text-muted-foreground">{driver.bio}</p>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleMessage}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              {t("messageDriver")}
            </button>
            {existingRating && (
              <button
                onClick={() => setShowRatingModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Star className="h-4 w-4" />
                {t("editRating")}
              </button>
            )}
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Flag className="h-4 w-4" />
              {t("reportDriver")}
            </button>
          </div>
        </div>

        {/* Pricing & Application */}
        <div className="mb-6 rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-bold">{t("trainingPlans")}</h2>

          {/* Duration Selection */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSelectedDuration(opt.value); setSelectedPlan(null); }}
                className={`rounded-xl border p-3 text-center transition-colors ${
                  selectedDuration === opt.value
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground"
                }`}
              >
                <p className="text-sm font-medium">{t(opt.labelKey)}</p>
                {opt.price != null && (
                  <p className="mt-1 text-xs text-muted-foreground">{opt.price} RWF</p>
                )}
              </button>
            ))}
          </div>

          {/* Plans */}
          {plans.length > 0 && (
            <div className="mb-4 space-y-2">
              {plans
                .filter((p) => p.duration_type === selectedDuration)
                .map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedPlan === plan.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{plan.title}</h4>
                      <span className="font-bold text-primary">{plan.price} RWF</span>
                    </div>
                    {plan.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </button>
                ))}
            </div>
          )}

          {applyResult && (
            <div className={`mb-3 rounded-xl p-3 text-sm ${
              applyResult.success
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}>
              {applyResult.message}
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {applying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("applying")}
              </span>
            ) : (
              t("applyForTraining")
            )}
          </button>
        </div>

        {/* Reviews */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("reviews")}</h2>
            {!existingRating && (
              <button
                onClick={() => setShowRatingModal(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Star className="h-4 w-4" />
                {t("rateDriver")}
              </button>
            )}
          </div>

          {ratings.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">{t("noReviewsYet")}</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r: any) => (
                <div key={r.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {r.student?.full_name || r.student?.username || t("student")}
                    </span>
                  </div>
                  {r.review && <p className="mt-1 text-sm text-muted-foreground">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProvisionCheckModal
        open={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onVerified={() => setProvisionVerified(true)}
      />
      <RatingModal
        open={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        driverId={driverId}
        existingRating={existingRating?.rating}
        existingReview={existingRating?.review}
      />
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedId={driverId}
      />
    </div>
  );
}
