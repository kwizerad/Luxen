"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { FloatingHeader } from "@/components/floating-header";
import { AdminDockNav } from "@/components/admin-dock-nav";

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

  // Track admin activity for real-time online status
  useActivityTracker();

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.classList.add("admin-portal-active");
    return () => document.body.classList.remove("admin-portal-active");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAdmin = async () => {
      try {
        const user = await getCurrentUser();

        // Allow access if user is primary admin OR has Admin role
        const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const hasAdminRole = user?.user_metadata?.role === "Admin";

        if (!user || (!isPrimaryAdmin && !hasAdminRole)) {
          router.push("/");
          return;
        }

        setUser(user);

        // Check if password change is required
        if (user?.user_metadata?.require_password_change && !isPrimaryAdmin) {
          setShowPasswordChange(true);
        }

        setLoading(false);
      } catch (error) {
        console.error("Check admin error:", error);
        router.push("/");
      }
    };

    checkAdmin();
  }, [router]);

  const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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
          require_password_change: false,
          role: "Admin",
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
    <div className="admin-portal">
      {/* Aurora mesh gradient background */}
      <div className="admin-aurora" />

      {/* Floating header (profile avatar + notifications) */}
      <FloatingHeader adminMode />

      {/* Admin layout: bottom nav only */}
      <div className="admin-shell">
        {/* Main content area */}
        <div className="admin-content">
          {/* Page content */}
          <main className="flex-1 pb-28">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom navigation — Dock */}
      <AdminDockNav user={user} isPrimaryAdmin={isPrimaryAdmin} />

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="admin-card !rounded-[24px] max-w-md w-full p-6">
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
          </div>
        </div>
      )}
    </div>
  );
}
