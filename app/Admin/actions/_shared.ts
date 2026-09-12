"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPrimaryAdmin, PRIMARY_ADMIN_EMAIL, type User } from "@/lib/permissions";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

export interface AdminUser {
  id: string;
  email?: string;
  role?: string;
  full_name?: string;
  user_metadata?: Record<string, any> | null;
}

function isAdminUser(user: { email?: string | null; user_metadata?: { role?: string } | null }): boolean {
  if (!user) return false;
  const isPrimary =
    isPrimaryAdmin(user as User) ||
    user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
    user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    user.email?.toLowerCase() === "navo@admin.jn";

  const role = user.user_metadata?.role;
  const hasAdminRole = typeof role === "string" && role.toLowerCase() === "admin";

  return isPrimary || hasAdminRole;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    if (isAdminUser(user)) {
      return {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || "Admin",
        full_name: user.user_metadata?.full_name || user.user_metadata?.username,
        user_metadata: user.user_metadata,
      };
    }

    // Fallback: check user_profiles in database
    try {
      const adminSupabase = createAdminClient();
      const { data: profile } = await adminSupabase
        .from("user_profiles")
        .select("role, full_name, username")
        .eq("id", user.id)
        .single();

      if (profile?.role && profile.role.toLowerCase() === "admin") {
        return {
          id: user.id,
          email: user.email,
          role: profile.role,
          full_name: profile.full_name || profile.username || user.email,
          user_metadata: user.user_metadata,
        };
      }
    } catch {
      // Ignore database lookup fallback errors
    }

    return null;
  } catch (err) {
    console.error("getAdminUser error:", err);
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Unauthorized. Please sign in with an administrator account.");
  }
  return admin;
}

export async function requirePrimaryAdmin(): Promise<AdminUser> {
  const admin = await requireAdmin();
  const isPrimary =
    isPrimaryAdmin(admin as User) ||
    admin.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
    admin.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    admin.email?.toLowerCase() === "navo@admin.jn";

  if (!isPrimary) {
    throw new Error("Unauthorized. Only the primary administrator can perform this action.");
  }
  return admin;
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

