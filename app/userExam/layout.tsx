"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FloatingHeader } from "@/components/floating-header";
import { StudentLayoutSkeleton } from "@/components/skeletons";

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
    return <StudentLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <FloatingHeader />
      <main className="min-w-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
