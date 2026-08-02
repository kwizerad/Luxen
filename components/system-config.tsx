"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Settings2, Shield, ClipboardList, FileText } from "lucide-react";
import { getSystemConfig, updateSystemConfig } from "@/lib/supabase/queries";
import { useLanguage } from "@/lib/language-context";
import type { SystemConfig } from "@/lib/database.types";
import { parseSecuritySettings, type SecuritySettings, SECURITY_CONFIG_KEYS, DEFAULT_SECURITY_SETTINGS } from "@/lib/security-config";

interface SecurityFeatureToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SecurityFeatureToggle({ id, label, description, checked, onCheckedChange, disabled }: SecurityFeatureToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
      <div className="space-y-0.5 pr-3">
        <Label htmlFor={id} className={`text-sm font-medium ${disabled ? "text-muted-foreground" : ""}`}>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function SystemConfigSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  
  // Individual settings
  const [examLimit, setExamLimit] = useState<number>(5);
  const [standaloneExamEnabled, setStandaloneExamEnabled] = useState<boolean>(false);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);

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
          if (configMap["standalone_exam_enabled"]) {
            setStandaloneExamEnabled(configMap["standalone_exam_enabled"].value === "true");
          }
          setSecurity(parseSecuritySettings(configMap));
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

  const handleSaveSecurity = async () => {
    try {
      setSaving(true);
      await Promise.all([
        updateSystemConfig(SECURITY_CONFIG_KEYS.VIOLATION_MEASURES_ENABLED, security.violationMeasuresEnabled.toString(), t("violationMeasuresDesc")),
        updateSystemConfig(SECURITY_CONFIG_KEYS.MAX_VIOLATIONS, security.maxViolations.toString(), t("maxViolationsDesc") || "Maximum allowed violation attempts before auto-submission"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.FULLSCREEN_ENABLED, security.fullscreenEnabled.toString(), t("fullscreenSecurityDesc") || "Enforce fullscreen during exams"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.TAB_SWITCH_ENABLED, security.tabSwitchEnabled.toString(), t("tabSwitchSecurityDesc") || "Detect tab or window switching"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.COPY_PASTE_ENABLED, security.copyPasteEnabled.toString(), t("copyPasteSecurityDesc") || "Prevent copy, paste, and cut"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.RIGHT_CLICK_ENABLED, security.rightClickEnabled.toString(), t("rightClickSecurityDesc") || "Disable right-click context menu"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.TEXT_SELECTION_ENABLED, security.textSelectionEnabled.toString(), t("textSelectionSecurityDesc") || "Prevent text selection"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.DRAG_DROP_ENABLED, security.dragDropEnabled.toString(), t("dragDropSecurityDesc") || "Prevent drag and drop"),
        updateSystemConfig(SECURITY_CONFIG_KEYS.AI_DETECTION_ENABLED, security.aiDetectionEnabled.toString(), t("aiDetectionSecurityDesc") || "Detect AI sidebars and block AI shortcuts"),
      ]);
      toast.success(t("securitySettingsSaved") || "Security settings saved");
    } catch (error: any) {
      toast.error((t("failedToUpdateSecuritySettings") || "Failed to save security settings: ") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStandaloneExam = async () => {
    try {
      setSaving(true);
      await updateSystemConfig(
        "standalone_exam_enabled",
        standaloneExamEnabled.toString(),
        t("standaloneExamDesc") || "Enable or disable the standalone Take Exam page"
      );
      toast.success(t(standaloneExamEnabled ? "standaloneExamEnabled" : "standaloneExamDisabled"));
    } catch (error: any) {
      toast.error(t("failedToUpdateStandaloneExam") + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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

      {/* Exam Security Settings */}
      <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("examSecuritySettings")}
          </CardTitle>
          <CardDescription>
            {t("enableEachSecurityFeature") || "Enable or disable each exam security feature individually"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
              checked={security.violationMeasuresEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, violationMeasuresEnabled: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-violations">{t("maxViolations") || "Max Violations Before Auto-Submit"}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="max-violations"
                type="number"
                min={1}
                max={10}
                value={security.maxViolations}
                onChange={(e) => setSecurity((s) => ({ ...s, maxViolations: parseInt(e.target.value, 10) || 1 }))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                {t("maxViolationsHint") || "Number of cheating attempts before the exam is submitted automatically"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecurityFeatureToggle
              id="security-fullscreen"
              label={t("fullscreenSecurity") || "Fullscreen"}
              description={t("fullscreenSecurityDesc") || "Require and enforce fullscreen"}
              checked={security.fullscreenEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, fullscreenEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
            <SecurityFeatureToggle
              id="security-tab-switch"
              label={t("tabSwitchSecurity") || "Tab Switch"}
              description={t("tabSwitchSecurityDesc") || "Detect switching tabs or windows"}
              checked={security.tabSwitchEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, tabSwitchEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
            <SecurityFeatureToggle
              id="security-copy-paste"
              label={t("copyPasteSecurity") || "Copy / Paste"}
              description={t("copyPasteSecurityDesc") || "Block copy, paste, and cut"}
              checked={security.copyPasteEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, copyPasteEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
            <SecurityFeatureToggle
              id="security-right-click"
              label={t("rightClickSecurity") || "Right Click"}
              description={t("rightClickSecurityDesc") || "Disable context menu"}
              checked={security.rightClickEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, rightClickEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
            <SecurityFeatureToggle
              id="security-text-selection"
              label={t("textSelectionSecurity") || "Text Selection"}
              description={t("textSelectionSecurityDesc") || "Prevent selecting text"}
              checked={security.textSelectionEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, textSelectionEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
            <SecurityFeatureToggle
              id="security-drag-drop"
              label={t("dragDropSecurity") || "Drag & Drop"}
              description={t("dragDropSecurityDesc") || "Prevent drag and drop"}
              checked={security.dragDropEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, dragDropEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
            <SecurityFeatureToggle
              id="security-ai-detection"
              label={t("aiDetectionSecurity") || "AI Detection"}
              description={t("aiDetectionSecurityDesc") || "Block AI shortcuts and detect AI sidebars"}
              checked={security.aiDetectionEnabled}
              onCheckedChange={(checked) => setSecurity((s) => ({ ...s, aiDetectionEnabled: checked }))}
              disabled={!security.violationMeasuresEnabled}
            />
          </div>

          <Button
            onClick={handleSaveSecurity}
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
      {/* Standalone Exam Toggle */}
      <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("standaloneExam") || "Standalone Exam Page"}
          </CardTitle>
          <CardDescription>
            {t("standaloneExamDesc") || "Enable or disable the standalone Take Exam page for students"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="standalone-exam-toggle" className="text-base">
                {t("standaloneExam") || "Standalone Exam Page"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("standaloneExamHint") || "When enabled, students can access the Take Exam page directly from the navigation."}
              </p>
            </div>
            <Switch
              id="standalone-exam-toggle"
              checked={standaloneExamEnabled}
              onCheckedChange={setStandaloneExamEnabled}
            />
          </div>

          <Button
            onClick={handleSaveStandaloneExam}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save") || "Save"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
