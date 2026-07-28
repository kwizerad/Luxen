"use server";

import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email?: string;
  role?: string;
}

function isAdminUser(user: { email?: string; user_metadata?: { role?: string } }): boolean {
  return user.user_metadata?.role === "Admin" || user.email?.toLowerCase() === "navo@admin.jn";
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) return null;
  return { id: user.id, email: user.email, role: user.user_metadata?.role };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("Unauthorized. Please sign in with an administrator account.");
  }
  return admin;
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
