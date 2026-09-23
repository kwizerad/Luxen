"use client";

import { useEffect, useState } from "react";

export type TextSize = "sm" | "md" | "lg";

function getTextSizeFromRoot(): TextSize {
  if (typeof document === "undefined") return "md";

  const fontSize = document.documentElement.style.fontSize;
  if (fontSize === "14px") return "sm";
  if (fontSize === "18px") return "lg";
  return "md";
}

export function useTextSize(): TextSize {
  const [textSize, setTextSize] = useState<TextSize>("md");

  useEffect(() => {
    setTextSize(getTextSizeFromRoot());

    const observer = new MutationObserver(() => {
      setTextSize(getTextSizeFromRoot());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => observer.disconnect();
  }, []);

  return textSize;
}

export function sidebarLabelClass(textSize: TextSize): string {
  switch (textSize) {
    case "sm":
      return "text-xs";
    case "lg":
      return "text-base";
    default:
      return "text-sm";
  }
}
