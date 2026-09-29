"use client";

import { useState } from "react";
import { Car, Loader2, AlertCircle, CheckCircle2, ShieldCheck, User, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface RegisterDriverFormProps {
  onSuccess: () => void;
}

export function RegisterDriverForm({ onSuccess }: RegisterDriverFormProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"id" | "verify">("id");
  const [nationalId, setNationalId] = useState("");
  const [verificationType, setVerificationType] = useState<"name" | "dob">("name");
  const [verificationValue, setVerificationValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleIdSubmit = async () => {
    if (!nationalId || nationalId.length !== 16) {
      setError(t("invalidNationalId"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify the ID exists by fetching document info
      const res = await fetch(`/api/theory-exam-dl-info?full=false`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ national_id: nationalId }),
      });

      const data = await res.json();

      if (data.status === "success" && data.document) {
        setStep("verify");
      } else {
        setError(data.message || t("noDataForNationalId"));
      }
    } catch {
      setError(t("verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verificationValue.trim()) {
      setError(t("enterVerificationValue"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/register-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: nationalId,
          verification_type: verificationType,
          verification_value: verificationValue,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setSuccess(data.message || t("driverRegistrationSuccess"));
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(data.message || t("driverRegistrationFailed"));
      }
    } catch {
      setError(t("driverRegistrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-base">{t("registerAsDriver")}</h3>
          <p className="text-sm text-muted-foreground">{t("registerAsDriverDesc")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {step === "id" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("enterNationalId")}</label>
            <input
              type="text"
              value={nationalId}
              onChange={(e) => {
                setNationalId(e.target.value.replace(/\D/g, "").slice(0, 16));
                setError(null);
              }}
              placeholder="119XXXXXXXXXXXXXX"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              maxLength={16}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("nationalIdHint")}</p>
          </div>

          <button
            onClick={handleIdSubmit}
            disabled={loading || nationalId.length !== 16}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("verifying")}
              </span>
            ) : (
              t("continue")
            )}
          </button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary p-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>{t("idVerifiedSuccessfully")}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("chooseVerificationMethod")}
            </p>
          </div>

          {/* Verification type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => { setVerificationType("name"); setVerificationValue(""); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                verificationType === "name"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <User className="h-4 w-4" />
              {t("enterName")}
            </button>
            <button
              onClick={() => { setVerificationType("dob"); setVerificationValue(""); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                verificationType === "dob"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Calendar className="h-4 w-4" />
              {t("enterDob")}
            </button>
          </div>

          <div>
            {verificationType === "name" ? (
              <>
                <label className="mb-1.5 block text-sm font-medium">{t("enterSingleName")}</label>
                <input
                  type="text"
                  value={verificationValue}
                  onChange={(e) => { setVerificationValue(e.target.value); setError(null); }}
                  placeholder={t("singleNamePlaceholder")}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("singleNameHint")}</p>
              </>
            ) : (
              <>
                <label className="mb-1.5 block text-sm font-medium">{t("enterDateOfBirth")}</label>
                <input
                  type="date"
                  value={verificationValue}
                  onChange={(e) => { setVerificationValue(e.target.value); setError(null); }}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("dobHint")}</p>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setStep("id"); setVerificationValue(""); setError(null); }}
              className="rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("back")}
            </button>
            <button
              onClick={handleVerifySubmit}
              disabled={loading || !verificationValue.trim()}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("registering")}
                </span>
              ) : (
                t("registerAsDriver")
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
