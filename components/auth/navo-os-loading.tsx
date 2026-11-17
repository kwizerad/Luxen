"use client";

import { useBrandingConfig } from "@/lib/branding-config";

interface NavoOSLoadingProps {
  label?: string;
}

/**
 * Full-screen system Navo OS loading animation with zero cover card.
 * Matches the canonical boot loader in app/page.tsx.
 */
export function NavoOSLoading({ label }: NavoOSLoadingProps) {
  const { config } = useBrandingConfig();
  const displayLogoText = (config.logoText || "N").trim().charAt(0).toUpperCase() || "N";
  const displaySystemName = label || config.systemName || "Navo OS";

  return (
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#050816] text-white select-none"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center space-y-5">
        {/* Glowing App Badge */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-2xl text-emerald-400 shadow-lg shadow-emerald-500/10 animate-pulse">
            {displayLogoText}
          </div>
        </div>

        {/* Animated Ring Spinner & System Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <span className="text-[11px] font-mono tracking-widest text-emerald-400/80 uppercase">
            {displaySystemName}
          </span>
        </div>
      </div>
    </div>
  );
}
