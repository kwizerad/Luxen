import { createClient } from "@/lib/supabase/server";

const PRIMARY_ADMIN_EMAIL = "Navo@admin.jn";

/**
 * Notify the primary admin about actions taken by other admins
 * This should be called when an admin makes changes to the system
 */
export async function notifyPrimaryAdmin(
  action: string,
  details: string,
  actorEmail: string,
  actorName?: string
) {
  try {
    const supabase = await createClient();
    
    // Get the primary admin's user ID
    const { data: primaryAdmin, error: userError } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", PRIMARY_ADMIN_EMAIL)
      .single();
    
    if (userError || !primaryAdmin) {
      console.error("Primary admin not found:", userError);
      return { success: false, error: "Primary admin not found" };
    }

    const senderName = actorName || actorEmail;
    
    // Create notification for primary admin only
    const { data, error } = await supabase
      .from("notifications")
      .insert([{
        title: `Admin Action: ${action}`,
        message: `${senderName} ${details}`,
        type: "warning",
        target_role: null, // Don't target by role, target specific user
        target_user_id: primaryAdmin.id, // Target only primary admin
        sender_id: null, // System notification
        sender_name: "System",
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating admin notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, notification: data };
  } catch (error: any) {
    console.error("Error in notifyPrimaryAdmin:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get primary admin user ID
 */
export async function getPrimaryAdminId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data: primaryAdmin, error } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", PRIMARY_ADMIN_EMAIL)
      .single();
    
    if (error || !primaryAdmin) {
      console.error("Primary admin not found:", error);
      return null;
    }
    
    return primaryAdmin.id;
  } catch (error) {
    console.error("Error getting primary admin ID:", error);
    return null;
  }
}
