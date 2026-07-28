"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

type TextSize = "sm" | "md" | "lg";
type Language = "English" | "Kinyarwanda" | "French";
type LanguageCode = "en" | "rw" | "fr";

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [textSize, setTextSize] = useState<TextSize>("md");

  // Convert full language name to code for storage
  const languageToCode: Record<Language, LanguageCode> = {
    English: "en",
    Kinyarwanda: "rw",
    French: "fr",
  };

  const textSizes = [
    { value: "sm", labelKey: "small" },
    { value: "md", labelKey: "medium" },
    { value: "lg", labelKey: "large" },
  ];

  useEffect(() => {
    // Load text size from localStorage first (for immediate load)
    const savedTextSize = localStorage.getItem("textSize") as TextSize;
    if (savedTextSize) {
      setTextSize(savedTextSize);
      applyTextSize(savedTextSize);
    } else if (user?.user_metadata?.text_size) {
      // Fallback to user metadata
      setTextSize(user.user_metadata.text_size);
      applyTextSize(user.user_metadata.text_size);
    }
  }, [user]);

  const handleTextSizeChange = async (size: TextSize) => {
    setTextSize(size);
    localStorage.setItem("textSize", size);
    applyTextSize(size);
    
    // Save to user metadata if logged in
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { text_size: size }
        });
      } catch (error) {
        console.error("Failed to save text size:", error);
      }
    }
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    setLanguage(newLanguage);

    // Save to user metadata if logged in (store as language code)
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { language: languageToCode[newLanguage] }
        });
      } catch (error) {
        console.error("Failed to save language:", error);
      }
    }
  };

  const applyTextSize = (size: TextSize) => {
    const root = document.documentElement;
    root.dataset.textSize = size;
    switch (size) {
      case "sm":
        root.style.fontSize = "14px";
        break;
      case "md":
        root.style.fontSize = "16px";
        break;
      case "lg":
        root.style.fontSize = "18px";
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
          <DialogDescription>
            {t("customizeYourExperience")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("theme")}</label>
            <ThemeSwitcher />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("textSize")}</label>
            <div className="flex gap-2 flex-wrap">
              {textSizes.map(({ value, labelKey }) => (
                <Button
                  key={value}
                  variant={textSize === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTextSizeChange(value as TextSize)}
                  className="min-w-[80px]"
                >
                  {t(labelKey)}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("language")}</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={language === "English" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("English" as Language)}
                className="min-w-[80px]"
              >
                English
              </Button>
              <Button
                variant={language === "French" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("French" as Language)}
                className="min-w-[80px]"
              >
                Français
              </Button>
              <Button
                variant={language === "Kinyarwanda" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("Kinyarwanda" as Language)}
                className="min-w-[80px]"
              >
                Kinyarwanda
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
