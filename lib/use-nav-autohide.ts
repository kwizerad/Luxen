"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nav-autohide-enabled";
const EVENT_NAME = "nav-autohide-change";

/**
 * Reads the autohide preference from localStorage.
 * Defaults to false (disabled) when no preference is stored.
 */
function readStoredValue(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return false;
    return stored === "true";
  } catch {
    return false;
  }
}

/**
 * Hook for the settings page toggle.
 * Returns [enabled, setEnabled] and persists to localStorage,
 * dispatching a custom event so active navbars update immediately.
 */
export function useNavAutohidePreference(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    setEnabled(readStoredValue());

    const handleChange = () => setEnabled(readStoredValue());
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  const setPreference = (value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  return [enabled, setPreference];
}

/**
 * Hook for navbar components.
 * Returns whether autohide is enabled. Listens for live changes
 * from the settings toggle so the navbar reacts without a reload.
 */
export function useNavAutohideEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    setEnabled(readStoredValue());

    const handleChange = () => setEnabled(readStoredValue());
    window.addEventListener(EVENT_NAME, handleChange);
    // Also sync across tabs
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) setEnabled(readStoredValue());
    });
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
    };
  }, []);

  return enabled;
}
