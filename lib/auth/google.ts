"use client";

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";

/**
 * Environment configuration for Google Identity Services.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/**
 * Singleton promise used to deduplicate concurrent script injections.
 */
let scriptLoadPromise: Promise<void> | null = null;

/**
 * Lazy-load the Google Identity Services script once per browser session.
 * Uses a singleton promise to prevent duplicate injection when multiple
 * components/hooks request it concurrently.
 */
export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`
    );

    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Google Identity Services script"))
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.id = "google-identity-services-script";

    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        reject(new Error("Google Identity Services API unavailable after load"));
      }
    };

    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Google Identity Services script"));
    };

    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Remove the injected Google script. Useful when the provider unmounts
 * and we want a clean state on the next mount (e.g. React Strict Mode).
 */
export function removeGoogleIdentityScript(): void {
  if (typeof window === "undefined") return;

  const script = document.getElementById("google-identity-services-script");
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }

  scriptLoadPromise = null;
}

const DISMISSAL_STORAGE_KEY = "google-one-tap-dismissed-at";
const DISMISSAL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Determine whether the user recently dismissed One Tap.
 * Respects a client-side cooldown in addition to Google's own suppression
 * so the prompt is not shown repeatedly after a user intentionally closes it.
 */
export function isOneTapDismissed(): boolean {
  if (typeof window === "undefined") return false;

  const dismissedAt = window.localStorage.getItem(DISMISSAL_STORAGE_KEY);
  if (!dismissedAt) return false;

  const dismissedTime = parseInt(dismissedAt, 10);
  if (Number.isNaN(dismissedTime)) return false;

  return Date.now() - dismissedTime < DISMISSAL_COOLDOWN_MS;
}

/**
 * Record that the user dismissed One Tap, starting the cooldown.
 */
export function recordOneTapDismissed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSAL_STORAGE_KEY, String(Date.now()));
}

/**
 * Clear the dismissal cooldown (e.g. after a successful sign-in).
 */
export function clearOneTapDismissal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DISMISSAL_STORAGE_KEY);
}

/**
 * Parse the browser user agent into a friendly browser/OS pair.
 */
export function getDeviceInfo(): { browser: string; os: string } {
  if (typeof window === "undefined") {
    return { browser: "Unknown", os: "Unknown" };
  }

  const ua = window.navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";

  // Browser detection
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Opera/") || ua.includes("OPR/")) browser = "Opera";

  // OS detection
  if (/Windows NT|Win32|Win64|Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|macOS|Macintosh/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os };
}

let countryCache: string | null = null;

/**
 * Best-effort approximation of the user's country using a free IP lookup.
 * Falls back to the browser's primary language region or "Unknown".
 */
export async function getCountryApproximate(): Promise<string> {
  if (typeof window === "undefined") return "Unknown";
  if (countryCache) return countryCache;

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);
    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.country_name) {
        countryCache = String(data.country_name);
        return countryCache;
      }
    }
  } catch {
    // Fail silently — approximate location is non-critical.
  }

  // Fallback to locale-based approximation.
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (locale) {
      countryCache = locale;
      return countryCache;
    }
  } catch {
    // Ignore.
  }

  countryCache = "Unknown";
  return countryCache;
}
