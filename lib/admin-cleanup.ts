import { createAdminClient } from "@/lib/supabase/admin";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";

const KNOWN_ADMIN_EMAILS = [
  PRIMARY_ADMIN_EMAIL.toLowerCase(),
  "navo@admin.jn",
  "kwizeradiementwari@gmail.com",
];

/**
 * Ensures Primary Admin and Admin accounts are never tainted with citizen National IDs or ID photos.
 * Cleans up any accidental National ID association and removes citizen ID avatar photos from the primary admin.
 */
export async function sanitizeAdminProfiles(): Promise<void> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch admin users from user_profiles
    const { data: adminProfiles, error: fetchErr } = await supabase
      .from("user_profiles")
      .select("id, email, role, national_id, avatar_url")
      .or(`role.eq.Admin,role.eq.admin,email.in.(${KNOWN_ADMIN_EMAILS.map(e => `"${e}"`).join(",")})`);

    if (fetchErr) {
      // Fallback query by email if role query syntax fails
      const { data: fallbackProfiles } = await supabase
        .from("user_profiles")
        .select("id, email, role, national_id, avatar_url");

      if (fallbackProfiles) {
        for (const p of fallbackProfiles) {
          const isKnownAdmin =
            p.role === "Admin" ||
            p.role === "admin" ||
            (p.email && KNOWN_ADMIN_EMAILS.includes(p.email.toLowerCase()));

          if (isKnownAdmin) {
            await cleanupSingleAdminProfile(supabase, p);
          }
        }
      }
      return;
    }

    if (adminProfiles && adminProfiles.length > 0) {
      for (const p of adminProfiles) {
        await cleanupSingleAdminProfile(supabase, p);
      }
    }
  } catch (err) {
    console.warn("sanitizeAdminProfiles notice:", err);
  }
}

async function cleanupSingleAdminProfile(supabase: any, profile: any) {
  try {
    const updates: Record<string, any> = {};
    let needsUpdate = false;

    // Remove any citizen National ID assigned to admin
    if (profile.national_id) {
      updates.national_id = null;
      needsUpdate = true;
    }

    // Check if avatar is an Irembo/NIDA official ID photo or data URL
    if (profile.avatar_url) {
      const av = String(profile.avatar_url);
      const isIdPhoto =
        av.includes("irembo.gov.rw") ||
        av.includes("nida.gov.rw") ||
        av.includes("data:image/") ||
        av.includes("citizen-photos") ||
        av.includes("nid-avatars");

      if (isIdPhoto) {
        updates.avatar_url = null;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", profile.id);
    }

    // Also unlink admin ID from national_id_records as owner / verified user
    await supabase
      .from("national_id_records")
      .update({ user_id: null, verified_user_id: null })
      .or(`user_id.eq.${profile.id},verified_user_id.eq.${profile.id}`);
  } catch (err) {
    console.warn(`Error sanitizing admin profile ${profile.id}:`, err);
  }
}
