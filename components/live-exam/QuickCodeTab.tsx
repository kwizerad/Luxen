"use client";

import { useState } from "react";
import { Key, BarChart3, Info } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";

interface QuickCodeTabProps {
  onViewResult: (code: string) => void;
}

export default function QuickCodeTab({
  onViewResult,
}: QuickCodeTabProps) {
  const { t } = useLanguage();
  const [regCode, setRegCode] = useState("");

  const handleFetch = () => {
    const code = regCode.trim();
    if (!code) {
      toast.error(t("liveExamEnterRegCode"));
      return;
    }

    onViewResult(code);
  };

  return (
    <div>
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-bold text-muted-foreground">
          <Key className="mr-1.5 inline h-4 w-4 text-primary" />
          {t("liveExamRegCode")}
        </label>
        <input
          type="text"
          value={regCode}
          onChange={(e) => setRegCode(e.target.value)}
          placeholder={t("liveExamRegCodePlaceholder")}
          required
          className="w-full rounded-xl border bg-card px-3.5 py-3 text-[15px] transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
        />
      </div>
      <button
        onClick={handleFetch}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:-translate-y-px"
      >
        <BarChart3 className="h-[18px] w-[18px]" />
        {t("liveExamFetchResults")}
      </button>
      <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        {t("liveExamQuickCodeHint")}
      </div>
    </div>
  );
}
