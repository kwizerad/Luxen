import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    // Use admin client to access auth.users
    const adminSupabase = createAdminClient();
    
    // Get the primary admin's user ID
    const { data: primaryAdmin, error: userError } = await adminSupabase
      .auth.admin.listUsers()
      .then(({ data }) => {
        const adminUser = data.users.find(u => u.email === PRIMARY_ADMIN_EMAIL);
        return adminUser ? { data: { id: adminUser.id } } : { data: null, error: new Error("Primary admin not found") };
      });
    
    if (userError || !primaryAdmin) {
      console.error("Primary admin not found:", userError);
      return { success: false, error: "Primary admin not found" };
    }

    const senderName = actorName || actorEmail;
    
    // Use regular client for notifications (has proper RLS)
    const supabase = await createClient();
    
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
  } catch (error: unknown) {
    console.error("Error in notifyPrimaryAdmin:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get primary admin user ID
 */
export async function getPrimaryAdminId(): Promise<string | null> {
  try {
    // Use admin client to access auth.users
    const adminSupabase = createAdminClient();
    
    const { data: users } = await adminSupabase.auth.admin.listUsers();
    const primaryAdmin = users.users.find(u => u.email === PRIMARY_ADMIN_EMAIL);
    
    if (!primaryAdmin) {
      console.error("Primary admin not found");
      return null;
    }
    
    return primaryAdmin.id;
  } catch (error) {
    console.error("Error getting primary admin ID:", error);
    return null;
  }
}
