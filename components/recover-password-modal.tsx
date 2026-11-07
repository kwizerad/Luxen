"use client";

import React, { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  CreditCard,
  User,
  Calendar,
  HelpCircle,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

interface RecoverPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RecoverPasswordModal({
  open,
  onOpenChange,
  onSuccess,
}: RecoverPasswordModalProps) {
  const { language } = useLanguage();
  const isRw = language === "Kinyarwanda" || language === "rw";

  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [nationalId, setNationalId] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanId = nationalId.replace(/\D/g, "").slice(0, 16);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cleanId.length !== 16) {
      toast.error(
        isRw
          ? "Andika numero y'indangamuntu y'imiryango 16 yuzuye."
          : "Please enter your 16-digit National ID number."
      );
      return;
    }

    if (!fullName.trim() || !birthdate.trim()) {
      toast.error(
        isRw
          ? "Uzuza amazina yawe yose n'itariki y'amavuko kugira ngo igenzura rikorwe."
          : "Full Name and Date of Birth are required for identity verification."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/recover-nid-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: cleanId,
          full_name: fullName.trim(),
          birthdate: birthdate.trim(),
          security_answer: securityAnswer.trim(),
          mode: "verify",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.verified) {
        toast.error(data.error || "Identity or security verification failed.");
        setLoading(false);
        return;
      }

      setSecurityQuestion(data.securityQuestion || "Security Question");
      setStep("reset");
      toast.success(
        isRw
          ? "Umwirondoro wemejwe! Noneho andika ijambo ry'ibanga rishya."
          : "Identity verified! Now create your new password."
      );
    } catch {
      toast.error(isRw ? "Ikosa mu gukora igenzura." : "Failed to process verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error(
        isRw
          ? "Ijambo ry'ibanga rishya rigomba kuba ryuzuye nibura inyuguti 6."
          : "New password must be at least 6 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        isRw ? "Amajambo y'ibanga yombi ntibahuye." : "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/recover-nid-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: cleanId,
          full_name: fullName.trim(),
          birthdate: birthdate.trim(),
          security_answer: securityAnswer.trim(),
          new_password: newPassword,
          mode: "reset",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to reset password.");
        setLoading(false);
        return;
      }

      toast.success(
        isRw
          ? "Ijambo ry'ibanga ryahinduwe neza! Winjire ukoresheje rishya."
          : "Password reset successfully! You can now log in."
      );

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch {
      toast.error(isRw ? "Ikosa mu guhindura ijambo ry'ibanga." : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 dark:bg-zinc-900/95 border-border/80 dark:border-white/15 text-card-foreground dark:text-white backdrop-blur-2xl rounded-3xl p-6 shadow-2xl select-none">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {step === "verify"
              ? isRw
                ? "Kugarura Ijambo ry'Ibanga ry'Indangamuntu"
                : "Recover National ID Password"
              : isRw
              ? "Andika Ijambo ry'Ibanga Rishya"
              : "Reset Your Password"}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {step === "verify"
              ? isRw
                ? "Andika numero y'indangamuntu, amazina yawe yose, itariki y'amavuko n'ikisubizo cy'umutekano kugarura konti."
                : "Enter your 16-digit National ID, Full Name, Date of Birth, and Security Answer for account recovery."
              : isRw
              ? "Umunyandiko wemejwe. Wuzuze ijambo ry'ibanga rishya kugira ngo ugarure uburyo bwo kwinjira."
              : "Identity confirmed. Please create a new secure password for your account."}
          </DialogDescription>
        </DialogHeader>

        {step === "verify" ? (
          <form onSubmit={handleVerify} className="space-y-3.5 py-2">
            {/* National ID Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Numero y'Indangamuntu (16 Digits)" : "16-Digit National ID"}
              </Label>
              <div className="relative">
                <CreditCard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  placeholder="1 1990 8 0012345 1 23"
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60 font-mono"
                  required
                />
              </div>
            </div>

            {/* Official Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Amazina yawe yose (Full Name)" : "Official Full Name"}
              </Label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isRw ? "Urugero: Kwizera Dieme" : "Official Name"}
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60"
                  required
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Itariki y'Amavuko (Date of Birth)" : "Date of Birth"}
              </Label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60"
                  required
                />
              </div>
            </div>

            {/* Security Answer */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Ikisubizo cy'Umutekano (Security Answer)" : "Security Recovery Answer"}
              </Label>
              <div className="relative">
                <HelpCircle className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder={isRw ? "Ikisubizo cy'ikibazo cy'umutekano" : "Your security answer"}
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-10 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="h-10 px-5 rounded-xl text-xs font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Identity"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5 py-2">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                {isRw
                  ? "Indangamuntu n'umwirondoro byahuye neza."
                  : "National ID & security verification matched successfully."}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Ijambo ry'ibanga rishya" : "New Password"}
              </Label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Soma ijambo ry'ibanga rishya" : "Confirm New Password"}
              </Label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="submit" size="sm" disabled={loading} className="h-10 px-5 rounded-xl text-xs font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
