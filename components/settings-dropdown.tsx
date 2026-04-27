"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [textSize, setTextSize] = useState("medium");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleTextSizeChange = (size: string) => {
    setTextSize(size);
    const root = document.documentElement;
    if (size === "small") {
      root.style.fontSize = "14px";
    } else if (size === "medium") {
      root.style.fontSize = "16px";
    } else if (size === "large") {
      root.style.fontSize = "18px";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Settings className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Settings</span>
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-64 p-4 z-50">
          <div className="space-y-4">
            {/* Theme Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("theme")}</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="system">{t("system")}</option>
                <option value="light">{t("light")}</option>
                <option value="dark">{t("dark")}</option>
              </select>
            </div>

            {/* Language Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("language")}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="Kinyarwanda">Kinyarwanda</option>
              </select>
            </div>

            {/* Text Size Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("textSize")}</label>
              <select
                value={textSize}
                onChange={(e) => handleTextSizeChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="small">{t("small")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="large">{t("large")}</option>
              </select>
            </div>

            {/* Help Section */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                setIsOpen(false);
                // Handle help navigation
              }}
            >
              <HelpCircle className="h-4 w-4" />
              {t("help")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
