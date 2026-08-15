"use client";

import { createClient } from "@/lib/supabase/client";

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
      return true;
    }

    if (!data) return true;
    return data.value === "true";
  } catch {
    return true;
  }
}
