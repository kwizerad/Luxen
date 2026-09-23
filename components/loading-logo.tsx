"use client";

import Image from "next/image";
import { useBrandingConfig } from "@/lib/branding-config";

export function LoadingLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { config } = useBrandingConfig();
  const sizeClasses = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-12 w-12 rounded-xl",
    lg: "h-14 w-14 rounded-2xl",
  };
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  };
  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} bg-primary overflow-hidden shadow-sm relative shrink-0`}>
      {config.logoUrl ? (
        <Image
          src={config.logoUrl}
          alt={config.systemName}
          fill
          unoptimized
          className="object-cover"
          sizes={size === "sm" ? "32px" : size === "md" ? "48px" : "56px"}
        />
      ) : (
        <span className={`${textSizes[size]} font-bold text-primary-foreground`}>
          {config.logoText || config.systemName?.charAt(0) || "N"}
        </span>
      )}
    </div>
  );
}
