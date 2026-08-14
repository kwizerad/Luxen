// Permission types and validation utilities

import { DEFAULT_ADMIN_EMAIL } from "./server-config";

export const PRIMARY_ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

export type PermissionAccess = "none" | "read_only" | "read_write";

export type PermissionSection =
  | "students"
  | "courseManagement"
  | "courseStudio"
  | "exams"
  | "settings"
  | "notifications"
  | "drivers";

export interface User {
  id?: string;
  email?: string | null;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
  banned?: boolean;
  last_seen?: string;
  created_at?: string;
  user_metadata?: {
    role?: string;
    permissions?: AdminPermissions;
    username?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  } | null;
}

export interface AdminPermissions {
  students: PermissionAccess;
  courseManagement: PermissionAccess;
  courseStudio: PermissionAccess;
  exams: PermissionAccess;
  settings: PermissionAccess;
  notifications: PermissionAccess;
  drivers: PermissionAccess;
}

export const ALL_PERMISSIONS: AdminPermissions = {
  students: "read_write",
  courseManagement: "read_write",
  courseStudio: "read_write",
  exams: "read_write",
  settings: "read_write",
  notifications: "read_write",
  drivers: "read_write",
};

export const NO_PERMISSIONS: AdminPermissions = {
  students: "none",
  courseManagement: "none",
  courseStudio: "none",
  exams: "none",
  settings: "none",
  notifications: "none",
  drivers: "none",
};

export const PERMISSION_SECTIONS: { key: PermissionSection; labelKey: string }[] = [
  { key: "students", labelKey: "permStudents" },
  { key: "courseManagement", labelKey: "permCourseManagement" },
  { key: "courseStudio", labelKey: "permCourseStudio" },
  { key: "exams", labelKey: "permExams" },
  { key: "settings", labelKey: "permSettings" },
  { key: "notifications", labelKey: "permNotifications" },
  { key: "drivers", labelKey: "permDrivers" },
];

/**
 * Check if user is the primary admin
 */
export function isPrimaryAdmin(user: User | null): boolean {
  return user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  return user?.user_metadata?.role === "Admin" || isPrimaryAdmin(user);
}

/**
 * Check if user has driver role
 */
export function isDriver(user: User | null): boolean {
  return user?.user_metadata?.role === "Driver";
}

/**
 * Migrate legacy permissions to the new format
 */
function migratePermissions(raw: any): AdminPermissions {
  if (!raw) return { ...NO_PERMISSIONS };
  if (raw.students && typeof raw.students === "object" && "access" in raw.students) {
    return {
      students: raw.students?.access ?? "none",
      courseManagement: raw.courseManagement ?? "none",
      courseStudio: raw.courseStudio ?? "none",
      exams: raw.exams ?? "none",
      settings: raw.settings ?? "none",
      notifications: raw.notifications ?? "none",
      drivers: raw.drivers ?? "none",
    };
  }
  // Legacy format: { students: { enabled, access }, examPermissions: { ... } }
  const legacy = raw as {
    students?: { enabled?: boolean; access?: PermissionAccess };
    examPermissions?: { enabled?: boolean; questionAccess?: PermissionAccess; canManageSettings?: boolean };
  };
  return {
    students: legacy?.students?.enabled ? (legacy.students.access ?? "read_write") : "none",
    courseManagement: "none",
    courseStudio: "none",
    exams: legacy?.examPermissions?.enabled ? (legacy.examPermissions.questionAccess ?? "read_write") : "none",
    settings: legacy?.examPermissions?.canManageSettings ? "read_write" : "none",
    notifications: "none",
    drivers: "none",
  };
}

/**
 * Get user permissions from metadata
 */
export function getUserPermissions(user: User | null): AdminPermissions {
  if (isPrimaryAdmin(user)) {
    return { ...ALL_PERMISSIONS };
  }
  return migratePermissions(user?.user_metadata?.permissions);
}

/**
 * Check if user can access a section at all (read or write)
 */
export function canAccess(user: User | null, section: PermissionSection): boolean {
  return getUserPermissions(user)[section] !== "none";
}

/**
 * Check if user has read access to a section
 */
export function canRead(user: User | null, section: PermissionSection): boolean {
  const access = getUserPermissions(user)[section];
  return access === "read_only" || access === "read_write";
}

/**
 * Check if user has write access to a section
 */
export function canWrite(user: User | null, section: PermissionSection): boolean {
  return getUserPermissions(user)[section] === "read_write";
}

// ── Backward-compatible helpers ──────────────────────────────────────────

export function canViewStudents(user: User | null): boolean {
  return canAccess(user, "students");
}

export function hasReadWriteStudentAccess(user: User | null): boolean {
  return canWrite(user, "students");
}

export function hasReadOnlyStudentAccess(user: User | null): boolean {
  return getUserPermissions(user).students === "read_only";
}

export function canAddQuestions(user: User | null): boolean {
  return canWrite(user, "exams");
}

export function canViewQuestions(user: User | null): boolean {
  return canRead(user, "exams");
}

export function canManageExamSettings(user: User | null): boolean {
  return canWrite(user, "exams");
}

export function hasReadWriteQuestionAccess(user: User | null): boolean {
  return canWrite(user, "exams");
}

export function hasReadOnlyQuestionAccess(user: User | null): boolean {
  return getUserPermissions(user).exams === "read_only";
}
