"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, BookOpen, ShieldCheck, ClipboardList, FileText, LayoutList, Globe, Users, Trophy, Database, Volume2, Clock } from "lucide-react";
import { getSystemConfig, updateSystemConfig, updateSystemConfigBatch, getServicesConfig, updateExamSavingConfig } from "@/lib/supabase/queries";
import { invalidateServicesConfigCache } from "@/lib/feature-flags";
import { getBrowserExamSavingConfig, saveBrowserExamSavingConfig } from "@/lib/browser-exam-history";
import { useLanguage } from "@/lib/language-context";
import { authFetch } from "@/lib/e2e-crypto";
import type { SystemConfig } from "@/lib/database.types";
import {
  parseAllScopedSecuritySettings,
  getSecurityConfigKeysForScope,
  type SecuritySettings,
  type SecurityScope,
  DEFAULT_SECURITY_SETTINGS,
} from "@/lib/security-config";

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

interface ScopedAntiCheatCardProps {
  scope: SecurityScope;
  title: string;
  badgeLabel: string;
  description: string;
  icon: React.ReactNode;
  settings: SecuritySettings;
  onChange: (updater: (prev: SecuritySettings) => SecuritySettings) => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  t: (key: string) => string;
}

function ScopedAntiCheatCard({
  scope,
  title,
  badgeLabel,
  description,
  icon,
  settings,
  onChange,
  onSave,
  saving,
  saveLabel,
  t,
}: ScopedAntiCheatCardProps) {
  return (
    <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-semibold">
            {badgeLabel}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-3">
            <Label htmlFor={`violations-toggle-${scope}`} className="text-base">
              {t("violationMeasures")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("securityFeaturesList")}
            </p>
          </div>
          <Switch
            id={`violations-toggle-${scope}`}
            checked={settings.violationMeasuresEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, violationMeasuresEnabled: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`max-violations-${scope}`}>
            {t("maxViolations") || "Max Violations Before Auto-Submit"}
          </Label>
          <div className="flex flex-wrap items-center gap-4">
            <Input
              id={`max-violations-${scope}`}
              type="number"
              min={1}
              max={10}
              value={settings.maxViolations}
              onChange={(e) => onChange((s) => ({ ...s, maxViolations: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)) }))}
              className="w-32"
              disabled={!settings.violationMeasuresEnabled}
            />
            <span className="text-sm text-muted-foreground">
              {t("maxViolationsHint") || "Number of cheating attempts before the exam is submitted automatically"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SecurityFeatureToggle
            id={`security-fullscreen-${scope}`}
            label={t("fullscreenSecurity") || "Fullscreen"}
            description={t("fullscreenSecurityDesc") || "Require and enforce fullscreen"}
            checked={settings.fullscreenEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, fullscreenEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
          <SecurityFeatureToggle
            id={`security-tab-switch-${scope}`}
            label={t("tabSwitchSecurity") || "Tab Switch"}
            description={t("tabSwitchSecurityDesc") || "Detect switching tabs or windows"}
            checked={settings.tabSwitchEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, tabSwitchEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
          <SecurityFeatureToggle
            id={`security-copy-paste-${scope}`}
            label={t("copyPasteSecurity") || "Copy / Paste"}
            description={t("copyPasteSecurityDesc") || "Block copy, paste, and cut"}
            checked={settings.copyPasteEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, copyPasteEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
          <SecurityFeatureToggle
            id={`security-right-click-${scope}`}
            label={t("rightClickSecurity") || "Right Click"}
            description={t("rightClickSecurityDesc") || "Disable context menu"}
            checked={settings.rightClickEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, rightClickEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
          <SecurityFeatureToggle
            id={`security-text-selection-${scope}`}
            label={t("textSelectionSecurity") || "Text Selection"}
            description={t("textSelectionSecurityDesc") || "Prevent selecting text"}
            checked={settings.textSelectionEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, textSelectionEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
          <SecurityFeatureToggle
            id={`security-drag-drop-${scope}`}
            label={t("dragDropSecurity") || "Drag & Drop"}
            description={t("dragDropSecurityDesc") || "Prevent drag and drop"}
            checked={settings.dragDropEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, dragDropEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
          <SecurityFeatureToggle
            id={`security-ai-detection-${scope}`}
            label={t("aiDetectionSecurity") || "AI Detection"}
            description={t("aiDetectionSecurityDesc") || "Block AI shortcuts and detect AI sidebars"}
            checked={settings.aiDetectionEnabled}
            onCheckedChange={(checked) => onChange((s) => ({ ...s, aiDetectionEnabled: checked }))}
            disabled={!settings.violationMeasuresEnabled}
          />
        </div>

        <Button
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("saving")}
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SystemConfigSettings({ filter }: { filter?: "exam" | "languages" | "services" }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  
  // Individual settings
  const [examLimit, setExamLimit] = useState<number>(5);
  const [guestFreeExamEnabled, setGuestFreeExamEnabled] = useState<boolean>(true);
  const [guestFreeExamLimit, setGuestFreeExamLimit] = useState<number>(3);
  const [guestResetValue, setGuestResetValue] = useState<number>(1);
  const [guestResetUnit, setGuestResetUnit] = useState<"hours" | "days">("days");
  const [savingGuestQuota, setSavingGuestQuota] = useState<boolean>(false);
  const [universalPassingPercentage, setUniversalPassingPercentage] = useState<number>(60);
  const [standaloneExamEnabled, setStandaloneExamEnabled] = useState<boolean>(false);
  const [groupExamEnabled, setGroupExamEnabled] = useState<boolean>(true);
  const [groupExamJoinWindow, setGroupExamJoinWindow] = useState<number>(120);
  const [saveIndividualExamsEnabled, setSaveIndividualExamsEnabled] = useState<boolean>(true);
  const [saveGroupExamsEnabled, setSaveGroupExamsEnabled] = useState<boolean>(true);
  const [scopedSecurity, setScopedSecurity] = useState<Record<SecurityScope, SecuritySettings>>({
    course: DEFAULT_SECURITY_SETTINGS,
    official: DEFAULT_SECURITY_SETTINGS,
  });
  const [savingSecurityScope, setSavingSecurityScope] = useState<SecurityScope | null>(null);

  // Services settings
  const [servicesPageEnabled, setServicesPageEnabled] = useState<boolean>(true);
  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean>>({});

  // Learning language toggles
  const LEARNING_LANGUAGES = [
    { key: "english", label: "English", nativeLabel: "English" },
    { key: "french", label: "French", nativeLabel: "Français" },
    { key: "kinyarwanda", label: "Kinyarwanda", nativeLabel: "Kinyarwanda" },
  ];
  const [languageToggles, setLanguageToggles] = useState<Record<string, boolean>>({
    english: true,
    french: true,
    kinyarwanda: true,
  });

  // Interface language toggles (controls which languages students can select for the UI)
  const INTERFACE_LANGUAGES = [
    { key: "english", label: "English", nativeLabel: "English" },
    { key: "french", label: "French", nativeLabel: "Français" },
    { key: "kinyarwanda", label: "Kinyarwanda", nativeLabel: "Kinyarwanda" },
  ];
  const [interfaceLanguageToggles, setInterfaceLanguageToggles] = useState<Record<string, boolean>>({
    english: true,
    french: true,
    kinyarwanda: true,
  });

  // Service definitions for the admin UI
  const serviceDefinitions = [
    {
      key: "live-exam",
      labelKey: "liveExamResults",
      descKey: "liveExamResultsDesc",
      titleFallback: "Official Exams Results Review Service",
      descFallback: "Used to review the marks from official exams (Rwanda Police provisional & driving exams)",
    },
    {
      key: "group-exam",
      labelKey: "groupExamService",
      descKey: "groupExamServiceDesc",
      titleFallback: "Multiplayer Group Exam Challenge",
      descFallback: "Invite classmates to compete in real-time synchronized mock exams",
    },
    {
      key: "traffic-assistant",
      labelKey: "trafficAssistantTitle",
      descKey: "trafficAssistantDesc",
      titleFallback: "Traffic Rules & Gazette Assistant",
      descFallback: "Search Rwanda road traffic regulations and official legal gazettes",
    },
  ];
  const [liveExamIdVerificationRequired, setLiveExamIdVerificationRequired] = useState<boolean>(true);

  const handleToggleLiveExamIdVerification = async (checked: boolean) => {
    const prev = liveExamIdVerificationRequired;
    setLiveExamIdVerificationRequired(checked);
    try {
      await updateSystemConfig(
        "live_exam_id_verification_required",
        checked.toString(),
        "Require National ID verification before viewing driving exam results"
      );
      if (typeof window !== "undefined") {
        sessionStorage.setItem("app_live_exam_id_verification_required", String(checked));
        sessionStorage.removeItem("app_services_config");
        window.dispatchEvent(new CustomEvent("config-changed", { detail: { key: "live_exam_id_verification_required", value: checked } }));
      }
      toast.success(t("servicesSettingsSaved") || "ID verification requirement setting updated");
    } catch (error: any) {
      setLiveExamIdVerificationRequired(prev);
      toast.error((t("failedToUpdateServicesSettings") || "Failed to update setting: ") + error.message);
    }
  };

  const handleToggleSaveIndividualExams = async (checked: boolean) => {
    const prev = saveIndividualExamsEnabled;
    setSaveIndividualExamsEnabled(checked);
    saveBrowserExamSavingConfig({ saveIndividualExams: checked });
    try {
      await updateExamSavingConfig({ saveIndividualExams: checked });
      toast.success(
        checked
          ? "Individual exam history saving enabled (saved to browser storage)"
          : "Individual exams set to Practice Only (not saved)"
      );
    } catch (error: any) {
      setSaveIndividualExamsEnabled(prev);
      saveBrowserExamSavingConfig({ saveIndividualExams: prev });
      toast.error(
        (t("failedToUpdateExamPersistence") || "Failed to update exam saving setting: ") +
          (error?.message || "Unknown error")
      );
    }
  };

  const handleToggleSaveGroupExams = async (checked: boolean) => {
    const prev = saveGroupExamsEnabled;
    setSaveGroupExamsEnabled(checked);
    saveBrowserExamSavingConfig({ saveGroupExams: checked });
    try {
      await updateExamSavingConfig({ saveGroupExams: checked });
      toast.success(
        checked
          ? "Group exam history saving enabled (saved to browser storage)"
          : "Group exams set to Practice Only (not saved)"
      );
    } catch (error: any) {
      setSaveGroupExamsEnabled(prev);
      saveBrowserExamSavingConfig({ saveGroupExams: prev });
      toast.error(
        (t("failedToUpdateExamPersistence") || "Failed to update exam saving setting: ") +
          (error?.message || "Unknown error")
      );
    }
  };

  const handleToggleService = async (key: string, checked: boolean) => {
    const prevServiceVal = serviceToggles[key] ?? true;
    const prevGroupExamVal = groupExamEnabled;
    setServiceToggles((prev) => ({ ...prev, [key]: checked }));
    if (key === "group-exam") {
      setGroupExamEnabled(checked);
    }
    try {
      const batchItems = [
        {
          key: `service_${key}_enabled`,
          value: checked.toString(),
          description: `Enable or disable the ${key} service`,
        },
        ...(key === "group-exam"
          ? [
              {
                key: "group_exam_enabled",
                value: checked.toString(),
                description: "Enable or disable group exam",
              },
            ]
          : []),
      ];
      await updateSystemConfigBatch(batchItems);
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        if (key === "group-exam") {
          sessionStorage.setItem("app_group_exam_enabled", String(checked));
        }
        sessionStorage.removeItem("app_services_config");
        window.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { key: `service_${key}_enabled`, value: checked },
          })
        );
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t("servicesSettingsSaved") || "Service setting updated");
    } catch (error: any) {
      setServiceToggles((prev) => ({ ...prev, [key]: prevServiceVal }));
      if (key === "group-exam") {
        setGroupExamEnabled(prevGroupExamVal);
      }
      toast.error((t("failedToUpdateServicesSettings") || "Failed to update service: ") + error.message);
    }
  };

  const handleToggleServicesPage = async (checked: boolean) => {
    const prev = servicesPageEnabled;
    setServicesPageEnabled(checked);
    try {
      await updateSystemConfig(
        "services_page_enabled",
        checked.toString(),
        t("servicesPageToggleDesc") || "Enable or disable the entire services page"
      );
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        sessionStorage.removeItem("app_services_config");
        sessionStorage.removeItem("app_admin_nav_toggles");
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t("servicesSettingsSaved") || "Services page setting updated");
    } catch (error: any) {
      setServicesPageEnabled(prev);
      toast.error((t("failedToUpdateServicesSettings") || "Failed to update services page setting: ") + error.message);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    const loadConfigs = async () => {
      try {
        const { configs: data } = await getSystemConfig();
        if (!active) return;
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
          if (configMap["guest_free_exam_enabled"]) {
            setGuestFreeExamEnabled(String(configMap["guest_free_exam_enabled"].value).toLowerCase() !== "false");
          }
          if (configMap["guest_free_exam_limit"]) {
            const parsedGuestLimit = parseInt(configMap["guest_free_exam_limit"].value, 10);
            if (!Number.isNaN(parsedGuestLimit) && parsedGuestLimit >= 0) {
              setGuestFreeExamLimit(Math.min(100, parsedGuestLimit));
            }
          }
          if (configMap["guest_exam_reset_value"]) {
            const parsedResetVal = parseInt(configMap["guest_exam_reset_value"].value, 10);
            if (!Number.isNaN(parsedResetVal) && parsedResetVal >= 1) {
              setGuestResetValue(Math.min(365, parsedResetVal));
            }
          }
          if (configMap["guest_exam_reset_unit"]) {
            const unit = String(configMap["guest_exam_reset_unit"].value).toLowerCase();
            setGuestResetUnit(unit === "hours" ? "hours" : "days");
          }
          if (configMap["universal_passing_percentage"]) {
            setUniversalPassingPercentage(parseInt(configMap["universal_passing_percentage"].value, 10) || 60);
          }
          if (configMap["standalone_exam_enabled"]) {
            setStandaloneExamEnabled(configMap["standalone_exam_enabled"].value === "true");
          }
          if (configMap["group_exam_enabled"]) {
            setGroupExamEnabled(configMap["group_exam_enabled"].value === "true");
          }
          if (configMap["group_exam_join_window_seconds"]) {
            setGroupExamJoinWindow(parseInt(configMap["group_exam_join_window_seconds"].value, 10) || 120);
          }
          const localSavingCfg = getBrowserExamSavingConfig();
          const indivVal = configMap["save_individual_exams_enabled"]
            ? configMap["save_individual_exams_enabled"].value !== "false"
            : localSavingCfg.saveIndividualExams;
          const groupVal = configMap["save_group_exams_enabled"]
            ? configMap["save_group_exams_enabled"].value !== "false"
            : localSavingCfg.saveGroupExams;
          setSaveIndividualExamsEnabled(indivVal);
          setSaveGroupExamsEnabled(groupVal);
          saveBrowserExamSavingConfig({
            saveIndividualExams: indivVal,
            saveGroupExams: groupVal,
          });
          setScopedSecurity(parseAllScopedSecuritySettings(configMap));

          // Load learning language toggles (default to enabled if not set)
          const langToggles: Record<string, boolean> = { english: true, french: true, kinyarwanda: true };
          for (const lang of ["english", "french", "kinyarwanda"]) {
            const configKey = `learning_language_${lang}_enabled`;
            if (configMap[configKey]) {
              langToggles[lang] = configMap[configKey].value === "true";
            }
          }
          setLanguageToggles(langToggles);

          // Load interface language toggles (Kinyarwanda is primary and always enabled)
          const ifaceLangToggles: Record<string, boolean> = { english: true, french: true, kinyarwanda: true };
          for (const lang of ["english", "french"]) {
            const configKey = `interface_language_${lang}_enabled`;
            if (configMap[configKey]) {
              ifaceLangToggles[lang] = configMap[configKey].value === "true";
            }
          }
          setInterfaceLanguageToggles(ifaceLangToggles);

          if (configMap["live_exam_id_verification_required"]) {
            setLiveExamIdVerificationRequired(configMap["live_exam_id_verification_required"].value === "true");
          }
        }

        // Load services config
        const servicesConfig = await getServicesConfig();
        if (!active) return;
        setServicesPageEnabled(servicesConfig.pageEnabled);
        setServiceToggles(servicesConfig.services);
        if (servicesConfig.idVerificationRequired !== undefined) {
          setLiveExamIdVerificationRequired(servicesConfig.idVerificationRequired);
        }
      } catch (error: any) {
        if (active) {
          toast.error((t("failedToLoadSystemConfig") || "Failed to load system config: ") + error.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadConfigs();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveExamLimit = async () => {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(examLimit) || 5)));
    setExamLimit(safeLimit);
    try {
      setSaving(true);
      await updateSystemConfig(
        "universal_exam_limit",
        safeLimit.toString(),
        t("universalExamLimitDesc")
      );
      toast.success(t("universalExamLimitUpdated"));
    } catch (error: any) {
      toast.error(t("failedToUpdateExamLimit") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGuestFreeExam = async (checked: boolean) => {
    const prev = guestFreeExamEnabled;
    setGuestFreeExamEnabled(checked);
    try {
      setSavingGuestQuota(true);
      await updateSystemConfig(
        "guest_free_exam_enabled",
        checked.toString(),
        "Enable or disable free exams for unauthenticated visitors"
      );
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("luxen_guest_free_exam_updated", String(Date.now()));
        } catch {}
      }
      toast.success(
        checked
          ? "Free exams for unauthenticated users enabled"
          : "Free exams for unauthenticated users hidden"
      );
    } catch (error: any) {
      setGuestFreeExamEnabled(prev);
      toast.error((t("failedToUpdateGuestQuota") || "Failed to update free exam setting: ") + error.message);
    } finally {
      setSavingGuestQuota(false);
    }
  };

  const handleSaveGuestQuota = async () => {
    const safeLimit = Math.min(100, Math.max(0, Math.floor(Number(guestFreeExamLimit) || 0)));
    const safeResetVal = Math.min(365, Math.max(1, Math.floor(Number(guestResetValue) || 1)));
    const safeUnit: "hours" | "days" = guestResetUnit === "hours" ? "hours" : "days";
    setGuestFreeExamLimit(safeLimit);
    setGuestResetValue(safeResetVal);
    setGuestResetUnit(safeUnit);

    try {
      setSavingGuestQuota(true);
      await updateSystemConfigBatch([
        {
          key: "guest_free_exam_enabled",
          value: guestFreeExamEnabled.toString(),
          description: "Enable or disable free exams for unauthenticated visitors",
        },
        {
          key: "guest_free_exam_limit",
          value: safeLimit.toString(),
          description: "Number of free practice exams allowed for unauthenticated visitors per reset window",
        },
        {
          key: "guest_exam_reset_value",
          value: safeResetVal.toString(),
          description: "Duration value after which free guest exams reset",
        },
        {
          key: "guest_exam_reset_unit",
          value: safeUnit,
          description: "Duration unit (hours or days) for free guest exam quota reset",
        },
      ]);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("luxen_guest_free_exam_updated", String(Date.now()));
        } catch {}
      }
      toast.success(
        t("guestQuotaSaved") ||
          `Guest quota updated: ${safeLimit} free exam(s) every ${safeResetVal} ${safeUnit}.`
      );
    } catch (error: any) {
      toast.error((t("failedToUpdateGuestQuota") || "Failed to update guest exam quota: ") + error.message);
    } finally {
      setSavingGuestQuota(false);
    }
  };

  const handleSavePassingPercentage = async () => {
    const safePct = Math.min(100, Math.max(1, Math.floor(Number(universalPassingPercentage) || 60)));
    setUniversalPassingPercentage(safePct);
    try {
      setSaving(true);
      await updateSystemConfig(
        "universal_passing_percentage",
        safePct.toString(),
        "Default minimum percentage required to pass exams"
      );
      toast.success(t("passingPercentageUpdated") || "Exam passing percentage saved successfully");
    } catch (error: any) {
      toast.error((t("failedToSavePassingPercentage") || "Failed to update passing percentage: ") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveScopeKeys = async (scope: SecurityScope, settingsObj: SecuritySettings) => {
    const keys = getSecurityConfigKeysForScope(scope);
    const label = scope === "course" ? "Course Exams" : "Official Exams";
    await updateSystemConfigBatch([
      { key: keys.VIOLATION_MEASURES_ENABLED, value: settingsObj.violationMeasuresEnabled.toString(), description: `${label}: Violation measures enabled` },
      { key: keys.MAX_VIOLATIONS, value: settingsObj.maxViolations.toString(), description: `${label}: Maximum allowed violation attempts before auto-submission` },
      { key: keys.FULLSCREEN_ENABLED, value: settingsObj.fullscreenEnabled.toString(), description: `${label}: Enforce fullscreen during exams` },
      { key: keys.TAB_SWITCH_ENABLED, value: settingsObj.tabSwitchEnabled.toString(), description: `${label}: Detect tab or window switching` },
      { key: keys.COPY_PASTE_ENABLED, value: settingsObj.copyPasteEnabled.toString(), description: `${label}: Prevent copy, paste, and cut` },
      { key: keys.RIGHT_CLICK_ENABLED, value: settingsObj.rightClickEnabled.toString(), description: `${label}: Disable right-click context menu` },
      { key: keys.TEXT_SELECTION_ENABLED, value: settingsObj.textSelectionEnabled.toString(), description: `${label}: Prevent text selection` },
      { key: keys.DRAG_DROP_ENABLED, value: settingsObj.dragDropEnabled.toString(), description: `${label}: Prevent drag and drop` },
      { key: keys.AI_DETECTION_ENABLED, value: settingsObj.aiDetectionEnabled.toString(), description: `${label}: Detect AI sidebars and block AI shortcuts` },
    ]);
  };

  const handleSaveSecurity = async (scope: SecurityScope) => {
    try {
      setSavingSecurityScope(scope);
      const currentSettings = scopedSecurity[scope];
      await saveScopeKeys(scope, currentSettings);
      toast.success(
        scope === "course"
          ? (t("courseSecuritySettingsSaved") || "Courses anti-cheat settings saved")
          : (t("officialSecuritySettingsSaved") || "Official Exams anti-cheat settings saved")
      );
    } catch (error: any) {
      toast.error((t("failedToUpdateSecuritySettings") || "Failed to save security settings: ") + error.message);
    } finally {
      setSavingSecurityScope(null);
    }
  };

  const handleToggleGroupExam = async (checked: boolean) => {
    const prevGroup = groupExamEnabled;
    const prevService = serviceToggles["group-exam"] ?? true;
    setGroupExamEnabled(checked);
    setServiceToggles((prev) => ({ ...prev, "group-exam": checked }));
    try {
      await updateSystemConfigBatch([
        {
          key: "group_exam_enabled",
          value: checked.toString(),
          description: t("groupExamToggleDesc") || "Enable or disable the group exam functionality for students",
        },
        {
          key: "service_group-exam_enabled",
          value: checked.toString(),
          description: "Enable or disable the group exam service",
        },
      ]);
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        sessionStorage.setItem("app_group_exam_enabled", String(checked));
        sessionStorage.removeItem("app_services_config");
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t(checked ? "groupExamEnabled" : "groupExamDisabled") || "Group exam setting updated");
    } catch (error: any) {
      setGroupExamEnabled(prevGroup);
      setServiceToggles((prev) => ({ ...prev, "group-exam": prevService }));
      toast.error((t("failedToUpdateGroupExam") || "Failed to update group exam setting: ") + error.message);
    }
  };

  const handleSaveGroupExam = async () => {
    const safeJoinWindow = Math.min(3600, Math.max(15, Math.floor(Number(groupExamJoinWindow) || 120)));
    setGroupExamJoinWindow(safeJoinWindow);
    try {
      setSaving(true);
      await updateSystemConfigBatch([
        {
          key: "group_exam_enabled",
          value: groupExamEnabled.toString(),
          description: t("groupExamToggleDesc") || "Enable or disable the group exam functionality for students",
        },
        {
          key: "service_group-exam_enabled",
          value: groupExamEnabled.toString(),
          description: "Enable or disable the group exam service",
        },
        {
          key: "group_exam_join_window_seconds",
          value: safeJoinWindow.toString(),
          description: "Time window in seconds during which invited students can enter the group exam room",
        },
      ]);
      setServiceToggles((prev) => ({ ...prev, "group-exam": groupExamEnabled }));
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        sessionStorage.setItem("app_group_exam_enabled", String(groupExamEnabled));
        sessionStorage.removeItem("app_services_config");
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t(groupExamEnabled ? "groupExamEnabled" : "groupExamDisabled") || "Group exam settings updated");
    } catch (error: any) {
      toast.error((t("failedToUpdateGroupExam") || "Failed to update group exam setting: ") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStandaloneExam = async (checked: boolean) => {
    const prev = standaloneExamEnabled;
    setStandaloneExamEnabled(checked);
    try {
      await updateSystemConfig(
        "standalone_exam_enabled",
        checked.toString(),
        t("standaloneExamDesc") || "Enable or disable the standalone Take Exam page"
      );
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        sessionStorage.setItem("app_standalone_exam_enabled", String(checked));
        sessionStorage.removeItem("app_admin_nav_toggles");
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t(checked ? "standaloneExamEnabled" : "standaloneExamDisabled") || "Standalone exam setting updated");
    } catch (error: any) {
      setStandaloneExamEnabled(prev);
      toast.error(t("failedToUpdateStandaloneExam") + error.message);
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
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        sessionStorage.setItem("app_standalone_exam_enabled", String(standaloneExamEnabled));
        sessionStorage.removeItem("app_admin_nav_toggles");
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t(standaloneExamEnabled ? "standaloneExamEnabled" : "standaloneExamDisabled"));
    } catch (error: any) {
      toast.error(t("failedToUpdateStandaloneExam") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExamPersistence = async () => {
    try {
      setSaving(true);
      await updateExamSavingConfig({
        saveIndividualExams: saveIndividualExamsEnabled,
        saveGroupExams: saveGroupExamsEnabled,
      });
      toast.success("Exam saving and browser storage settings saved");
    } catch (error: any) {
      toast.error(
        (t("failedToUpdateExamPersistence") || "Failed to save exam saving settings: ") +
          (error?.message || "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  };

  const [prePopulatingTranslations, setPrePopulatingTranslations] = useState(false);
  const [translationWarmSummary, setTranslationWarmSummary] = useState<string | null>(null);

  const handlePrePopulateTranslations = async () => {
    try {
      setPrePopulatingTranslations(true);
      setTranslationWarmSummary(null);
      const res = await authFetch("/api/admin/pre-populate-translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languages: ["English", "French"],
          limit: 150,
          offset: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to pre-populate translations");
      }
      const newlyCached =
        Number(data?.totalNewlyCached || 0) ||
        Number(data?.primaryNewlyCached || 0) + Number(data?.externalNewlyCached || 0);
      const summary =
        newlyCached > 0
          ? `Pre-warmed ${newlyCached} translations across ${data?.totalQuestionsProcessed || 0} exam questions.`
          : `Checked ${data?.totalQuestionsProcessed || 0} exam questions — all EN/FR translations are already cached.`;
      setTranslationWarmSummary(summary);
      toast.success(summary);
    } catch (error: any) {
      toast.error(error?.message || "Failed to pre-populate exam translations");
    } finally {
      setPrePopulatingTranslations(false);
    }
  };

  const handleSaveServices = async () => {
    try {
      setSaving(true);
      const groupExamSvcEnabled = serviceToggles["group-exam"] ?? true;
      await updateSystemConfigBatch([
        {
          key: "services_page_enabled",
          value: servicesPageEnabled.toString(),
          description: t("servicesPageToggleDesc") || "Enable or disable the entire services page",
        },
        {
          key: "live_exam_id_verification_required",
          value: liveExamIdVerificationRequired.toString(),
          description: "Require National ID verification before viewing driving exam results",
        },
        {
          key: "group_exam_enabled",
          value: groupExamSvcEnabled.toString(),
          description: "Enable or disable group exam",
        },
        ...serviceDefinitions.map((svc) => ({
          key: `service_${svc.key}_enabled`,
          value: (serviceToggles[svc.key] ?? true).toString(),
          description: t(svc.descKey) || `Enable or disable the ${svc.key} service`,
        })),
      ]);
      setGroupExamEnabled(groupExamSvcEnabled);
      if (typeof window !== "undefined") {
        invalidateServicesConfigCache();
        sessionStorage.setItem("app_live_exam_id_verification_required", String(liveExamIdVerificationRequired));
        sessionStorage.setItem("app_group_exam_enabled", String(groupExamSvcEnabled));
        sessionStorage.removeItem("app_services_config");
        sessionStorage.removeItem("app_admin_nav_toggles");
        window.dispatchEvent(new CustomEvent("config-changed", { detail: { key: "live_exam_id_verification_required", value: liveExamIdVerificationRequired } }));
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t("servicesSettingsSaved") || "Services settings saved");
    } catch (error: any) {
      toast.error((t("failedToUpdateServicesSettings") || "Failed to save services settings: ") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLanguages = async () => {
    try {
      setSaving(true);
      await updateSystemConfigBatch(
        LEARNING_LANGUAGES.map((lang) => ({
          key: `learning_language_${lang.key}_enabled`,
          value: (languageToggles[lang.key] ?? true).toString(),
          description: t("learningLanguageToggleDesc") || `Enable or disable ${lang.label} as a learning language`,
        }))
      );
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("app_admin_nav_toggles");
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t("learningLanguagesSaved") || "Learning language settings saved");
    } catch (error: any) {
      toast.error((t("failedToUpdateLearningLanguages") || "Failed to save learning language settings: ") + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInterfaceLanguages = async () => {
    try {
      setSaving(true);
      await updateSystemConfigBatch(
        INTERFACE_LANGUAGES.map((lang) => ({
          key: `interface_language_${lang.key}_enabled`,
          value: lang.key === "kinyarwanda" ? "true" : (interfaceLanguageToggles[lang.key] ?? true).toString(),
          description: t("interfaceLanguageToggleDesc") || `Enable or disable ${lang.label} as an interface language`,
        }))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("system-config-updated"));
      }
      toast.success(t("interfaceLanguagesSaved") || "Interface language settings saved");
    } catch (error: any) {
      toast.error((t("failedToUpdateInterfaceLanguages") || "Failed to save interface language settings: ") + error.message);
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
      {(!filter || filter === "exam") && (
      <>
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
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

      {/* Guest / Unauthenticated Free Exams Limit & Reset Time */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("guestFreeExamsQuota") || "Guest Free Exams & Reset Window"}
          </CardTitle>
          <CardDescription>
            {t("guestFreeExamsQuotaDesc") ||
              "Control how many free practice exams unauthenticated visitors can take and how often their quota resets (in Hours or Days)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="guest-free-exam-enabled-toggle" className="text-base font-semibold cursor-pointer">
                  {t("enableGuestFreeExams") || "Enable Free Exam for Unauthenticated Users"}
                </Label>
                <Badge
                  variant={guestFreeExamEnabled ? "default" : "secondary"}
                  className={
                    guestFreeExamEnabled
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {guestFreeExamEnabled ? (t("enabled") || "Enabled") : (t("disabled") || "Hidden")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("enableGuestFreeExamsDesc") ||
                  "When disabled, unauthenticated visitors will not see any Take Exam button or free exam prompt."}
              </p>
            </div>
            <Switch
              id="guest-free-exam-enabled-toggle"
              checked={guestFreeExamEnabled}
              onCheckedChange={handleToggleGuestFreeExam}
              disabled={savingGuestQuota}
            />
          </div>

          <div className={`grid gap-5 sm:grid-cols-2 ${!guestFreeExamEnabled ? "opacity-55" : ""}`}>
            <div className="space-y-2">
              <Label htmlFor="guest-free-exam-limit">
                {t("guestFreeExamsCount") || "Number of Free Exams Allowed"}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="guest-free-exam-limit"
                  type="number"
                  min={0}
                  max={100}
                  value={guestFreeExamLimit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setGuestFreeExamLimit(Number.isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                  }}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  {guestFreeExamLimit === 1
                    ? t("examSingular") || "free exam"
                    : t("examsPlural") || "free exams"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("guestFreeExamsHint") ||
                  "Set to 0 to require sign-in before starting any practice exam."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-reset-value">
                {t("guestResetInterval") || "Reset Time (Hours or Days)"}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="guest-reset-value"
                  type="number"
                  min={1}
                  max={365}
                  value={guestResetValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setGuestResetValue(Number.isNaN(val) ? 1 : Math.min(365, Math.max(1, val)));
                  }}
                  className="w-24"
                />
                <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setGuestResetUnit("hours")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      guestResetUnit === "hours"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("hours") || "Hours"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestResetUnit("days")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      guestResetUnit === "days"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("days") || "Days"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { label: "6 Hours", value: 6, unit: "hours" as const },
                  { label: "12 Hours", value: 12, unit: "hours" as const },
                  { label: "1 Day", value: 1, unit: "days" as const },
                  { label: "3 Days", value: 3, unit: "days" as const },
                  { label: "7 Days", value: 7, unit: "days" as const },
                ].map((preset) => {
                  const active =
                    guestResetValue === preset.value && guestResetUnit === preset.unit;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setGuestResetValue(preset.value);
                        setGuestResetUnit(preset.unit);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        active
                          ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                          : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 text-xs text-muted-foreground">
            {guestFreeExamLimit === 0
              ? "Active policy preview: Unauthenticated visitors must sign up or log in before taking any exam."
              : `Active policy preview: Visitors can take ${guestFreeExamLimit} free exam${guestFreeExamLimit === 1 ? "" : "s"} every ${guestResetValue} ${guestResetUnit === "hours" ? (guestResetValue === 1 ? "hour" : "hours") : guestResetValue === 1 ? "day" : "days"}.`}
          </div>

          <Button
            onClick={handleSaveGuestQuota}
            disabled={savingGuestQuota}
            className="w-full sm:w-auto"
          >
            {savingGuestQuota ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("saveGuestQuota") || "Save Guest Exam Quota"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Universal Passing Percentage */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("examPassingPercentage") || "Exam Passing Percentage"}
          </CardTitle>
          <CardDescription>
            {t("examPassingPercentageDesc") || "Set the default percentage required for candidates to pass exams"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passing-percentage-config">{t("passingPercentage") || "Passing Percentage (%)"}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="passing-percentage-config"
                type="number"
                min={1}
                max={100}
                value={universalPassingPercentage}
                onChange={(e) => setUniversalPassingPercentage(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 60)))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground font-semibold">
                % ({universalPassingPercentage >= 50 ? "Pass" : "Warning"})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("passingPercentageAppliedDesc") || "This percentage is used across regular and group exams to determine pass or fail status."}
            </p>
          </div>

          <Button
            onClick={handleSavePassingPercentage}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("savePassingPercentage") || "Save Passing Percentage"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Separate Anti-Cheat Configurations: Courses & Official Exams */}
      <ScopedAntiCheatCard
        scope="course"
        title={t("courseExamsAntiCheat") || "Courses Anti-Cheat Settings"}
        badgeLabel={t("courses") || "Courses"}
        description={
          t("courseExamsAntiCheatDesc") ||
          "Independent anti-cheat configuration applied exclusively to Courses (Module, Midterm, and Final exams)."
        }
        icon={<BookOpen className="h-5 w-5 text-primary" />}
        settings={scopedSecurity.course}
        onChange={(updater) =>
          setScopedSecurity((prev) => ({ ...prev, course: updater(prev.course) }))
        }
        onSave={() => handleSaveSecurity("course")}
        saving={savingSecurityScope === "course"}
        saveLabel={t("saveCourseSecuritySettings") || "Save Courses Anti-Cheat"}
        t={t}
      />

      <ScopedAntiCheatCard
        scope="official"
        title={t("officialExamsAntiCheat") || "Official Exams Anti-Cheat Settings"}
        badgeLabel={t("officialExams") || "Official Exams"}
        description={
          t("officialExamsAntiCheatDesc") ||
          "Independent anti-cheat configuration applied exclusively to Official Exams (Standalone Mock, Group Challenge, and Guest Practice exams)."
        }
        icon={<ShieldCheck className="h-5 w-5 text-primary" />}
        settings={scopedSecurity.official}
        onChange={(updater) =>
          setScopedSecurity((prev) => ({ ...prev, official: updater(prev.official) }))
        }
        onSave={() => handleSaveSecurity("official")}
        saving={savingSecurityScope === "official"}
        saveLabel={t("saveOfficialSecuritySettings") || "Save Official Exams Anti-Cheat"}
        t={t}
      />

      {/* Standalone Exam Toggle */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
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
              onCheckedChange={handleToggleStandaloneExam}
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

      {/* Group Exam Toggle */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("groupExam") || "Group Exam"}
          </CardTitle>
          <CardDescription>
            {t("groupExamToggleDesc") || "Enable or disable the group exam functionality for students"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="group-exam-toggle" className="text-base">
                {t("groupExam") || "Group Exam"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("groupExamHint") || "When enabled, students can create group exams and invite friends to compete. When disabled, all group exam content is hidden."}
              </p>
            </div>
            <Switch
              id="group-exam-toggle"
              checked={groupExamEnabled}
              onCheckedChange={handleToggleGroupExam}
            />
          </div>

          {/* Join Window Configuration */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="join-window" className="text-sm font-semibold">
              {t("groupExamJoinWindow") || "Participant Join Window Limit"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("groupExamJoinWindowDesc") || "The time window during which invited students can enter the exam room lobby or accept invitations."}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { label: "30s", value: 30 },
                { label: "1 min", value: 60 },
                { label: "2 min", value: 120 },
                { label: "5 min", value: 300 },
                { label: "10 min", value: 600 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGroupExamJoinWindow(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    groupExamJoinWindow === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 hover:bg-muted text-foreground border-border"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <Input
                  id="join-window"
                  type="number"
                  min={15}
                  max={3600}
                  value={groupExamJoinWindow}
                  onChange={(e) => setGroupExamJoinWindow(Math.max(15, parseInt(e.target.value, 10) || 15))}
                  className="w-24 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">{t("seconds") || "sec"}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveGroupExam}
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

      {/* Exam Saving & History Persistence Settings */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {t("examSavingPersistence") || "Exam Saving & History Persistence"}
          </CardTitle>
          <CardDescription>
            Decide whether completed individual exams and group exams are saved in the user&apos;s browser storage and Exam History (never written to the database).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Individual Exams Saving Toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-primary" />
                <Label htmlFor="save-individual-exams-toggle" className="text-base font-semibold cursor-pointer">
                  {t("saveIndividualExams") || "Save Individual Exams"}
                </Label>
                <Badge variant={saveIndividualExamsEnabled ? "default" : "secondary"} className={saveIndividualExamsEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                  {saveIndividualExamsEnabled ? (t("savingActive") || "Saving Active") : (t("savingDisabled") || "Practice Only (Not Saved)")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When enabled, individual exam attempts, answers, correct answers, duration, and scores are saved in the user&apos;s browser storage and shown in Exam History. When disabled, exams run in practice mode and are not saved.
              </p>
            </div>
            <Switch
              id="save-individual-exams-toggle"
              checked={saveIndividualExamsEnabled}
              onCheckedChange={handleToggleSaveIndividualExams}
            />
          </div>

          {/* Group Exams Saving Toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-4 w-4 text-primary" />
                <Label htmlFor="save-group-exams-toggle" className="text-base font-semibold cursor-pointer">
                  {t("saveGroupExams") || "Save Group Exams & Battle History"}
                </Label>
                <Badge variant={saveGroupExamsEnabled ? "default" : "secondary"} className={saveGroupExamsEnabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                  {saveGroupExamsEnabled ? (t("savingActive") || "Saving Active") : (t("savingDisabled") || "Practice Only (Not Saved)")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When enabled, completed group exam attempts and review answers are stored in the user&apos;s browser storage and Exam History. When disabled, group exam results are temporary.
              </p>
            </div>
            <Switch
              id="save-group-exams-toggle"
              checked={saveGroupExamsEnabled}
              onCheckedChange={handleToggleSaveGroupExams}
            />
          </div>

          <Button
            type="button"
            onClick={handleSaveExamPersistence}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("savePersistenceSettings") || "Save Persistence Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Exam Translation Cache Warming */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Exam Translation Cache Warming
          </CardTitle>
          <CardDescription>
            Pre-populate English and French translations for published &amp; Rwanda PVS questions so students open translated exams instantly without waiting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {translationWarmSummary && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {translationWarmSummary}
            </div>
          )}
          <Button
            type="button"
            onClick={handlePrePopulateTranslations}
            disabled={prePopulatingTranslations}
            className="w-full sm:w-auto"
          >
            {prePopulatingTranslations ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Warming Translations...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Pre-Populate Exam Translations (EN / FR)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      </>
      )}

      {/* Services Settings */}
      {(!filter || filter === "services") && (
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary" />
            {t("servicesSettings") || "Services Settings"}
          </CardTitle>
          <CardDescription>
            {t("servicesSettingsDesc") || "Enable or disable the services page and individual services for students"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Master toggle for entire services page */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="space-y-0.5 pr-3">
              <Label htmlFor="services-page-toggle" className="text-sm font-medium">
                {t("servicesPageToggle") || "Services Page"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("servicesPageToggleDesc") || "When disabled, the entire services page is hidden from students."}
              </p>
            </div>
            <Switch
              id="services-page-toggle"
              checked={servicesPageEnabled}
              onCheckedChange={handleToggleServicesPage}
            />
          </div>

          {/* Individual service toggles */}
          <div className={`space-y-3 ${!servicesPageEnabled ? "opacity-50 pointer-events-none" : ""}`}>
            <Label className="text-sm font-medium text-muted-foreground">
              {t("individualServices") || "Individual Services"}
            </Label>
            {serviceDefinitions.map((svc) => {
              const isEnabled = serviceToggles[svc.key] ?? true;
              return (
                <div key={svc.key} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/40 transition-colors">
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label htmlFor={`service-${svc.key}-toggle`} className="text-sm font-semibold cursor-pointer">
                        {t(svc.labelKey) || (svc as any).titleFallback}
                      </Label>
                      <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className={`text-[10px] px-2 py-0 font-medium ${
                          isEnabled
                            ? "bg-emerald-600/90 hover:bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isEnabled ? (t("active") || "Active") : (t("hidden") || "Hidden from students")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {t(svc.descKey) || (svc as any).descFallback}
                    </p>
                  </div>
                  <Switch
                    id={`service-${svc.key}-toggle`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleService(svc.key, checked)}
                    disabled={!servicesPageEnabled}
                  />
                </div>
              );
            })}

            {/* National ID Verification toggle for Driving Exam Results */}
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <Label htmlFor="live-exam-id-verification-toggle" className="text-sm font-semibold cursor-pointer">
                      {t("liveExamIdVerificationRequired") || "Require ID Verification for Exam Results"}
                    </Label>
                    <Badge variant={liveExamIdVerificationRequired ? "default" : "secondary"} className={`text-[10px] py-0 px-2 ${liveExamIdVerificationRequired ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""}`}>
                      {liveExamIdVerificationRequired ? (t("required") || "Required") : (t("optional") || "Optional")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("liveExamIdVerificationRequiredDesc") ||
                      "When enabled, candidates must verify their 16-digit Rwandan National ID with their Names & Date of Birth before accessing driving exam results. When disabled, candidates can look up results freely."}
                  </p>
                </div>
                <Switch
                  id="live-exam-id-verification-toggle"
                  checked={liveExamIdVerificationRequired}
                  onCheckedChange={handleToggleLiveExamIdVerification}
                  disabled={!servicesPageEnabled || serviceToggles["live-exam"] === false}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveServices}
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
      )}

      {/* Learning Language Toggles */}
      {(!filter || filter === "languages") && (
      <>
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("learningLanguages") || "Learning Languages"}
          </CardTitle>
          <CardDescription>
            {t("learningLanguagesDesc") || "Enable or disable languages that students can choose for learning"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {LEARNING_LANGUAGES.map((lang) => (
              <div key={lang.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5 pr-3">
                  <Label htmlFor={`lang-${lang.key}-toggle`} className="text-sm font-medium">
                    {lang.nativeLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("learningLanguageToggleDesc") || `Allow students to use ${lang.label} as their learning language`}
                  </p>
                </div>
                <Switch
                  id={`lang-${lang.key}-toggle`}
                  checked={languageToggles[lang.key] ?? true}
                  onCheckedChange={(checked) =>
                    setLanguageToggles((prev) => ({ ...prev, [lang.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveLanguages}
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

      {/* Text-to-Speech (TTS) banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Text-to-Speech (TTS) Voice & Custom Audio
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle Gemini Neural AI voice per language (Kinyarwanda, English, French) or import recorded native audio files.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            const ttsTabBtn = document.querySelector<HTMLButtonElement>('[data-tab="tts"]');
            if (ttsTabBtn) {
              ttsTabBtn.click();
            } else {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "tts");
              window.history.pushState({}, "", url.toString());
              window.location.reload();
            }
          }}
          className="rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/15 shrink-0"
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Configure TTS
        </Button>
      </div>

      {/* Interface Language Toggles */}
      <Card className="border border-border rounded-[24px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("interfaceLanguages") || "Interface Languages"}
          </CardTitle>
          <CardDescription>
            {t("interfaceLanguagesDesc") || "Enable or disable languages that users can select for the app interface. Disable a language if its translations are not ready or need updating."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {INTERFACE_LANGUAGES.map((lang) => {
              const isPrimary = lang.key === "kinyarwanda";
              const isLastEnabled =
                isPrimary ||
                (Object.entries(interfaceLanguageToggles).filter(([k, v]) => v && k !== lang.key).length === 0 &&
                  interfaceLanguageToggles[lang.key]);
              return (
                <div key={lang.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-0.5 pr-3">
                    <Label htmlFor={`iface-lang-${lang.key}-toggle`} className="text-sm font-medium">
                      {lang.nativeLabel}
                      {isPrimary ? " (Primary)" : ""}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isPrimary
                        ? "Primary landing language for new users (always enabled)."
                        : t("interfaceLanguageToggleDesc") || `Allow users to use ${lang.label} as the app interface language`}
                    </p>
                  </div>
                  <Switch
                    id={`iface-lang-${lang.key}-toggle`}
                    checked={isPrimary ? true : (interfaceLanguageToggles[lang.key] ?? true)}
                    disabled={isLastEnabled}
                    onCheckedChange={(checked) => {
                      if (isPrimary) return;
                      setInterfaceLanguageToggles((prev) => ({ ...prev, [lang.key]: checked }));
                    }}
                  />
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleSaveInterfaceLanguages}
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
      </>
      )}
    </div>
  );
}
