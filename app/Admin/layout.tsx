"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  Users, LayoutDashboard,
  FileText, Lock, BookOpen,
  Search, Bell, Sun, Moon, Globe, Settings, LogOut, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { canViewStudents, canAddQuestions } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useNavAutohideEnabled } from "@/lib/use-nav-autohide";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

type Language = "English" | "Arabic" | "Kinyarwanda" | "French";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config } = useBrandingConfig();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const autohideEnabled = useNavAutohideEnabled();
  const { theme, setTheme } = useTheme();

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

  // Close dropdowns on route change
  useEffect(() => {
    setLangOpen(false);
    setProfileOpen(false);
  }, [pathname]);

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
    return (
      <div className="admin-portal min-h-screen flex items-center justify-center">
        <div className="admin-aurora" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-[var(--admin-border)] border-t-[var(--admin-primary)]" />
          <p className="text-sm text-[var(--admin-muted)]">Loading admin portal…</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/Admin", icon: LayoutDashboard, label: t("dashboard") },
    ...(canViewStudentsTab ? [{ href: "/Admin/users", icon: Users, label: t("users") }] : []),
    ...(canAddQuestionsTab ? [{ href: "/Admin/exams", icon: FileText, label: t("examManagementNav") }] : []),
    { href: "/Admin/course-management", icon: BookOpen, label: t("courseManagementNav") },
  ];

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: "English", label: "English", flag: "🇬🇧" },
    { value: "Arabic", label: "العربية", flag: "🇸🇦" },
    { value: "Kinyarwanda", label: "Kinyarwanda", flag: "🇷🇼" },
    { value: "French", label: "Français", flag: "🇫🇷" },
  ];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setLangOpen(false);
  };

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

      {/* Desktop layout: sidebar + content */}
      <div className="admin-shell">
        {/* Floating Sidebar (desktop only) */}
        <aside className="admin-sidebar hidden lg:flex">
          {/* Logo / Brand */}
          <Link href="/Admin" className="flex items-center gap-3 px-2 pb-4 mb-2 border-b border-[var(--admin-border)]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--admin-primary)] to-[var(--admin-secondary)] flex items-center justify-center overflow-hidden shadow-lg shadow-[var(--admin-primary)]/30 flex-shrink-0">
              {config.logoUrl ? (
                <Image
                  src={config.logoUrl}
                  alt={config.systemName}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span className="text-white font-bold text-sm">{config.logoText}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-[var(--admin-text)] truncate">{config.systemName}</p>
              <p className="text-[11px] text-[var(--admin-muted)]">Admin Console</p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="admin-sidebar-label">Menu</div>
          <nav className="admin-sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/Admin"
                ? pathname === "/Admin"
                : pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn("admin-sidebar-item", isActive && "active")}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Settings link */}
          <div className="admin-sidebar-label mt-auto">Account</div>
          <nav className="admin-sidebar-nav">
            <Link href="/Admin/settings" className={cn("admin-sidebar-item", pathname.startsWith("/Admin/settings") && "active")}>
              <Settings />
              <span>{t("settings")}</span>
            </Link>
            {isPrimaryAdmin && (
              <Link href="/Admin/register" className={cn("admin-sidebar-item", pathname.startsWith("/Admin/register") && "active")}>
                <Users />
                <span>{t("registerAdmin") || "Register Admin"}</span>
              </Link>
            )}
          </nav>

          {/* User card at bottom */}
          <div className="mt-4 pt-4 border-t border-[var(--admin-border)]">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--admin-secondary)] to-[#8B5CF6] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(user?.user_metadata?.username || user?.email || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--admin-text)] truncate">
                  {user?.user_metadata?.username || user?.email}
                </p>
                <p className="text-[11px] text-[var(--admin-muted)] truncate">
                  {isPrimaryAdmin ? "Primary Admin" : "Administrator"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="admin-icon-btn !w-8 !h-8"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="admin-content">
          {/* Top Navigation Bar */}
          <header className="admin-topbar">
            {/* Mobile logo */}
            <Link href="/Admin" className="flex items-center gap-2 lg:hidden flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--admin-primary)] to-[var(--admin-secondary)] flex items-center justify-center overflow-hidden shadow-md shadow-[var(--admin-primary)]/25">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xs">{config.logoText}</span>
                )}
              </div>
              <span className="font-bold text-sm text-[var(--admin-text)]">{config.systemName}</span>
            </Link>

            {/* Search bar */}
            <div className="admin-topbar-search hidden md:flex">
              <Search className="w-4 h-4 text-[var(--admin-muted)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search…"
                aria-label="Search"
              />
              <kbd className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[10px] text-[var(--admin-muted)] font-mono">
                ⌘K
              </kbd>
            </div>

            {/* Actions */}
            <div className="admin-topbar-actions">
              {/* Language selector */}
              <div className="relative">
                <button
                  className="admin-icon-btn"
                  onClick={() => setLangOpen(!langOpen)}
                  aria-label="Language"
                >
                  <Globe />
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 200 }}
                      className="absolute right-0 top-12 z-50 admin-card !rounded-2xl p-2 min-w-[180px]"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.value}
                          onClick={() => handleLanguageChange(lang.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left",
                            language === lang.value
                              ? "bg-[var(--admin-card-hover)] text-[var(--admin-text)]"
                              : "text-[var(--admin-muted)] hover:bg-[var(--admin-hover-bg)] hover:text-[var(--admin-text)]"
                          )}
                        >
                          <span className="text-base">{lang.flag}</span>
                          <span>{lang.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme toggle */}
              <button
                className="admin-icon-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </button>

              {/* Notifications */}
              <Link href="/Admin/settings" className="admin-icon-btn relative" aria-label="Notifications">
                <Bell />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444]" />
              </Link>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] hover:bg-[var(--admin-card-hover)] transition-colors"
                  aria-label="Profile"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--admin-secondary)] to-[#8B5CF6] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {(user?.user_metadata?.username || user?.email || "A").charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[var(--admin-muted)]" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 200 }}
                      className="absolute right-0 top-14 z-50 admin-card !rounded-2xl p-2 min-w-[220px]"
                    >
                      <div className="px-3 py-2 mb-1 border-b border-[var(--admin-border)]">
                        <p className="text-sm font-medium text-[var(--admin-text)] truncate">
                          {user?.user_metadata?.username || "Admin"}
                        </p>
                        <p className="text-xs text-[var(--admin-muted)] truncate">{user?.email}</p>
                      </div>
                      <Link href="/Admin/settings" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-hover-bg)] hover:text-[var(--admin-text)] transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>{t("settings")}</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--admin-muted)] hover:bg-[#EF4444]/10 hover:text-[#F87171] transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 pb-28 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation — floating pill */}
      {!navVisible && autohideEnabled && (
        <div
          className="fixed bottom-1.5 left-3 right-3 z-40 lg:hidden h-1 rounded-full bg-[var(--admin-primary)] transition-opacity duration-300"
          style={{ boxShadow: "0 0 12px 2px rgba(37,99,235,0.8), 0 0 24px 6px rgba(37,99,235,0.4)" }}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed bottom-3 left-3 right-3 z-50 lg:hidden transition-all duration-300 ${
          navVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-[120%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="admin-nav-pill premium-glass-panel border rounded-[20px] h-14 overflow-hidden shadow-lg">
          <div className={`grid h-full`} style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
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
                  <span className={cn("text-xs font-medium transition-all duration-200 truncate max-w-full px-1", isActive && "scale-105")}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[var(--admin-primary)] rounded-full" />
                  )}
                </button>
              );
            })}
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
