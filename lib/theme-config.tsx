"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeConfig {
  primaryColor: string;
  hoverBorderColor: string;
  glowIntensity: number;
}

interface ThemeConfigContextType {
  config: ThemeConfig;
  setPrimaryColor: (color: string) => void;
  setHoverBorderColor: (color: string) => void;
  setGlowIntensity: (intensity: number) => void;
  resetToDefault: () => void;
}

const defaultConfig: ThemeConfig = {
  primaryColor: "#22C55E", // Default green
  hoverBorderColor: "#22C55E", // Default green
  glowIntensity: 30, // Default 30px glow
};

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

export function ThemeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved config from localStorage
    const saved = localStorage.getItem("navo-theme-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        applyThemeConfig(parsed);
      } catch {
        applyThemeConfig(defaultConfig);
      }
    } else {
      applyThemeConfig(defaultConfig);
    }
  }, []);

  const applyThemeConfig = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for primary color
    const hsl = hexToHSL(themeConfig.primaryColor);
    if (hsl) {
      root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty("--primary-foreground", hsl.l > 50 ? "0 0% 0%" : "0 0% 100%");
    }
    
    // Apply hover border color
    root.style.setProperty("--hover-border-color", themeConfig.hoverBorderColor);
    
    // Apply glow intensity as CSS variable
    root.style.setProperty("--glow-intensity", `${themeConfig.glowIntensity}px`);
  };

  const hexToHSL = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const setPrimaryColor = (color: string) => {
    const newConfig = { ...config, primaryColor: color };
    setConfig(newConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(newConfig));
    applyThemeConfig(newConfig);
  };

  const setHoverBorderColor = (color: string) => {
    const newConfig = { ...config, hoverBorderColor: color };
    setConfig(newConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(newConfig));
    applyThemeConfig(newConfig);
  };

  const setGlowIntensity = (intensity: number) => {
    const newConfig = { ...config, glowIntensity: intensity };
    setConfig(newConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(newConfig));
    applyThemeConfig(newConfig);
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(defaultConfig));
    applyThemeConfig(defaultConfig);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeConfigContext.Provider
      value={{
        config,
        setPrimaryColor,
        setHoverBorderColor,
        setGlowIntensity,
        resetToDefault,
      }}
    >
      {children}
    </ThemeConfigContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeConfigContext);
  if (context === undefined) {
    throw new Error("useThemeConfig must be used within a ThemeConfigProvider");
  }
  return context;
}
