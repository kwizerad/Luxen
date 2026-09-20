"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, IdCard, User, Calendar, AlertCircle, CheckCircle2, Loader2, Sparkles, ShieldAlert, Clock } from "lucide-react";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<any | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

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

    const cleanId = nationalId.trim().replace(/\D/g, "");
    if (!cleanId || cleanId.length !== 16) {
      setErrorMessage(t("enter16DigitId") || "Please enter a valid 16-digit Rwandan National ID.");
      return;
    }

    if (!firstName.trim() && !lastName.trim() && !dob.trim()) {
      setErrorMessage(
        t("fillAllVerificationFields") ||
          "Please enter your First Name, Last Name, and Date of Birth to verify your ID."
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
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dob: dob.trim(),
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
        setErrorMessage(
          data.error ||
            t("idVerificationFailedTryAgain") ||
            "Verification failed. The entered details do not match official Irembo records. Please try again and verify your details."
        );
        toast.error(
          data.error || t("idVerificationFailed") || "ID verification failed. Please check your data and try again."
        );
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
      setErrorMessage(err.message || "Network error. Please try again.");
      toast.error("Failed to connect to verification service.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    if (verifiedData) {
      setVerifiedData(null);
      setNationalId("");
      setFirstName("");
      setLastName("");
      setDob("");
      setAttemptsRemaining(null);
      setIsLocked(false);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-6 rounded-3xl border shadow-xl bg-card">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary-readable" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                {verifiedData
                  ? t("idVerified") || "National ID Verified"
                  : t("verifyNationalId") || "Verify National ID"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {verifiedData
                  ? t("idVerifiedSub") || "Your identity has been confirmed via official Irembo records."
                  : t("verifyIdIremboDesc") ||
                    "Enter your National ID, Names, and Date of Birth to verify your identity with Irembo."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {verifiedData ? (
          <div className="space-y-5 pt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t("verificationConfirmed") || "Identity Confirmed"}
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {verifiedData.fullName || `${verifiedData.firstName} ${verifiedData.lastName}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-500/20">
                <div>
                  <span className="text-muted-foreground block text-[11px]">{t("nationalId") || "National ID"}</span>
                  <span className="font-mono font-medium">{verifiedData.nationalId}</span>
                </div>
                {verifiedData.dateOfBirth && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">{t("dateOfBirth") || "Date of Birth"}</span>
                    <span className="font-medium">{verifiedData.dateOfBirth}</span>
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleClose} className="w-full rounded-xl font-semibold">
              {t("done") || "Done"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {isLocked ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-2 text-xs text-destructive animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />
                  <span>{t("verificationLockedTitle") || "Verification Temporarily Locked"}</span>
                </div>
                <p className="leading-relaxed">
                  {errorMessage ||
                    t("verificationLockedDesc") ||
                    "You have exceeded the maximum of 3 failed verification attempts. For security reasons, please wait 15 minutes before trying again or double check your official National ID card."}
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-destructive/80">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("lockoutDuration") || "Lockout period: 15 minutes"}</span>
                </div>
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 space-y-2 text-xs text-destructive animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{t("verificationFailedTitle") || "Verification Unsuccessful"}</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>

                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-destructive/20 text-[11px]">
                    <span className="font-medium">{t("attemptsRemaining") || "Attempts remaining:"}</span>
                    <Badge variant="destructive" className="text-[10px] py-0 px-2">
                      {attemptsRemaining} / 3 {t("attempts") || "tries"}
                    </Badge>
                  </div>
                )}
              </div>
            ) : null}

            {/* National ID Field */}
            <div className="space-y-1.5">
              <Label htmlFor="nid_input" className="text-xs font-semibold flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-primary-readable" />
                {t("nationalId") || "National ID Number"}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nid_input"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={nationalId}
                onChange={handleIdChange}
                placeholder="1199..."
                className="h-10 rounded-xl font-mono text-sm tracking-wide"
                required
                disabled={loading || isLocked}
              />
              <p className="text-[11px] text-muted-foreground">
                {nationalId.length}/16 digits (must start with 1)
              </p>
            </div>

            {/* Names Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name_input" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("firstName") || "First Name"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name_input"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Jean"
                  className="h-10 rounded-xl text-sm"
                  required
                  disabled={loading || isLocked}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name_input" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("lastName") || "Last Name"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name_input"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Mugisha"
                  className="h-10 rounded-xl text-sm"
                  required
                  disabled={loading || isLocked}
                />
              </div>
            </div>

            {/* Date of Birth Field */}
            <div className="space-y-1.5">
              <Label htmlFor="dob_input" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {t("dateOfBirth") || "Date of Birth (DoB)"}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dob_input"
                type="date"
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="h-10 rounded-xl text-sm"
                required
                disabled={loading || isLocked}
              />
              <p className="text-[11px] text-muted-foreground">
                Matches the birth date on your official National ID card.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl text-xs h-9 px-4"
              >
                {t("cancel") || "Cancel"}
              </Button>

              <Button
                type="submit"
                disabled={loading || nationalId.length !== 16 || isLocked}
                className="rounded-xl text-xs h-9 px-5 gap-1.5 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("verifying") || "Verifying with Irembo..."}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t("verifyAndSaveId") || "Verify & Save ID"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
