"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { isAdmin, isPrimaryAdmin as checkIsPrimaryAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useLoginRecorder } from "@/hooks/use-login-recorder";
import { FloatingHeader } from "@/components/floating-header";
import { useThemeConfig } from "@/lib/theme-config";
import { AdminSpaProvider } from "@/lib/admin-spa-router";
import { AdminSpaViewport } from "@/components/admin/admin-spa-viewport";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const { config } = useThemeConfig();

  // Track admin activity for real-time online status
  useActivityTracker();
  useLoginRecorder();

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.classList.add("admin-portal-active");
    return () => document.body.classList.remove("admin-portal-active");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();

    const checkAdmin = async () => {
      try {
        const currentUser = await getCurrentUser();

        // Allow access ONLY if user is primary admin OR has Admin role
        const isPrimary =
          checkIsPrimaryAdmin(currentUser) ||
          currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const hasAdminRole = isAdmin(currentUser);

        if (!currentUser) {
          router.replace("/");
          return;
        }

        if (isStrictlyStudentEmail(currentUser.email)) {
          router.replace("/dashboard");
          return;
        }

        if (!isPrimary && !hasAdminRole) {
          router.replace("/dashboard");
          return;
        }

        setUser(currentUser);

        // Check if password change is required
        if (currentUser?.user_metadata?.require_password_change && !isPrimary) {
          setShowPasswordChange(true);
        }

        setLoading(false);
      } catch (error) {
        console.error("Check admin error:", error);
        router.replace("/");
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
        checkAdmin();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const isPrimaryAdmin = checkIsPrimaryAdmin(user) || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(t("passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }

    setChangingPassword(true);

    try {
      const supabase = createClient();

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        toast.error(passwordError.message);
        return;
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata || {}),
          require_password_change: false,
          role: "Admin",
          permissions: user?.user_metadata?.permissions,
          username: user?.user_metadata?.username,
          gender: user?.user_metadata?.gender,
        }
      });

      if (metadataError) {
        toast.error(metadataError.message);
        return;
      }

      toast.success(t("passwordChangedSuccess"));
      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || t("failedToChangePassword"));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AdminSpaProvider>
      <div className={`admin-portal ${config.backgroundMode === 'gradient' ? 'admin-bg-gradient' : 'admin-bg-solid'}`}>
        {/* Aurora mesh gradient background — only in gradient mode */}
        {config.backgroundMode === 'gradient' && config.backgroundEnabled !== false && (
          <div className="admin-aurora" />
        )}

        {/* Floating header (profile avatar + notifications) */}
        <FloatingHeader adminMode />

        {/* Admin layout */}
        <div className="admin-shell">
          {/* Main content area */}
          <div className="admin-content">
            {/* Page content — Unified 0ms Client-Side SPA Viewport */}
            <main className="flex-1 pb-24 lg:pb-10">
              <AdminSpaViewport />
            </main>
          </div>
        </div>

        {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
              className="admin-card !rounded-[24px] max-w-md w-full p-6 transform-gpu"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#F59E0B]/15 rounded-full">
                  <Lock className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <h2 className="text-xl font-bold text-[var(--admin-text)]">{t("changePasswordRequired")}</h2>
              </div>

              <p className="text-[var(--admin-muted)] mb-6 text-sm">
                {t("changePasswordRequiredDesc")}
              </p>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[var(--admin-text)]">{t("newPassword")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("enterNewPassword")}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[var(--admin-text)]">{t("confirmNewPassword")}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("confirmNewPassword")}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("changingPassword")}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {t("changePassword")}
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </AdminSpaProvider>
  );
}
