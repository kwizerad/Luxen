"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FloatingHeader } from "@/components/floating-header";

export default function UserExamLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

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

  if (authLoading || !user || isPrimaryAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <FloatingHeader />
      <main className="min-w-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
