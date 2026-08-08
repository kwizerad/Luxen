"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, X, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface ProvisionCheckModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function ProvisionCheckModal({ open, onClose, onVerified }: ProvisionCheckModalProps) {
  const { t } = useLanguage();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ hasProvision: boolean; message: string } | null>(null);

  if (!open) return null;

  const handleVerify = async () => {
    if (!nationalId || nationalId.length !== 16) {
      setResult({ hasProvision: false, message: t("invalidNationalId") });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/verify-provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ national_id: nationalId }),
      });

      const data = await res.json();

      if (data.status === "success") {
        if (data.has_provision) {
          setResult({ hasProvision: true, message: t("provisionVerified") });
          setTimeout(() => {
            onVerified();
            onClose();
          }, 1500);
        } else {
          setResult({ hasProvision: false, message: t("noProvisionFound") });
        }
      } else {
        setResult({ hasProvision: false, message: data.message || t("verificationFailed") });
      }
    } catch {
      setResult({ hasProvision: false, message: t("verificationFailed") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{t("provisionCheck")}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{t("provisionCheckDesc")}</p>

        <div className="space-y-3">
          <input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 16))}
            placeholder={t("enterNationalId")}
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            maxLength={16}
          />

          {result && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                result.hasProvision
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
              }`}
            >
              {result.hasProvision ? (
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || nationalId.length !== 16}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("verifying")}
              </span>
            ) : (
              t("verify")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
