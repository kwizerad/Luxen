"use client";

import { useEffect } from "react";
import { useThemeConfig } from "@/lib/theme-config";

export function BackgroundManager() {
  const { config } = useThemeConfig();

  useEffect(() => {
    const body = document.body;
    const mode = config.backgroundMode || "solid";

    if (mode === "gradient") {
      body.classList.add("mesh-gradient-bg");
    } else {
      body.classList.remove("mesh-gradient-bg");
    }
  }, [config.backgroundMode]);

  return null;
}
