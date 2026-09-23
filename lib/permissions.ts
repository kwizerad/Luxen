// Permission types and validation utilities

import { DEFAULT_ADMIN_EMAIL } from "./server-config";

export const PRIMARY_ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

export type PermissionAccess = "none" | "read_only" | "read_write";

export type PermissionKey =
  | "students"
  | "courseManagement"
  | "courseStudio"
  | "exams"
  | "settings"
  | "notifications"
  | "drivers";

export type PermissionSection = PermissionKey | "users";

export interface User {
  id?: string;
  email?: string | null;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
  national_id?: string;
  banned?: boolean;
  last_seen?: string;
  created_at?: string;
  user_metadata?: {
    role?: string;
    national_id?: string;
    permissions?: AdminPermissions | Record<string, any>;
    username?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
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

export const PERMISSION_SECTIONS: { key: PermissionKey; labelKey: string }[] = [
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
  if (!user?.email) return false;
  return (
    user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
    user.email.toLowerCase() === "navo@admin.jn"
  );
}

/**
 * Check if the user is a National ID based user
 */
export function isNationalIdUser(user: User | null): boolean {
  if (!user) return false;
  if (user.national_id && typeof user.national_id === "string" && user.national_id.trim().length > 0) return true;
  if (user.user_metadata?.national_id && typeof user.user_metadata.national_id === "string" && user.user_metadata.national_id.trim().length > 0) return true;
  if (user.email && /@nid\.(rw|internal|local)$/i.test(user.email)) return true;
  return false;
}

/**
 * Resolve effective role for user ("Admin", "Driver", "Student", or "Guest")
 */
export function getUserRole(user: User | null): "Admin" | "Driver" | "Student" | "Guest" {
  if (!user) return "Guest";
  if (isPrimaryAdmin(user)) return "Admin";

  const rawRole = (user.user_metadata?.role || user.role || "") as string;
  const normalized = typeof rawRole === "string" ? rawRole.trim().toLowerCase() : "";

  if (normalized === "admin") return "Admin";
  if (normalized === "driver") return "Driver";
  if (normalized === "student") return "Student";

  // ID-based users and standard authenticated accounts default to Student role
  return "Student";
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  return getUserRole(user) === "Admin";
}

/**
 * Check if user has driver role
 */
export function isDriver(user: User | null): boolean {
  if (!user) return false;
  return getUserRole(user) === "Driver";
}

/**
 * Check if user has student role
 */
export function isStudent(user: User | null): boolean {
  if (!user) return false;
  return getUserRole(user) === "Student";
}

/**
 * Check if user account is banned or suspended
 */
export function isUserBanned(user: User | null): boolean {
  if (!user) return false;
  return Boolean(user.banned || user.user_metadata?.banned);
}

/**
 * Migrate legacy or dynamic permissions to the standard AdminPermissions format
 */
export function migratePermissions(raw: any): AdminPermissions {
  if (!raw || typeof raw !== "object") return { ...NO_PERMISSIONS };

  const validAccess = (val: any): PermissionAccess => {
    if (val === "read_write" || val === "read_only" || val === "none") return val;
    return "none";
  };

  const rawStudents = raw.students ?? raw.users;

  // 1. Direct flat string format: { students: "read_write", exams: "read_only", ... }
  if (
    typeof rawStudents === "string" ||
    typeof raw.courseManagement === "string" ||
    typeof raw.courseStudio === "string" ||
    typeof raw.exams === "string" ||
    typeof raw.settings === "string" ||
    typeof raw.notifications === "string" ||
    typeof raw.drivers === "string"
  ) {
    return {
      students: validAccess(rawStudents),
      courseManagement: validAccess(raw.courseManagement),
      courseStudio: validAccess(raw.courseStudio),
      exams: validAccess(raw.exams),
      settings: validAccess(raw.settings),
      notifications: validAccess(raw.notifications),
      drivers: validAccess(raw.drivers),
    };
  }

  // 2. Nested access object format: { students: { access: "read_write" }, ... }
  if (rawStudents && typeof rawStudents === "object" && "access" in rawStudents) {
    return {
      students: validAccess(rawStudents?.access),
      courseManagement: validAccess(raw.courseManagement?.access ?? raw.courseManagement),
      courseStudio: validAccess(raw.courseStudio?.access ?? raw.courseStudio),
      exams: validAccess(raw.exams?.access ?? raw.exams),
      settings: validAccess(raw.settings?.access ?? raw.settings),
      notifications: validAccess(raw.notifications?.access ?? raw.notifications),
      drivers: validAccess(raw.drivers?.access ?? raw.drivers),
    };
  }

  // 3. Legacy format: { students: { enabled, access }, examPermissions: { ... } }
  const legacy = raw as {
    students?: { enabled?: boolean; access?: PermissionAccess };
    users?: { enabled?: boolean; access?: PermissionAccess };
    examPermissions?: { enabled?: boolean; questionAccess?: PermissionAccess; canManageSettings?: boolean };
  };
  const legacyStudents = legacy?.students ?? legacy?.users;
  return {
    students: legacyStudents?.enabled ? validAccess(legacyStudents.access ?? "read_write") : "none",
    courseManagement: "none",
    courseStudio: "none",
    exams: legacy?.examPermissions?.enabled ? validAccess(legacy.examPermissions.questionAccess ?? "read_write") : "none",
    settings: legacy?.examPermissions?.canManageSettings ? "read_write" : "none",
    notifications: "none",
    drivers: "none",
  };
}

/**
 * Get user permissions from metadata
 */
export function getUserPermissions(user: User | null): AdminPermissions {
  if (!user) return { ...NO_PERMISSIONS };
  if (isPrimaryAdmin(user)) {
    return { ...ALL_PERMISSIONS };
  }
  if (isAdmin(user)) {
    const customPerms = user.user_metadata?.permissions;
    if (!customPerms || (typeof customPerms === "object" && Object.keys(customPerms).length === 0)) {
      return { ...ALL_PERMISSIONS };
    }
    return migratePermissions(customPerms);
  }
  return { ...NO_PERMISSIONS };
}

/**
 * Check if the user is authorized to take exams
 */
export function canTakeExams(user: User | null, standaloneExamEnabled: boolean = true): boolean {
  if (!user) return false;
  if (isUserBanned(user)) return false;
  if (isAdmin(user)) return true;
  return standaloneExamEnabled;
}

/**
 * Check if user can access a service based on feature flags and user state
 */
export function canAccessService(
  user: User | null,
  serviceKey: string,
  servicesPageEnabled: boolean = true,
  serviceItemEnabled: boolean = true
): boolean {
  if (!user) return false;
  if (isUserBanned(user)) return false;
  if (isAdmin(user)) return true;
  if (!servicesPageEnabled) return false;
  return serviceItemEnabled;
}

/**
 * Check if user can access a section at all (read or write)
 */
export function canAccess(user: User | null, section: PermissionSection | string): boolean {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const key = (section === "users" ? "students" : section) as keyof AdminPermissions;
  const perms = getUserPermissions(user);
  return (perms[key] ?? "none") !== "none";
}

/**
 * Check if user has read access to a section
 */
export function canRead(user: User | null, section: PermissionSection | string): boolean {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const key = (section === "users" ? "students" : section) as keyof AdminPermissions;
  const access = getUserPermissions(user)[key] ?? "none";
  return access === "read_only" || access === "read_write";
}

/**
 * Check if user has write access to a section
 */
export function canWrite(user: User | null, section: PermissionSection | string): boolean {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const key = (section === "users" ? "students" : section) as keyof AdminPermissions;
  return (getUserPermissions(user)[key] ?? "none") === "read_write";
}

// ── Backward-compatible helpers ──────────────────────────────────────────

export function canViewStudents(user: User | null): boolean {
  return canAccess(user, "students");
}

export function canViewUsers(user: User | null): boolean {
  return canAccess(user, "users");
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
