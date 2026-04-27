"use client";

import { useState } from "react";
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

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your experience
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("theme")}</label>
            <ThemeSwitcher />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("language")}</label>
            <div className="flex gap-2">
              <Button
                variant={language === "English" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("English")}
              >
                English
              </Button>
              <Button
                variant={language === "Arabic" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("Arabic")}
              >
                Arabic
              </Button>
              <Button
                variant={language === "Kinyarwanda" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("Kinyarwanda")}
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
