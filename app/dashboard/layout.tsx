"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { LogOut } from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FloatingHeader } from "@/components/floating-header";
import { useLanguage } from "@/lib/language-context";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const { config } = useBrandingConfig();

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
      <div className="flex items-center justify-center min-h-[100dvh] bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-transparent" dir={isRTL ? "rtl" : "ltr"}>
      {/* Floating Header */}
      <div
        id="floating-header"
        className="premium-glass-panel fixed top-0 left-0 right-0 z-50 border-b opacity-0 translate-y-[-100%] transition-all duration-300"
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

      <FloatingHeader />

      {/* Main Content */}
      <main className="min-w-0">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
