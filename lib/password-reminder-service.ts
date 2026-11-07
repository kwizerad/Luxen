"use client";

import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/lib/database.types";

const REMINDER_INTERVAL_MS = 3.5 * 24 * 60 * 60 * 1000; // 3.5 days (~2 times per week)

export async function checkAndDispatchPasswordReminder(
  user: { id: string; email?: string } | null,
  userProfile: UserProfile | null
): Promise<boolean> {
  if (!user || !userProfile) return false;

  // Only apply to users who logged in via National ID or have a registered National ID
  const isNationalIdUser = Boolean(userProfile.national_id);
  if (!isNationalIdUser) return false;

  // If user already has a custom password, no reminder needed
  if ((userProfile as any).has_custom_password) return false;

  const storageKey = `luxen_pwd_reminder_${user.id}`;
  const now = Date.now();
  const lastReminderStr =
    typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
  const lastReminder = lastReminderStr ? parseInt(lastReminderStr, 10) : 0;

  if (now - lastReminder < REMINDER_INTERVAL_MS) {
    return false;
  }

  // Dispatch notification to database
  try {
    const supabase = createClient();
    const notificationTitle = "Shyiraho ijambo ry'ibanga rya konti yawe (Set Account Password)";
    const notificationMessage =
      "Fungura ibijyanye n'umutekano kumenya kugarura konti yawe mu buryo bworoshye. (Protect your account with a password and recovery questions).";

    await supabase.from("notifications").insert([
      {
        target_user_id: user.id,
        type: "reminder",
        title: notificationTitle,
        message: notificationMessage,
        action_url: "/dashboard#set-password",
        priority: "normal",
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, String(now));
    }

    // Update user_profiles table if field exists
    try {
      await supabase
        .from("user_profiles")
        .update({ last_password_reminder_at: new Date().toISOString() })
        .eq("id", user.id);
    } catch {
      // ignore table column error if field not present
    }

    return true;
  } catch (err) {
    console.error("Failed to dispatch password reminder notification:", err);
    return false;
  }
}
