"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { LogOut } from "lucide-react";
import { DockNav } from "@/components/dock-nav";
import { FloatingHeader } from "@/components/floating-header";
import { useLanguage } from "@/lib/language-context";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const { config } = useBrandingConfig();
  const [isExamActive, setIsExamActive] = useState(false);

  // Check if exam is active (to hide dock nav during exam)
  useEffect(() => {
    const checkExamActive = () => {
      setIsExamActive(sessionStorage.getItem('exam-active') === 'true');
    };
    checkExamActive();
    const handleExamStateChange = () => checkExamActive();
    window.addEventListener('exam-state-change', handleExamStateChange);
    window.addEventListener('storage', handleExamStateChange);
    return () => {
      window.removeEventListener('exam-state-change', handleExamStateChange);
      window.removeEventListener('storage', handleExamStateChange);
    };
  }, []);

  // Pages where the inline header (logo + logout) is hidden; only the
  // FloatingHeader (notifications + user settings) remains.
  const HIDE_INLINE_HEADER_PATHS = ["/dashboard", "/dashboard/exam", "/dashboard/settings", "/dashboard/course", "/dashboard/services"];
  const showInlineHeader = !HIDE_INLINE_HEADER_PATHS.includes(pathname);

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
    return null;
  }

  return (
    <div className="bg-transparent" dir={isRTL ? "rtl" : "ltr"}>
      {/* Inline Header (hidden on /dashboard, /dashboard/exam, /dashboard/settings) */}
      {showInlineHeader && (
        <div
          id="floating-header"
          className="premium-glass-panel sticky top-0 left-0 right-0 z-50 border-b transition-all duration-300"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md relative">
                {config.logoUrl ? (
                  <Image
                    src={config.logoUrl}
                    alt={config.systemName}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="40px"
                  />
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
      )}

      <FloatingHeader />

      {/* Main Content */}
      <main className="min-w-0">
        {children}
      </main>

      {/* Bottom Navigation (hidden during active exam) */}
      {!isExamActive && <DockNav />}
    </div>
  );
}
