"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useNavAutohidePreference } from "@/lib/use-nav-autohide";
import { useLanguage } from "@/lib/language-context";

/**
 * Card with a toggle to enable/disable the navbar auto-hide feature.
 * Shared between admin and student settings pages.
 */
export function NavAutohideSettings() {
  const [enabled, setEnabled] = useNavAutohidePreference();
  const { t } = useLanguage();

  return (
    <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          {t("navbarAutohide")}
        </CardTitle>
        <CardDescription>{t("navbarAutohideDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-3xl border border-border bg-secondary p-4">
          <div className="space-y-0.5">
            <Label htmlFor="nav-autohide-toggle" className="text-sm font-medium">
              {t("autohideNavbar")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {enabled ? t("autohideEnabled") : t("autohideDisabled")}
            </p>
          </div>
          <Switch
            id="nav-autohide-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
