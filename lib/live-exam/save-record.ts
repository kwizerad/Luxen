import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Saves a National ID to the database. One canonical row per National ID:
 * whichever account (or anonymous visitor) first checks an ID keeps
 * ownership — later checks by other accounts never reassign it or create a
 * duplicate row. Uses the admin client so this also works for anonymous
 * (not logged in) visitors, who can't write to this table under normal RLS.
 * Silently fails — this is a side-effect, not critical to the main response.
 */
export async function saveNationalIdRecord(
  nationalId: string,
  userId?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("national_id_records")
      .select("id")
      .eq("national_id", nationalId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("national_id_records")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      return;
    }

    await supabase.from("national_id_records").insert({
      national_id: nationalId,
      user_id: userId || null,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // silently fail — saving is a side-effect
  }
}
