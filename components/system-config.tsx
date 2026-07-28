"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Settings2, Shield, ClipboardList } from "lucide-react";
import { getSystemConfig, updateSystemConfig } from "@/lib/supabase/queries";
import { CardSkeleton } from "@/components/skeletons";
import { useLanguage } from "@/lib/language-context";
import type { SystemConfig } from "@/lib/database.types";

export function SystemConfigSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  
  // Individual settings
  const [examLimit, setExamLimit] = useState<number>(5);
  const [violationsEnabled, setViolationsEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadConfigs = async () => {
      try {
        const { configs: data } = await getSystemConfig();
        if (data) {
          const configMap: Record<string, SystemConfig> = {};
          data.forEach((c: SystemConfig) => {
            configMap[c.key] = c;
          });
          setConfigs(configMap);
          
          // Set individual values
          if (configMap["universal_exam_limit"]) {
            setExamLimit(parseInt(configMap["universal_exam_limit"].value, 10) || 5);
          }
          if (configMap["violation_measures_enabled"]) {
            setViolationsEnabled(configMap["violation_measures_enabled"].value === "true");
          }
        }
      } catch (error: any) {
        toast.error(t("failedToLoadSystemConfig") + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadConfigs();
  }, [t]);

  const handleSaveExamLimit = async () => {
    try {
      setSaving(true);
      await updateSystemConfig(
        "universal_exam_limit",
        examLimit.toString(),
        t("universalExamLimitDesc")
      );
      toast.success(t("universalExamLimitUpdated"));
    } catch (error: any) {
      toast.error(t("failedToUpdateExamLimit") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveViolations = async () => {
    try {
      setSaving(true);
      await updateSystemConfig(
        "violation_measures_enabled",
        violationsEnabled.toString(),
        t("violationMeasuresDesc")
      );
      toast.success(t(violationsEnabled ? "violationMeasuresEnabled" : "violationMeasuresDisabled"));
    } catch (error: any) {
      toast.error(t("failedToUpdateViolationSettings") + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <CardSkeleton hasAction lines={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Universal Exam Limit */}
      <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("universalExamLimit")}
          </CardTitle>
          <CardDescription>
            {t("setDailyExamLimit")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-limit">{t("dailyExamLimitPerUser")}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="exam-limit"
                type="number"
                min={1}
                max={100}
                value={examLimit}
                onChange={(e) => setExamLimit(parseInt(e.target.value, 10) || 1)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                {t("examsPerDayPerUser")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("limitAppliedToAllUsers")}
            </p>
          </div>

          <Button
            onClick={handleSaveExamLimit}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("saveExamLimit")
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Violation Measures Toggle */}
      <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("examSecuritySettings")}
          </CardTitle>
          <CardDescription>
            {t("enableDisableSecurityMeasures")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="violations-toggle" className="text-base">
                {t("violationMeasures")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("securityFeaturesList")}
              </p>
            </div>
            <Switch
              id="violations-toggle"
              checked={violationsEnabled}
              onCheckedChange={setViolationsEnabled}
            />
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              {t("currentStatus")}{" "}
              <span className={`font-medium ${violationsEnabled ? "text-green-600" : "text-red-600"}`}>
                {violationsEnabled ? t("enabledUpper") : t("disabledUpper")}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {violationsEnabled
                ? t("securityFeaturesActive")
                : t("securityFeaturesDisabled")}
            </p>
          </div>

          <Button
            onClick={handleSaveViolations}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("saveSecuritySettings")
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
