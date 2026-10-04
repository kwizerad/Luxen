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
    if (typeof window === "undefined") return;

    // 1. Hydrate immediately from localStorage on client mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({
          systemName: parsed.systemName || defaultConfig.systemName,
          logoUrl: parsed.logoUrl || defaultConfig.logoUrl,
          logoText: parsed.logoText || defaultConfig.logoText,
          adminEmail: parsed.adminEmail || defaultConfig.adminEmail,
        });
      }
    } catch {
      // ignore parse errors
    }

    // 2. Load latest branding config from database (updates state & localStorage)
    const loadBrandingConfig = async () => {
      try {
        const response = await fetch('/api/system-config/branding_config');

        if (response.ok) {
          const data = await response.json();
          if (data.value) {
            const parsed = JSON.parse(data.value);
            const dbConfig: BrandingConfig = {
              systemName: parsed.systemName || defaultConfig.systemName,
              logoUrl: parsed.logoUrl || null,
              logoText: parsed.logoText || defaultConfig.logoText,
              adminEmail: parsed.adminEmail || defaultConfig.adminEmail,
            };
            setConfig(dbConfig);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbConfig));
            window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
            return;
          }
        }
      } catch {
        // ignore — we already have localStorage or default
      }
    };

    loadBrandingConfig();
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--site-name", `"${config.systemName}"`);
    }
  }, [config.systemName]);

  // Dynamically update the browser favicon / branding logo when config.logoUrl changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const iconHref = config.logoUrl || "/icons/icon.svg";
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
    ];

    let updatedAny = false;
    selectors.forEach((selector) => {
      const links = document.head.querySelectorAll<HTMLLinkElement>(selector);
      links.forEach((link) => {
        updatedAny = true;
        link.href = iconHref;
        if (config.logoUrl) {
          link.removeAttribute("type");
        } else if (selector === 'link[rel="icon"]') {
          link.type = "image/svg+xml";
        }
      });
    });

    if (!updatedAny) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = iconHref;
      document.head.appendChild(link);
    }
  }, [config.logoUrl]);

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
    saveToDatabase(newConfig);
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    saveToDatabase(defaultConfig);
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