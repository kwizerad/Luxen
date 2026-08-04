"use client";

import type { ParsedDeviceInfo } from "@/lib/device.types";

interface UADataBrandVersion {
  brand: string;
  version: string;
}

interface NavigatorUAData {
  brands: UADataBrandVersion[];
  mobile: boolean;
  platform: string;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
}

function getUAData(): NavigatorUAData | null {
  if (typeof navigator === "undefined") return null;
  if (!("userAgentData" in navigator)) return null;
  const uad = (navigator as unknown as { userAgentData?: unknown }).userAgentData;
  if (!uad || typeof uad !== "object") return null;
  const data = uad as Partial<NavigatorUAData>;
  if (!Array.isArray(data.brands)) return null;
  return data as NavigatorUAData;
}

export async function parseDeviceInfo(): Promise<ParsedDeviceInfo> {
  const ua = navigator.userAgent;
  const uaData = getUAData();

  // Try to get high entropy values from User-Agent Client Hints
  let highEntropyData: Record<string, unknown> | null = null;
  if (uaData?.getHighEntropyValues) {
    try {
      highEntropyData = await uaData.getHighEntropyValues([
        "architecture",
        "bitness",
        "model",
        "platformVersion",
        "fullVersionList",
      ]);
    } catch {
      // High entropy values not available; continue with low-entropy only
    }
  }

  const browser = detectBrowser(ua, uaData, highEntropyData);
  const browserVersion = detectBrowserVersion(ua, browser, uaData, highEntropyData);
  const os = detectOS(ua, uaData);
  const osVersion = detectOSVersion(ua, os, highEntropyData);
  const deviceType = detectDeviceType(ua, uaData);
  const deviceName = detectDeviceName(ua, uaData, highEntropyData);
  const cpuArchitecture = detectCPUArchitecture(ua, highEntropyData);

  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const language = navigator.language || navigator.languages?.[0] || "";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const cookiesEnabled = navigator.cookieEnabled;
  const onlineStatus = navigator.onLine;

  const fingerprint = generateFingerprint({
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceName: deviceName || "",
    cpuArchitecture: cpuArchitecture || "",
    screenResolution,
    devicePixelRatio,
    language,
    timezone,
    touchSupport: String(touchSupport),
    cookiesEnabled: String(cookiesEnabled),
  });

  return {
    fingerprint,
    deviceType,
    deviceName,
    browser,
    browserVersion,
    os,
    osVersion,
    cpuArchitecture,
    screenResolution,
    viewportSize,
    devicePixelRatio,
    language,
    timezone,
    touchSupport,
    cookiesEnabled,
    onlineStatus,
  };
}

function generateFingerprint(parts: Record<string, string | number | boolean>): string {
  const str = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function detectBrowser(
  ua: string,
  uaData: NavigatorUAData | null,
  highEntropy: Record<string, unknown> | null
): string {
  // Prefer high entropy fullVersionList for accurate brand detection
  if (highEntropy?.fullVersionList && Array.isArray(highEntropy.fullVersionList)) {
    const brands = (highEntropy.fullVersionList as UADataBrandVersion[]).filter(
      (b) => !b.brand.includes("Not") && b.brand !== "Chromium" && b.brand !== "Google Chrome"
    );
    if (brands.length > 0) {
      const brand = brands[0].brand;
      if (brand.includes("Edge")) return "Edge";
      if (brand.includes("Opera")) return "Opera";
      if (brand.includes("Brave")) return "Brave";
      if (brand.includes("Chrome")) return "Chrome";
    }
    // If only Chromium/Chrome brands found, return Chrome
    const chromeBrand = (highEntropy.fullVersionList as UADataBrandVersion[]).find(
      (b) => b.brand.includes("Chrome") && !b.brand.includes("Not")
    );
    if (chromeBrand) return "Chrome";
  }

  // Fallback to low-entropy UA-CH brands
  if (uaData) {
    const brands = uaData.brands.filter(
      (b) => !b.brand.includes("Not") && b.brand !== "Chromium"
    );
    if (brands.length > 0) {
      const brand = brands[0].brand;
      if (brand.includes("Edge")) return "Edge";
      if (brand.includes("Opera")) return "Opera";
      if (brand.includes("Chrome")) return "Chrome";
    }
  }

  // Fallback to UA string parsing
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Chrome")) return "Chrome";
  return "Unknown";
}

function detectBrowserVersion(
  ua: string,
  browser: string,
  uaData: NavigatorUAData | null,
  highEntropy: Record<string, unknown> | null
): string {
  // Prefer high entropy fullVersionList for accurate version
  if (highEntropy?.fullVersionList && Array.isArray(highEntropy.fullVersionList)) {
    const fullList = highEntropy.fullVersionList as UADataBrandVersion[];
    const brandEntry = fullList.find(
      (b) =>
        !b.brand.includes("Not") &&
        ((browser === "Chrome" && (b.brand.includes("Chrome") || b.brand === "Google Chrome")) ||
          (browser === "Edge" && b.brand.includes("Edge")) ||
          (browser === "Opera" && b.brand.includes("Opera")) ||
          (browser === "Brave" && b.brand.includes("Brave")))
    );
    if (brandEntry?.version) return brandEntry.version;
  }

  // Fallback to low-entropy UA-CH brands
  if (uaData) {
    const brand = uaData.brands.find(
      (b) =>
        !b.brand.includes("Not") &&
        ((browser === "Chrome" && b.brand.includes("Chrome") && !b.brand.includes("Edge")) ||
          (browser === "Edge" && b.brand.includes("Edge")) ||
          (browser === "Opera" && b.brand.includes("Opera")))
    );
    if (brand?.version) return brand.version;
  }

  // Fallback to UA string regex
  const patterns: Record<string, RegExp> = {
    Chrome: /Chrome\/(\d+\.?\d*)/,
    Safari: /Version\/(\d+\.?\d*)/,
    Firefox: /Firefox\/(\d+\.?\d*)/,
    Edge: /Edg\/(\d+\.?\d*)/,
    Opera: /OPR\/(\d+\.?\d*)/,
    Brave: /Chrome\/(\d+\.?\d*)/,
  };
  return patterns[browser]?.exec(ua)?.[1] || "";
}

function detectOS(ua: string, uaData: NavigatorUAData | null): string {
  // Prefer UA-CH platform (low entropy, available without permission)
  if (uaData?.platform) {
    const p = uaData.platform;
    if (p === "Windows") return "Windows";
    if (p === "macOS") return "macOS";
    if (p === "Android") return "Android";
    if (p === "Chrome OS") return "Chrome OS";
    if (p === "Linux") return "Linux";
  }

  // Fallback to UA string
  if (/Windows NT 10\.0/.test(ua)) return "Windows";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Macintosh/.test(ua) && /Mac OS X/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "Chrome OS";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Unknown";
}

function detectOSVersion(
  ua: string,
  os: string,
  highEntropy: Record<string, unknown> | null
): string {
  // Prefer high entropy platformVersion from UA-CH
  if (highEntropy?.platformVersion && typeof highEntropy.platformVersion === "string") {
    const pv = highEntropy.platformVersion;
    if (os === "Windows") {
      // Windows maps platformVersion differently: 15+ = Windows 11, 10+ = Windows 10
      const major = parseInt(pv.split(".")[0], 10);
      if (major >= 13) return "11";
      if (major >= 1) return "10";
      return pv;
    }
    if (os === "macOS" || os === "Android" || os === "Chrome OS" || os === "iOS") {
      return pv;
    }
    return pv;
  }

  // Fallback to UA string parsing
  switch (os) {
    case "Windows": {
      const match = /Windows NT (\d+\.?\d*)/.exec(ua);
      const version = match?.[1];
      if (version === "10.0") return "10/11";
      return version || "";
    }
    case "macOS": {
      const match = /Mac OS X (\d+(?:[._]\d+)+)/.exec(ua);
      if (match?.[1]) return match[1].replace(/_/g, ".");
      const fallback = /Mac OS X (\d+[._]\d+)/.exec(ua);
      return fallback?.[1].replace(/_/g, ".") || "";
    }
    case "Chrome OS": {
      const match = /CrOS \w+ (\d+\.\d+\.\d+\.\d+)/.exec(ua);
      return match?.[1] || "";
    }
    case "Android": {
      const match = /Android (\d+\.?\d*)/.exec(ua);
      return match?.[1] || "";
    }
    case "iOS": {
      const match = /OS (\d+[._]\d+(?:[._]\d+)?)/.exec(ua);
      return match?.[1].replace(/_/g, ".") || "";
    }
    default:
      return "";
  }
}

function detectDeviceType(
  ua: string,
  uaData: NavigatorUAData | null
): "Desktop" | "Laptop" | "Tablet" | "Mobile" | "Unknown" {
  const hasTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0;

  // iOS devices — explicit UA matching
  if (/iPad/.test(ua)) return "Tablet";
  if (/iPhone/.test(ua)) return "Mobile";
  if (/iPod/.test(ua)) return "Mobile";

  // Android — the tricky case.
  // Many Android tablets include "Mobile" in their UA string (e.g. Samsung Galaxy Tab).
  // Use a combination of heuristics:
  // 1. UA explicitly says "Tablet" → Tablet
  // 2. UA has "Android" but NOT "Mobile" → Tablet (traditional signal)
  // 3. UA has "Android" AND "Mobile" but screen is large or maxTouchPoints suggests tablet → check further
  if (/Android/.test(ua)) {
    if (/Tablet/.test(ua)) return "Tablet";
    if (!/Mobile/.test(ua)) return "Tablet";

    // Android with "Mobile" in UA — could still be a tablet (Samsung does this)
    // Use screen size as a secondary signal: tablets typically have wider screens
    if (typeof window !== "undefined") {
      const minScreenDim = Math.min(window.screen.width, window.screen.height);
      // Tablets typically have a minimum dimension >= 600dp (after dividing by pixel ratio)
      // But we use the physical screen pixels as a rough heuristic
      // Most phones have screen width < 600px in CSS pixels, tablets >= 600px
      const cssWidth = window.screen.width / (window.devicePixelRatio || 1);
      const cssHeight = window.screen.height / (window.devicePixelRatio || 1);
      const minCssDim = Math.min(cssWidth, cssHeight);

      // If the smaller CSS dimension is >= 600, it's very likely a tablet
      if (minCssDim >= 600) return "Tablet";

      // Fallback: if minScreenDim (physical pixels) is very large, likely tablet
      if (minScreenDim >= 1200) return "Tablet";
    }

    // If we can't determine, it's a mobile device with "Mobile" in UA
    return "Mobile";
  }

  // Chrome OS — could be Chromebook or Chromebox
  if (/CrOS/.test(ua)) {
    if (uaData?.mobile) return "Tablet";
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Laptop";
  }

  // Desktop OSes
  if (/Macintosh/.test(ua)) {
    // iPad with desktop UA (iPadOS 13+ requests desktop sites)
    // iPadOS reports "Macintosh" in UA but has touch support
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Desktop";
  }

  if (/Windows/.test(ua)) {
    // Windows touch devices with high touch points are likely tablets/2-in-1s
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Desktop";
  }

  if (/Linux/.test(ua)) {
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Desktop";
  }

  return "Unknown";
}

function detectDeviceName(
  ua: string,
  uaData: NavigatorUAData | null,
  highEntropy: Record<string, unknown> | null
): string | undefined {
  // Prefer high entropy "model" from UA-CH — this is the browser-provided model
  // Only available on mobile devices (Android/Chrome OS). Returns "" on desktop.
  if (highEntropy?.model && typeof highEntropy.model === "string") {
    const model = highEntropy.model.trim();
    if (model && model !== "") return model;
  }

  // iOS devices — UA string is the only source, and it only tells us the family
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/iPod/.test(ua)) return "iPod touch";

  // Android — do NOT parse the UA string for device model.
  // The UA string on Android contains the build model which is often
  // a codename (e.g. "Pixel 9", "SM-X910") not a real product name,
  // and is unreliable. If UA-CH high entropy "model" didn't provide it,
  // we return "Unknown" rather than guessing.
  if (/Android/.test(ua)) {
    return undefined;
  }

  // Desktop OSes — no reliable device model from browser
  if (/CrOS/.test(ua)) return undefined;
  if (/Macintosh/.test(ua)) return undefined;
  if (/Windows/.test(ua)) return undefined;
  if (/Linux/.test(ua)) return undefined;

  return undefined;
}

function detectCPUArchitecture(
  ua: string,
  highEntropy: Record<string, unknown> | null
): string | undefined {
  // Prefer high entropy "architecture" from UA-CH
  if (highEntropy?.architecture && typeof highEntropy.architecture === "string") {
    const arch = highEntropy.architecture;
    if (arch && arch !== "") return arch;
  }

  // Fallback to UA string parsing — only for obvious cases
  const archMatch = /\b(x86_64|Win64|WOW64|aarch64|armv[0-9]+|arm64)\b/.exec(ua);
  if (archMatch) {
    const arch = archMatch[1];
    if (arch === "Win64" || arch === "WOW64") return "x86_64";
    return arch;
  }

  // Do NOT guess based on platform string (e.g. "MacIntel" could be x86_64 or arm64)
  return undefined;
}
