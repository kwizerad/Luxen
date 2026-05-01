"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BrandingConfig {
  systemName: string;
  logoUrl: string | null;
  logoText: string;
}

interface BrandingConfigContextType {
  config: BrandingConfig;
  setSystemName: (name: string) => void;
  setLogoUrl: (url: string | null) => void;
  setLogoText: (text: string) => void;
  saveConfig: (newConfig: BrandingConfig) => void;
  resetToDefault: () => void;
}

const defaultConfig: BrandingConfig = {
  systemName: "Navo",
  logoUrl: null,
  logoText: "N",
};

const STORAGE_KEY = "navo-branding-config";

const BrandingConfigContext = createContext<BrandingConfigContextType | undefined>(undefined);

export function BrandingConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BrandingConfig>(defaultConfig);

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({
          systemName: parsed.systemName || defaultConfig.systemName,
          logoUrl: parsed.logoUrl || defaultConfig.logoUrl,
          logoText: parsed.logoText || defaultConfig.logoText,
        });
      } catch (e) {
        console.error("Failed to parse branding config:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--site-name", `"${config.systemName}"`);
    }
  }, [config.systemName]);

  const setSystemName = (name: string) => {
    const newConfig = { ...config, systemName: name };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    // Dispatch event to notify other components
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  const setLogoUrl = (url: string | null) => {
    const newConfig = { ...config, logoUrl: url };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  const setLogoText = (text: string) => {
    const newConfig = { ...config, logoText: text };
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  const saveConfig = (newConfig: BrandingConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };

  return (
    <BrandingConfigContext.Provider
      value={{
        config,
        setSystemName,
        setLogoUrl,
        setLogoText,
        saveConfig,
        resetToDefault,
      }}
    >
      {children}
    </BrandingConfigContext.Provider>
  );
}

export function useBrandingConfig() {
  const context = useContext(BrandingConfigContext);
  if (context === undefined) {
    throw new Error("useBrandingConfig must be used within a BrandingConfigProvider");
  }
  return context;
}

// Helper hook to get branding config without throwing (for use outside provider)
export function useBrandingConfigSafe(): BrandingConfig {
  const context = useContext(BrandingConfigContext);
  if (context === undefined) {
    return defaultConfig;
  }
  return context.config;
}
