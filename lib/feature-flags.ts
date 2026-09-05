"use client";

import { createClient } from "@/lib/supabase/client";

// In-memory cache to prevent layout flickering (flitching) on client-side navigations
let cachedGroupExam: boolean | null = null;
let cachedStandaloneExam: boolean | null = null;
let cachedServicesConfig: { pageEnabled: boolean; services: Record<string, boolean> } | null = null;

// Read from session storage if available
if (typeof window !== "undefined") {
  try {
    const sGroup = sessionStorage.getItem("app_group_exam_enabled");
    if (sGroup !== null) cachedGroupExam = sGroup === "true";
    const sExam = sessionStorage.getItem("app_standalone_exam_enabled");
    if (sExam !== null) cachedStandaloneExam = sExam === "true";
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
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "group_exam_enabled")
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch group_exam_enabled:", error);
      return cachedGroupExam !== null ? cachedGroupExam : true;
    }

    const isEnabled = data ? data.value === "true" : true;
    cachedGroupExam = isEnabled;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("app_group_exam_enabled", String(isEnabled));
      } catch {}
    }
    return isEnabled;
  } catch {
    return cachedGroupExam !== null ? cachedGroupExam : true;
  }
}

/**
 * Fetch whether standalone exam is enabled.
 */
export async function isStandaloneExamEnabled(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "standalone_exam_enabled")
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch standalone_exam_enabled:", error);
      return cachedStandaloneExam !== null ? cachedStandaloneExam : true;
    }

    const isEnabled = data ? data.value === "true" : true;
    cachedStandaloneExam = isEnabled;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("app_standalone_exam_enabled", String(isEnabled));
      } catch {}
    }
    return isEnabled;
  } catch {
    return cachedStandaloneExam !== null ? cachedStandaloneExam : true;
  }
}

/**
 * Fetch and cache services configuration
 */
export async function getCachedServicesConfig(): Promise<{
  pageEnabled: boolean;
  services: Record<string, boolean>;
}> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_config")
      .select("key, value");

    if (error || !data) {
      return cachedServicesConfig || { pageEnabled: true, services: {} };
    }

    let pageEnabled = true;
    const services: Record<string, boolean> = {};

    for (const row of data) {
      if (row.key === "services_page_enabled") {
        pageEnabled = row.value === "true";
      } else {
        const match = row.key.match(/^service_(.+)_enabled$/);
        if (match) {
          services[match[1]] = row.value === "true";
        }
      }
    }

    const result = { pageEnabled, services };
    cachedServicesConfig = result;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("app_services_config", JSON.stringify(result));
      } catch {}
    }
    return result;
  } catch {
    return cachedServicesConfig || { pageEnabled: true, services: {} };
  }
}

