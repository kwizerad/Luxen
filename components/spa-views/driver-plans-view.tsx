"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Edit, Loader2, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { DriverPlan, DurationType } from "@/lib/database.types";

export interface DriverPlansViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function DriverPlansView({ navigate }: DriverPlansViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [plans, setPlans] = useState<DriverPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DriverPlan | null>(null);
  const [form, setForm] = useState({ title: "", description: "", duration_type: "day" as DurationType, price: 0 });

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("driver_plans")
      .select("*")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });
    setPlans((data || []) as DriverPlan[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.title || !form.price) return;
    const supabase = createClient();

    if (editing) {
      await supabase
        .from("driver_plans")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
    } else {
      await supabase
        .from("driver_plans")
        .insert([{ ...form, driver_id: user.id }]);
    }

    setShowForm(false);
    setEditing(null);
    setForm({ title: "", description: "", duration_type: "day", price: 0 });
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("driver_plans").delete().eq("id", id);
    fetchPlans();
  };

  const startEdit = (plan: DriverPlan) => {
    setEditing(plan);
    setForm({
      title: plan.title,
      description: plan.description || "",
      duration_type: plan.duration_type,
      price: plan.price,
    });
    setShowForm(true);
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
          <h1 className="text-2xl font-bold tracking-tight">{t("myPlans")}</h1>
          <button
            onClick={() => { setEditing(null); setForm({ title: "", description: "", duration_type: "day", price: 0 }); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("addPlan")}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noPlansYet")}</p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold">{plan.title}</h3>
                    {plan.description && <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>}
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span className="font-semibold text-primary">{plan.price} RWF</span>
                      <span className="text-muted-foreground">/ {t(plan.duration_type)}</span>
                      {!plan.is_active && <span className="text-orange-500">({t("inactive")})</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(plan)} className="rounded-lg p-2 hover:bg-muted">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="rounded-lg p-2 hover:bg-red-500/10 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border/50 dark:border-border/30 bg-card shadow-xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{editing ? t("editPlan") : t("addPlan")}</h2>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("planTitle")}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("planDescription")}
                  rows={3}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
                />
                <select
                  value={form.duration_type}
                  onChange={(e) => setForm({ ...form, duration_type: e.target.value as DurationType })}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="day">{t("driverPerDay")}</option>
                  <option value="week">{t("driverPerWeek")}</option>
                  <option value="month">{t("driverPerMonth")}</option>
                </select>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  placeholder={t("planPrice")}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
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
