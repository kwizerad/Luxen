"use client";

import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { LiveExamView } from "@/components/spa-views/live-exam-view";

/**
 * Public, always-free driving exam results checker. No login required —
 * intentionally kept outside the /dashboard auth-gated layout.
 */
export default function PublicResultsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <SiteHeader />
      <LiveExamView navigate={() => router.push("/")} />
    </div>
  );
}
