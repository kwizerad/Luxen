"use client";

import { cn } from "@/lib/utils";
import { createClient, setAdminSessionFlag } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";
import {
  CreditCard,
  Mail,
  Lock,
  ShieldCheck,
  User,
  Calendar,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.909 3.154-1.908 4.154-1.229 1.229-3.146 2.568-6.932 2.568-5.94 0-10.638-4.806-10.638-10.746s4.698-10.746 10.638-10.746c3.23 0 5.58 1.278 7.23 2.82l2.322-2.322C18.91 1.293 15.93 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c3.75 0 6.58-1.23 8.81-3.56 2.31-2.31 3.03-5.55 3.03-8.23 0-.79-.06-1.54-.18-2.25H12.48z" />
  </svg>
);

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

type LoginMode = "options" | "id_verification" | "password";

export function LoginForm({
  className,
  onSuccess,
  onSwitchToSignUp,
  ...props
}: LoginFormProps) {
  const [loginMode, setLoginMode] = useState<LoginMode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ID Verification Login State
  const [nationalId, setNationalId] = useState("");
  const [verificationValue, setVerificationValue] = useState("");
  const [challengeType, setChallengeType] = useState<"name" | "dob">("name");
  const [idStep, setIdStep] = useState<"id_entry" | "verify">("id_entry");
  const [idError, setIdError] = useState<string | null>(null);
  const [idErrorCode, setIdErrorCode] = useState<string | null>(null);

  const router = useRouter();
  const { t } = useLanguage();
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const nidInputRef = useRef<HTMLInputElement>(null);

  // Randomly assign whether system asks for Name or Date of Birth
  const randomizeChallenge = () => {
    const nextType = Math.random() < 0.5 ? "name" : "dob";
    setChallengeType(nextType);
    setVerificationValue("");
  };

  const cleanId = nationalId.replace(/\D/g, "").slice(0, 16);
  const isIdComplete = cleanId.length === 16;

  // Auto-advance to verify card when 16 digits are typed
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 16);
    setNationalId(val);
    if (idError) {
      setIdError(null);
      setIdErrorCode(null);
    }
    if (val.length === 16) {
      randomizeChallenge();
      setIdStep("verify");
    }
  };

  // Auto-focus verification input when switching to verify card
  useEffect(() => {
    if (loginMode === "id_verification" && idStep === "verify" && verificationInputRef.current) {
      const timer = setTimeout(() => {
        verificationInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [loginMode, idStep]);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("errorSomethingWentWrong"));
      setIsLoading(false);
    }
  };

  const handleIdVerificationLogin = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register-national-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: cleanId,
          verification_type: challengeType,
          verification_value: verificationValue.trim(),
          mode: "login",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        setIdErrorCode(data.code || "error");
        setIdError(data.message || t("errorSomethingWentWrong"));
        setIsLoading(false);
        return;
      }

      const greetingName = data.full_name || cleanId;
      toast.success(`Murakaza neza, ${greetingName}!`);

      // Sign in to Supabase
      const supabase = createClient();
      const authPasswordToUse = data.auth_password || `!Nid_Sec_${cleanId}_rw!`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: authPasswordToUse,
      });

      if (signInError) {
        console.error("ID login session error:", signInError);
        toast.error("Could not initialize session. Please try logging in with password.");
        setIsLoading(false);
        return;
      }

      setAdminSessionFlag(false);
      if (onSuccess) onSuccess();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorSomethingWentWrong");
      setIdError(msg);
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error(t("login.noInternetConnection"));
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const cleanInput = email.trim();
      let targetEmail = cleanInput.toLowerCase();

      const digitsOnly = cleanInput.replace(/\D/g, "");
      if (digitsOnly.length === 16 && !cleanInput.includes("@")) {
        targetEmail = `${digitsOnly}@nid.rw`;
        try {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("national_id", digitsOnly)
            .maybeSingle();
          if (profile?.email) {
            targetEmail = profile.email.toLowerCase();
          }
        } catch {
          // fallback to synthetic
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("failed to fetch") ||
          error.message.toLowerCase().includes("network") ||
          error.message.toLowerCase().includes("fetch")
        ) {
          toast.error(t("login.noInternetConnection"));
          setIsLoading(false);
          return;
        }
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t("login.invalidCredentials") || "Invalid login credentials. If you haven't set a password, use Continue with ID.");
          setIsLoading(false);
          return;
        }
        throw error;
      }

      if (onSuccess) onSuccess();

      const isPrimary = isPrimaryAdmin({ email: targetEmail || data.user?.email || "" });
      const role = data.user?.user_metadata?.role;
      const isAdminUser = isPrimary || role === "Admin";

      setAdminSessionFlag(isAdminUser);

      const destination = isAdminUser ? "/Admin" : "/dashboard";
      router.prefetch(destination);
      router.push(destination);
    } catch (error: unknown) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t("errorSomethingWentWrong"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{t("login")}</h2>
          <p className="text-sm text-muted-foreground">
            {loginMode === "id_verification"
              ? (t("idVerificationHelp") || "Enter your National ID")
              : (t("enterYourEmail") || "Log in to your account")}
          </p>
        </div>

        {/* ================= FAST AUTH BUTTONS: CONTINUE WITH ID & CONTINUE WITH GOOGLE ================= */}
        {loginMode === "options" && (
          <div className="space-y-3">
            {/* 1. Continue with ID Button */}
            <Button
              type="button"
              onClick={() => {
                setLoginMode("id_verification");
                setIdError(null);
              }}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base"
            >
              <CreditCard className="h-5 w-5" />
              <span>{t("continueWithId") || "Continue with ID"}</span>
            </Button>

            {/* 2. Continue with Google Button */}
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 rounded-xl border border-border/80 hover:bg-muted/60 font-medium flex items-center justify-center gap-2.5 shadow-sm text-sm sm:text-base"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>{t("continueWithGoogle") || "Continue with Google"}</span>
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">
                  {t("orContinueWithEmail") || "Or with Email & Password"}
                </span>
              </div>
            </div>

            {/* Button to open standard password login */}
            <Button
              variant="ghost"
              type="button"
              onClick={() => setLoginMode("password")}
              className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground font-medium text-sm"
            >
              <Mail className="mr-2 h-4 w-4" />
              <span>{t("emailOrNationalId") || "Email & Password Login"}</span>
            </Button>
          </div>
        )}

        {/* ================= MODE: ID VERIFICATION LOGIN (PASSWORDLESS) ================= */}
        {loginMode === "id_verification" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Top switcher / back button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                {t("continueWithId") || "Continue with ID"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("options");
                  setIdStep("id_entry");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {t("otherOptions") || "Other options"}
              </button>
            </div>

            {/* CARD 1: National ID Entry */}
            {idStep === "id_entry" && (
              <div className="space-y-4 p-4 rounded-2xl border bg-card shadow-sm animate-in fade-in">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-nid-input" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
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
                    ref={nidInputRef}
                    id="login-nid-input"
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
              <form onSubmit={handleIdVerificationLogin} className="space-y-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                {/* ID Badge with change button */}
                <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
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
                      ? t("systemPromptName") || "Enter one of your official names:"
                      : t("systemPromptDob") || "Select your Date of Birth:"}
                  </Label>
                </div>

                {/* System Prompted Input based on random challenge */}
                <div className="space-y-1.5">
                  <Label htmlFor="login-verify-value" className="text-xs font-semibold">
                    {challengeType === "name"
                      ? t("systemAskNameLabel") || "Official Name"
                      : t("systemAskDobLabel") || "Date of Birth"}
                  </Label>

                  {challengeType === "dob" ? (
                    <div className="relative flex items-center">
                      <Input
                        ref={verificationInputRef}
                        id="login-verify-value"
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
                      id="login-verify-value"
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
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-start gap-2 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <span>{idError}</span>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md h-11 text-sm rounded-xl transition-all"
                  disabled={isLoading || !verificationValue.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("verifyingAndLoggingIn") || "Logging in..."}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>{t("verifyAndEnterDashboard") || "Continue"}</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ================= MODE: EMAIL / ID + PASSWORD LOGIN ================= */}
        {loginMode === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("emailOrNationalId") || "Standard Password Login"}
              </span>
              <button
                type="button"
                onClick={() => setLoginMode("options")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {t("otherOptions") || "Other options"}
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-identifier" className="text-xs font-semibold">
                {t("emailOrNationalId") || "Email or National ID"}
              </Label>
              <Input
                id="login-identifier"
                type="text"
                placeholder={t("emailOrNationalIdPlaceholder") || "1199... or email@example.com"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">{t("password")}</Label>
                <button
                  type="button"
                  onClick={() => router.push("/auth/forgot-password")}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {t("forgotPassword")}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-sm" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loggingIn") || "Logging in..."}
                </>
              ) : (
                t("login") || "Log In"
              )}
            </Button>
          </form>
        )}

        {/* Footer switch to sign up */}
        <div className="text-center text-sm pt-1 text-muted-foreground">
          {t("dontHaveAccount") || "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="underline underline-offset-4 text-foreground font-semibold hover:text-primary transition-colors"
          >
            {t("signUp") || "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
