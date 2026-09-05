"use client";

import { useEffect, useState } from "react";
import { PWAInstallPrompt } from "./pwa-install-prompt";
import { VisitorTracker } from "./visitor-tracker";
import { useLoginRecorder } from "@/hooks/use-login-recorder";

function LoginRecorder() {
  useLoginRecorder();
  return null;
}

export function ClientComponents() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything during SSR to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <>
      <PWAInstallPrompt />
      <VisitorTracker />
      <LoginRecorder />
    </>
  );
}

