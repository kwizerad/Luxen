"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

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
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
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

const STORAGE_KEY = "navo-theme-config";

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

export function ThemeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig);
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Load theme config from API first, then localStorage as fallback
    const loadThemeConfig = async () => {
      if (typeof window === "undefined") return;

      try {
        // API reads session from cookies; no need for explicit auth header
        const response = await fetch('/api/system-config/theme_config');

        if (response.ok) {
          const data = await response.json();
          if (data.value) {
            const dbConfig = JSON.parse(data.value);
            setConfig(dbConfig);
            applyThemeConfig(dbConfig);
            console.log("Theme config loaded from API:", dbConfig);
            setMounted(true);
            return;
          }
        }
      } catch (error) {
        console.log("Could not load theme from API, using localStorage:", error);
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
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
            // Save migrated config to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(configToUse));
            console.log("Migrated old theme config to new format:", configToUse);
          }

          setConfig(configToUse);
          applyThemeConfig(configToUse);
          console.log("Theme config loaded from localStorage:", configToUse);
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
            const currentConfig = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(defaultConfig));
            applyThemeConfig(currentConfig);
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });

      return () => observer.disconnect();
    };

    loadThemeConfig();
  }, []);

  const applyThemeConfig = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    console.log("Applying theme config:", themeConfig);
    console.log("Current theme mode:", isDark ? "dark" : "light");
    
    // Get the appropriate theme colors based on current mode
    const themeColors = isDark ? themeConfig.dark : themeConfig.light;
    console.log("Theme colors being applied:", themeColors);
    
    // Convert hex to HSL for primary color
    const hsl = hexToHSL(themeColors.primaryColor);
    console.log("HSL conversion result:", hsl);
    
    if (hsl) {
      // Set primary and related colors
      root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      
      // Auto-adjust foreground color based on primary color brightness
      const isDarkColor = hsl.l < 40;
      if (isDarkColor) {
        // Dark primary color → light text
        root.style.setProperty("--primary-foreground", "0 0% 100%");
      } else {
        // Light primary color → dark text
        root.style.setProperty("--primary-foreground", "0 0% 0%");
      }
      
      // Set ring to match primary
      root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      
      // Set accent (slightly darker version of primary)
      const accentL = Math.max(0, hsl.l - 10);
      root.style.setProperty("--accent", `${hsl.h} ${hsl.s}% ${accentL}%`);
      
      // Auto-adjust accent foreground based on accent brightness
      if (accentL < 40) {
        // Dark accent → light text
        root.style.setProperty("--accent-foreground", "0 0% 100%");
      } else {
        // Light accent → dark text
        root.style.setProperty("--accent-foreground", "0 0% 0%");
      }
      
      // Set chart colors (variations of primary)
      root.style.setProperty("--chart-1", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      root.style.setProperty("--chart-2", `${hsl.h} ${hsl.s}% ${Math.max(0, hsl.l - 5)}%`);
      root.style.setProperty("--chart-3", `${(hsl.h + 10) % 360} ${Math.max(0, hsl.s - 10)}% ${hsl.l}%`);
      root.style.setProperty("--chart-4", `${(hsl.h - 10 + 360) % 360} ${Math.max(0, hsl.s - 10)}% ${hsl.l}%`);
      root.style.setProperty("--chart-5", `${(hsl.h + 20) % 360} ${Math.max(0, hsl.s - 15)}% ${hsl.l}%`);
      
      console.log("CSS variables set successfully");
    } else {
      console.error("Failed to convert hex to HSL for color:", themeColors.primaryColor);
    }
    
    // Apply hover border color
    root.style.setProperty("--hover-border-color", themeColors.hoverBorderColor);
    
    // Apply glow intensity as CSS variable
    root.style.setProperty("--glow-intensity", `${themeConfig.glowIntensity}px`);
    
    console.log("Theme config applied successfully");
  };

  const hexToHSL = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
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

  const saveToDatabase = async (newConfig: ThemeConfig) => {
    try {
      // API reads session from cookies; no need for explicit auth header
      const response = await fetch('/api/system-config/theme_config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(newConfig),
          description: 'Global theme configuration applied to all users'
        })
      });

      if (response.ok) {
        console.log("Theme config saved to database via API");
      } else {
        console.error("Failed to save theme to database via API:", await response.text());
      }
    } catch (error) {
      console.error("Error saving theme to database:", error);
    }
  };

  const setLightPrimaryColor = (color: string) => {
    console.log("Setting light primary color to:", color);
    const newConfig = { ...config, light: { ...config.light, primaryColor: color } };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    applyThemeConfig(newConfig);
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setLightHoverBorderColor = (color: string) => {
    const newConfig = { ...config, light: { ...config.light, hoverBorderColor: color } };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    applyThemeConfig(newConfig);
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setDarkPrimaryColor = (color: string) => {
    const newConfig = { ...config, dark: { ...config.dark, primaryColor: color } };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    applyThemeConfig(newConfig);
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setDarkHoverBorderColor = (color: string) => {
    const newConfig = { ...config, dark: { ...config.dark, hoverBorderColor: color } };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    applyThemeConfig(newConfig);
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setGlowIntensity = (intensity: number) => {
    const newConfig = { ...config, glowIntensity: intensity };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    applyThemeConfig(newConfig);
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const saveConfig = (newConfig: ThemeConfig) => {
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    applyThemeConfig(newConfig);
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
    }
    applyThemeConfig(defaultConfig);
    if (isAdmin) {
      saveToDatabase(defaultConfig);
    }
  };

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
        isAdmin,
        setIsAdmin,
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
