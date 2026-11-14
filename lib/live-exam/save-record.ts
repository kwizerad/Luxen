import { createAdminClient } from "@/lib/supabase/admin";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";
import type { CitizenFullProfile } from "./irembo";

const KNOWN_ADMIN_EMAILS = [
  PRIMARY_ADMIN_EMAIL.toLowerCase(),
  "navo@admin.jn",
];

export interface CheckedAccountMeta {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  phone_number?: string | null;
  checked_at: string;
  verified_at?: string | null;
  last_verified_at?: string | null;
  verification_count?: number;
  ip_address?: string | null;
  is_verified?: boolean;
  is_admin_check?: boolean;
}

export interface SaveNationalIdOptions {
  isVerified?: boolean;
  ipAddress?: string;
  userName?: string;
  userEmail?: string;
  citizen?: Partial<CitizenFullProfile> | null;
}

function cleanStr(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = String(val).trim();
  return trimmed.length > 0 && trimmed !== "N/A" ? trimmed : null;
}

function buildCitizenFields(
  citizen?: Partial<CitizenFullProfile> | null,
  existingCitizenInfo?: Record<string, any> | null
): Record<string, any> {
  if (!citizen) return {};

  const mergedInfo: Record<string, any> = {
    ...(existingCitizenInfo && typeof existingCitizenInfo === "object" ? existingCitizenInfo : {}),
  };

  const mapPairs: Array<[string, any]> = [
    ["full_name", cleanStr(citizen.fullName)],
    ["first_name", cleanStr(citizen.firstName)],
    ["last_name", cleanStr(citizen.lastName)],
    ["middle_name", cleanStr(citizen.middleName)],
    ["date_of_birth", cleanStr(citizen.dateOfBirth)],
    ["gender", cleanStr(citizen.gender)],
    ["nationality", cleanStr(citizen.nationality)],
    ["photo_url", cleanStr(citizen.photoUrl)],
    ["signature_url", cleanStr(citizen.signatureUrl)],
    ["civil_status", cleanStr(citizen.civilStatus)],
    ["spouse", cleanStr(citizen.spouse)],
    ["father_names", cleanStr(citizen.fatherNames)],
    ["mother_names", cleanStr(citizen.motherNames)],
    ["place_of_birth", cleanStr(citizen.placeOfBirth)],
    ["place_of_issue", cleanStr(citizen.placeOfIssue)],
    ["province", cleanStr(citizen.province)],
    ["district", cleanStr(citizen.district)],
    ["sector", cleanStr(citizen.sector)],
    ["cell", cleanStr(citizen.cell)],
    ["village", cleanStr(citizen.village)],
    ["license_number", cleanStr(citizen.licenseNumber)],
    ["vehicle_class", cleanStr(citizen.vehicleClass)],
    ["license_status", cleanStr(citizen.licenseStatus)],
    ["date_of_issue", cleanStr(citizen.dateOfIssue)],
    ["date_of_expiry", cleanStr(citizen.dateOfExpiry)],
  ];

  const columnUpdates: Record<string, any> = {};
  for (const [col, val] of mapPairs) {
    if (val !== null) {
      columnUpdates[col] = val;
      mergedInfo[col] = val;
    }
  }

  if (Object.keys(mergedInfo).length > 0) {
    columnUpdates.citizen_info = mergedInfo;
  }

  return columnUpdates;
}

/**
 * Saves a National ID canonically (one row per 16-digit ID — zero duplicates).
 * - Preserves verified = true / is_verified = true whenever verified.
 * - Stores all belonging citizen information from Irembo/NIDA on the canonical row.
 * - Tracks all accounts that checked or verified the ID in deduplicated
 *   checked_accounts and verified_accounts arrays (preserving every prior account
 *   when the same National ID is verified across multiple different accounts).
 * - Admin checks are logged as admin checks and never assign an admin as ID owner.
 */
export async function saveNationalIdRecord(
  nationalId: string,
  userId?: string,
  options?: SaveNationalIdOptions
): Promise<void> {
  const cleanId = (nationalId || "").trim().replace(/\D/g, "");
  if (!cleanId || cleanId.length !== 16) return;

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    let userMeta: CheckedAccountMeta | null = null;
    let isUserAdmin = false;

    if (userId) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const userEmail = (options?.userEmail || profile?.email || "").toLowerCase().trim();
      isUserAdmin =
        profile?.role === "Admin" ||
        profile?.role === "admin" ||
        (userEmail ? KNOWN_ADMIN_EMAILS.includes(userEmail) : false);

      const fullName =
        options?.userName ||
        options?.citizen?.fullName ||
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        null;

      const isAccountVerified = !isUserAdmin && Boolean(options?.isVerified);

      userMeta = {
        user_id: userId,
        email: options?.userEmail || profile?.email || null,
        full_name: fullName,
        avatar_url: isUserAdmin ? null : (profile?.avatar_url || options?.citizen?.photoUrl || null),
        username: profile?.username || null,
        phone_number: (profile as any)?.phone_number || null,
        checked_at: now,
        verified_at: isAccountVerified ? now : null,
        last_verified_at: isAccountVerified ? now : null,
        verification_count: isAccountVerified ? 1 : 0,
        ip_address: options?.ipAddress || null,
        is_verified: isAccountVerified,
        is_admin_check: isUserAdmin,
      };
    }

    const { data: existing } = await supabase
      .from("national_id_records")
      .select("*")
      .eq("national_id", cleanId)
      .maybeSingle();

    const isVerifiedNow = !isUserAdmin && Boolean(options?.isVerified);

    if (existing) {
      const currentChecked: CheckedAccountMeta[] = Array.isArray(existing.checked_accounts)
        ? existing.checked_accounts
        : [];
      const currentVerified: CheckedAccountMeta[] = Array.isArray((existing as any).verified_accounts)
        ? (existing as any).verified_accounts
        : [];

      const updatedChecked = [...currentChecked];
      const updatedVerified = [...currentVerified];

      if (userMeta) {
        const existingIdx = updatedChecked.findIndex((a) => a.user_id === userMeta!.user_id);
        if (existingIdx >= 0) {
          const prev = updatedChecked[existingIdx];
          const wasVerified = Boolean(prev.is_verified);
          const nowVerified = !isUserAdmin && (wasVerified || Boolean(userMeta.is_verified));
          updatedChecked[existingIdx] = {
            ...prev,
            ...userMeta,
            checked_at: now,
            verified_at: prev.verified_at || (nowVerified ? now : null),
            last_verified_at: isVerifiedNow ? now : (prev.last_verified_at || null),
            verification_count: isVerifiedNow
              ? (prev.verification_count || (wasVerified ? 1 : 0)) + 1
              : (prev.verification_count || (wasVerified ? 1 : 0)),
            is_verified: nowVerified,
          };
        } else {
          updatedChecked.push(userMeta);
        }

        // Preserve every account that has verified this National ID without duplicating the same account
        if (isVerifiedNow) {
          const verIdx = updatedVerified.findIndex((a) => a.user_id === userMeta!.user_id);
          if (verIdx >= 0) {
            const prevV = updatedVerified[verIdx];
            updatedVerified[verIdx] = {
              ...prevV,
              ...userMeta,
              is_verified: true,
              verified_at: prevV.verified_at || now,
              last_verified_at: now,
              verification_count: (prevV.verification_count || 1) + 1,
            };
          } else {
            updatedVerified.push({
              ...userMeta,
              is_verified: true,
              verified_at: now,
              last_verified_at: now,
              verification_count: 1,
            });
          }
        }
      }

      const citizenColumns = buildCitizenFields(options?.citizen, (existing as any).citizen_info);
      const nextVerifiedFlag =
        Boolean((existing as any).verified) ||
        Boolean((existing as any).is_verified) ||
        Boolean(existing.verified_user_id) ||
        isVerifiedNow;

      const resolvedUserName =
        cleanStr(options?.citizen?.fullName) ||
        cleanStr(options?.userName) ||
        cleanStr((existing as any).user_name);
      const resolvedUserEmail =
        cleanStr(options?.userEmail) ||
        cleanStr((existing as any).user_email);

      const updateData: Record<string, any> = {
        ...citizenColumns,
        updated_at: now,
        last_checked_at: now,
        check_count: (existing.check_count || 1) + 1,
        checked_accounts: updatedChecked,
        verified_accounts: updatedVerified,
        verified: nextVerifiedFlag,
        is_verified: nextVerifiedFlag,
        ...(resolvedUserName ? { user_name: resolvedUserName } : {}),
        ...(resolvedUserEmail ? { user_email: resolvedUserEmail } : {}),
      };

      if (isVerifiedNow) {
        updateData.last_verified_at = now;
        updateData.verification_count = ((existing as any).verification_count || 0) + 1;
      }

      // Only assign user_id / verified_user_id for non-admin accounts
      if (!isUserAdmin) {
        if (isVerifiedNow && userId) {
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
        // Fallback if some newly added columns have not yet been migrated in DB
        await supabase
          .from("national_id_records")
          .update({
            updated_at: now,
            last_checked_at: now,
            check_count: (existing.check_count || 1) + 1,
            checked_accounts: updatedChecked,
            ...(nextVerifiedFlag ? { is_verified: true } : {}),
            ...(!isUserAdmin && isVerifiedNow && userId ? { verified_user_id: userId } : {}),
          })
          .eq("id", existing.id);
      }
      return;
    }

    // Insert new canonical record for this 16-digit National ID
    const citizenColumns = buildCitizenFields(options?.citizen, null);
    const verifiedAccountsInit = isVerifiedNow && userMeta ? [userMeta] : [];
    const resolvedUserName = cleanStr(options?.citizen?.fullName) || cleanStr(options?.userName);
    const resolvedUserEmail = cleanStr(options?.userEmail);

    const insertData: Record<string, any> = {
      ...citizenColumns,
      national_id: cleanId,
      user_id: !isUserAdmin && userId ? userId : null,
      verified_user_id: !isUserAdmin && isVerifiedNow && userId ? userId : null,
      verified: isVerifiedNow,
      is_verified: isVerifiedNow,
      ...(resolvedUserName ? { user_name: resolvedUserName } : {}),
      ...(resolvedUserEmail ? { user_email: resolvedUserEmail } : {}),
      checked_accounts: userMeta ? [userMeta] : [],
      verified_accounts: verifiedAccountsInit,
      check_count: 1,
      verification_count: isVerifiedNow ? 1 : 0,
      first_checked_at: now,
      last_checked_at: now,
      ...(isVerifiedNow ? { last_verified_at: now } : {}),
      created_at: now,
      updated_at: now,
    };

    const { error: insertError } = await supabase
      .from("national_id_records")
      .insert(insertData);

    if (insertError) {
      // Fallback insert using baseline schema columns
      await supabase.from("national_id_records").insert({
        national_id: cleanId,
        user_id: !isUserAdmin && userId ? userId : null,
        verified_user_id: !isUserAdmin && isVerifiedNow && userId ? userId : null,
        is_verified: isVerifiedNow,
        checked_accounts: userMeta ? [userMeta] : [],
        check_count: 1,
        first_checked_at: now,
        last_checked_at: now,
        updated_at: now,
      });
    }
  } catch (e) {
    console.warn("saveNationalIdRecord warning:", e);
  }
}
