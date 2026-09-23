"use client";

import { createClient } from "@/lib/supabase/client";
import type { SystemConfig } from "@/lib/database.types";

export const SECURITY_CONFIG_KEYS = {
  VIOLATION_MEASURES_ENABLED: "violation_measures_enabled",
  MAX_VIOLATIONS: "security_max_violations",
  FULLSCREEN_ENABLED: "security_fullscreen_enabled",
  TAB_SWITCH_ENABLED: "security_tab_switch_enabled",
  COPY_PASTE_ENABLED: "security_copy_paste_enabled",
  RIGHT_CLICK_ENABLED: "security_right_click_enabled",
  TEXT_SELECTION_ENABLED: "security_text_selection_enabled",
  DRAG_DROP_ENABLED: "security_drag_drop_enabled",
  AI_DETECTION_ENABLED: "security_ai_detection_enabled",
} as const;

export interface SecuritySettings {
  violationMeasuresEnabled: boolean;
  maxViolations: number;
  fullscreenEnabled: boolean;
  tabSwitchEnabled: boolean;
  copyPasteEnabled: boolean;
  rightClickEnabled: boolean;
  textSelectionEnabled: boolean;
  dragDropEnabled: boolean;
  aiDetectionEnabled: boolean;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  violationMeasuresEnabled: true,
  maxViolations: 3,
  fullscreenEnabled: true,
  tabSwitchEnabled: true,
  copyPasteEnabled: true,
  rightClickEnabled: true,
  textSelectionEnabled: true,
  dragDropEnabled: true,
  aiDetectionEnabled: true,
};

function parseBool(value: string | null | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  return value === "true";
}

function parseNumber(value: string | null | undefined, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function parseSecuritySettings(configs: SystemConfig[] | Record<string, SystemConfig>): SecuritySettings {
  const map: Record<string, string> = {};

  if (Array.isArray(configs)) {
    configs.forEach((c) => {
      map[c.key] = c.value;
    });
  } else {
    Object.values(configs).forEach((c) => {
      map[c.key] = c.value;
    });
  }

  return {
    violationMeasuresEnabled: parseBool(map[SECURITY_CONFIG_KEYS.VIOLATION_MEASURES_ENABLED], DEFAULT_SECURITY_SETTINGS.violationMeasuresEnabled),
    maxViolations: parseNumber(map[SECURITY_CONFIG_KEYS.MAX_VIOLATIONS], DEFAULT_SECURITY_SETTINGS.maxViolations),
    fullscreenEnabled: parseBool(map[SECURITY_CONFIG_KEYS.FULLSCREEN_ENABLED], DEFAULT_SECURITY_SETTINGS.fullscreenEnabled),
    tabSwitchEnabled: parseBool(map[SECURITY_CONFIG_KEYS.TAB_SWITCH_ENABLED], DEFAULT_SECURITY_SETTINGS.tabSwitchEnabled),
    copyPasteEnabled: parseBool(map[SECURITY_CONFIG_KEYS.COPY_PASTE_ENABLED], DEFAULT_SECURITY_SETTINGS.copyPasteEnabled),
    rightClickEnabled: parseBool(map[SECURITY_CONFIG_KEYS.RIGHT_CLICK_ENABLED], DEFAULT_SECURITY_SETTINGS.rightClickEnabled),
    textSelectionEnabled: parseBool(map[SECURITY_CONFIG_KEYS.TEXT_SELECTION_ENABLED], DEFAULT_SECURITY_SETTINGS.textSelectionEnabled),
    dragDropEnabled: parseBool(map[SECURITY_CONFIG_KEYS.DRAG_DROP_ENABLED], DEFAULT_SECURITY_SETTINGS.dragDropEnabled),
    aiDetectionEnabled: parseBool(map[SECURITY_CONFIG_KEYS.AI_DETECTION_ENABLED], DEFAULT_SECURITY_SETTINGS.aiDetectionEnabled),
  };
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("*")
    .in(
      "key",
      Object.values(SECURITY_CONFIG_KEYS)
    );

  if (error) {
    console.error("Failed to load security settings:", error);
    return DEFAULT_SECURITY_SETTINGS;
  }

  return parseSecuritySettings(data || []);
}
