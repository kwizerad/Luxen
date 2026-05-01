// Permission types and validation utilities

export interface AdminPermissions {
  students: {
    enabled: boolean;
    access: "read_only" | "read_write" | "none";
  };
  examPermissions: {
    enabled: boolean;
    canAddQuestions: boolean;
    canViewQuestions: boolean;
    canManageSettings: boolean;
    questionAccess: "read_only" | "read_write" | "none";
  };
}

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  students: {
    enabled: true,
    access: "read_write",
  },
  examPermissions: {
    enabled: true,
    canAddQuestions: true,
    canViewQuestions: true,
    canManageSettings: true,
    questionAccess: "read_write",
  },
};

export const PRIMARY_ADMIN_EMAIL = "Navo@admin.jn";

/**
 * Check if user is the primary admin
 */
export function isPrimaryAdmin(user: any): boolean {
  return user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: any): boolean {
  return user?.user_metadata?.role === "Admin" || isPrimaryAdmin(user);
}

/**
 * Get user permissions from metadata
 */
export function getUserPermissions(user: any): AdminPermissions {
  if (isPrimaryAdmin(user)) {
    // Primary admin has all permissions
    return {
      students: {
        enabled: true,
        access: "read_write",
      },
      examPermissions: {
        enabled: true,
        canAddQuestions: true,
        canViewQuestions: true,
        canManageSettings: true,
        questionAccess: "read_write",
      },
    };
  }
  
  return {
    ...DEFAULT_PERMISSIONS,
    ...user?.user_metadata?.permissions,
    examPermissions: {
      ...DEFAULT_PERMISSIONS.examPermissions,
      ...user?.user_metadata?.permissions?.examPermissions,
    },
  };
}

/**
 * Check if user can view students
 */
export function canViewStudents(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.students.enabled;
}

/**
 * Check if user has read-write access to students
 */
export function hasReadWriteStudentAccess(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.students.enabled && perms.students.access === "read_write";
}

/**
 * Check if user has read-only access to students
 */
export function hasReadOnlyStudentAccess(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.students.enabled && perms.students.access === "read_only";
}

/**
 * Check if user can add questions
 */
export function canAddQuestions(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.examPermissions.enabled && perms.examPermissions.canAddQuestions;
}

/**
 * Check if user can view questions
 */
export function canViewQuestions(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.examPermissions.enabled && perms.examPermissions.canViewQuestions;
}

export function canManageExamSettings(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.examPermissions.enabled && perms.examPermissions.canManageSettings;
}

/**
 * Check if user has read-write access to questions
 */
export function hasReadWriteQuestionAccess(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.examPermissions.enabled && perms.examPermissions.canViewQuestions && perms.examPermissions.questionAccess === "read_write";
}

/**
 * Check if user has read-only access to questions
 */
export function hasReadOnlyQuestionAccess(user: any): boolean {
  const perms = getUserPermissions(user);
  return perms.examPermissions.enabled && perms.examPermissions.canViewQuestions && perms.examPermissions.questionAccess === "read_only";
}
