"use client";

import { useEffect } from "react";
import { useThemeConfig } from "@/lib/theme-config";

export function BackgroundManager() {
  const { config } = useThemeConfig();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const mode = config.backgroundMode || "solid";

    body.classList.remove("mesh-gradient-bg");
    if (mode === "gradient") {
      html.classList.add("mesh-gradient-bg");
    } else {
      html.classList.remove("mesh-gradient-bg");
    }
  }, [config.backgroundMode]);

  return null;
}
