"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { Monitor, Tablet, Smartphone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface DevicePreviewFrameProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DevicePreviewFrame({
  children,
  title,
  subtitle,
}: DevicePreviewFrameProps) {
  const { t } = useLanguage();
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [isLandscape, setIsLandscape] = useState(false);

  return (
    <div className="space-y-4">
      {/* Device Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)]">
        <div className="flex items-center gap-2">
          {title && <span className="text-xs font-semibold text-[var(--admin-text)]">{title}</span>}
          {subtitle && <span className="text-[11px] text-[var(--admin-muted)]">({subtitle})</span>}
        </div>

        <div className="flex items-center gap-1 bg-[var(--admin-hover-bg)] p-1 rounded-md">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDevice("desktop")}
            className={`h-7 px-2 text-xs gap-1.5 rounded transition-all ${
              device === "desktop"
                ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm font-medium"
                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("desktop") || "Desktop"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDevice("tablet")}
            className={`h-7 px-2 text-xs gap-1.5 rounded transition-all ${
              device === "tablet"
                ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm font-medium"
                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            <Tablet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tablet") || "Tablet"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDevice("mobile")}
            className={`h-7 px-2 text-xs gap-1.5 rounded transition-all ${
              device === "mobile"
                ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm font-medium"
                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("mobile") || "Mobile"}</span>
          </Button>

          {device !== "desktop" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsLandscape(!isLandscape)}
              title={t("toggleOrientation") || "Toggle orientation"}
              className="h-7 w-7 p-0 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center w-full transition-all duration-300">
        {device === "desktop" && (
          <div className="w-full max-w-4xl transition-all">
            {children}
          </div>
        )}

        {device === "tablet" && (
          <div
            className={`transition-all duration-300 rounded-[28px] border-[10px] border-neutral-800 bg-[var(--admin-card)] p-4 shadow-2xl overflow-hidden ${
              isLandscape ? "w-[820px] min-h-[560px]" : "w-[640px] min-h-[780px]"
            }`}
          >
            <div className="w-full flex justify-center mb-3">
              <div className="h-1.5 w-12 rounded-full bg-neutral-600/40" />
            </div>
            <div className="max-h-[700px] overflow-y-auto pr-1">
              {children}
            </div>
          </div>
        )}

        {device === "mobile" && (
          <div
            className={`transition-all duration-300 rounded-[36px] border-[10px] border-neutral-900 bg-[var(--admin-card)] p-3.5 shadow-2xl overflow-hidden ${
              isLandscape ? "w-[660px] min-h-[360px]" : "w-[375px] min-h-[680px]"
            }`}
          >
            <div className="w-full flex justify-center mb-3">
              <div className="h-4 w-28 rounded-full bg-neutral-900 flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-neutral-700" />
                <div className="h-1 w-8 rounded-full bg-neutral-800" />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto pr-1">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
