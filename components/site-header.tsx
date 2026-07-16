"use client";

import Link from "next/link";
import Image from "next/image";
import { SettingsModal } from "@/components/settings-modal";
import { AuthButton } from "@/components/auth-button";
import { useBrandingConfig } from "@/lib/branding-config";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SiteHeader() {
  const { config } = useBrandingConfig();
  const router = useRouter();

  useEffect(() => {
    // Prefetch frequently visited pages
    router.prefetch("/dashboard");
    router.prefetch("/Admin");
    router.prefetch("/dashboard/settings");
  }, [router]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/60 backdrop-blur-xl shadow-lg">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <Link href="/" prefetch={true} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md relative">
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
            <span className="font-bold text-xl tracking-tight">{config.systemName}</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <SettingsModal />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
