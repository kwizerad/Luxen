"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-context";

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

function getVisitPayload(fingerprint: string) {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  return {
    fingerprint,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    deviceType: isMobile ? "mobile" : "desktop",
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer,
    landingPage: window.location.href,
    userAgent: ua,
    touchSupport: isTouch,
    cookiesEnabled: navigator.cookieEnabled,
  };
}

async function trackVisit(fingerprint: string) {
  try {
    await fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getVisitPayload(fingerprint)),
    });
  } catch (error) {
    console.error("[VisitorTracker] Failed to track visit:", error);
  }
}

async function linkVisitor(fingerprint: string, userId: string) {
  try {
    await fetch("/api/link-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, userId }),
    });
  } catch (error) {
    console.error("[VisitorTracker] Failed to link visitor:", error);
  }
}

export function useVisitorTracker() {
  const { user } = useAuth();
  const linkedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fingerprint = getOrCreateFingerprint();
    if (!fingerprint) return;
    trackVisit(fingerprint);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !user || linkedRef.current) return;
    const fingerprint = getOrCreateFingerprint();
    if (!fingerprint) return;
    linkedRef.current = true;
    linkVisitor(fingerprint, user.id);
  }, [user]);
}
