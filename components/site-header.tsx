"use client";

import Link from "next/link";
import { SettingsModal } from "@/components/settings-modal";
import { AuthButton } from "@/components/auth-button";
import { useBrandingConfig } from "@/lib/branding-config";

export function SiteHeader() {
  const { config } = useBrandingConfig();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
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
