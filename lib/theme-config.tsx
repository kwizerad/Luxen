"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeConfig {
  light: {
    primaryColor: string;
    hoverBorderColor: string;
  };
  dark: {
    primaryColor: string;
    hoverBorderColor: string;
  };
  glowIntensity: number;
}

interface ThemeConfigContextType {
  config: ThemeConfig;
  setLightPrimaryColor: (color: string) => void;
  setLightHoverBorderColor: (color: string) => void;
  setDarkPrimaryColor: (color: string) => void;
  setDarkHoverBorderColor: (color: string) => void;
  setGlowIntensity: (intensity: number) => void;
  saveConfig: (newConfig: ThemeConfig) => void;
  resetToDefault: () => void;
}

const defaultConfig: ThemeConfig = {
  light: {
    primaryColor: "#22C55E", // Default green
    hoverBorderColor: "#22C55E", // Default green
  },
  dark: {
    primaryColor: "#22C55E", // Default green
    hoverBorderColor: "#22C55E", // Default green
  },
  glowIntensity: 30, // Default 30px glow
};

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

export function ThemeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved config from localStorage and apply immediately
    const saved = localStorage.getItem("navo-theme-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migrate old format to new format if needed
        let configToUse = parsed;
        if (parsed.primaryColor && !parsed.light) {
          // Old format detected - migrate to new format
          configToUse = {
            light: {
              primaryColor: parsed.primaryColor,
              hoverBorderColor: parsed.hoverBorderColor || parsed.primaryColor,
            },
            dark: {
              primaryColor: parsed.primaryColor,
              hoverBorderColor: parsed.hoverBorderColor || parsed.primaryColor,
            },
            glowIntensity: parsed.glowIntensity || 30,
          };
          // Save migrated config
          localStorage.setItem("navo-theme-config", JSON.stringify(configToUse));
          console.log("Migrated old theme config to new format:", configToUse);
        }
        
        setConfig(configToUse);
        applyThemeConfig(configToUse);
        console.log("Theme config loaded and applied:", configToUse);
      } catch (e) {
        console.error("Failed to parse theme config:", e);
        applyThemeConfig(defaultConfig);
      }
    } else {
      console.log("No saved theme config, using default");
      applyThemeConfig(defaultConfig);
    }
    setMounted(true);

    // Listen for theme changes and re-apply colors
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Re-apply theme colors when theme changes
          const currentConfig = JSON.parse(localStorage.getItem("navo-theme-config") || JSON.stringify(defaultConfig));
          applyThemeConfig(currentConfig);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const applyThemeConfig = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    // Get the appropriate theme colors based on current mode
    const themeColors = isDark ? themeConfig.dark : themeConfig.light;
    
    // Convert hex to HSL for primary color
    const hsl = hexToHSL(themeColors.primaryColor);
    if (hsl) {
      // Set primary and related colors
      root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty("--primary-foreground", hsl.l > 50 ? "0 0% 0%" : "0 0% 100%");
      
      // Set ring to match primary
      root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      
      // Set accent (slightly darker version of primary)
      const accentL = Math.max(0, hsl.l - 10);
      root.style.setProperty("--accent", `${hsl.h} ${hsl.s}% ${accentL}%`);
      root.style.setProperty("--accent-foreground", accentL > 50 ? "0 0% 0%" : "0 0% 100%");
      
      // Set chart colors (variations of primary)
      root.style.setProperty("--chart-1", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty("--chart-2", `${hsl.h} ${hsl.s}% ${Math.max(0, hsl.l - 5)}%`);
      root.style.setProperty("--chart-3", `${(hsl.h + 10) % 360} ${Math.max(0, hsl.s - 10)}% ${hsl.l}%`);
      root.style.setProperty("--chart-4", `${(hsl.h - 10 + 360) % 360} ${Math.max(0, hsl.s - 10)}% ${hsl.l}%`);
      root.style.setProperty("--chart-5", `${(hsl.h + 20) % 360} ${Math.max(0, hsl.s - 15)}% ${hsl.l}%`);
    }
    
    // Apply hover border color
    root.style.setProperty("--hover-border-color", themeColors.hoverBorderColor);
    
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

  const setLightPrimaryColor = (color: string) => {
    const newConfig = { ...config, light: { ...config.light, primaryColor: color } };
    setConfig(newConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(newConfig));
    applyThemeConfig(newConfig);
  };

  const setLightHoverBorderColor = (color: string) => {
    const newConfig = { ...config, light: { ...config.light, hoverBorderColor: color } };
    setConfig(newConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(newConfig));
    applyThemeConfig(newConfig);
  };

  const setDarkPrimaryColor = (color: string) => {
    const newConfig = { ...config, dark: { ...config.dark, primaryColor: color } };
    setConfig(newConfig);
    localStorage.setItem("navo-theme-config", JSON.stringify(newConfig));
    applyThemeConfig(newConfig);
  };

  const setDarkHoverBorderColor = (color: string) => {
    const newConfig = { ...config, dark: { ...config.dark, hoverBorderColor: color } };
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

  const saveConfig = (newConfig: ThemeConfig) => {
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
        setLightPrimaryColor,
        setLightHoverBorderColor,
        setDarkPrimaryColor,
        setDarkHoverBorderColor,
        setGlowIntensity,
        saveConfig,
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
