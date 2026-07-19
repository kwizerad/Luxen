"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { LayoutDashboard, FileText, Settings, LogOut, Trophy, BookOpen } from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FloatingHeader } from "@/components/floating-header";
import { useLanguage } from "@/lib/language-context";
import { getCourseLanguages } from "@/lib/supabase/queries";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const sidebarHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const { config } = useBrandingConfig();
  const [hasPublishedCourses, setHasPublishedCourses] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isExamActive, setIsExamActive] = useState(false);

  // Track user activity for real-time online status
  useActivityTracker();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    if (isPrimaryAdmin(user)) {
      router.push("/Admin");
    }
  }, [authLoading, user, router]);

  // Check for published courses
  useEffect(() => {
    const checkPublishedCourses = async () => {
      if (!user) return;

      try {
        const data = await getCourseLanguages();
        setHasPublishedCourses(data.languages && data.languages.length > 0);
      } catch (error) {
        console.error("Failed to check published courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    checkPublishedCourses();
  }, [user]);

  // Check for active exam
  useEffect(() => {
    const checkActiveExam = async () => {
      if (!user) return;

      try {
        const supabase = createClient();
        const { data: activeAttempt } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "in_progress")
          .single();

        setIsExamActive(!!activeAttempt);
      } catch (error) {
        console.error("Failed to check active exam:", error);
      }
    };

    checkActiveExam();
  }, [user]);

  // Handle sidebar hover
  const handleSidebarMouseEnter = () => {
    if (sidebarHideTimeout.current) {
      clearTimeout(sidebarHideTimeout.current);
    }
    setIsHoveringSidebar(true);
    setSidebarOpen(true);
  };

  const handleSidebarMouseLeave = () => {
    setIsHoveringSidebar(false);
    sidebarHideTimeout.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 300);
  };

  // Floating header on scroll
  useEffect(() => {
    const handleScroll = () => {
      const floatingHeader = document.getElementById("floating-header");
      if (floatingHeader) {
        if (window.scrollY > 100) {
          floatingHeader.classList.remove("opacity-0", "translate-y-[-100%]");
        } else {
          floatingHeader.classList.add("opacity-0", "translate-y-[-100%]");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sidebarLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    ...(hasPublishedCourses ? [{ href: "/dashboard/course", icon: BookOpen, label: t("courses") }] : []),
    { href: "/dashboard/exam", icon: Trophy, label: t("exams") },
    { href: "/dashboard/settings", icon: Settings, label: t("settings") },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Floating Header */}
      <div
        id="floating-header"
        className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border opacity-0 translate-y-[-100%] transition-all duration-300"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md relative">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-lg">{config.logoText}</span>
              )}
            </div>
            <span className="font-bold text-lg tracking-tight">{config.systemName}</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md relative">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-lg">{config.logoText}</span>
              )}
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg tracking-tight">{config.systemName}</span>
            )}
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <link.icon className="h-5 w-5" />
              {sidebarOpen && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            {sidebarOpen && t("logout")}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="p-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
