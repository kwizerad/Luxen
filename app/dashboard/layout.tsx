"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { useBrandingConfig } from "@/lib/branding-config";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Settings, LogOut, Trophy, Car } from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FloatingHeader } from "@/components/floating-header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const sidebarHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const { config } = useBrandingConfig();
  
  // Check if we're on exam page and if exam is active
  const isExamPage = pathname === "/dashboard/exam";
  const [isExamActive, setIsExamActive] = useState(false);
  
  // Check exam state immediately on mount and when pathname changes
  useEffect(() => {
    const checkExamActive = () => {
      if (typeof window === 'undefined') return false;
      
      const isExamPage = window.location.pathname === '/dashboard/exam';
      const examActiveFlag = sessionStorage.getItem('exam-active') === 'true';
      const isFullscreen = !!document.fullscreenElement || 
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).mozFullScreenElement ||
        !!(document as any).msFullscreenElement;
      
      const shouldHide = isExamPage && (examActiveFlag || isFullscreen);
      
      console.log('Exam check:', { isExamPage, examActiveFlag, isFullscreen, shouldHide });
      return shouldHide;
    };
    
    const updateExamState = () => {
      const shouldHide = checkExamActive();
      setIsExamActive(shouldHide);
    };
    
    // Immediate check
    updateExamState();
    
    // Also check after a short delay to ensure sessionStorage is set
    const timeoutId = setTimeout(updateExamState, 100);
    
    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      updateExamState();
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Listen for custom exam-state-change event
    const handleExamStateChange = () => {
      console.log('Exam state change event received');
      updateExamState();
    };
    window.addEventListener('exam-state-change', handleExamStateChange);
    
    // Aggressive polling every 100ms
    const intervalId = setInterval(updateExamState, 100);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('exam-state-change', handleExamStateChange);
    };
  }, [pathname]); // Re-run when pathname changes

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const supabase = createClient();

    const checkAuth = async () => {
      try {
        // First try getSession which is more reliable immediately after login
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // Suppress lock errors
          if (!sessionError.message?.includes("lock") && !sessionError.message?.includes("Lock")) {
            console.log("Session error:", sessionError.message);
          }
        }
        
        let user = session?.user || null;
        
        // If no session, try getUser as fallback
        if (!user) {
          const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            // Suppress lock errors
            if (!userError.message?.includes("lock") && !userError.message?.includes("Lock")) {
              console.log("User error:", userError.message);
            }
          }
          user = userData || null;
        }
        
        if (!isMounted) return;
        
        if (!user) {
          // Retry a few times in case session is still loading
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`No user found, retrying (${retryCount}/${maxRetries})...`);
            setTimeout(checkAuth, 800 * retryCount);
            return;
          }
          console.log("No user found after retries, redirecting to home");
          router.push("/");
          return;
        }

        if (isPrimaryAdmin(user)) {
          console.log("Primary admin detected, redirecting to Admin");
          router.push("/Admin");
          return;
        }

        console.log("User authenticated successfully:", user.email);
        setUserEmail(user.email ?? null);
        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Auth error, retrying (${retryCount}/${maxRetries})...`);
          setTimeout(checkAuth, 800 * retryCount);
          return;
        }
        router.push("/");
      }
    };
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user: { email: string | null } } | null) => {
      console.log("Auth state changed:", event);
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("User signed in via auth state change");
        if (isPrimaryAdmin(session.user)) {
          router.push("/Admin");
        } else {
          setUserEmail(session.user.email ?? null);
          setLoading(false);
        }
      }
    });
    
    checkAuth();
    
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!isHoveringSidebar) {
      if (sidebarHideTimeout.current) {
        clearTimeout(sidebarHideTimeout.current);
      }

      sidebarHideTimeout.current = setTimeout(() => {
        setSidebarOpen(false);
      }, 300);
    } else {
      if (sidebarHideTimeout.current) {
        clearTimeout(sidebarHideTimeout.current);
      }
    }

    return () => {
      if (sidebarHideTimeout.current) {
        clearTimeout(sidebarHideTimeout.current);
      }
    };
  }, [isHoveringSidebar]);

  const navItems = useMemo(() => ([
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/exam", label: "Take Exam", icon: FileText },
    { href: "/userExam", label: "My Exams", icon: Trophy },
    { href: "/dashboard/Driver", label: "Driver", icon: Car },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* CSS to force sidebar hide during exam */}
      <style jsx global>{`
        @media (min-width: 768px) {
          aside[data-exam-active="true"] {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Sidebar - Completely hidden during exam */}
      {!isExamActive && (
        <aside
          data-exam-active={isExamActive ? 'true' : 'false'}
          className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 sticky top-0 h-screen overflow-hidden ${sidebarOpen ? "w-64" : "w-20"}`}
          onMouseEnter={() => {
            setIsHoveringSidebar(true);
            setSidebarOpen(true);
          }}
          onMouseLeave={() => {
            setIsHoveringSidebar(false);
          }}
        >
          <div className="w-full h-full p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-3">
              <Link href="/dashboard" className="flex items-center gap-3 text-foreground hover:opacity-90 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold">{config.logoText || "N"}</span>
                  )}
                </div>
                <div className={`min-w-0 ${sidebarOpen ? "block" : "hidden"}`}>
                  <p className="text-sm font-bold truncate">{config.systemName}</p>
                  <p className="text-xs text-muted-foreground">User Dashboard</p>
                </div>
              </Link>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span className={`${sidebarOpen ? "text-sm font-medium" : "sr-only"}`}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto" />

            {/* Logout Button */}
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive w-full"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className={`${sidebarOpen ? "text-sm font-medium" : "sr-only"}`}>Logout</span>
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0 overflow-auto">
        {!isExamActive && <FloatingHeader />}
        {children}
      </div>
    </div>
  );
}

