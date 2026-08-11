"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fetch the production-mode flag as a public, unauthenticated value.
 * Uses the admin client so it is not blocked by `system_config` RLS
 * when anonymous visitors hit the landing page.
 */
export async function isProductionModeEnabled(): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "production_mode_enabled")
    .single();

  if (error || !data) {
    return false;
  }

  return data.value === "true";
}
