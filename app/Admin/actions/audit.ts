"use server";

import { requireAdmin } from "./_shared";
import {
  getAdminAuditLogs,
  logAdminAction,
  GetAdminAuditLogsOptions,
  AuditLogQueryResult,
  LogAdminActionParams,
} from "@/lib/admin-audit";

/**
 * Server action to fetch admin audit logs with filtering (supporting other admins only)
 */
export async function fetchAdminAuditLogs(
  options: GetAdminAuditLogsOptions = {}
): Promise<AuditLogQueryResult> {
  await requireAdmin();
  return getAdminAuditLogs(options);
}

/**
 * Server action to record an explicit admin audit log event
 */
export async function recordAdminAuditAction(params: LogAdminActionParams) {
  const admin = await requireAdmin();
  return logAdminAction({
    ...params,
    adminUser: admin,
  });
}
