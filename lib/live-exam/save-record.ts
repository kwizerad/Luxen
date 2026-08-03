import { createClient } from "@/lib/supabase/server";

/**
 * Saves a National ID to the database, linked to the user who searched it.
 * Upserts by (national_id, user_id) so one user can search multiple IDs.
 * Silently fails — this is a side-effect, not critical to the main response.
 */
export async function saveNationalIdRecord(
  nationalId: string,
  userId?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase
      .from("national_id_records")
      .upsert(
        {
          national_id: nationalId,
          user_id: userId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "national_id,user_id" }
      );
  } catch {
    // silently fail — saving is a side-effect
  }
}
