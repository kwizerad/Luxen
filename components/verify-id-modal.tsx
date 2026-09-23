"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  IdCard, 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";

interface VerifyIdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (citizen: any) => void;
  initialNationalId?: string;
}

export function VerifyIdModal({
  open,
  onOpenChange,
  onSuccess,
  initialNationalId = "",
}: VerifyIdModalProps) {
  const { t } = useLanguage();
  const [nationalId, setNationalId] = useState(initialNationalId);
  const [verificationMethod, setVerificationMethod] = useState<"name" | "dob">("name");
  const [singleName, setSingleName] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<any | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Sync initialNationalId if modal opens with prefilled ID
  useEffect(() => {
    if (initialNationalId) {
      setNationalId(initialNationalId.replace(/\D/g, "").slice(0, 16));
    }
  }, [initialNationalId]);

  const cleanId = nationalId.trim().replace(/\D/g, "");
  const is16Digits = cleanId.length === 16;

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    setNationalId(raw);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLocked) {
      toast.error(t("verificationLocked") || "Verification is temporarily locked. Please wait before retrying.");
      return;
    }

    if (!is16Digits) {
      setErrorMessage(t("enter16DigitId") || "Please enter a valid 16-digit Rwandan National ID.");
      return;
    }

    const verificationValue = verificationMethod === "name" ? singleName.trim() : dob.trim();

    if (!verificationValue) {
      setErrorMessage(
        verificationMethod === "name"
          ? t("singleNameHint") || "Please enter either your First Name or Last Name."
          : t("dobHint") || "Please enter your Date of Birth."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/verify-national-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: cleanId,
          verification_type: verificationMethod,
          verification_value: verificationValue,
          ...(verificationMethod === "name" ? { name: verificationValue } : { dob: verificationValue }),
        }),
      });

      const data = await res.json();

      if (data.attempts_remaining !== undefined) {
        setAttemptsRemaining(data.attempts_remaining);
      }

      if (data.locked) {
        setIsLocked(true);
        if (data.locked_until) setLockedUntil(data.locked_until);
      }

      if (!res.ok || !data.success) {
        const errorText =
          data.error ||
          (verificationMethod === "name"
            ? t("nameMismatchError") || "The name you entered does not match this National ID."
            : t("dobMismatchError") || "The date of birth does not match this National ID.");
        
        setErrorMessage(errorText);
        toast.error(errorText);
      } else {
        setVerifiedData(data.citizen);
        setAttemptsRemaining(null);
        setIsLocked(false);
        setLockedUntil(null);
        toast.success(t("idVerifiedSuccess") || "National ID verified successfully!");
        if (onSuccess) {
          onSuccess(data.citizen);
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || "Network error. Please try again.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    if (verifiedData) {
      setVerifiedData(null);
      setNationalId("");
      setSingleName("");
      setDob("");
      setAttemptsRemaining(null);
      setIsLocked(false);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
                {verifiedData
                  ? t("idVerified") || "National ID Verified"
                  : t("verifyNationalId") || "Verify National ID"}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {verifiedData
                  ? t("idVerifiedSub") || "Your identity has been confirmed via official records."
                  : t("verifyIdDesc") || "Enter your 16-digit National ID and confirm with either your Name or Date of Birth."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {verifiedData ? (
          <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                    {t("verificationConfirmed") || "Identity Confirmed"}
                  </p>
                  <p className="text-sm font-bold text-zinc-100 truncate">
                    {verifiedData.fullName || `${verifiedData.firstName || ""} ${verifiedData.lastName || ""}`.trim()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-emerald-500/20">
                <div>
                  <span className="text-zinc-400 block text-[11px] font-mono">{t("nationalId") || "National ID"}</span>
                  <span className="font-mono font-semibold text-zinc-200">{verifiedData.nationalId}</span>
                </div>
                {verifiedData.dateOfBirth && (
                  <div>
                    <span className="text-zinc-400 block text-[11px] font-mono">{t("dateOfBirth") || "Date of Birth"}</span>
                    <span className="font-medium text-zinc-200">{verifiedData.dateOfBirth}</span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleClose} 
              className="w-full h-10 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-none transition-colors"
            >
              {t("done") || "Done"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Lockout Banner */}
            {isLocked ? (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 space-y-1.5 text-xs text-red-300 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-sm text-red-400">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{t("verificationLockedTitle") || "Verification Temporarily Locked"}</span>
                </div>
                <p className="leading-relaxed">
                  {errorMessage ||
                    t("verificationLockedDesc") ||
                    "You have exceeded the maximum of 3 failed verification attempts. Please wait 15 minutes before trying again."}
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-red-400/90">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("lockoutDuration") || "Lockout period: 15 minutes"}</span>
                </div>
              </div>
            ) : errorMessage ? (
              /* Error Banner */
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 space-y-2 text-xs text-red-300 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-red-300">{t("verificationFailedTitle") || "Verification Unsuccessful"}</p>
                    <p className="text-zinc-300 leading-snug">{errorMessage}</p>
                  </div>
                </div>

                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-red-500/20 text-[11px] font-mono">
                    <span className="text-zinc-400">{t("attemptsRemaining") || "Attempts remaining:"}</span>
                    <span className="text-red-400 font-bold">
                      {attemptsRemaining} / 3 {t("attempts") || "tries"}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Step 1: 16-Digit National ID Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="nid_input" className="text-xs font-semibold flex items-center gap-1.5 text-zinc-200">
                  <IdCard className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{t("nationalId") || "National ID Number"}</span>
                  <span className="text-red-400">*</span>
                </Label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {cleanId.length}/16 {t("digitsEntered") || "digits"}
                </span>
              </div>

              <Input
                id="nid_input"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={nationalId}
                onChange={handleIdChange}
                placeholder="1199... (16 digits)"
                className="h-10 rounded-xl font-mono text-sm tracking-wider bg-zinc-900/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
                disabled={loading || isLocked}
                autoFocus
              />
              {!is16Digits && (
                <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <span>Enter all 16 digits of your Rwandan National ID to proceed.</span>
                </p>
              )}
            </div>

            {/* Step 2: Verification Card (ONLY shows up after writing 16 digits) */}
            {is16Digits && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      {t("verificationMethod") || "Single Verification Method"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
                    1 of 2 required
                  </span>
                </div>

                {/* Switch Between Single Name OR Date of Birth */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationMethod("name");
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                      verificationMethod === "name"
                        ? "bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>{t("verifyByName") || "Single Name"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVerificationMethod("dob");
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                      verificationMethod === "dob"
                        ? "bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t("verifyByDob") || "Date of Birth"}</span>
                  </button>
                </div>

                {/* Method A: Single Name Input */}
                {verificationMethod === "name" && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <Label htmlFor="single_name_input" className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        {t("oneNameLabel") || "Single Name (First or Last Name)"}
                        <span className="text-red-400">*</span>
                      </span>
                    </Label>
                    <Input
                      id="single_name_input"
                      type="text"
                      value={singleName}
                      onChange={(e) => {
                        setSingleName(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={t("singleNamePlaceholder") || "e.g. Jean or Mugisha"}
                      className="h-10 rounded-lg text-sm bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500"
                      required
                      disabled={loading || isLocked}
                      autoFocus
                    />
                    <p className="text-[11px] text-zinc-400">
                      {t("singleNameHint") || "Enter either your first name or last name as on your National ID card."}
                    </p>
                  </div>
                )}

                {/* Method B: Date of Birth Input */}
                {verificationMethod === "dob" && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <Label htmlFor="dob_input" className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        {t("dateOfBirth") || "Date of Birth"}
                        <span className="text-red-400">*</span>
                      </span>
                    </Label>
                    <Input
                      id="dob_input"
                      type="date"
                      value={dob}
                      onChange={(e) => {
                        setDob(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="h-10 rounded-lg text-sm bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500"
                      required
                      disabled={loading || isLocked}
                      autoFocus
                    />
                    <p className="text-[11px] text-zinc-400">
                      {t("dobHint") || "Enter your date of birth as it appears on your official National ID card."}
                    </p>
                  </div>
                )}

                {/* Submit Action Inside the Card */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={
                      loading || 
                      !is16Digits || 
                      isLocked || 
                      (verificationMethod === "name" ? !singleName.trim() : !dob.trim())
                    }
                    className="w-full h-10 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-none transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t("verifying") || "Verifying with Official Records..."}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{t("verifyAndSaveId") || "Verify & Link National ID"}</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            {!is16Digits && (
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-lg text-xs h-9 px-4 border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
                >
                  {t("cancel") || "Cancel"}
                </Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
