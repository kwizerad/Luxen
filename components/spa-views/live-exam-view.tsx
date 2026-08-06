"use client";

import { useState, useCallback, useEffect } from "react";
import { Car, ArrowLeft } from "lucide-react";
import TabBar, { type TabType } from "@/components/live-exam/TabBar";
import ExamSearchTab from "@/components/live-exam/ExamSearchTab";
import QuickCodeTab from "@/components/live-exam/QuickCodeTab";
import ResultModal from "@/components/live-exam/ResultModal";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { ExamResultDetails } from "@/lib/live-exam/types";

export interface LiveExamViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function LiveExamView({ navigate }: LiveExamViewProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("full");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ExamResultDetails | null>(null);
  const [resultCache, setResultCache] = useState<Record<string, ExamResultDetails>>({});

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
            national_id: "0000000000000000",
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
    [resultCache, t]
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

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate("services")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("services")}
        </button>

        {/* Main card */}
        <div className="w-full rounded-3xl border bg-card/95 p-7 shadow-lg backdrop-blur-md transition-all hover:shadow-xl sm:p-8">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3 border-b pb-4">
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

          {/* Tab Bar */}
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Tab Content */}
          {activeTab === "full" && (
            <ExamSearchTab
              resultCache={resultCache}
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
        </div>
      </div>

      {/* Modal */}
      <ResultModal
        open={modalOpen}
        loading={modalLoading}
        error={modalError}
        data={modalData}
        onClose={closeModal}
        onCopy={copyToClipboard}
      />
    </div>
  );
}
