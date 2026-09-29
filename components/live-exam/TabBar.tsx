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
    <div className="mb-5 flex gap-2 rounded-xl bg-muted p-1">
      <button
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-center text-sm font-semibold transition-all ${
          activeTab === "full"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card/50"
        }`}
        onClick={() => onTabChange("full")}
      >
        <Search className="h-4 w-4" />
        {t("liveExamSearch")}
      </button>
      <button
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2.5 text-center text-sm font-semibold transition-all ${
          activeTab === "simple"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card/50"
        }`}
        onClick={() => onTabChange("simple")}
      >
        <Key className="h-4 w-4" />
        {t("liveExamQuickCode")}
      </button>
    </div>
  );
}
