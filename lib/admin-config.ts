// Admin credentials configuration
// These credentials should be used to create the initial admin user in Supabase

import { DEFAULT_ADMIN_EMAIL } from "./server-config";

export const ADMIN_CREDENTIALS = {
  email: DEFAULT_ADMIN_EMAIL,
  password: "adminjohn",
  role: "Admin",
  username: "NavoAdmin",
};

// Instructions to create admin user:
// 1. Sign up with these credentials in the application
// 2. Or use Supabase Dashboard > Authentication > Users > Add User
// 3. Update user metadata to include role: "Admin"
