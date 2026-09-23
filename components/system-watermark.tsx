"use client";

import { useBrandingConfig } from "@/lib/branding-config";

export function SystemWatermark() {
  const { config } = useBrandingConfig();
  const systemName = config.systemName || "Navo";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.02]">
        <div className="text-[20vw] font-bold tracking-tighter text-foreground select-none transform -rotate-12">
          {systemName}
        </div>
      </div>
    </div>
  );
}
