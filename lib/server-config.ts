// Server-side configuration utilities
// These can be used in API routes and server components

export function getAdminEmail(): string {
  // In a real application, this would come from a database or environment variable
  // For now, we'll use a default that can be overridden by environment variable
  return process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";
}

export function getSystemName(): string {
  // In a real application, this would come from a database or environment variable
  // For now, we'll use a default that can be overridden by environment variable
  return process.env.NEXT_PUBLIC_SYSTEM_NAME || "Navo";
}

// Default values for module-level imports
export const DEFAULT_ADMIN_EMAIL = "admin@example.com";
export const DEFAULT_SYSTEM_NAME = "Navo";
export const DEFAULT_LOGO_TEXT = "N";