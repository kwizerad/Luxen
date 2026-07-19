"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DEFAULT_ADMIN_EMAIL } from "./server-config";

interface BrandingConfig {
  systemName: string;
  logoUrl: string | null;
  logoText: string;
  adminEmail: string;
}

interface BrandingConfigContextType {
  config: BrandingConfig;
  setSystemName: (name: string) => void;
  setLogoUrl: (url: string | null) => void;
  setLogoText: (text: string) => void;
  setAdminEmail: (email: string) => void;
  saveConfig: (newConfig: BrandingConfig) => void;
  resetToDefault: () => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

const defaultConfig: BrandingConfig = {
  systemName: "Navo",
  logoUrl: null,
  logoText: "N",
  adminEmail: DEFAULT_ADMIN_EMAIL,
};

const STORAGE_KEY = "navo-branding-config";

const BrandingConfigContext = createContext<BrandingConfigContextType | undefined>(undefined);

export function BrandingConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BrandingConfig>(defaultConfig);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Load branding config from database first, then localStorage as fallback
    const loadBrandingConfig = async () => {
      if (typeof window === "undefined") return;

      try {
        // API reads session from cookies; no need for explicit auth header
        const response = await fetch('/api/system-config/branding_config');

        if (response.ok) {
          const data = await response.json();
          if (data.value) {
            const dbConfig = JSON.parse(data.value);
            setConfig(dbConfig);
            console.log("Branding config loaded from database:", dbConfig);
            return;
          }
        }
      } catch (error) {
        console.log("Could not load branding from database, using localStorage:", error);
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig({
            systemName: parsed.systemName || defaultConfig.systemName,
            logoUrl: parsed.logoUrl || defaultConfig.logoUrl,
            logoText: parsed.logoText || defaultConfig.logoText,
            adminEmail: parsed.adminEmail || defaultConfig.adminEmail,
          });
          console.log("Branding config loaded from localStorage:", parsed);
        } catch (e) {
          console.error("Failed to parse branding config:", e);
          setConfig(defaultConfig);
        }
      } else {
        console.log("No saved branding config, using default");
        setConfig(defaultConfig);
      }
    };

    loadBrandingConfig();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--site-name", `"${config.systemName}"`);
    }
  }, [config.systemName]);

  const setSystemName = (name: string) => {
    const newConfig = { ...config, systemName: name };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setLogoUrl = (url: string | null) => {
    const newConfig = { ...config, logoUrl: url };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setLogoText = (text: string) => {
    const newConfig = { ...config, logoText: text };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const setAdminEmail = (email: string) => {
    const newConfig = { ...config, adminEmail: email };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const saveToDatabase = async (newConfig: BrandingConfig) => {
    try {
      // API reads session from cookies; no need for explicit auth header
      const response = await fetch('/api/system-config/branding_config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(newConfig),
          description: 'Global branding configuration for system name and logo'
        })
      });

      if (response.ok) {
        console.log("Branding config saved to database via API");
      } else {
        console.error("Failed to save branding to database via API:", await response.text());
      }
    } catch (error) {
      console.error("Error saving branding to database:", error);
    }
  };

  const saveConfig = (newConfig: BrandingConfig) => {
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    if (isAdmin) {
      saveToDatabase(newConfig);
    }
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    if (isAdmin) {
      saveToDatabase(defaultConfig);
    }
  };

  return (
    <BrandingConfigContext.Provider
      value={{
        config,
        setSystemName,
        setLogoUrl,
        setLogoText,
        setAdminEmail,
        saveConfig,
        resetToDefault,
        isAdmin,
        setIsAdmin,
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