"use client";

import { Search, Key } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export type TabType = "full" | "simple";

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4 sm:mb-5 flex gap-1.5 sm:gap-2 rounded-xl bg-muted p-1">
      <button
        type="button"
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
          activeTab === "full"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card/50"
        }`}
        onClick={() => onTabChange("full")}
      >
        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <span>{t("liveExamSearch")}</span>
      </button>
      <button
        type="button"
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
          activeTab === "simple"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card/50"
        }`}
        onClick={() => onTabChange("simple")}
      >
        <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <span>{t("liveExamQuickCode")}</span>
      </button>
    </div>
  );
}
