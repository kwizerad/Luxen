"use client";

import type { ParsedDeviceInfo } from "@/lib/device.types";

export function parseDeviceInfo(): ParsedDeviceInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";

  const browser = detectBrowser(ua);
  const browserVersion = detectBrowserVersion(ua, browser);
  const os = detectOS(ua);
  const osVersion = detectOSVersion(ua, os);
  const deviceType = detectDeviceType(ua);
  const deviceName = detectDeviceName(ua);
  const cpuArchitecture = detectCPUArchitecture(ua, platform);

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

function detectBrowser(ua: string): string {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Chrome")) return "Chrome";
  return "Unknown";
}

function detectBrowserVersion(ua: string, browser: string): string {
  const patterns: Record<string, RegExp> = {
    Chrome: /Chrome\/(\d+\.?\d*)/,
    Safari: /Version\/(\d+\.?\d*)/,
    Firefox: /Firefox\/(\d+\.?\d*)/,
    Edge: /Edg\/(\d+\.?\d*)/,
    Opera: /OPR\/(\d+\.?\d*)/,
  };
  return patterns[browser]?.exec(ua)?.[1] || "";
}

function detectOS(ua: string): string {
  if (/Windows NT 10\.0/.test(ua)) return "Windows";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Macintosh/.test(ua) && /Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Unknown";
}

function detectOSVersion(ua: string, os: string): string {
  switch (os) {
    case "Windows": {
      const match = /Windows NT (\d+\.?\d*)/.exec(ua);
      const version = match?.[1];
      if (version === "10.0") return "10/11";
      return version || "";
    }
    case "macOS": {
      const match = /Mac OS X (\d+[._]\d+[._]?\d*)/.exec(ua);
      return match?.[1].replace(/_/g, ".") || "";
    }
    case "Android": {
      const match = /Android (\d+\.?\d*)/.exec(ua);
      return match?.[1] || "";
    }
    case "iOS": {
      const match = /OS (\d+[._]\d+[._]?\d*) like Mac OS X/.exec(ua);
      return match?.[1].replace(/_/g, ".") || "";
    }
    default:
      return "";
  }
}

function detectDeviceType(ua: string): "Desktop" | "Laptop" | "Tablet" | "Mobile" | "Unknown" {
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return "Tablet";
  if (/Mobile|iPhone|iPod|Android/.test(ua)) return "Mobile";
  if (/Macintosh|Windows|Linux/.test(ua)) return "Desktop";
  return "Unknown";
}

function detectDeviceName(ua: string): string | undefined {
  const devicePatterns = [
    /(iPhone\s*\d{0,2}[A-Za-z]{0,2})/,
    /(iPad\s*\w*)/,
    /(Samsung\s*[^;)]*)/,
    /(Pixel\s*\d{0,2}[A-Za-z]{0,2})/,
    /(OnePlus\s*[^;)]*)/,
    /(Xiaomi\s*[^;)]*)/,
    /(Huawei\s*[^;)]*)/,
    /(Nokia\s*[^;)]*)/,
  ];

  for (const pattern of devicePatterns) {
    const match = pattern.exec(ua);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function detectCPUArchitecture(ua: string, platform: string): string | undefined {
  const archMatch = /\b(x86_64|Win64|WOW64|aarch64|armv[0-9]+|arm64)\b/.exec(ua);
  if (archMatch) return archMatch[1];
  if (platform.includes("Win32")) return "x86";
  if (platform.includes("MacIntel")) return "x86_64";
  return undefined;
}
