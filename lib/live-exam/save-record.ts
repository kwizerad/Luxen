import { createAdminClient } from "@/lib/supabase/admin";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";

const KNOWN_ADMIN_EMAILS = [
  PRIMARY_ADMIN_EMAIL.toLowerCase(),
  "navo@admin.jn",
  "kwizeradiementwari@gmail.com",
];

export interface CheckedAccountMeta {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  checked_at: string;
  ip_address?: string | null;
  is_verified?: boolean;
  is_admin_check?: boolean;
}

/**
 * Saves a National ID to the database without duplication.
 * Keeps a single canonical record for each 16-digit National ID and tracks
 * all accounts (users) that have checked or verified it.
 * Note: Admin checks are logged in checked_accounts but never link the admin
 * as the owner/verified_user of the citizen's National ID.
 */
export async function saveNationalIdRecord(
  nationalId: string,
  userId?: string,
  options?: {
    isVerified?: boolean;
    ipAddress?: string;
    userName?: string;
    userEmail?: string;
  }
): Promise<void> {
  const cleanId = (nationalId || "").trim();
  if (!cleanId || cleanId.length !== 16) return;

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    let userMeta: CheckedAccountMeta | null = null;
    let isUserAdmin = false;

    // Fetch user details if userId is provided
    if (userId) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, first_name, last_name, email, avatar_url, username, role")
        .eq("id", userId)
        .maybeSingle();

      const userEmail = (options?.userEmail || profile?.email || "").toLowerCase().trim();
      isUserAdmin =
        profile?.role === "Admin" ||
        profile?.role === "admin" ||
        (userEmail ? KNOWN_ADMIN_EMAILS.includes(userEmail) : false);

      const fullName =
        options?.userName ||
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        null;

      userMeta = {
        user_id: userId,
        email: options?.userEmail || profile?.email || null,
        full_name: fullName,
        avatar_url: isUserAdmin ? null : (profile?.avatar_url || null),
        username: profile?.username || null,
        checked_at: now,
        ip_address: options?.ipAddress || null,
        is_verified: isUserAdmin ? false : Boolean(options?.isVerified),
        is_admin_check: isUserAdmin,
      };
    }

    const { data: existing } = await supabase
      .from("national_id_records")
      .select("id, user_id, verified_user_id, checked_accounts, check_count")
      .eq("national_id", cleanId)
      .maybeSingle();

    if (existing) {
      const currentChecked: CheckedAccountMeta[] = Array.isArray(existing.checked_accounts)
        ? existing.checked_accounts
        : [];

      let updatedChecked = [...currentChecked];
      if (userMeta) {
        const existingIdx = updatedChecked.findIndex((a) => a.user_id === userMeta!.user_id);
        if (existingIdx >= 0) {
          updatedChecked[existingIdx] = {
            ...updatedChecked[existingIdx],
            ...userMeta,
            checked_at: now,
            is_verified: isUserAdmin ? false : (updatedChecked[existingIdx].is_verified || userMeta.is_verified),
          };
        } else {
          updatedChecked.push(userMeta);
        }
      }

      const updateData: Record<string, any> = {
        updated_at: now,
        last_checked_at: now,
        check_count: (existing.check_count || 1) + 1,
        checked_accounts: updatedChecked,
      };

      // Only assign user_id/verified_user_id if the user is a student/citizen, NEVER an admin
      if (!isUserAdmin) {
        if (options?.isVerified && userId) {
          updateData.verified_user_id = userId;
        }

        if (!existing.user_id && userId) {
          updateData.user_id = userId;
        }
      }

      const { error } = await supabase
        .from("national_id_records")
        .update(updateData)
        .eq("id", existing.id);

      if (error) {
        // Fallback for simple schema
        await supabase
          .from("national_id_records")
          .update({ updated_at: now })
          .eq("id", existing.id);
      }
      return;
    }

    // Insert new canonical record
    const insertData: Record<string, any> = {
      national_id: cleanId,
      user_id: (!isUserAdmin && userId) ? userId : null,
      verified_user_id: (!isUserAdmin && options?.isVerified && userId) ? userId : null,
      checked_accounts: userMeta ? [userMeta] : [],
      check_count: 1,
      first_checked_at: now,
      last_checked_at: now,
      created_at: now,
      updated_at: now,
    };

    const { error: insertError } = await supabase
      .from("national_id_records")
      .insert(insertData);

    if (insertError) {
      // Fallback simple insert
      await supabase.from("national_id_records").insert({
        national_id: cleanId,
        user_id: (!isUserAdmin && userId) ? userId : null,
        updated_at: now,
      });
    }
  } catch (e) {
    console.warn("saveNationalIdRecord warning:", e);
  }
}
