"use client";

import { useBrandingConfig } from "@/lib/branding-config";

export function Watermark() {
  const { config } = useBrandingConfig();

  return (
    <div className="navo-watermark brand-protected">
      {config.systemName}
    </div>
  );
}
