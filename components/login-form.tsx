"use client";

import { cn } from "@/lib/utils";
import { createClient, setAdminSessionFlag } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { isPrimaryAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
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
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
} from "lucide-react";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.909 3.154-1.908 4.154-1.229 1.229-3.146 2.568-6.932 2.568-5.94 0-10.638-4.806-10.638-10.746s4.698-10.746 10.638-10.746c3.23 0 5.58 1.278 7.23 2.82l2.322-2.322C18.91 1.293 15.93 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c3.75 0 6.58-1.23 8.81-3.56 2.31-2.31 3.03-5.55 3.03-8.23 0-.79-.06-1.54-.18-2.25H12.48z" />
  </svg>
);

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onBack?: () => void;
}

type LoginMode = "options" | "id_verification" | "password";

export function LoginForm({
  className,
  onSuccess,
  onSwitchToSignUp,
  onBack,
  ...props
}: LoginFormProps) {
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ID Verification Login State
  const [nationalId, setNationalId] = useState("");
  const [verificationValue, setVerificationValue] = useState("");
  const [challengeType, setChallengeType] = useState<"name" | "dob">("name");
  const [idStep, setIdStep] = useState<"id_entry" | "verify">("id_entry");
  const [idError, setIdError] = useState<string | null>(null);
  const [idErrorCode, setIdErrorCode] = useState<string | null>(null);

  const router = useRouter();
  const { t, language } = useLanguage();
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

    setIsLoading(true);

    try {
      const cleanInput = email.trim();

      // Call server-side authentication route
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: cleanInput,
          password: password,
        }),
      });

      const authRes = await res.json().catch(() => ({}));

      if (!res.ok || authRes.status !== "success") {
        toast.error(
          authRes.message ||
          t("login.invalidCredentials") ||
          "Imeyili cyangwa ijambo ry'ibanga ntibihuye (Invalid email or password)."
        );
        setIsLoading(false);
        return;
      }

      // Sync browser client session if session is returned
      const supabase = createClient();
      if (authRes.session?.access_token && authRes.session?.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: authRes.session.access_token,
            refresh_token: authRes.session.refresh_token,
          });
        } catch {
          // If browser client lock occurs, server session cookie is already active
        }
      }

      if (onSuccess) onSuccess();

      const isAdminUser = Boolean(authRes.isAdmin);
      setAdminSessionFlag(isAdminUser);

      const destination = authRes.destination || (isAdminUser ? "/Admin" : "/dashboard");
      toast.success(authRes.message || (isRw ? "Murakaza neza!" : "Welcome back!"));
      router.prefetch(destination);
      router.push(destination);
    } catch (error: unknown) {
      console.error("Login error:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error(t("errorSomethingWentWrong"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";

  interface LoginLabels {
    title: string;
    emailOrId: string;
    emailPlaceholder: string;
    password: string;
    forgot: string;
    submit: string;
    loading: string;
    idTitle: string;
    idPlaceholder: string;
    continueBtn: string;
    officialName: string;
    dob: string;
    back: string;
    noAccount: string;
    signUp: string;
    usePassword: string;
    useIdOnly: string;
    or: string;
  }

  const labels: LoginLabels = {
    title: isRw ? "Injira" : isFr ? "Connexion" : "Sign In",
    emailOrId: isRw ? "Email / Indandamuntu" : isFr ? "Email / Indandamuntu" : "Email or Indandamuntu",
    emailPlaceholder: isRw ? "Email cyangwa Indandamuntu" : isFr ? "Email ou ID" : "Email or ID",
    password: isRw ? "Ijambo ry'ibanga" : isFr ? "Mot de passe" : "Password",
    forgot: isRw ? "Wibagiwe ijambobanga" : isFr ? "Oublié ?" : "Forgot?",
    submit: isRw ? "Injira" : isFr ? "Connexion" : "Sign In",
    loading: isRw ? "Tegereza..." : isFr ? "Connexion..." : "Signing in...",
    idTitle: isRw ? "Indandamuntu" : isFr ? "Carte d'identité" : "National ID",
    idPlaceholder: "1 1998 8 0012345 6 78",
    continueBtn: isRw ? "Komeza" : isFr ? "Continuer" : "Continue",
    officialName: isRw ? "Izina" : isFr ? "Nom officiel" : "Official Name",
    dob: isRw ? "Itariki y'amavuko" : isFr ? "Date de naissance" : "Date of Birth",
    back: isRw ? "Subira inyuma" : isFr ? "Retour" : "Back",
    noAccount: isRw ? "Nta konti?" : isFr ? "Pas de compte ?" : "No account?",
    signUp: isRw ? "Iyandikishe" : isFr ? "S'inscrire" : "Sign up",
    usePassword: isRw ? "Injira n'ijambo ry'ibanga" : isFr ? "Connexion par mot de passe" : "Sign in with password",
    useIdOnly: isRw ? "Injira na Indandamuntu gusa" : isFr ? "Connexion par ID" : "Sign in with ID only",
    or: isRw ? "cyangwa" : isFr ? "ou" : "or",
  };

  return (
    <div className={cn("relative flex flex-col items-center max-w-[300px] mx-auto w-full gap-2 select-none bg-transparent shadow-none border-0", className)} {...props}>
      {/* Top Bar with Back Action */}
      <div className="w-full flex items-center justify-between min-h-[20px]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-5" />
        )}
      </div>

      {/* Header Avatar & Title */}
      <div className="flex flex-col items-center text-center -mt-2 space-y-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-none">
          N
        </div>
        <h2 className="text-base font-bold tracking-tight text-foreground dark:text-white">
          {loginMode === "id_verification" ? (isRw ? "Indandamuntu" : "National ID") : labels.title}
        </h2>
      </div>

      {/* MODE 1: Standard Password Login (Google on top, then Indandamuntu, then Username/Password) */}
      {loginMode === "password" && (
        <form onSubmit={handlePasswordLogin} className="w-full space-y-2 pt-0.5">
          {/* 1. Google Button on Top */}
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-9 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/80 hover:bg-white dark:bg-zinc-800/60 dark:hover:bg-zinc-800 font-medium text-xs flex items-center justify-center gap-2 shadow-none cursor-pointer"
          >
            <GoogleIcon className="h-4 w-4" />
            <span>Google</span>
          </Button>

          {/* 2. Indandamuntu Quick Action Button */}
          <Button
            type="button"
            onClick={() => {
              setLoginMode("id_verification");
              setIdError(null);
            }}
            variant="outline"
            className="w-full h-9 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/15 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/25 font-semibold text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 shadow-none cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isRw ? "Indandamuntu" : "National ID"}</span>
          </Button>

          {/* 3. Username / Email & Password */}
          <div className="space-y-1">
            <div className="relative flex items-center">
              <User className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
              <Input
                id="login-identifier"
                type="text"
                placeholder={labels.emailPlaceholder}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="pl-9 h-9 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-white/10 focus-visible:ring-emerald-500/30 text-xs shadow-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative flex items-center">
              <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={labels.password}
                className="pl-9 pr-9 h-9 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-white/10 focus-visible:ring-emerald-500/30 text-xs shadow-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => router.push("/auth/forgot-password")}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
              >
                {labels.forgot}
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <Button
            type="submit"
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-none transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{labels.loading}</span>
              </>
            ) : (
              <>
                <span>{labels.submit}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>
      )}



      {/* MODE 2: ID Only Verification Login */}
      {loginMode === "id_verification" && (
        <div className="space-y-3 pt-1">
          {idStep === "id_entry" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-nid-input" className="text-xs font-semibold text-foreground">
                    {labels.idTitle}
                  </Label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {cleanId.length}/16
                  </span>
                </div>
                <Input
                  ref={nidInputRef}
                  id="login-nid-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={16}
                  placeholder={labels.idPlaceholder}
                  value={nationalId}
                  onChange={handleIdChange}
                  required
                  autoFocus
                  className={cn(
                    "font-mono tracking-widest text-center h-10 rounded-xl shadow-none text-sm",
                    isIdComplete && "border-emerald-500 ring-2 ring-emerald-500/20"
                  )}
                  autoComplete="off"
                />
              </div>

              {idError && (
                <p className="text-xs text-red-500">{idError}</p>
              )}

              {isIdComplete && (
                <Button
                  type="button"
                  onClick={() => {
                    randomizeChallenge();
                    setIdStep("verify");
                  }}
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-none flex items-center justify-center gap-1.5"
                >
                  <span>{labels.continueBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("password");
                    setIdError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                >
                  {labels.usePassword || labels.password}
                </button>
              </div>
            </div>
          )}

          {idStep === "verify" && (
            <form onSubmit={handleIdVerificationLogin} className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span className="font-mono font-medium">{cleanId}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIdStep("id_entry");
                    setIdError(null);
                    setVerificationValue("");
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {labels.back}
                </button>
              </div>

              <div className="space-y-1">
                <Label htmlFor="login-verify-value" className="text-xs font-semibold text-foreground">
                  {challengeType === "name" ? labels.officialName : labels.dob}
                </Label>

                {challengeType === "dob" ? (
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
                    className="h-10 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 shadow-none text-sm"
                  />
                ) : (
                  <Input
                    ref={verificationInputRef}
                    id="login-verify-value"
                    type="text"
                    placeholder={labels.officialName}
                    value={verificationValue}
                    onChange={(e) => {
                      setVerificationValue(e.target.value);
                      if (idError) setIdError(null);
                    }}
                    required
                    className="h-10 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 shadow-none text-sm"
                    autoComplete="off"
                  />
                )}
              </div>

              {idError && (
                <p className="text-xs text-red-500">{idError}</p>
              )}

              <Button
                type="submit"
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-none flex items-center justify-center gap-1.5"
                disabled={isLoading || !verificationValue.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{labels.loading}</span>
                  </>
                ) : (
                  <>
                    <span>{labels.continueBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Footer Switch to Sign Up */}
      <div className="pt-2 text-center text-xs text-muted-foreground border-t border-slate-200/60 dark:border-white/10">
        <span>{labels.noAccount} </span>
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          {labels.signUp}
        </button>
      </div>
    </div>
  );
}
