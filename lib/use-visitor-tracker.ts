"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-context";
import { parseDeviceInfo } from "@/lib/device/client-detection";
import { fetchClientPublicIp } from "@/lib/device/client-ip";

const FINGERPRINT_KEY = "navo-visitor-fingerprint";

export function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    try {
      fingerprint = crypto.randomUUID();
    } catch {
      fingerprint = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

async function trackVisit(userId?: string | null) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const [device, clientIp] = await Promise.all([
      parseDeviceInfo(),
      fetchClientPublicIp(),
    ]);

    const payload = {
      fingerprint: device.fingerprint,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
      browser: device.browser,
      browserVersion: device.browserVersion,
      os: device.os,
      osVersion: device.osVersion,
      cpuArchitecture: device.cpuArchitecture,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      screenResolution: device.screenResolution,
      viewportSize: device.viewportSize,
      devicePixelRatio: device.devicePixelRatio,
      language: device.language,
      timezone: device.timezone,
      touchSupport: device.touchSupport,
      cookiesEnabled: device.cookiesEnabled,
      referrer: document.referrer || "",
      landingPage: window.location.href,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      clientIp: clientIp || undefined,
      userId: userId || undefined,
    };

    const res = await fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!res.ok) {
      return;
    }
  } catch {
    // Non-critical background telemetry: silently ignore network/adblocker errors
  }
}

async function linkVisitor(fingerprint: string, userId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const res = await fetch("/api/link-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, userId }),
      keepalive: true,
    });
    if (!res.ok) {
      return;
    }
  } catch {
    // Non-critical background telemetry: silently ignore network/adblocker errors
  }
}

export function useVisitorTracker() {
  const { user } = useAuth();
  const trackedRef = useRef(false);
  const linkedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackVisit(user?.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !user || linkedRef.current) return;
    linkedRef.current = true;
    parseDeviceInfo().then((device) => {
      const fp = device.fingerprint || getOrCreateFingerprint();
      if (fp) {
        linkVisitor(fp, user.id);
      }
    });
  }, [user]);
}

