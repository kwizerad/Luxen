"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users, LayoutDashboard,
  FileText, Lock,
  Settings, LogOut, BookOpen, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { canViewStudents, canAddQuestions } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useNavAutohideEnabled } from "@/lib/use-nav-autohide";
import { cn } from "@/lib/utils";
import { AdminLayoutSkeleton } from "@/components/skeletons";

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
  const [navVisible, setNavVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const autohideEnabled = useNavAutohideEnabled();

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

  // Cursor-proximity auto-hide (large screens only, respects user preference).
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!autohideEnabled) {
      setNavVisible(true);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const REVEAL_ZONE = 100;
    const HIDE_DELAY = 2500;

    const scheduleHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (window.innerWidth < 1024) setNavVisible(false);
      }, HIDE_DELAY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth >= 1024) {
        setNavVisible(true);
        return;
      }

      const nearBottom = e.clientY > window.innerHeight - REVEAL_ZONE;
      if (nearBottom) {
        setNavVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
      } else {
        scheduleHide();
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        if (hideTimer) clearTimeout(hideTimer);
        setNavVisible(true);
      } else {
        scheduleHide();
      }
    };

    if (window.innerWidth < 1024) scheduleHide();

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [autohideEnabled]);

  const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const canViewStudentsTab = canViewStudents(user);
  const canAddQuestionsTab = canAddQuestions(user);

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
    return <AdminLayoutSkeleton />;
  }

  const navItems = [
    { href: "/Admin", icon: LayoutDashboard, label: t("dashboard") },
    { href: "/Admin/course-management", icon: BookOpen, label: t("courseManagementNav") },
    { href: "/Admin/course-studio", icon: Layers, label: t("courseStudioNav") || "Studio" },
    ...(canViewStudentsTab ? [{ href: "/Admin/users", icon: Users, label: t("users") }] : []),
    ...(canAddQuestionsTab ? [{ href: "/Admin/exams", icon: FileText, label: t("examManagementNav") }] : []),
    { href: "/Admin/settings", icon: Settings, label: t("settings") },
    ...(isPrimaryAdmin ? [{ href: "/Admin/register", icon: Users, label: t("registerAdmin") }] : []),
  ];

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      router.push("/");
    }
  };

  return (
    <div className="admin-portal">
      {/* Aurora mesh gradient background */}
      <div className="admin-aurora" />

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

      {/* Bottom navigation — floating pill */}
      {!navVisible && autohideEnabled && (
        <div
          className="fixed bottom-1.5 left-3 right-3 z-40 h-1 rounded-full bg-[var(--admin-primary)] transition-opacity duration-300"
          style={{ boxShadow: "0 0 12px 2px rgba(37,99,235,0.8), 0 0 24px 6px rgba(37,99,235,0.4)" }}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed bottom-3 left-3 right-3 z-50 transition-all duration-300 ${
          navVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-[120%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="admin-nav-pill premium-glass-panel border rounded-[20px] h-14 overflow-hidden shadow-lg">
          <div className={`grid h-full`} style={{ gridTemplateColumns: `repeat(${navItems.length + 1}, minmax(0, 1fr))` }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/Admin"
                ? pathname === "/Admin"
                : pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "admin-nav-btn flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative rounded-xl mx-1 my-1",
                    isActive && "admin-nav-active font-semibold"
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="admin-nav-icon-wrap p-1.5 rounded-full transition-all duration-200">
                    <Icon className={cn("h-4 w-4 transition-all duration-200", isActive && "scale-110")} />
                  </div>
                  <span className={cn("hidden sm:inline text-xs font-medium transition-all duration-200 truncate max-w-full px-1", isActive && "scale-105")}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--admin-primary)] rounded-full" />
                  )}
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="admin-nav-btn flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative rounded-xl mx-1 my-1"
              aria-label="Logout"
            >
              <div className="admin-nav-icon-wrap p-1.5 rounded-full transition-all duration-200">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline text-xs font-medium transition-all duration-200 truncate max-w-full px-1">
                {t("logout")}
              </span>
            </button>
          </div>
        </div>
      </div>

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
