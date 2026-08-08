"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, FileText, CheckCircle2, Clock, Info, FileCode } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export interface RequestCodeViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  embedded?: boolean;
}

export function RequestCodeView({ navigate, embedded = false }: RequestCodeViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<"theory" | "practical">("theory");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [fees, setFees] = useState({ theory: 0, practical: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const supabase = createClient();

      const { data: theoryFee } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "theory_exam_request_fee")
        .single();
      const { data: practicalFee } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "practical_exam_request_fee")
        .single();

      setFees({
        theory: theoryFee ? parseFloat(theoryFee.value) : 0,
        practical: practicalFee ? parseFloat(practicalFee.value) : 0,
      });

      const { data: userPayments } = await supabase
        .from("exam_request_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPayments(userPayments || []);
    };

    fetchData();
  }, [user]);

  const handleCheck = async () => {
    if (!nationalId || nationalId.length !== 16) return;

    setLoading(true);
    setResult(null);
    setSelectedCategory(null);

    try {
      const res = await fetch("/api/exam-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ national_id: nationalId, exam_type: tab }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ status: "error", message: t("verificationFailed") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nationalId.length === 16 && !loading) {
      handleCheck();
    }
  }, [nationalId]);

  const content = (
    <div className={embedded ? "" : "w-full rounded-3xl border bg-card/95 p-7 shadow-lg backdrop-blur-md transition-all hover:shadow-xl sm:p-8"}>
      {!embedded && (
        <div className="mb-5 flex items-center gap-3 border-b pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCode className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              {t("requestCode")}
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              {t("requestCodeDesc")}
            </span>
          </div>
        </div>
      )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-xl border p-1">
          <button
            onClick={() => { setTab("theory"); setResult(null); setSelectedCategory(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "theory" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {t("theoryExam")}
          </button>
          <button
            onClick={() => { setTab("practical"); setResult(null); setSelectedCategory(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === "practical" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {t("practicalExam")}
          </button>
        </div>

        {/* ID Input */}
        <div className="mb-6 rounded-2xl border bg-background/50 p-6">
          <label className="mb-2 block text-sm font-medium">{t("enterNationalId")}</label>
          <input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 16))}
            placeholder="119XXXXXXXXXXXXX"
            className="mb-3 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            maxLength={16}
          />
          <button
            onClick={handleCheck}
            disabled={loading || nationalId.length !== 16}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("checking")}
              </span>
            ) : nationalId.length === 16 ? (
              t("recheck")
            ) : (
              t("checkAndRequest")
            )}
          </button>

          {result && (
            <div className={`mt-4 rounded-xl p-4 text-sm ${
              result.status === "error"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : result.has_exam
                ? (result.allowed_categories && result.allowed_categories.length > 0
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400")
                : "bg-green-500/10 text-green-600 dark:text-green-400"
            }`}>
              {result.has_exam ? (
                <div>
                  <div className="flex items-start gap-2 mb-3">
                    {result.allowed_categories && result.allowed_categories.length > 0
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      : <Info className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span>{result.message}</span>
                  </div>
                  {result.allowed_categories && result.allowed_categories.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 font-semibold">{t("chooseCategory")}</p>
                      <p className="mb-3 text-xs text-muted-foreground">{t("selectOneCategory")}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {result.allowed_categories.map((cat: { category: string; description: string }) => (
                          <button
                            key={cat.category}
                            onClick={() => setSelectedCategory(cat.category)}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary ${
                              selectedCategory === cat.category
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : ""
                            }`}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                              {cat.category}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{cat.description}</p>
                              <p className="text-xs text-muted-foreground">{t("category")} {cat.category}</p>
                            </div>
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              selectedCategory === cat.category
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/30"
                            }`}>
                              {selectedCategory === cat.category && (
                                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      {selectedCategory && (
                        <button className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                          {t("continueWithCategory")} {selectedCategory}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : result.status === "success" ? (
                <div>
                  <p className="mb-2">{result.message}</p>
                  <p className="font-bold">{t("fee")}: {result.amount} RWF</p>
                  <button className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    {t("payNow")}
                  </button>
                </div>
              ) : (
                <span>{result.message}</span>
              )}
            </div>
          )}
        </div>

        {/* Past Requests */}
        <div className="rounded-2xl border bg-background/50 p-6">
          <h2 className="mb-4 text-lg font-bold">{t("pastRequests")}</h2>
          {payments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">{t("noPastRequests")}</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t(p.exam_type === "theory" ? "theoryExam" : "practicalExam")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.payment_status === "paid"
                      ? "bg-green-500/10 text-green-600"
                      : p.payment_status === "failed"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-orange-500/10 text-orange-600"
                  }`}>
                    {t(`payment_${p.payment_status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );

  if (embedded) {
    return <div className="py-4">{content}</div>;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate("services")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("services")}
        </button>
        {content}
      </div>
    </div>
  );
}
