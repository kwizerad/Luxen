"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useBrandingConfig } from "@/lib/branding-config";
import { 
  Users, Settings, UserPlus, LogOut, LayoutDashboard, 
  ChevronLeft, ChevronRight, Menu, X, FileText, Lock, MoreVertical,
  PanelLeft, PanelLeftClose, PanelLeftOpen, MousePointer2
} from "lucide-react";
import { toast } from "sonner";
import { canViewStudents, canAddQuestions, canViewQuestions } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_EMAIL = "Navo@admin.jn";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config } = useBrandingConfig();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<"expanded" | "collapsed" | "auto">("auto");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isNearSidebarEdge, setIsNearSidebarEdge] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAdmin = async (retryCount = 0) => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        // Handle auth lock error by retrying
        if (error?.message?.includes("lock") && retryCount < 3) {
          console.log("Auth lock detected, retrying...", retryCount + 1);
          setTimeout(() => checkAdmin(retryCount + 1), 500 * (retryCount + 1));
          return;
        }
        
        if (error) {
          console.error("Auth error:", error);
          router.push("/");
          return;
        }
        
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

  // Sidebar visibility effect based on mode
  useEffect(() => {
    if (sidebarMode === "expanded") {
      setSidebarOpen(true);
    } else if (sidebarMode === "collapsed") {
      setSidebarOpen(false);
    }
    // "auto" mode is handled by the mouse detection effects
  }, [sidebarMode]);

  // Auto-hide sidebar when cursor leaves sidebar area (only in "auto" mode)
  useEffect(() => {
    if (sidebarMode !== "auto") return;

    const handleMouseEnter = () => {
      setIsHoveringSidebar(true);
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
        sidebarTimeoutRef.current = null;
      }
      setSidebarOpen(true);
    };

    const handleMouseLeave = () => {
      setIsHoveringSidebar(false);
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
      sidebarTimeoutRef.current = setTimeout(() => {
        setSidebarOpen(false);
      }, 500); // Hide after 500ms of not hovering
    };

    const sidebarElement = document.querySelector('[data-sidebar="true"]');
    if (sidebarElement) {
      sidebarElement.addEventListener('mouseenter', handleMouseEnter);
      sidebarElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
      if (sidebarElement) {
        sidebarElement.removeEventListener('mouseenter', handleMouseEnter);
        sidebarElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [sidebarMode]);

  // Detect cursor near left edge of screen to show sidebar in auto mode
  useEffect(() => {
    if (sidebarMode !== "auto") return;

    const handleMouseMove = (e: MouseEvent) => {
      const isNearEdge = e.clientX < 20; // Within 20px of left edge
      setIsNearSidebarEdge(isNearEdge);
      
      if (isNearEdge && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [sidebarMode, sidebarOpen]);

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
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
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
      
      toast.success("Password changed successfully!");
      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const navItems = [
    { href: "/Admin", icon: LayoutDashboard, label: "Dashboard" },
    ...(canViewStudentsTab ? [{ href: "/Admin/users", icon: Users, label: "Users" }] : []),
    ...(canAddQuestionsTab ? [{ href: "/Admin/exams", icon: FileText, label: "Exam Management" }] : []),
    ...(canViewQuestionsTab ? [{ href: "/Admin/questions", icon: FileText, label: "Questions" }] : []),
  ];

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between min-h-[73px]">
        {/* Title - always visible on mobile, conditionally on desktop */}
        <div className={`${sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden"} flex-1 min-w-0`}>
          <Link href="/Admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{config.logoText || "N"}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{config.systemName}</h1>
              <p className="text-sm text-muted-foreground mt-1 truncate max-w-[180px]">{user?.email}</p>
            </div>
          </Link>
        </div>
        {/* Desktop sidebar mode dropdown */}
        {!mobileMenuOpen && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`hidden lg:flex flex-shrink-0 ${!sidebarOpen ? "mx-auto" : ""}`}
              >
                {sidebarMode === "expanded" && <PanelLeftOpen className="h-5 w-5" />}
                {sidebarMode === "collapsed" && <PanelLeftClose className="h-5 w-5" />}
                {sidebarMode === "auto" && <MousePointer2 className="h-5 w-5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => setSidebarMode("expanded")}
                className={sidebarMode === "expanded" ? "bg-primary/10" : ""}
              >
                <PanelLeftOpen className="mr-2 h-4 w-4" />
                Expanded
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSidebarMode("collapsed")}
                className={sidebarMode === "collapsed" ? "bg-primary/10" : ""}
              >
                <PanelLeftClose className="mr-2 h-4 w-4" />
                Collapsed
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSidebarMode("auto")}
                className={sidebarMode === "auto" ? "bg-primary/10" : ""}
              >
                <MousePointer2 className="mr-2 h-4 w-4" />
                Automatic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-secondary"
              } ${!sidebarOpen && !mobileMenuOpen ? "lg:justify-center" : ""}`}
              title={!sidebarOpen && !mobileMenuOpen ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className={sidebarOpen || mobileMenuOpen ? "block" : "hidden lg:hidden"}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Mobile: Settings and Logout */}
        {mobileMenuOpen && (
          <>
            <div className="border-t border-border my-2" />
            <Link
              href="/Admin/settings"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                pathname === "/Admin/settings" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-secondary"
              }`}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full text-left text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </>
        )}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/Admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-lg font-bold text-foreground truncate">{config.systemName}</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="text-foreground"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      <div className="flex h-[calc(100vh-56px)] lg:h-screen">
        {/* Desktop Sidebar */}
        <aside 
          data-sidebar="true"
          className={`hidden lg:flex bg-card border-r border-border flex-col transition-all duration-300 sticky top-0 h-screen ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex-col z-50 lg:hidden flex">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main 
          className="flex-1 overflow-auto bg-background relative"
          onMouseEnter={() => {
            // In auto mode, when entering main content, keep sidebar behavior based on cursor position
            if (sidebarMode === "auto" && !isHoveringSidebar && !isNearSidebarEdge) {
              // Only hide if we're not near the edge and not hovering sidebar
              if (sidebarTimeoutRef.current) {
                clearTimeout(sidebarTimeoutRef.current);
              }
              sidebarTimeoutRef.current = setTimeout(() => {
                setSidebarOpen(false);
              }, 300);
            }
          }}
        >
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-card sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{config.logoText || "N"}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{config.systemName}</h1>
                <p className="text-sm text-muted-foreground">Admin Panel</p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/Admin/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold">Change Password Required</h2>
            </div>
            
            <p className="text-muted-foreground mb-6">
              For security reasons, you must change your default password (admin1234) before continuing.
            </p>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
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
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
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
