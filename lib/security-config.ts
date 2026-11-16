"use client";

import { createClient } from "@/lib/supabase/client";
import type { SystemConfig } from "@/lib/database.types";

export type SecurityScope = "course" | "official";

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

export interface SecurityConfigKeysMap {
  VIOLATION_MEASURES_ENABLED: string;
  MAX_VIOLATIONS: string;
  FULLSCREEN_ENABLED: string;
  TAB_SWITCH_ENABLED: string;
  COPY_PASTE_ENABLED: string;
  RIGHT_CLICK_ENABLED: string;
  TEXT_SELECTION_ENABLED: string;
  DRAG_DROP_ENABLED: string;
  AI_DETECTION_ENABLED: string;
}

export function getSecurityConfigKeysForScope(scope: SecurityScope): SecurityConfigKeysMap {
  const prefix = scope === "course" ? "course_" : "official_";
  return {
    VIOLATION_MEASURES_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.VIOLATION_MEASURES_ENABLED}`,
    MAX_VIOLATIONS: `${prefix}${SECURITY_CONFIG_KEYS.MAX_VIOLATIONS}`,
    FULLSCREEN_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.FULLSCREEN_ENABLED}`,
    TAB_SWITCH_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.TAB_SWITCH_ENABLED}`,
    COPY_PASTE_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.COPY_PASTE_ENABLED}`,
    RIGHT_CLICK_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.RIGHT_CLICK_ENABLED}`,
    TEXT_SELECTION_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.TEXT_SELECTION_ENABLED}`,
    DRAG_DROP_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.DRAG_DROP_ENABLED}`,
    AI_DETECTION_ENABLED: `${prefix}${SECURITY_CONFIG_KEYS.AI_DETECTION_ENABLED}`,
  };
}

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

function buildMap(configs: SystemConfig[] | Record<string, SystemConfig>): Record<string, string> {
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
  return map;
}

export function parseSecuritySettings(
  configs: SystemConfig[] | Record<string, SystemConfig>,
  scope: SecurityScope
): SecuritySettings {
  const map = buildMap(configs);

  // Legacy unprefixed keys act only as initial fallback if a scoped key has not been configured yet
  const fallback: SecuritySettings = {
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

  const scopedKeys = getSecurityConfigKeysForScope(scope);
  return {
    violationMeasuresEnabled: parseBool(map[scopedKeys.VIOLATION_MEASURES_ENABLED], fallback.violationMeasuresEnabled),
    maxViolations: parseNumber(map[scopedKeys.MAX_VIOLATIONS], fallback.maxViolations),
    fullscreenEnabled: parseBool(map[scopedKeys.FULLSCREEN_ENABLED], fallback.fullscreenEnabled),
    tabSwitchEnabled: parseBool(map[scopedKeys.TAB_SWITCH_ENABLED], fallback.tabSwitchEnabled),
    copyPasteEnabled: parseBool(map[scopedKeys.COPY_PASTE_ENABLED], fallback.copyPasteEnabled),
    rightClickEnabled: parseBool(map[scopedKeys.RIGHT_CLICK_ENABLED], fallback.rightClickEnabled),
    textSelectionEnabled: parseBool(map[scopedKeys.TEXT_SELECTION_ENABLED], fallback.textSelectionEnabled),
    dragDropEnabled: parseBool(map[scopedKeys.DRAG_DROP_ENABLED], fallback.dragDropEnabled),
    aiDetectionEnabled: parseBool(map[scopedKeys.AI_DETECTION_ENABLED], fallback.aiDetectionEnabled),
  };
}

export function parseAllScopedSecuritySettings(
  configs: SystemConfig[] | Record<string, SystemConfig>
): Record<SecurityScope, SecuritySettings> {
  return {
    course: parseSecuritySettings(configs, "course"),
    official: parseSecuritySettings(configs, "official"),
  };
}

export function hasCustomScopeSettings(
  configs: SystemConfig[] | Record<string, SystemConfig>,
  scope: SecurityScope
): boolean {
  const map = buildMap(configs);
  const scopedKeys = getSecurityConfigKeysForScope(scope);
  return Object.values(scopedKeys).some((k) => map[k] !== undefined);
}

const securitySettingsCache: Partial<Record<SecurityScope, { value: SecuritySettings; expiresAt: number }>> = {};
const securityInFlight: Partial<Record<SecurityScope, Promise<SecuritySettings>>> = {};

if (typeof window !== "undefined") {
  const clearSecCache = () => {
    delete securitySettingsCache.course;
    delete securitySettingsCache.official;
  };
  window.addEventListener("config-changed", clearSecCache);
  window.addEventListener("system-config-updated", clearSecCache);
}

export async function getSecuritySettings(scope: SecurityScope): Promise<SecuritySettings> {
  const cached = securitySettingsCache[scope];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const running = securityInFlight[scope];
  if (running) return running;

  const promise = (async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          const res = await fetch("/api/system-config", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.configs)) {
              const parsed = parseSecuritySettings(json.configs, scope);
              securitySettingsCache[scope] = { value: parsed, expiresAt: Date.now() + 30_000 };
              return parsed;
            }
          }
        } catch {}
      }

      const supabase = createClient();
      const keys = Array.from(
        new Set([
          ...Object.values(SECURITY_CONFIG_KEYS),
          ...Object.values(getSecurityConfigKeysForScope(scope)),
        ])
      );

      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .in("key", keys);

      if (error) {
        console.error("Failed to load security settings:", error);
        return DEFAULT_SECURITY_SETTINGS;
      }

      const parsed = parseSecuritySettings(data || [], scope);
      securitySettingsCache[scope] = { value: parsed, expiresAt: Date.now() + 30_000 };
      return parsed;
    } finally {
      delete securityInFlight[scope];
    }
  })();

  securityInFlight[scope] = promise;
  return promise;
}
