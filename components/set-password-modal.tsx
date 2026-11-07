"use client";

import React, { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  HelpCircle,
  AtSign,
  Lock,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
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

interface SetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onSkip?: () => void;
}

export const SECURITY_QUESTIONS = [
  {
    id: "childhood_name",
    labelRw: "Izina witwaga mu buto bwawe (Childhood Name)",
    labelEn: "What was your childhood nickname/name?",
    labelFr: "Quel était votre nom / surnom d'enfance ?",
  },
  {
    id: "first_phone",
    labelRw: "Numero ya telefone yawe ya mbere (First Phone Number)",
    labelEn: "What was your first mobile phone number?",
    labelFr: "Quel était votre premier numéro de téléphone portable ?",
  },
  {
    id: "primary_school",
    labelRw: "Izina ry'ishuri abanza ryaza mbere wizeho (Primary School)",
    labelEn: "What was the name of your primary school?",
    labelFr: "Quel était le nom de votre école primaire ?",
  },
  {
    id: "mother_maiden",
    labelRw: "Izina rya nyina w'umubyeyi wawe (Mother's Maiden Name)",
    labelEn: "What is your mother's maiden name?",
    labelFr: "Quel est le nom de jeune fille de votre mère ?",
  },
  {
    id: "birth_place",
    labelRw: "Aho wavukiye (Place of Birth)",
    labelEn: "What is your city/district of birth?",
    labelFr: "Dans quelle ville / district êtes-vous né(e) ?",
  },
];

export function SetPasswordModal({
  open,
  onOpenChange,
  onSuccess,
  onSkip,
}: SetPasswordModalProps) {
  const { language } = useLanguage();
  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0].labelRw);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error(
        isRw
          ? "Ijambo ry'ibanga rigomba kugira inyuguti no gukomera bihagije (nibura 6)."
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        isRw
          ? "Amajambo y'ibanga yombi ntibahuye. Baza neza wuzuze amagambo ahuye."
          : "Passwords do not match."
      );
      return;
    }

    if (!securityAnswer.trim()) {
      toast.error(
        isRw
          ? "Uzuza ikisubizo cyo kuzakoresha mu kugarura ijambo ry'ibanga."
          : "Please enter an answer for password recovery."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          username: username.trim(),
          security_question: securityQuestion,
          security_answer: securityAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to set password.");
        setLoading(false);
        return;
      }

      toast.success(
        isRw
          ? "Ijambo ry'ibanga ryemejwe neza! Konti yawe irarinzwe."
          : "Password and security recovery set successfully!"
      );

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch {
      toast.error(isRw ? "Ikosa mu gukora iki gikorwa." : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    if (onSkip) onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 dark:bg-zinc-900/95 border-border/80 dark:border-white/15 text-card-foreground dark:text-white backdrop-blur-2xl rounded-3xl p-6 shadow-2xl select-none">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {isRw
              ? "Wifuza gushyiraho ijambo ry'ibanga?"
              : isFr
              ? "Créer un mot de passe pour votre compte ?"
              : "Create a password for your account?"}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {isRw
              ? "Gushyiraho ijambo ry'ibanga bituma winjira vuba utarinze gutegereza, ukaba unashobora kuyikora uwo ariwo wese n'ikibazo cy'umutekano."
              : isFr
              ? "Définissez un mot de passe pour vous connecter plus rapidement et sécuriser votre compte avec une question de récupération."
              : "Set up a password for instant sign-in and protect your account with security recovery questions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Optional Username Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>{isRw ? "Izina ry'agatsiko (Username) - Bya hitamo" : "Username (Optional)"}</span>
              <span className="text-[10px] text-muted-foreground font-mono">@username</span>
            </Label>
            <div className="relative">
              <AtSign className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
                placeholder="e.g. kwizera254"
                className="pl-9 h-10 text-xs rounded-xl bg-background/60"
              />
            </div>
          </div>

          {/* New Password Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Ijambo ry'ibanga rishya" : "New Password"}
              </Label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-10 text-xs rounded-xl bg-background/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isRw ? "Soma ijambo ry'ibanga" : "Confirm Password"}
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
          </div>

          {/* Security Recovery Question Selection */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              <span>{isRw ? "Ikibazo cyo kugarura konti" : "Security Recovery Question"}</span>
            </Label>
            <select
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background/80 px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q.id} value={isRw ? q.labelRw : isFr ? q.labelFr : q.labelEn}>
                  {isRw ? q.labelRw : isFr ? q.labelFr : q.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Security Answer Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {isRw ? "Ikisubizo cyawe (Answer)" : "Your Security Answer"}
            </Label>
            <Input
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder={isRw ? "Urugero: Keza / Kigali / 078..." : "e.g. Primary School Name / Answer"}
              className="h-10 text-xs rounded-xl bg-background/60"
              required
            />
          </div>

          {/* Submit & Skip Actions */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="w-full sm:w-auto h-10 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {isRw ? "Simbuka ibi (Skip for now)" : "Skip for now"}
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="w-full sm:w-auto h-10 px-5 rounded-xl font-semibold gap-1.5 text-xs shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isRw ? "Emeza ijambo ry'ibanga" : "Save & Protect Account"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
