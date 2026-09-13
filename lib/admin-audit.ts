import { createAdminClient } from "@/lib/supabase/admin";
import { isPrimaryAdmin, PRIMARY_ADMIN_EMAIL, type User } from "@/lib/permissions";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { notifyPrimaryAdmin } from "@/lib/admin-notifications";

export type AuditCategory =
  | "USER_MANAGEMENT"
  | "EXAMS_QUESTIONS"
  | "COURSE_STUDIO"
  | "FLEET_DRIVERS"
  | "REPORTS_SUPPORT"
  | "SETTINGS_SECURITY"
  | "SYSTEM_CRON"
  | "COMMUNICATION";

export type AuditActionType =
  // User Management
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_ROLE_CHANGED"
  | "USER_SUSPENDED"
  | "USER_UNSUSPENDED"
  | "ADMIN_INVITED"
  | "ADMIN_PERMISSIONS_UPDATED"
  | "ADMIN_REMOVED"
  | "PASSWORD_RESET_SENT"
  // Exams & Questions
  | "EXAM_CATEGORY_CREATED"
  | "EXAM_CATEGORY_UPDATED"
  | "EXAM_CATEGORY_DELETED"
  | "EXAM_CATEGORY_PUBLISHED"
  | "QUESTION_CREATED"
  | "QUESTION_UPDATED"
  | "QUESTION_DELETED"
  | "QUESTIONS_BULK_IMPORTED"
  | "EXAM_SETTINGS_UPDATED"
  | "EXAM_ATTEMPT_DELETED"
  // Course Studio
  | "COURSE_CREATED"
  | "COURSE_UPDATED"
  | "COURSE_DELETED"
  | "MODULE_CREATED"
  | "MODULE_UPDATED"
  | "LESSON_CREATED"
  | "LESSON_UPDATED"
  // Fleet & Drivers
  | "DRIVER_APPROVED"
  | "DRIVER_REJECTED"
  | "DRIVER_UPDATED"
  | "DRIVER_DELETED"
  | "BOOKING_STATUS_CHANGED"
  // Reports & Support
  | "REPORT_STATUS_UPDATED"
  | "REPORT_COMMENT_ADDED"
  | "RETAKE_REQUEST_APPROVED"
  | "RETAKE_REQUEST_REJECTED"
  // Settings & Security
  | "SYSTEM_CONFIG_UPDATED"
  | "THEME_CONFIG_UPDATED"
  | "SECURITY_POLICY_CHANGED"
  | "CLEANUP_TRIGGERED"
  // Communication
  | "BROADCAST_SENT"
  | "NOTIFICATION_DISPATCHED"
  // Scheduled System
  | "WEEKLY_REPORT_GENERATED"
  | "WEEKLY_REPORT_SCHEDULE_UPDATED"
  | "MANUAL_REPORT_SENT";

export interface AdminAuditLog {
  id: string;
  timestamp: string; // ISO 8601 string
  admin_id: string;
  admin_email: string;
  admin_name: string;
  admin_role: string;
  is_primary_admin: boolean;
  category: AuditCategory;
  action: AuditActionType | string;
  action_label: string;
  target_type?: string;
  target_id?: string;
  target_label?: string;
  details: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface LogAdminActionParams {
  action: AuditActionType | string;
  actionLabel?: string;
  category: AuditCategory;
  details: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, any>;
  adminUser?:
    | User
    | {
        id?: string | null;
        email?: string | null;
        full_name?: string | null;
        username?: string | null;
        role?: string | null;
        user_metadata?: Record<string, any> | null;
      }
    | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Check if the given admin email / user is the primary admin
 */
export function isUserPrimaryAdmin(user?: { email?: string | null; id?: string | null; [key: string]: any } | User | null): boolean {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase().trim();
  const primary1 = (process.env.NEXT_PUBLIC_PRIMARY_ADMIN_EMAIL || PRIMARY_ADMIN_EMAIL).toLowerCase().trim();
  const primary2 = DEFAULT_ADMIN_EMAIL.toLowerCase().trim();
  const primary3 = "kwizeradiementwari@gmail.com";
  const primary4 = "navo@admin.jn";
  return email === primary1 || email === primary2 || email === primary3 || email === primary4;
}

/**
 * Log an administrative action to the audit repository
 * Automatically flags whether it was done by the primary admin or another admin.
 * If done by another admin, dispatches an alert to the primary admin.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const adminSupabase = createAdminClient();
    
    // Resolve admin info
    let adminId = params.adminUser?.id || "system";
    let adminEmail = params.adminUser?.email || "system@navo.app";
    let adminName = params.adminUser?.full_name || params.adminUser?.username || adminEmail.split("@")[0];
    let adminRole = params.adminUser?.role || "Admin";

    const isPrimary = isUserPrimaryAdmin(params.adminUser);

    const actionLabel = params.actionLabel || humanizeAction(params.action);
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();

    const auditEntry: AdminAuditLog = {
      id: logId,
      timestamp,
      admin_id: adminId,
      admin_email: adminEmail,
      admin_name: adminName,
      admin_role: adminRole,
      is_primary_admin: isPrimary,
      category: params.category,
      action: params.action,
      action_label: actionLabel,
      target_type: params.targetType,
      target_id: params.targetId,
      target_label: params.targetLabel,
      details: params.details,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    };

    // 1. Try to insert into dedicated admin_audit_logs table
    let tableSuccess = false;
    try {
      const { error: insertError } = await adminSupabase
        .from("admin_audit_logs")
        .insert({
          id: logId,
          created_at: timestamp,
          admin_id: adminId,
          admin_email: adminEmail,
          admin_name: adminName,
          admin_role: adminRole,
          is_primary_admin: isPrimary,
          category: params.category,
          action: params.action,
          action_label: actionLabel,
          target_type: params.targetType,
          target_id: params.targetId,
          target_label: params.targetLabel,
          details: params.details,
          metadata: params.metadata || {},
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
        });

      if (!insertError) {
        tableSuccess = true;
      }
    } catch {
      // Table might not exist yet; gracefully fallback
    }

    // 2. Always persist a structured record in notifications/system stream for resilience
    try {
      await adminSupabase.from("notifications").insert({
        title: `Audit: ${actionLabel}`,
        message: `${adminName} (${adminEmail}): ${params.details}`,
        type: isPrimary ? "info" : "warning",
        target_role: "admin",
        sender_id: adminId,
        sender_name: adminName,
        data: {
          audit_log: true,
          audit_entry: auditEntry,
        },
      });
    } catch {
      // Ignore notifications table insert issues
    }

    // 3. If action was performed by ANOTHER admin (not primary), immediately alert primary admin
    if (!isPrimary) {
      try {
        await notifyPrimaryAdmin(
          `[Other Admin Action] ${actionLabel}`,
          `performed action: "${params.details}" at ${new Date().toLocaleString()}`,
          adminEmail,
          adminName
        );
      } catch (notifyErr) {
        console.warn("[AdminAudit] Failed to dispatch secondary admin alert:", notifyErr);
      }
    }

    return { success: true, id: logId };
  } catch (err: any) {
    console.error("[AdminAudit] Error logging admin action:", err);
    return { success: false, error: err?.message || "Unknown error" };
  }
}

/**
 * Convert technical action code to clean human-readable title
 */
function humanizeAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface GetAdminAuditLogsOptions {
  otherAdminsOnly?: boolean;
  category?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogQueryResult {
  logs: AdminAuditLog[];
  total: number;
  stats: {
    totalActions: number;
    actionsByOtherAdmins: number;
    actionsByPrimaryAdmin: number;
    uniqueAdminsCount: number;
    categoryCounts: Record<string, number>;
  };
}

/**
 * Retrieve audit logs with comprehensive filters for other admins vs all admins
 */
export async function getAdminAuditLogs(
  options: GetAdminAuditLogsOptions = {}
): Promise<AuditLogQueryResult> {
  const {
    otherAdminsOnly = false,
    category,
    action,
    search,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  const adminSupabase = createAdminClient();
  let logs: AdminAuditLog[] = [];

  // Try 1: Query dedicated admin_audit_logs table
  try {
    let query = adminSupabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (otherAdminsOnly) {
      query = query.eq("is_primary_admin", false);
    }
    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }
    if (action && action !== "ALL") {
      query = query.eq("action", action);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error } = await query.limit(300);

    if (!error && data && data.length > 0) {
      logs = data.map((d: any) => ({
        id: d.id,
        timestamp: d.created_at || d.timestamp || new Date().toISOString(),
        admin_id: d.admin_id,
        admin_email: d.admin_email,
        admin_name: d.admin_name || d.admin_email?.split("@")[0] || "Admin",
        admin_role: d.admin_role || "Admin",
        is_primary_admin: Boolean(d.is_primary_admin),
        category: d.category || "USER_MANAGEMENT",
        action: d.action,
        action_label: d.action_label || humanizeAction(d.action),
        target_type: d.target_type,
        target_id: d.target_id,
        target_label: d.target_label,
        details: d.details || "",
        metadata: d.metadata || {},
        ip_address: d.ip_address,
        user_agent: d.user_agent,
      }));
    }
  } catch (err) {
    console.warn("[AdminAudit] Fallback reading audit table:", err);
  }

  // Try 2: Supplement / Fallback from notifications table and system events
  if (logs.length === 0) {
    try {
      const { data: notifData } = await adminSupabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (notifData) {
        for (const n of notifData) {
          if (n.data?.audit_entry) {
            logs.push(n.data.audit_entry);
          } else if (n.title?.startsWith("Admin Action:") || n.title?.startsWith("Audit:")) {
            const isPrimary = isUserPrimaryAdmin({ email: n.sender_name });
            logs.push({
              id: `notif_${n.id}`,
              timestamp: n.created_at,
              admin_id: n.sender_id || "admin",
              admin_email: n.sender_name?.includes("@") ? n.sender_name : `${n.sender_name || "admin"}@admin.local`,
              admin_name: n.sender_name || "Admin",
              admin_role: "Admin",
              is_primary_admin: isPrimary,
              category: "SETTINGS_SECURITY",
              action: "ADMIN_ACTION_PERFORMED",
              action_label: n.title.replace("Admin Action:", "").replace("Audit:", "").trim(),
              details: n.message || "",
              metadata: n.data || {},
            });
          }
        }
      }
    } catch {
      // Ignore fallback errors
    }
  }

  // De-duplicate by ID
  const uniqueMap = new Map<string, AdminAuditLog>();
  logs.forEach((log) => {
    if (!uniqueMap.has(log.id)) {
      uniqueMap.set(log.id, log);
    }
  });
  let allLogs = Array.from(uniqueMap.values());

  // Apply filters
  if (otherAdminsOnly) {
    allLogs = allLogs.filter((l) => !l.is_primary_admin);
  }
  if (category && category !== "ALL") {
    allLogs = allLogs.filter((l) => l.category === category);
  }
  if (action && action !== "ALL") {
    allLogs = allLogs.filter((l) => l.action === action);
  }
  if (search) {
    const q = search.toLowerCase();
    allLogs = allLogs.filter(
      (l) =>
        l.admin_name?.toLowerCase().includes(q) ||
        l.admin_email?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.action_label?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.target_label?.toLowerCase().includes(q)
    );
  }

  // Sort descending by timestamp
  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Compute statistics
  const totalActions = allLogs.length;
  const actionsByOtherAdmins = allLogs.filter((l) => !l.is_primary_admin).length;
  const actionsByPrimaryAdmin = allLogs.filter((l) => l.is_primary_admin).length;
  const uniqueAdmins = new Set(allLogs.map((l) => l.admin_email));
  const categoryCounts: Record<string, number> = {};

  allLogs.forEach((l) => {
    categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
  });

  const paginatedLogs = allLogs.slice(offset, offset + limit);

  return {
    logs: paginatedLogs,
    total: allLogs.length,
    stats: {
      totalActions,
      actionsByOtherAdmins,
      actionsByPrimaryAdmin,
      uniqueAdminsCount: uniqueAdmins.size,
      categoryCounts,
    },
  };
}
