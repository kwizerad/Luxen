"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPrimaryAdmin, migratePermissions, type AdminPermissions, type User } from "@/lib/permissions";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";

async function requirePrimaryAdmin(): Promise<User> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  if (!isPrimaryAdmin(user as User)) {
    throw new Error("Only the primary admin can manage other admins");
  }
  return user as User;
}

export interface AdminListItem {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  created_at: string | null;
  permissions: AdminPermissions | null;
}

export async function getAdmins(): Promise<AdminListItem[]> {
  await requirePrimaryAdmin();
  const adminSupabase = createAdminClient();

  const { data: profiles, error } = await adminSupabase
    .from("user_profiles")
    .select("id, email, full_name, username, created_at")
    .eq("role", "Admin")
    .neq("email", PRIMARY_ADMIN_EMAIL)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Retrieve auth users to populate actual permissions
  const authUserMap = new Map<string, any>();
  try {
    const { data: authUsersData } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authUsersData?.users) {
      for (const u of authUsersData.users) {
        authUserMap.set(u.id, u.user_metadata?.permissions);
      }
    }
  } catch (err) {
    console.warn("[admin-management] Failed to list auth users for permissions:", err);
  }

  return (profiles || []).map((p) => {
    const rawPerms = authUserMap.get(p.id);
    const perms = rawPerms ? migratePermissions(rawPerms) : null;
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      username: p.username,
      created_at: p.created_at,
      permissions: perms,
    };
  });
}

export async function inviteAdmin(
  email: string,
  fullName: string,
  permissions: AdminPermissions
): Promise<{ success: boolean; error?: string }> {
  await requirePrimaryAdmin();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/login`,
      data: {
        role: "Admin",
        permissions,
        full_name: fullName.trim(),
        require_password_change: false,
      },
    }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateAdminPermissions(
  userId: string,
  permissions: AdminPermissions
): Promise<{ success: boolean; error?: string }> {
  await requirePrimaryAdmin();
  const adminSupabase = createAdminClient();

  // Fetch current user auth record to merge existing metadata
  const { data: userData, error: getUserError } = await adminSupabase.auth.admin.getUserById(userId);
  if (getUserError || !userData?.user) {
    return { success: false, error: getUserError?.message || "User not found" };
  }

  const existingMetadata = userData.user.user_metadata || {};

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMetadata,
      role: "Admin",
      permissions,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeAdmin(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePrimaryAdmin();
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.auth.admin.deleteUser(userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getAdminPermissions(
  userId: string
): Promise<AdminPermissions | null> {
  await requirePrimaryAdmin();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.auth.admin.getUserById(userId);

  if (error || !data.user) return null;

  const raw = data.user.user_metadata?.permissions;
  if (!raw) return null;

  return migratePermissions(raw);
}
