"use client";

import { createClient } from "@/lib/supabase/client";

// In-memory cache to prevent layout flickering (flitching) on client-side navigations
let cachedGroupExam: boolean | null = null;
let cachedStandaloneExam: boolean | null = null;
let cachedLiveExamIdVerification: boolean | null = null;
let cachedServicesConfig: { pageEnabled: boolean; services: Record<string, boolean>; idVerificationRequired?: boolean } | null = null;
let cachedConfigRows: Array<{ key: string; value: string }> | null = null;
let cachedConfigRowsAt = 0;
let inFlightConfigPromise: Promise<Array<{ key: string; value: string }> | null> | null = null;
const CLIENT_CONFIG_TTL_MS = 30_000;

async function fetchAllConfigRowsDeduplicated(): Promise<Array<{ key: string; value: string }> | null> {
  if (cachedConfigRows && Date.now() - cachedConfigRowsAt < CLIENT_CONFIG_TTL_MS) {
    return cachedConfigRows;
  }
  if (inFlightConfigPromise) {
    return inFlightConfigPromise;
  }

  inFlightConfigPromise = (async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          const res = await fetch("/api/system-config", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.configs)) {
              cachedConfigRows = json.configs;
              cachedConfigRowsAt = Date.now();
              return json.configs;
            }
          }
        } catch {}
      }

      const supabase = createClient();
      const { data, error } = await supabase.from("system_config").select("key, value");
      if (!error && Array.isArray(data)) {
        cachedConfigRows = data;
        cachedConfigRowsAt = Date.now();
        return data;
      }
      return cachedConfigRows;
    } finally {
      inFlightConfigPromise = null;
    }
  })();

  return inFlightConfigPromise;
}

// Read from session storage if available
if (typeof window !== "undefined") {
  try {
    const sGroup = sessionStorage.getItem("app_group_exam_enabled");
    if (sGroup !== null) cachedGroupExam = sGroup === "true";
    const sExam = sessionStorage.getItem("app_standalone_exam_enabled");
    if (sExam !== null) cachedStandaloneExam = sExam === "true";
    const sVerify = sessionStorage.getItem("app_live_exam_id_verification_required");
    if (sVerify !== null) cachedLiveExamIdVerification = sVerify === "true";
    const sServices = sessionStorage.getItem("app_services_config");
    if (sServices) cachedServicesConfig = JSON.parse(sServices);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get synchronously cached group exam status or default
 */
export function getCachedGroupExamEnabled(): boolean | null {
  return cachedGroupExam;
}

/**
 * Fetch whether group exam functionality is enabled.
 * Defaults to true if the config key doesn't exist.
 */
export async function isGroupExamEnabled(): Promise<boolean> {
  try {
    const rows = await fetchAllConfigRowsDeduplicated();
    if (rows) {
      const entry = rows.find((r) => r.key === "group_exam_enabled");
      const isEnabled = entry ? String(entry.value).toLowerCase() !== "false" : true;
      cachedGroupExam = isEnabled;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("app_group_exam_enabled", String(isEnabled));
        } catch {}
      }
      return isEnabled;
    }
    return cachedGroupExam !== null ? cachedGroupExam : true;
  } catch {
    return cachedGroupExam !== null ? cachedGroupExam : true;
  }
}

/**
 * Fetch whether standalone exam is enabled.
 */
export async function isStandaloneExamEnabled(): Promise<boolean> {
  try {
    const rows = await fetchAllConfigRowsDeduplicated();
    if (rows) {
      const entry = rows.find((r) => r.key === "standalone_exam_enabled");
      const isEnabled = entry ? String(entry.value).toLowerCase() !== "false" : true;
      cachedStandaloneExam = isEnabled;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("app_standalone_exam_enabled", String(isEnabled));
        } catch {}
      }
      return isEnabled;
    }
    return cachedStandaloneExam !== null ? cachedStandaloneExam : true;
  } catch {
    return cachedStandaloneExam !== null ? cachedStandaloneExam : true;
  }
}

/**
 * Fetch whether National ID verification is required before viewing Driving Exam results.
 * Defaults to true if not set.
 */
export async function isLiveExamIdVerificationRequired(): Promise<boolean> {
  try {
    const rows = await fetchAllConfigRowsDeduplicated();
    if (rows) {
      const entry = rows.find((r) => r.key === "live_exam_id_verification_required");
      const isRequired = entry ? String(entry.value).toLowerCase() !== "false" : true;
      cachedLiveExamIdVerification = isRequired;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("app_live_exam_id_verification_required", String(isRequired));
        } catch {}
      }
      return isRequired;
    }
    return cachedLiveExamIdVerification !== null ? cachedLiveExamIdVerification : true;
  } catch {
    return cachedLiveExamIdVerification !== null ? cachedLiveExamIdVerification : true;
  }
}

/**
 * Get synchronously cached standalone exam status or default
 */
export function getCachedStandaloneExamEnabled(): boolean | null {
  return cachedStandaloneExam;
}

/**
 * Get synchronously cached services config or default
 */
export function getSyncServicesConfig(): {
  pageEnabled: boolean;
  services: Record<string, boolean>;
  idVerificationRequired?: boolean;
} | null {
  return cachedServicesConfig;
}

/**
 * Fetch and cache services configuration
 */
export async function getCachedServicesConfig(): Promise<{
  pageEnabled: boolean;
  services: Record<string, boolean>;
  idVerificationRequired: boolean;
}> {
  try {
    const rows = await fetchAllConfigRowsDeduplicated();

    if (!rows) {
      return (
        (cachedServicesConfig as any) || {
          pageEnabled: true,
          services: {
            "live-exam": true,
            "group-exam": true,
            "traffic-assistant": true,
          },
          idVerificationRequired: true,
        }
      );
    }

    let pageEnabled = true;
    let idVerificationRequired = true;
    const services: Record<string, boolean> = {
      "live-exam": true,
      "group-exam": true,
      "traffic-assistant": true,
    };

    for (const row of rows) {
      if (row.key === "services_page_enabled") {
        pageEnabled = String(row.value).toLowerCase() !== "false";
      } else if (row.key === "live_exam_id_verification_required") {
        idVerificationRequired = String(row.value).toLowerCase() !== "false";
      } else {
        const match = row.key.match(/^service_(.+)_enabled$/);
        if (match) {
          services[match[1]] = String(row.value).toLowerCase() !== "false";
        }
      }
    }

    const result = { pageEnabled, services, idVerificationRequired };
    cachedServicesConfig = result;
    cachedLiveExamIdVerification = idVerificationRequired;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("app_services_config", JSON.stringify(result));
        sessionStorage.setItem("app_live_exam_id_verification_required", String(idVerificationRequired));
      } catch {}
    }
    return result;
  } catch {
    return (
      (cachedServicesConfig as any) || {
        pageEnabled: true,
        services: {
          "live-exam": true,
          "group-exam": true,
          "traffic-assistant": true,
        },
        idVerificationRequired: true,
      }
    );
  }
}

/**
 * Invalidate in-memory and sessionStorage cached services config
 */
export function invalidateServicesConfigCache(): void {
  cachedServicesConfig = null;
  cachedConfigRows = null;
  cachedConfigRowsAt = 0;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("app_services_config");
    } catch {}
  }
}

// Invalidate in-memory caches on real-time configuration changes
if (typeof window !== "undefined") {
  window.addEventListener("config-changed", () => {
    cachedServicesConfig = null;
    cachedGroupExam = null;
    cachedStandaloneExam = null;
    cachedConfigRows = null;
    cachedConfigRowsAt = 0;
  });
  window.addEventListener("system-config-updated", () => {
    cachedServicesConfig = null;
    cachedGroupExam = null;
    cachedStandaloneExam = null;
    cachedConfigRows = null;
    cachedConfigRowsAt = 0;
  });
}

