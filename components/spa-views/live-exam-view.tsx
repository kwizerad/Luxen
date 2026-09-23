"use client";

import { useState, useCallback, useEffect } from "react";
import { Car, ArrowLeft, ShieldAlert, ShieldCheck, UserCheck, Loader2 } from "lucide-react";
import TabBar, { type TabType } from "@/components/live-exam/TabBar";
import ExamSearchTab from "@/components/live-exam/ExamSearchTab";
import QuickCodeTab from "@/components/live-exam/QuickCodeTab";
import ResultModal from "@/components/live-exam/ResultModal";
import { VerifyIdModal } from "@/components/verify-id-modal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { getCachedServicesConfig } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ExamResultDetails } from "@/lib/live-exam/types";

export interface LiveExamViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function LiveExamView({ navigate }: LiveExamViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("full");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ExamResultDetails | null>(null);
  const [resultCache, setResultCache] = useState<Record<string, ExamResultDetails>>({});
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean | null>(null);
  const [idVerificationRequired, setIdVerificationRequired] = useState<boolean>(true);

  // User National ID verification state
  const [checkingIdStatus, setCheckingIdStatus] = useState(true);
  const [verifiedNationalId, setVerifiedNationalId] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const refreshConfig = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("system_config")
        .select("key, value");

      let pageEnabled = true;
      let examServiceEnabled = true;
      let reqId = true;

      if (data && data.length > 0) {
        for (const row of data) {
          if (row.key === "services_page_enabled") {
            pageEnabled = row.value === "true";
          } else if (row.key === "service_live-exam_enabled") {
            examServiceEnabled = row.value === "true";
          } else if (row.key === "live_exam_id_verification_required") {
            reqId = row.value === "true";
          }
        }
      }
      setIsServiceEnabled(pageEnabled && examServiceEnabled);
      setIdVerificationRequired(reqId);
    } catch {
      setIsServiceEnabled(true);
      setIdVerificationRequired(true);
    }
  }, []);

  useEffect(() => {
    refreshConfig();

    const handleConfigChange = (e: any) => {
      if (e?.detail?.key === "live_exam_id_verification_required") {
        setIdVerificationRequired(Boolean(e.detail.value));
      } else {
        refreshConfig();
      }
    };

    window.addEventListener("config-changed", handleConfigChange);
    return () => {
      window.removeEventListener("config-changed", handleConfigChange);
    };
  }, [refreshConfig]);

  // Fetch and check current user's verified National ID
  useEffect(() => {
    let isMounted = true;
    async function checkUserId() {
      if (!user) {
        if (isMounted) {
          setVerifiedNationalId(null);
          setCheckingIdStatus(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("national_id, is_id_verified")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          const userMetaId = user.user_metadata?.national_id;
          const nid = profile?.national_id || userMetaId || null;
          const isVerified = Boolean(profile?.is_id_verified || user.user_metadata?.is_id_verified);
          if (isVerified && nid && String(nid).trim().length === 16) {
            setVerifiedNationalId(String(nid).trim());
          } else {
            setVerifiedNationalId(null);
          }
          setCheckingIdStatus(false);
        }
      } catch {
        if (isMounted) {
          const userMetaId = user.user_metadata?.national_id;
          const isVerified = Boolean(user.user_metadata?.is_id_verified);
          if (isVerified && userMetaId && String(userMetaId).trim().length === 16) {
            setVerifiedNationalId(String(userMetaId).trim());
          } else {
            setVerifiedNationalId(null);
          }
          setCheckingIdStatus(false);
        }
      }
    }

    checkUserId();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const copyToClipboard = useCallback(
    (text: string) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => toast.success(`${t("copy")}: ${text}`))
          .catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    },
    [t]
  );

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      toast.success(`${t("copy")}: ${text}`);
    } catch {
      toast.error(t("liveExamCopyFailed"));
    }
    document.body.removeChild(textarea);
  };

  const viewCodeResult = useCallback(
    async (code: string) => {
      const cached = resultCache[code];
      if (cached) {
        setModalData(cached);
        setModalError(null);
        setModalLoading(false);
        setModalOpen(true);
        return;
      }

      setModalLoading(true);
      setModalError(null);
      setModalData(null);
      setModalOpen(true);

      try {
        const response = await fetch("/api/select-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            national_id: verifiedNationalId || "0000000000000000",
            selected_code: code,
          }),
        });
        const data = await response.json();

        if (data.status === "error") {
          setModalError(data.message || t("liveExamRetrieveError"));
        } else if (data.status === "success" && data.result) {
          setResultCache((prev) => ({ ...prev, [code]: data.result }));
          setModalData(data.result);
        } else {
          setModalError(t("liveExamUnexpectedResponse"));
        }
      } catch {
        setModalError(t("liveExamConnectionError"));
      } finally {
        setModalLoading(false);
      }
    },
    [resultCache, t, verifiedNationalId]
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  if (isServiceEnabled === false) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
        <div className="container mx-auto max-w-xl px-4 py-12 text-center">
          <button
            onClick={() => navigate("back", { fallback: "services" })}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back") || "Back to Services"}
          </button>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t("liveExamResults") || "Live Exam Results"}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {t("serviceDisabledMessage") || "This service is currently disabled by administration."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate("back", { fallback: "services" })}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("services") || "Back"}
        </button>

        {/* Main card */}
        <div className="w-full rounded-3xl border bg-card/95 p-7 shadow-lg backdrop-blur-md transition-all hover:shadow-xl sm:p-8">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Car className="text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  {t("liveExamResults")}
                </h2>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("liveExamResultsSubtitle")}
                </span>
              </div>
            </div>

            {verifiedNationalId && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <UserCheck className="w-3.5 h-3.5" />
                ID Verified
              </span>
            )}
          </div>

          {/* ID Check Loading */}
          {checkingIdStatus ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">
                {t("checkingIdentity") || "Checking National ID verification status..."}
              </p>
            </div>
          ) : idVerificationRequired && !verifiedNationalId ? (
            /* Unverified ID Guard when verification is enforced by admin */
            <div className="py-6 px-2 text-center space-y-5 animate-in fade-in duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ShieldAlert className="h-8 w-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {t("idVerificationRequired") || "National ID Verification Required"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("idVerificationRequiredExamDesc") ||
                    "To protect candidate privacy and display official Driving Exam Results, you must verify your Rwandan National ID with your Names and Date of Birth first."}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setShowVerifyModal(true)}
                  className="rounded-xl font-semibold gap-2 px-6 h-10 shadow-sm"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("verifyNationalIdNow") || "Verify National ID Now"}</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Verified OR Verification Disabled by Admin: Show Driving Exam Results Tabs */
            <>
              {/* Tab Bar */}
              <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

              {/* Tab Content */}
              {activeTab === "full" && (
                <ExamSearchTab
                  resultCache={resultCache}
                  verifiedNationalId={verifiedNationalId}
                  onViewResult={viewCodeResult}
                  onCopy={copyToClipboard}
                  onResultsLoaded={(results) =>
                    setResultCache((prev) => ({ ...prev, ...results }))
                  }
                />
              )}
              {activeTab === "simple" && (
                <QuickCodeTab
                  onViewResult={viewCodeResult}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        open={modalOpen}
        loading={modalLoading}
        error={modalError}
        data={modalData}
        onClose={closeModal}
        onCopy={copyToClipboard}
      />

      {/* ID Verification Modal */}
      <VerifyIdModal
        open={showVerifyModal}
        onOpenChange={setShowVerifyModal}
        onSuccess={(citizen) => {
          setVerifiedNationalId(citizen.nationalId);
          toast.success(t("idVerifiedSuccess") || "ID verified! You can now view exam results.");
        }}
      />
    </div>
  );
}
