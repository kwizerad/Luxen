/**
 * Avatar Visibility & Privacy Helpers
 *
 * Rules:
 * 1. Standard user profile pictures (uploaded custom avatars, Google profile photos, etc.)
 *    are public and CAN be seen by all classmates and other users.
 * 2. Official National ID photos (Base64 data URLs from NIDA / Irembo or ID document records)
 *    are private and can ONLY be seen by the user themselves or by administrators.
 */

export function isNationalIdPhoto(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  // Rwanda NIDA / Irembo citizen photos are base64 data URLs
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("data:")) {
    return true;
  }
  // Explicit ID document storage paths
  if (
    trimmed.includes("/national_id/") ||
    trimmed.includes("/id_photos/") ||
    trimmed.includes("nid_photo") ||
    trimmed.includes("irembo_photo")
  ) {
    return true;
  }
  return false;
}

export function canViewUserAvatar(
  avatarUrl?: string | null,
  targetUserId?: string | null,
  currentUserId?: string | null,
  currentUserRole?: string | null
): boolean {
  if (!avatarUrl || typeof avatarUrl !== "string" || !avatarUrl.trim()) {
    return false;
  }

  const isSelf = Boolean(
    targetUserId && currentUserId && String(targetUserId) === String(currentUserId)
  );
  const normalizedRole = (currentUserRole || "").toLowerCase();
  const isAdmin = normalizedRole === "admin" || normalizedRole === "super_admin";

  // If this is a government ID picture, restrict to self and admin only
  if (isNationalIdPhoto(avatarUrl)) {
    return isSelf || isAdmin;
  }

  // All other user profile pictures (uploaded photos, google avatars, etc.) are visible to everyone
  return true;
}

export function getDisplayAvatarUrl(
  avatarUrl?: string | null,
  targetUserId?: string | null,
  currentUserId?: string | null,
  currentUserRole?: string | null
): string | undefined {
  if (canViewUserAvatar(avatarUrl, targetUserId, currentUserId, currentUserRole)) {
    return avatarUrl || undefined;
  }
  return undefined;
}
