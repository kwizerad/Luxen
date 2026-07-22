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
  FileText, Lock, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { canViewStudents, canAddQuestions } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";
import { FloatingHeader } from "@/components/floating-header";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useNavAutohideEnabled } from "@/lib/use-nav-autohide";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

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
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const autohideEnabled = useNavAutohideEnabled();

  // Track admin activity for real-time online status
  useActivityTracker();



  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkAdmin = async () => {
      try {
        const user = await getCurrentUser();
        
        // Allow access if user is primary admin OR has Admin role
        const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const hasAdminRole = user?.user_metadata?.role === "Admin";
        
        if (!user || (!isPrimaryAdmin && !hasAdminRole)) {
          console.log("Access denied:", { email: user?.email, role: user?.user_metadata?.role });
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

  useEffect(() => {
    const scrollEl = document.querySelector('main');
    const handleScroll = () => {
      const y = scrollEl ? scrollEl.scrollTop : window.scrollY;
      setShowFloatingHeader(y > 100);
    };

    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Cursor-proximity auto-hide (large screens only, respects user preference).
  // Navbar hides after inactivity and reappears when the cursor
  // approaches the bottom of the viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If autohide is disabled, always show the navbar
    if (!autohideEnabled) {
      setNavVisible(true);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const REVEAL_ZONE = 100; // px from bottom that reveals the navbar
    const HIDE_DELAY = 2500; // ms of inactivity before hiding

    const scheduleHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (window.innerWidth >= 1024) setNavVisible(false);
      }, HIDE_DELAY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Always visible on small screens
      if (window.innerWidth < 1024) {
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

    const handleMouseLeave = () => {
      if (window.innerWidth >= 1024) scheduleHide();
    };

    // Keep navbar visible when resized to small screen; reschedule on large
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        if (hideTimer) clearTimeout(hideTimer);
        setNavVisible(true);
      } else {
        scheduleHide();
      }
    };

    // Start initial hide timer (only if starting on a large screen)
    if (window.innerWidth >= 1024) scheduleHide();

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
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
      
      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (passwordError) {
        toast.error(passwordError.message);
        return;
      }
      
      // Update user metadata to remove require_password_change flag
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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary/20 border-t-primary" />
      </div>
    );
  }

  const navItems = [
    { href: "/Admin", icon: LayoutDashboard, label: t("dashboard") },
    ...(canViewStudentsTab ? [{ href: "/Admin/users", icon: Users, label: t("users") }] : []),
    ...(canAddQuestionsTab ? [{ href: "/Admin/exams", icon: FileText, label: t("examManagementNav") }] : []),
    { href: "/Admin/course-management", icon: BookOpen, label: t("courseManagementNav") },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex flex-col h-screen">
        {/* Floating Header */}
        {showFloatingHeader && (
          <div className="premium-glass-panel fixed top-4 left-4 z-50 border rounded-[18px] px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
            <Link href="/Admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-[#3B82F6] rounded-full flex items-center justify-center overflow-hidden shadow-md shadow-primary/25 relative">
                {config.logoUrl ? (
                  <Image 
                    src={config.logoUrl} 
                    alt={config.systemName} 
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <span className="text-primary-foreground font-bold text-sm">{config.logoText}</span>
                )}
              </div>
              <span className="font-bold text-lg tracking-tight">{config.systemName}</span>
            </Link>
          </div>
        )}

        {/* Main Content */}
        <main
          className="flex-1 overflow-auto bg-transparent relative isolate"
          style={{ zIndex: 1 }}
        >
          <FloatingHeader adminMode />
          <div className="p-4 lg:p-8 pb-24 lg:pb-20">
            {children}
          </div>
        </main>

        {/* Bottom Navigation — floating pill (matches student MobileBottomNav) */}
        {/* Thin indicator line shown when navbar is hidden (autohide) */}
        {!navVisible && autohideEnabled && (
          <div
            className="fixed bottom-1.5 left-3 right-3 z-40 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2 h-1 rounded-full bg-primary transition-opacity duration-300"
            style={{ boxShadow: "0 0 12px 2px hsl(var(--primary) / 0.8), 0 0 24px 6px hsl(var(--primary) / 0.4)" }}
            aria-hidden="true"
          />
        )}
        <div
          className={`fixed bottom-3 left-3 right-3 z-50 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2 transition-all duration-300 ${
            navVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-[120%] opacity-0 pointer-events-none"
          }`}
        >
          <div className="premium-glass-panel admin-nav-pill border rounded-[20px] h-14 overflow-hidden shadow-lg">
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
                    <div className={cn(
                      "admin-nav-icon-wrap p-1.5 rounded-full transition-all duration-200"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4 transition-all duration-200",
                        isActive && "scale-110"
                      )} />
                    </div>
                    <span className={cn(
                      "text-xs font-medium transition-all duration-200 truncate max-w-full px-1",
                      isActive && "scale-105"
                    )}>
                      {item.label}
                    </span>
                    {/* Active indicator dot */}
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card/85 border border-border/20 rounded-[24px] max-w-md w-full p-6 shadow-glass dark:shadow-glass-dark backdrop-blur-[24px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100/20 rounded-full">
                <Lock className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold">{t("changePasswordRequired")}</h2>
            </div>
            
            <p className="text-muted-foreground mb-6">
              {t("changePasswordRequiredDesc")}
            </p>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("newPassword")}</Label>
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
                <Label htmlFor="confirm-password">{t("confirmNewPassword")}</Label>
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
