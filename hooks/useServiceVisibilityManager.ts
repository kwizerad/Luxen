"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getCachedServicesConfig, getSyncServicesConfig } from "@/lib/feature-flags";

export interface ServicesConfigState {
  pageEnabled: boolean;
  services: Record<string, boolean>;
  idVerificationRequired?: boolean;
}

const DEFAULT_SERVICES_CONFIG: ServicesConfigState = {
  pageEnabled: true,
  services: {
    "live-exam": true,
    "group-exam": true,
    "traffic-assistant": true,
  },
  idVerificationRequired: true,
};

/**
 * ServiceVisibilityManager: Centralized hook that manages dynamic feature & service visibility
 * configured by administrators (e.g. Services Page, Live Exam, Group Exam, Traffic Assistant).
 * Ensures disabled services are cleanly filtered out across Navo OS Desktop, Dock, System Bar, and Viewports.
 */
export function useServiceVisibilityManager() {
  const [config, setConfig] = useState<ServicesConfigState>(() => {
    const sync = getSyncServicesConfig();
    if (sync) {
      return {
        pageEnabled: sync.pageEnabled ?? true,
        services: sync.services || DEFAULT_SERVICES_CONFIG.services,
        idVerificationRequired: sync.idVerificationRequired ?? true,
      };
    }
    return DEFAULT_SERVICES_CONFIG;
  });

  const [loading, setLoading] = useState<boolean>(true);

  const refreshConfig = useCallback(async () => {
    try {
      const latest = await getCachedServicesConfig();
      setConfig({
        pageEnabled: latest.pageEnabled ?? true,
        services: latest.services || {},
        idVerificationRequired: latest.idVerificationRequired ?? true,
      });
    } catch (err) {
      console.error("ServiceVisibilityManager failed to refresh config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();

    if (typeof window !== "undefined") {
      const handleConfigUpdate = () => {
        refreshConfig();
      };

      window.addEventListener("config-changed", handleConfigUpdate);
      window.addEventListener("system-config-updated", handleConfigUpdate);
      window.addEventListener("storage", handleConfigUpdate);

      return () => {
        window.removeEventListener("config-changed", handleConfigUpdate);
        window.removeEventListener("system-config-updated", handleConfigUpdate);
        window.removeEventListener("storage", handleConfigUpdate);
      };
    }
  }, [refreshConfig]);

  const isServicesPageEnabled = useMemo(() => {
    return config.pageEnabled;
  }, [config.pageEnabled]);

  const isServiceEnabled = useCallback(
    (serviceKey: string): boolean => {
      if (!config.pageEnabled) return false;

      const normalizedKey = serviceKey.toLowerCase().trim();
      const services = config.services || {};

      if (services[normalizedKey] !== undefined) {
        return Boolean(services[normalizedKey]);
      }

      return true;
    },
    [config]
  );

  return {
    loading,
    servicesConfig: config,
    isServicesPageEnabled,
    isServiceEnabled,
    refreshConfig,
  };
}

// Named alias export for compatibility
export const ServiceVisibilityManager = useServiceVisibilityManager;
