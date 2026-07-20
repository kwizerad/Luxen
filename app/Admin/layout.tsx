"use client";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  Users, Settings, UserPlus, LogOut, LayoutDashboard,
  Menu, X, FileText, Lock, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { canViewStudents, canAddQuestions, canViewQuestions } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { FloatingHeader } from "@/components/floating-header";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useTextSize, sidebarLabelClass } from "@/lib/use-text-size";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const textSize = useTextSize();

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
    // Close mobile menu on route change
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const canViewStudentsTab = canViewStudents(user);
  const canAddQuestionsTab = canAddQuestions(user);
  const canViewQuestionsTab = canViewQuestions(user);

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
          <div className="fixed top-4 left-4 z-50 bg-card/75 backdrop-blur-[24px] border border-border/20 rounded-[18px] shadow-glass dark:shadow-glass-dark px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
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
          <FloatingHeader />
          <div className="p-4 lg:p-8 pb-24 lg:pb-20">
            {children}
          </div>
        </main>

        {/* Desktop Bottom Sidebar */}
        <aside
          data-sidebar="true"
          className={`hidden lg:flex bg-card/70 backdrop-blur-[24px] border-t border-border/20 flex-row transition-all duration-300 fixed bottom-0 left-0 right-0 z-50 shadow-glass dark:shadow-glass-dark ${
            sidebarOpen ? "h-16" : "h-12"
          }`}
        >
          <div className="flex-1 flex items-center justify-center gap-2 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-[14px] transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-primary to-[#3B82F6] text-primary-foreground shadow-md shadow-primary/25"
                      : "hover:bg-muted/60"
                  )}
                  title={item.label}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className={cn(sidebarLabelClass(textSize), "whitespace-nowrap")}>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Mobile Bottom Sidebar */}
        <aside className={`lg:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-[24px] border-t border-border/20 z-50 shadow-glass dark:shadow-glass-dark ${mobileMenuOpen ? 'h-auto' : 'h-16'}`}>
          {mobileMenuOpen ? (
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">{t("menu")}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-[14px] transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary to-[#3B82F6] text-primary-foreground shadow-md shadow-primary/25"
                        : "hover:bg-muted/60"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-border my-2" />
              <Link
                href="/Admin/settings"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[14px] transition-all duration-200",
                  pathname === "/Admin/settings"
                    ? "bg-gradient-to-r from-primary to-[#3B82F6] text-primary-foreground shadow-md shadow-primary/25"
                    : "hover:bg-muted/60"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span>{t("settings")}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>{t("logout")}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-around h-full px-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
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
