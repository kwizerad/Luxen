"use client";

import { cn } from "@/lib/utils";
import { createClient, setAdminSessionFlag } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import {
  CreditCard,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.909 3.154-1.908 4.154-1.229 1.229-3.146 2.568-6.932 2.568-5.94 0-10.638-4.806-10.638-10.746s4.698-10.746 10.638-10.746c3.23 0 5.58 1.278 7.23 2.82l2.322-2.322C18.91 1.293 15.93 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c3.75 0 6.58-1.23 8.81-3.56 2.31-2.31 3.03-5.55 3.03-8.23 0-.79-.06-1.54-.18-2.25H12.48z" />
  </svg>
);

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

type SignUpMethod = "national_id" | "email";
type VerificationType = "name" | "dob";

export function SignUpForm({
  className,
  onSuccess,
  onSwitchToLogin,
  ...props
}: SignUpFormProps) {
  const [method, setMethod] = useState<SignUpMethod>("national_id");
  const router = useRouter();
  const { t } = useLanguage();

  // National ID form state
  const [nationalId, setNationalId] = useState("");
  const [verificationValue, setVerificationValue] = useState("");
  const [challengeType, setChallengeType] = useState<"name" | "dob">("name");
  const [idStep, setIdStep] = useState<"id_entry" | "verify" | "password">("id_entry");
  const [idPassword, setIdPassword] = useState("");
  const [idConfirmPassword, setIdConfirmPassword] = useState("");
  const [showIdPassword, setShowIdPassword] = useState(false);
  const [showIdConfirmPassword, setShowIdConfirmPassword] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [idErrorCode, setIdErrorCode] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [isVerifyingId, setIsVerifyingId] = useState(false);

  // Email form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [gender, setGender] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Randomly assign whether system asks for Name or Date of Birth
  const randomizeChallenge = () => {
    const nextType = Math.random() < 0.5 ? "name" : "dob";
    setChallengeType(nextType);
    setVerificationValue("");
  };

  // Format 16 digits
  const cleanId = nationalId.replace(/\D/g, "").slice(0, 16);
  const isIdComplete = cleanId.length === 16;

  // Auto-advance to verify card when 16 digits are typed
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    setNationalId(digits);
    if (idError) {
      setIdError(null);
      setIdErrorCode(null);
    }
    if (digits.length === 16) {
      randomizeChallenge();
      setIdStep("verify");
    }
  };

  // Auto-focus verification input when switching to verify card
  useEffect(() => {
    if (method === "national_id" && idStep === "verify" && verificationInputRef.current) {
      const timer = setTimeout(() => {
        verificationInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [method, idStep]);

  // Auto-focus password input when switching to password card
  useEffect(() => {
    if (method === "national_id" && idStep === "password" && passwordInputRef.current) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [method, idStep]);

  // Step 2: Verify citizen identity against official registry
  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdError(null);
    setIdErrorCode(null);

    if (cleanId.length !== 16) {
      setIdStep("id_entry");
      setIdError(t("enter16DigitId") || "Please enter a valid 16-digit National ID.");
      return;
    }

    if (!verificationValue.trim()) {
      setIdError(
        challengeType === "name"
          ? t("systemPromptName") || "Please enter one of your official names."
          : t("systemPromptDob") || "Please enter your Date of Birth."
      );
      return;
    }

    setIsVerifyingId(true);

    try {
      const response = await fetch("/api/auth/register-national-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: cleanId,
          verification_type: challengeType,
          verification_value: verificationValue.trim(),
          mode: "verify",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        setIdErrorCode(data.code || "error");
        setIdError(data.message || t("errorSomethingWentWrong"));
        return;
      }

      setVerifiedName(data.full_name || null);
      setIdStep("password");
      toast.success(
        t("identityVerified") || "Umwirondoro wemejwe neza! Shyiraho ijambobanga ry'indangamuntu yawe."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorSomethingWentWrong");
      setIdError(msg);
    } finally {
      setIsVerifyingId(false);
    }
  };

  // Step 3: Set password and finalize registration
  const handleCompleteIdRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdError(null);
    setIdErrorCode(null);

    if (!idPassword || idPassword.length < 6) {
      setIdError(t("passwordMinLength") || "Ijambobanga rigomba kugira nibura inyuguti 6.");
      return;
    }

    if (idPassword !== idConfirmPassword) {
      setIdError(t("passwordsDoNotMatch") || "Amagambo y'ibanga ntabwo ahuye.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register-national-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: cleanId,
          verification_type: challengeType,
          verification_value: verificationValue.trim(),
          password: idPassword,
          mode: "register",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        setIdErrorCode(data.code || "error");
        setIdError(data.message || t("errorSomethingWentWrong"));
        return;
      }

      setVerifiedName(data.full_name || null);
      const greetingName = data.full_name || verifiedName || cleanId;
      toast.success(
        `Murakaza neza, ${greetingName}! Konti yawe yafunguwe neza.`
      );

      // Log in automatically
      const supabase = createClient();
      const authPasswordToUse = data.auth_password || idPassword;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: authPasswordToUse,
      });

      if (signInError) {
        console.warn("Auto-login error:", signInError);
        toast.info("Registration complete! Please log in.");
        if (onSwitchToLogin) onSwitchToLogin();
        else router.push("/auth/login");
        return;
      }

      setAdminSessionFlag(false);
      if (onSuccess) onSuccess();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorSomethingWentWrong");
      setIdError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setEmailError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: emailPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName.trim() || undefined,
            gender: gender || undefined,
            role: "Student",
          },
        },
      });
      if (error) throw error;

      // Notify admins about the new user (best-effort)
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "user_joined",
            title: "New User Joined",
            message: `${fullName || email} just signed up.`,
            target_role: "admin",
            data: { email, full_name: fullName },
          }),
        });
      } catch (notifyError) {
        console.error("Failed to notify admins about new user:", notifyError);
      }

      toast.success(t("registrationSuccessful") || "Registration successful! Welcome.");
      if (onSuccess) onSuccess();
      router.push("/dashboard");
    } catch (error: unknown) {
      setEmailError(error instanceof Error ? error.message : t("errorSomethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: "google") => {
    const supabase = createClient();
    setIsLoading(true);
    setEmailError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setEmailError(error instanceof Error ? error.message : t("errorSomethingWentWrong"));
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-5", className)} {...props}>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{t("signUp")}</h2>
          <p className="text-sm text-muted-foreground">
            {method === "national_id"
              ? (t("enterNationalId") || "Enter your National ID")
              : t("createAccount")}
          </p>
        </div>

        {/* Visible Method Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1.5 border text-sm font-medium shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMethod("national_id");
              setIdError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 transition-all duration-200",
              method === "national_id"
                ? "bg-background text-foreground shadow-sm font-semibold border border-border/50 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <CreditCard className="h-4 w-4" />
            <span>{t("registerWithNationalId") || "National ID"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setEmailError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 transition-all duration-200",
              method === "email"
                ? "bg-background text-foreground shadow-sm font-semibold border border-border/50 text-blue-700 dark:text-blue-400"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <Mail className="h-4 w-4" />
            <span>{t("registerWithEmail") || "Email"}</span>
          </button>
        </div>

        {/* ================= METHOD 1: NATIONAL ID ================= */}
        {method === "national_id" && (
          <div className="space-y-4">
            {/* CARD 1: National ID Entry */}
            {idStep === "id_entry" && (
              <div className="space-y-4 p-4 rounded-2xl border bg-card shadow-sm animate-in fade-in">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nid-input" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                      <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      {t("nationalId") || "National ID"}
                    </Label>
                    <span
                      className={cn(
                        "text-xs font-mono px-2.5 py-0.5 rounded-full border transition-all",
                        isIdComplete
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                          : "bg-muted text-muted-foreground border-transparent"
                      )}
                    >
                      {cleanId.length} / 16 {t("digitsEntered") || "digits"}
                    </span>
                  </div>
                  <Input
                    id="nid-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={16}
                    placeholder="1199880012345678"
                    value={nationalId}
                    onChange={handleIdChange}
                    required
                    autoFocus
                    className={cn(
                      "font-mono tracking-widest text-base sm:text-lg h-12 text-center rounded-xl transition-all shadow-sm",
                      isIdComplete
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10"
                        : "focus-visible:ring-primary"
                    )}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t("enterIdToStart") || "Enter your National ID to continue"}</span>
                  </p>
                </div>

                {idError && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>{idError}</span>
                  </div>
                )}

                {isIdComplete && (
                  <Button
                    type="button"
                    onClick={() => {
                      randomizeChallenge();
                      setIdStep("verify");
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md h-11 text-sm rounded-xl transition-all"
                  >
                    <span>{t("continue") || "Continue"}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* CARD 2: Verification Challenge (Name or DoB prompted randomly by the system) */}
            {idStep === "verify" && (
              <form onSubmit={handleVerifyIdentity} className="space-y-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                {/* ID Badge with change button */}
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-foreground tracking-wider">{cleanId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIdStep("id_entry");
                      setIdError(null);
                      setIdErrorCode(null);
                      setVerificationValue("");
                      randomizeChallenge();
                    }}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    {t("changeId") || "Change ID"}
                  </button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {challengeType === "name"
                      ? t("systemPromptName") || "Injiza rimwe mu mazina yawe:"
                      : t("systemPromptDob") || "Hitamo itariki y'amavuko:"}
                  </Label>
                </div>

                {/* System Prompted Input based on random challenge */}
                <div className="space-y-1.5">
                  <Label htmlFor="signup-verify-value" className="text-xs font-semibold">
                    {challengeType === "name"
                      ? t("systemAskNameLabel") || "Official Name"
                      : t("systemAskDobLabel") || "Date of Birth"}
                  </Label>

                  {challengeType === "dob" ? (
                    <div className="relative flex items-center">
                      <Input
                        ref={verificationInputRef}
                        id="signup-verify-value"
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        min="1920-01-01"
                        value={verificationValue}
                        onChange={(e) => {
                          setVerificationValue(e.target.value);
                          if (idError) setIdError(null);
                        }}
                        required
                        className={cn(
                          "bg-background h-11 text-sm font-medium pr-10",
                          idErrorCode === "verification_mismatch" && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = verificationInputRef.current as HTMLInputElement | null;
                          if (el) {
                            if (typeof (el as any).showPicker === "function") {
                              (el as any).showPicker();
                            } else {
                              el.focus();
                            }
                          }
                        }}
                        className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Open Calendar"
                      >
                        <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </button>
                    </div>
                  ) : (
                    <Input
                      ref={verificationInputRef}
                      id="signup-verify-value"
                      type="text"
                      placeholder={t("systemAskNamePlaceholder") || "e.g. Jean"}
                      value={verificationValue}
                      onChange={(e) => {
                        setVerificationValue(e.target.value);
                        if (idError) setIdError(null);
                      }}
                      required
                      className={cn(
                        "bg-background h-11 text-sm font-medium",
                        idErrorCode === "verification_mismatch" && "border-red-500 focus-visible:ring-red-500"
                      )}
                      autoComplete="off"
                    />
                  )}
                </div>

                {/* Error Banner */}
                {idError && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-start gap-2 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <span>{idError}</span>
                    </div>
                  </div>
                )}

                {/* Verify Identity Button */}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md h-11 text-sm rounded-xl transition-all"
                  disabled={isVerifyingId || !verificationValue.trim()}
                >
                  {isVerifyingId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("verifyingIdentity") || "Kugenzura umwirondoro..."}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>{t("verifyIdentity") || "Emeza Umwirondoro"}</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* CARD 3: Direct Password Setup after ID Verification */}
            {idStep === "password" && (
              <form onSubmit={handleCompleteIdRegistration} className="space-y-4 p-4 rounded-2xl border border-emerald-500/40 bg-card shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                {/* Verified Identity Badge */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t("identityVerified") || "Umwirondoro Wemejwe"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIdStep("id_entry");
                        setIdError(null);
                        setIdErrorCode(null);
                      }}
                      className="text-[11px] text-muted-foreground hover:underline font-medium"
                    >
                      {t("changeId") || "Change ID"}
                    </button>
                  </div>
                  {verifiedName && (
                    <p className="font-semibold text-sm text-foreground pt-0.5">{verifiedName}</p>
                  )}
                  <p className="font-mono text-[11px] text-muted-foreground">ID: {cleanId}</p>
                </div>

                {/* Password Header */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("setPasswordForId") || "Ijambobanga ry'Indangamuntu yawe"}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("setPasswordHelp") || "Shyiramo ijambobanga uzajya ukoresha winjira muri konti yawe n'iyi ndangamuntu."}
                  </p>
                </div>

                {/* Password Input (Ijambobanga) */}
                <div className="space-y-1.5">
                  <Label htmlFor="id-password-input" className="text-xs font-semibold flex items-center justify-between">
                    <span>{t("createPassword") || "Ijambobanga"}</span>
                    <span className="text-[11px] text-muted-foreground font-normal">(min 6)</span>
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      ref={passwordInputRef}
                      id="id-password-input"
                      type={showIdPassword ? "text" : "password"}
                      placeholder="Shyiramo ijambobanga (nibura inyuguti 6)"
                      value={idPassword}
                      onChange={(e) => {
                        setIdPassword(e.target.value);
                        if (idError) setIdError(null);
                      }}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="h-11 text-sm bg-background pr-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIdPassword(!showIdPassword)}
                      className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={showIdPassword ? "Hide password" : "Show password"}
                    >
                      {showIdPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input (Subiramo Ijambobanga) */}
                <div className="space-y-1.5">
                  <Label htmlFor="id-confirm-password-input" className="text-xs font-semibold">
                    {t("confirmPassword") || "Subiramo Ijambobanga"}
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id="id-confirm-password-input"
                      type={showIdConfirmPassword ? "text" : "password"}
                      placeholder="Ongera wandike ijambobanga"
                      value={idConfirmPassword}
                      onChange={(e) => {
                        setIdConfirmPassword(e.target.value);
                        if (idError) setIdError(null);
                      }}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="h-11 text-sm bg-background pr-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIdConfirmPassword(!showIdConfirmPassword)}
                      className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={showIdConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showIdConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {idError && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-start gap-2 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <span>{idError}</span>
                    </div>
                  </div>
                )}

                {/* Submit / Finish Registration Button */}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md h-11 text-sm rounded-xl transition-all"
                  disabled={isLoading || !idPassword || !idConfirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("completingRegistration") || "Gufungura konti..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      <span>{t("completeRegistration") || "Fungura Konti"}</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ================= METHOD 2: EMAIL SIGN UP ================= */}
        {method === "email" && (
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleSocialSignUp("google")}
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-medium"
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              {t("continueWithGoogle") || "Continue with Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orContinueWithEmail") || "Or continue with email"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullname-input" className="text-xs font-semibold">
                {t("fullName") || "Full Name"}
              </Label>
              <Input
                id="fullname-input"
                type="text"
                placeholder={t("fullNamePlaceholder") || "John Doe"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-input" className="text-xs font-semibold">
                {t("email") || "Email"}
              </Label>
              <Input
                id="email-input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-password-input" className="text-xs font-semibold">
                {t("password") || "Password"}
              </Label>
              <Input
                id="email-password-input"
                type="password"
                placeholder="••••••••"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                className="h-10"
              />
            </div>

            {emailError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{emailError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creatingAccount") || "Creating Account..."}
                </>
              ) : (
                t("createAccount") || "Create Account"
              )}
            </Button>
          </form>
        )}

        {/* Footer switch to login */}
        <div className="text-center text-sm pt-2 text-muted-foreground">
          {t("alreadyHaveAccount") || "Already have an account?"}{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="underline underline-offset-4 text-foreground font-semibold hover:text-primary transition-colors"
          >
            {t("login") || "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
