"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Award, Download, Loader2, FileText, CheckCircle2, Printer } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { createClient } from "@/lib/supabase/client";

export interface ClaimResultsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface ExamAttempt {
  id: string;
  category_name: string;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  status: string;
}

interface UserProfile {
  full_name: string | null;
  username: string | null;
  email: string | null;
  national_id: string | null;
}

export function ClaimResultsView({ navigate }: ClaimResultsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { config } = useBrandingConfig();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const fetchData = async () => {
      try {
        const [attemptsRes, profileRes] = await Promise.all([
          supabase
            .from("exam_attempts")
            .select("id, category_name, score_percentage, total_questions, correct_answers, started_at, completed_at, duration_seconds, status")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false }),
          supabase
            .from("user_profiles")
            .select("full_name, username, email, national_id")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (attemptsRes.error) throw attemptsRes.error;
        const passedAttempts = (attemptsRes.data || []).filter(
          (a: ExamAttempt) => a.score_percentage >= 50
        );
        setAttempts(passedAttempts);
        setProfile(profileRes.data as UserProfile | null);
      } catch (err) {
        console.error("Failed to fetch exam results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDownload = () => {
    if (!certificateRef.current) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const certificateHTML = certificateRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Certificate - ${profile?.full_name || "Student"}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Georgia', serif; background: #f5f5f5; padding: 40px; }
            .certificate {
              max-width: 800px; margin: 0 auto; background: white;
              border: 3px double #1a1a2e; border-radius: 12px; padding: 60px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .cert-header { text-align: center; margin-bottom: 30px; }
            .cert-system { font-size: 28px; font-weight: bold; color: #1a1a2e; }
            .cert-title { font-size: 14px; color: #666; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
            .cert-award { text-align: center; margin: 30px 0; }
            .cert-award-icon { font-size: 48px; color: #c9a227; }
            .cert-award-text { font-size: 24px; font-weight: bold; color: #1a1a2e; margin-top: 10px; }
            .cert-body { text-align: center; margin: 30px 0; line-height: 1.8; }
            .cert-name { font-size: 22px; font-weight: bold; color: #1a1a2e; }
            .cert-detail { font-size: 16px; color: #444; margin-top: 8px; }
            .cert-score { font-size: 36px; font-weight: bold; color: #16a34a; margin: 20px 0; }
            .cert-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
            .cert-info-item { text-align: center; }
            .cert-info-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            .cert-info-value { font-size: 16px; font-weight: 600; color: #1a1a2e; margin-top: 4px; }
            .cert-footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
            .cert-signature { text-align: center; }
            .cert-signature-line { border-top: 1px solid #333; width: 200px; margin: 40px auto 8px; }
            .cert-signature-label { font-size: 14px; color: #666; }
            .cert-date { font-size: 14px; color: #666; }
            @media print { body { background: white; padding: 0; } }
          </style>
        </head>
        <body>${certificateHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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

        <div className="w-full rounded-3xl border bg-card/95 p-7 shadow-lg backdrop-blur-md transition-all hover:shadow-xl sm:p-8">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3 border-b pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                {t("claimResults")}
              </h2>
              <span className="text-sm font-medium text-muted-foreground">
                {t("claimResultsDesc")}
              </span>
            </div>
          </div>

          {attempts.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                {t("noResultsToClaim")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("noResultsToClaimHint")}
              </p>
            </div>
          ) : (
            <>
              {/* Results list */}
              <div className="space-y-3">
                {attempts.map((attempt) => (
                  <button
                    key={attempt.id}
                    onClick={() => setSelectedAttempt(attempt)}
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:border-primary hover:shadow-md ${
                      selectedAttempt?.id === attempt.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "bg-background/50"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {attempt.category_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(attempt.completed_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {attempt.score_percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.correct_answers}/{attempt.total_questions}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Certificate preview */}
              {selectedAttempt && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {t("certificatePreview")}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                      >
                        <Download className="h-4 w-4" />
                        {t("download")}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-all hover:bg-muted"
                      >
                        <Printer className="h-4 w-4" />
                        {t("print")}
                      </button>
                    </div>
                  </div>

                  {/* Certificate */}
                  <div ref={certificateRef} className="overflow-hidden rounded-2xl border-2 border-double border-foreground/20 bg-white p-8 shadow-sm">
                    <div className="cert-header text-center mb-6">
                      <div className="cert-system text-2xl font-bold text-foreground">
                        {config.systemName}
                      </div>
                      <div className="cert-title text-xs text-muted-foreground mt-1 tracking-widest uppercase">
                        {t("examCertificate")}
                      </div>
                    </div>

                    <div className="cert-award text-center my-6">
                      <div className="cert-award-icon text-4xl text-amber-500">
                        <Award className="inline h-10 w-10" />
                      </div>
                      <div className="cert-award-text text-xl font-bold text-foreground mt-2">
                        {t("certificateOfAchievement")}
                      </div>
                    </div>

                    <div className="cert-body text-center my-6 leading-relaxed">
                      <div className="cert-name text-lg font-bold text-foreground">
                        {profile?.full_name || profile?.username || profile?.email || "Student"}
                      </div>
                      <div className="cert-detail text-sm text-muted-foreground mt-2">
                        {t("hasSuccessfullyCompleted")}
                      </div>
                      <div className="cert-detail text-base font-semibold text-foreground mt-1">
                        {selectedAttempt.category_name} — {t("theoryExam")}
                      </div>

                      <div className="cert-score text-3xl font-bold text-green-600 my-4">
                        {selectedAttempt.score_percentage}%
                      </div>

                      <div className="cert-info-grid grid grid-cols-2 gap-4 my-6">
                        <div className="cert-info-item text-center">
                          <div className="cert-info-label text-xs text-muted-foreground uppercase tracking-wider">
                            {t("correctAnswers")}
                          </div>
                          <div className="cert-info-value text-sm font-semibold text-foreground mt-1">
                            {selectedAttempt.correct_answers} / {selectedAttempt.total_questions}
                          </div>
                        </div>
                        <div className="cert-info-item text-center">
                          <div className="cert-info-label text-xs text-muted-foreground uppercase tracking-wider">
                            {t("duration")}
                          </div>
                          <div className="cert-info-value text-sm font-semibold text-foreground mt-1">
                            {formatDuration(selectedAttempt.duration_seconds)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="cert-footer mt-8 flex justify-between items-end">
                      <div className="cert-date text-xs text-muted-foreground">
                        {formatDate(selectedAttempt.completed_at)}
                      </div>
                      <div className="cert-signature text-center">
                        <div className="cert-signature-line border-t border-foreground w-48 mx-auto my-8" />
                        <div className="cert-signature-label text-xs text-muted-foreground">
                          {config.systemName}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
