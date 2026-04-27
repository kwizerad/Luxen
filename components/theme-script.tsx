"use client";

import { useEffect } from "react";

export function ThemeScript() {
  useEffect(() => {
    const getTheme = () => {
      const stored = localStorage.getItem("theme");
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };
    const theme = getTheme();
    document.documentElement.classList.add(theme);
  }, []);

  return null;
}
