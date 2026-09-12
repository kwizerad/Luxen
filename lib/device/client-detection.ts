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

function detectGPURenderer(): string | undefined {
  if (typeof document === "undefined") return undefined;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl) return undefined;
    const dbg = (gl as WebGLRenderingContext).getExtension(
      "WEBGL_debug_renderer_info"
    );
    if (dbg) {
      const renderer = (gl as WebGLRenderingContext).getParameter(
        dbg.UNMASKED_RENDERER_WEBGL
      );
      if (typeof renderer === "string" && renderer.trim()) {
        return renderer.replace(/^ANGLE\s*\((.+)\)$/, "$1").trim();
      }
    }
  } catch {
    // WebGL unsupported or context disabled
  }
  return undefined;
}

async function getBatteryStatus(): Promise<string | undefined> {
  if (typeof navigator === "undefined" || !("getBattery" in navigator)) {
    return undefined;
  }
  try {
    const battery = await (navigator as any).getBattery();
    const level = Math.round((battery.level || 1) * 100);
    const charging = battery.charging ? "Charging" : "On Battery";
    return `${level}% (${charging})`;
  } catch {
    return undefined;
  }
}

function getNetworkType(): string | undefined {
  if (typeof navigator === "undefined" || !("connection" in navigator)) {
    return undefined;
  }
  try {
    const conn = (navigator as any).connection;
    if (!conn) return undefined;
    const parts: string[] = [];
    if (conn.effectiveType) parts.push(conn.effectiveType.toUpperCase());
    if (conn.type && conn.type !== "unknown") parts.push(conn.type);
    if (conn.downlink) parts.push(`${conn.downlink} Mbps`);
    if (conn.rtt) parts.push(`RTT: ${conn.rtt}ms`);
    return parts.length > 0 ? parts.join(" • ") : undefined;
  } catch {
    return undefined;
  }
}

async function estimateRefreshRate(): Promise<string | undefined> {
  if (typeof window === "undefined" || !("requestAnimationFrame" in window)) {
    return undefined;
  }
  try {
    return await new Promise<string>((resolve) => {
      let frameCount = 0;
      let startTime = performance.now();
      const check = () => {
        frameCount++;
        if (frameCount < 10) {
          requestAnimationFrame(check);
        } else {
          const elapsed = performance.now() - startTime;
          const fps = Math.round((frameCount / elapsed) * 1000);
          if (fps >= 110) resolve("120 Hz");
          else if (fps >= 80) resolve("90 Hz");
          else if (fps >= 50) resolve("60 Hz");
          else resolve(`${fps} Hz`);
        }
      };
      requestAnimationFrame(check);
      // Timeout fallback
      setTimeout(() => resolve("60 Hz"), 250);
    });
  } catch {
    return undefined;
  }
}

export async function parseDeviceInfo(): Promise<ParsedDeviceInfo> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const uaData = getUAData();

  // Retrieve high entropy values from User-Agent Client Hints
  let highEntropyData: Record<string, unknown> | null = null;
  if (uaData?.getHighEntropyValues) {
    try {
      highEntropyData = await uaData.getHighEntropyValues([
        "architecture",
        "bitness",
        "model",
        "platformVersion",
        "fullVersionList",
        "formFactors",
        "wow64",
      ]);
    } catch {
      // High entropy values not available
    }
  }

  const gpuRenderer = detectGPURenderer();
  const browser = detectBrowser(ua, uaData, highEntropyData);
  const browserVersion = detectBrowserVersion(ua, browser, uaData, highEntropyData);
  const os = detectOS(ua, uaData);
  const osVersion = detectOSVersion(ua, os, highEntropyData);
  const deviceType = detectDeviceType(ua, uaData);
  
  const { deviceName, deviceModel, deviceVendor } = detectDeviceName(
    ua,
    uaData,
    highEntropyData,
    os,
    osVersion,
    deviceType,
    gpuRenderer
  );

  const rawCpuArch = detectCPUArchitecture(ua, highEntropyData, os, gpuRenderer);
  const cpuArchitecture = rawCpuArch || (os === "Android" || os === "iOS" ? "ARM64" : (os === "macOS" ? "ARM64 (Apple Silicon)" : "x86_64"));

  const cpuCores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : undefined;
  const deviceMemory = typeof navigator !== "undefined" && "deviceMemory" in navigator ? (navigator as any).deviceMemory : undefined;
  const colorDepth = typeof window !== "undefined" && window.screen?.colorDepth ? window.screen.colorDepth : undefined;
  const maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : undefined;
  
  const screenResolution = typeof window !== "undefined" && window.screen?.width
    ? `${window.screen.width}x${window.screen.height}`
    : "1920x1080";
  const viewportSize = typeof window !== "undefined" && window.innerWidth
    ? `${window.innerWidth}x${window.innerHeight}`
    : screenResolution;
  const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const language = typeof navigator !== "undefined" ? navigator.language || navigator.languages?.[0] || "en-US" : "en-US";
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Kigali" : "Africa/Kigali";
  const touchSupport = typeof window !== "undefined" ? ("ontouchstart" in window || (navigator?.maxTouchPoints || 0) > 0) : (deviceType === "Mobile" || deviceType === "Tablet");
  const cookiesEnabled = typeof navigator !== "undefined" ? navigator.cookieEnabled : true;
  const onlineStatus = typeof navigator !== "undefined" ? navigator.onLine : true;

  // Extra metrics
  let batteryStatus: string | undefined;
  let networkType: string | undefined;
  let screenRefreshRate: string | undefined;

  try {
    batteryStatus = await getBatteryStatus();
  } catch {}
  try {
    networkType = getNetworkType();
  } catch {}
  try {
    screenRefreshRate = await estimateRefreshRate();
  } catch {}

  const fingerprint = generateFingerprint({
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceName: deviceName || "",
    deviceModel: deviceModel || "",
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
    deviceModel,
    deviceVendor,
    browser,
    browserVersion,
    os,
    osVersion,
    cpuArchitecture,
    cpuCores,
    deviceMemory,
    gpuRenderer,
    screenResolution,
    viewportSize,
    devicePixelRatio,
    screenRefreshRate,
    colorDepth,
    maxTouchPoints,
    networkType,
    batteryStatus,
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
  if (highEntropy?.fullVersionList && Array.isArray(highEntropy.fullVersionList)) {
    const brands = (highEntropy.fullVersionList as UADataBrandVersion[]).filter(
      (b) => !b.brand.includes("Not") && b.brand !== "Chromium" && b.brand !== "Google Chrome"
    );
    if (brands.length > 0) {
      const brand = brands[0].brand;
      if (brand.includes("Edge")) return "Edge";
      if (brand.includes("Opera")) return "Opera";
      if (brand.includes("Brave")) return "Brave";
      if (brand.includes("Samsung")) return "Samsung Internet";
      if (brand.includes("Chrome")) return "Chrome";
    }
    const chromeBrand = (highEntropy.fullVersionList as UADataBrandVersion[]).find(
      (b) => b.brand.includes("Chrome") && !b.brand.includes("Not")
    );
    if (chromeBrand) return "Chrome";
  }

  if (uaData) {
    const brands = uaData.brands.filter(
      (b) => !b.brand.includes("Not") && b.brand !== "Chromium"
    );
    if (brands.length > 0) {
      const brand = brands[0].brand;
      if (brand.includes("Edge")) return "Edge";
      if (brand.includes("Opera")) return "Opera";
      if (brand.includes("Samsung")) return "Samsung Internet";
      if (brand.includes("Chrome")) return "Chrome";
    }
  }

  if (ua.includes("SamsungBrowser/")) return "Samsung Internet";
  if (ua.includes("Edg/") || ua.includes("Edge/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Chrome")) return "Chrome";
  return "Chrome";
}

function detectBrowserVersion(
  ua: string,
  browser: string,
  uaData: NavigatorUAData | null,
  highEntropy: Record<string, unknown> | null
): string {
  if (highEntropy?.fullVersionList && Array.isArray(highEntropy.fullVersionList)) {
    const fullList = highEntropy.fullVersionList as UADataBrandVersion[];
    const brandEntry = fullList.find(
      (b) =>
        !b.brand.includes("Not") &&
        ((browser === "Chrome" && (b.brand.includes("Chrome") || b.brand === "Google Chrome")) ||
          (browser === "Edge" && b.brand.includes("Edge")) ||
          (browser === "Opera" && b.brand.includes("Opera")) ||
          (browser === "Samsung Internet" && b.brand.includes("Samsung")) ||
          (browser === "Brave" && b.brand.includes("Brave")))
    );
    if (brandEntry?.version) return brandEntry.version;
  }

  if (uaData) {
    const brand = uaData.brands.find(
      (b) =>
        !b.brand.includes("Not") &&
        ((browser === "Chrome" && b.brand.includes("Chrome") && !b.brand.includes("Edge")) ||
          (browser === "Edge" && b.brand.includes("Edge")) ||
          (browser === "Samsung Internet" && b.brand.includes("Samsung")) ||
          (browser === "Opera" && b.brand.includes("Opera")))
    );
    if (brand?.version) return brand.version;
  }

  const patterns: Record<string, RegExp> = {
    Chrome: /Chrome\/(\d+(?:\.\d+)*)/,
    "Samsung Internet": /SamsungBrowser\/(\d+(?:\.\d+)*)/,
    Safari: /Version\/(\d+(?:\.\d+)*)/,
    Firefox: /Firefox\/(\d+(?:\.\d+)*)/,
    Edge: /Edg\/(\d+(?:\.\d+)*)/,
    Opera: /OPR\/(\d+(?:\.\d+)*)/,
    Brave: /Chrome\/(\d+(?:\.\d+)*)/,
  };
  return patterns[browser]?.exec(ua)?.[1] || "";
}

function detectOS(ua: string, uaData: NavigatorUAData | null): string {
  // Check iPad / iPadOS first: Safari on iPad presents MacIntel with touch support
  const isIPad =
    /iPad/i.test(ua) ||
    (typeof navigator !== "undefined" &&
      (navigator.platform === "MacIntel" || /Macintosh/i.test(ua)) &&
      (navigator.maxTouchPoints > 1 || (typeof window !== "undefined" && "ontouchstart" in window)));

  if (isIPad) return "iPadOS";

  if (uaData?.platform) {
    const p = uaData.platform;
    if (p === "Windows") return "Windows";
    if (p === "macOS") return "macOS";
    if (p === "Android") return "Android";
    if (p === "Chrome OS") return "Chrome OS";
    if (p === "Linux") return "Linux";
  }

  if (/Windows NT/.test(ua)) return "Windows";
  if (/Macintosh/.test(ua) && /Mac OS X/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "Chrome OS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPod/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

function detectOSVersion(
  ua: string,
  os: string,
  highEntropy: Record<string, unknown> | null
): string {
  // 1. Check UA Client Hints platformVersion
  if (highEntropy?.platformVersion && typeof highEntropy.platformVersion === "string") {
    const pv = highEntropy.platformVersion.trim();
    if (pv && pv !== "0.0.0" && pv !== "0") {
      if (os === "Windows") {
        const major = parseInt(pv.split(".")[0], 10);
        if (major >= 13) return "11";
        if (major >= 1) return "10";
        return pv;
      }
      if (os === "Android") {
        const parts = pv.split(".");
        const majorNum = parseInt(parts[0], 10);
        if (majorNum >= 30) {
          const apiMap: Record<number, string> = {
            35: "15",
            34: "14",
            33: "13",
            32: "12L",
            31: "12",
            30: "11",
          };
          if (apiMap[majorNum]) return apiMap[majorNum];
        }
        if (majorNum >= 7 && majorNum <= 20) {
          return String(majorNum);
        }
        return pv;
      }
      if (os === "macOS" || os === "iOS" || os === "iPadOS") {
        return pv;
      }
    }
  }

  // 2. Feature detection heuristic for Android version when UA is frozen to Android 10
  if (os === "Android" && typeof window !== "undefined") {
    try {
      const hasColorMix = typeof CSS !== "undefined" && CSS.supports && CSS.supports("color", "color-mix(in srgb, red, blue)");
      const hasOklch = typeof CSS !== "undefined" && CSS.supports && CSS.supports("color", "oklch(0.5 0.2 180)");
      const hasVisualViewportSegments = "visualViewport" in window && "segments" in ((window as any).visualViewport || {});
      const hasFullscreen = typeof document !== "undefined" && "fullscreenEnabled" in document;
      const hasCanShare = typeof navigator !== "undefined" && "canShare" in navigator;

      if (hasVisualViewportSegments || (hasColorMix && hasFullscreen)) {
        return "14+";
      }
      if (hasOklch && hasCanShare) {
        return "13";
      }
      if (typeof CSS !== "undefined" && CSS.supports && CSS.supports("aspect-ratio", "1/1")) {
        return "12";
      }
      if (typeof CSS !== "undefined" && CSS.supports && CSS.supports("gap", "10px")) {
        return "11";
      }
    } catch {
      // Fall through to regex
    }
  }

  // 3. Fallback regex checks
  switch (os) {
    case "Windows": {
      const match = /Windows NT (\d+\.?\d*)/.exec(ua);
      const version = match?.[1];
      if (version === "10.0") return "10/11";
      return version || "10";
    }
    case "macOS": {
      const match = /Mac OS X (\d+(?:[._]\d+)+)/.exec(ua);
      if (match?.[1]) return match[1].replace(/_/g, ".");
      return "14.0";
    }
    case "Android": {
      const match = /Android\s+([0-9.]+)/i.exec(ua);
      const extracted = match?.[1] || "";
      if (extracted === "10" || extracted === "10.0") {
        return "13/14 (Modern)";
      }
      return extracted || "14";
    }
    case "iOS":
    case "iPadOS": {
      const match = /OS (\d+[._]\d+(?:[._]\d+)?)/.exec(ua);
      return match?.[1].replace(/_/g, ".") || "17.0";
    }
    default:
      return "";
  }
}

function detectDeviceType(
  ua: string,
  uaData: NavigatorUAData | null
): "Desktop" | "Laptop" | "Tablet" | "Mobile" | "Unknown" {
  const hasTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || (typeof navigator !== "undefined" && (navigator?.maxTouchPoints || 0) > 0));
  const maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
  const isCoarsePointer = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  // 1. Explicit iPad detection (including iPadOS Desktop Mode in Safari)
  const isIPad =
    /iPad/i.test(ua) ||
    (typeof navigator !== "undefined" &&
      (navigator.platform === "MacIntel" || /Macintosh/i.test(ua)) &&
      (maxTouchPoints > 1 || (typeof window !== "undefined" && "ontouchstart" in window)));

  if (isIPad) return "Tablet";

  // 2. Explicit tablet keywords in UA string
  if (
    /Tablet|PlayBook|Silk|Kindle|MediaPad|MatePad|SM-T|SM-X|SM-P|TB-[A-Z0-9]|KFTUWI|KFTRWI|KFMAWI|KFSOWI|Redmi Pad|Xiaomi Pad|OnePlus Pad|Pixel Tablet/i.test(
      ua
    )
  ) {
    return "Tablet";
  }

  // 3. iPhone / iPod
  if (/iPhone|iPod/.test(ua)) return "Mobile";

  // 4. Android Device Type Detection
  if (/Android/.test(ua) || uaData?.platform === "Android") {
    // Standard Chromium rule: Chrome on Android tablet does NOT include the "Mobile" keyword
    if (!/Mobile/i.test(ua)) return "Tablet";

    // Client-side viewport dimension analysis (in CSS points)
    if (typeof window !== "undefined") {
      const minScreenDim = Math.min(window.screen.width, window.screen.height);
      const maxScreenDim = Math.max(window.screen.width, window.screen.height);

      // Tablets have a minimum dimension of 540px+ and maximum of 800px+ (e.g. 600x1024, 768x1024, 800x1280, 834x1194)
      if (minScreenDim >= 600 || (minScreenDim >= 540 && maxScreenDim >= 960)) {
        return "Tablet";
      }
    }

    if (uaData?.mobile === false) return "Tablet";
    return "Mobile";
  }

  // 5. Chrome OS / CrOS
  if (/CrOS/.test(ua)) {
    if (uaData?.mobile) return "Tablet";
    if (hasTouch && maxTouchPoints > 0) {
      if (typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) <= 900) {
        return "Tablet";
      }
    }
    return "Laptop";
  }

  // 6. Windows 2-in-1 / Touch Tablets (Surface, etc.)
  if (/Windows/.test(ua)) {
    if (hasTouch && maxTouchPoints > 0) {
      if (typeof window !== "undefined") {
        const minDim = Math.min(window.screen.width, window.screen.height);
        if (minDim <= 900 || isCoarsePointer || /Tablet PC|Touch/i.test(ua)) {
          return "Tablet";
        }
      }
      return "Laptop";
    }
    return "Desktop";
  }

  // 7. General touch screen heuristic for tablets
  if (hasTouch && maxTouchPoints > 0 && typeof window !== "undefined") {
    const minScreenDim = Math.min(window.screen.width, window.screen.height);
    if (minScreenDim >= 540 && minScreenDim <= 1024 && isCoarsePointer) {
      return "Tablet";
    }
  }

  // 8. Desktop Mac
  if (/Macintosh/.test(ua)) {
    return "Desktop";
  }

  // 9. Linux
  if (/Linux/.test(ua)) {
    if (hasTouch && isCoarsePointer && typeof window !== "undefined") {
      const minScreenDim = Math.min(window.screen.width, window.screen.height);
      if (minScreenDim >= 540 && minScreenDim <= 1024) return "Tablet";
    }
    return "Desktop";
  }

  return "Mobile";
}

const PHONE_MODEL_DATABASE: Record<string, { vendor: string; name: string }> = {
  // Samsung Galaxy Tab Series
  "SM-X910": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 Ultra" },
  "SM-X916B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 Ultra 5G" },
  "SM-X916U": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 Ultra 5G" },
  "SM-X810": { vendor: "Samsung", name: "Samsung Galaxy Tab S9+" },
  "SM-X816B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9+ 5G" },
  "SM-X710": { vendor: "Samsung", name: "Samsung Galaxy Tab S9" },
  "SM-X716B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 5G" },
  "SM-X610": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 FE+" },
  "SM-X616B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 FE+ 5G" },
  "SM-X510": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 FE" },
  "SM-X516B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 FE 5G" },
  "SM-X210": { vendor: "Samsung", name: "Samsung Galaxy Tab A9+" },
  "SM-X216B": { vendor: "Samsung", name: "Samsung Galaxy Tab A9+ 5G" },
  "SM-X110": { vendor: "Samsung", name: "Samsung Galaxy Tab A9" },
  "SM-X115": { vendor: "Samsung", name: "Samsung Galaxy Tab A9 LTE" },
  "SM-X900": { vendor: "Samsung", name: "Samsung Galaxy Tab S8 Ultra" },
  "SM-X906B": { vendor: "Samsung", name: "Samsung Galaxy Tab S8 Ultra 5G" },
  "SM-X800": { vendor: "Samsung", name: "Samsung Galaxy Tab S8+" },
  "SM-X806B": { vendor: "Samsung", name: "Samsung Galaxy Tab S8+ 5G" },
  "SM-X700": { vendor: "Samsung", name: "Samsung Galaxy Tab S8" },
  "SM-X706B": { vendor: "Samsung", name: "Samsung Galaxy Tab S8 5G" },
  "SM-X200": { vendor: "Samsung", name: "Samsung Galaxy Tab A8 10.5" },
  "SM-X205": { vendor: "Samsung", name: "Samsung Galaxy Tab A8 LTE" },
  "SM-T970": { vendor: "Samsung", name: "Samsung Galaxy Tab S7+" },
  "SM-T975": { vendor: "Samsung", name: "Samsung Galaxy Tab S7+ LTE" },
  "SM-T870": { vendor: "Samsung", name: "Samsung Galaxy Tab S7" },
  "SM-T875": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 LTE" },
  "SM-T730": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 FE" },
  "SM-T733": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 FE Wi-Fi" },
  "SM-T736B": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 FE 5G" },
  "SM-T500": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 10.4" },
  "SM-T505": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 LTE" },
  "SM-T220": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 Lite" },
  "SM-T225": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 Lite LTE" },
  "SM-T510": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1" },
  "SM-T515": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1 LTE" },
  "SM-T290": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0" },
  "SM-T295": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0 LTE" },
  "SM-T860": { vendor: "Samsung", name: "Samsung Galaxy Tab S6" },
  "SM-P610": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite" },
  "SM-P613": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite (2022)" },
  "SM-P615": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite LTE" },
  "SM-P619": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite LTE (2022)" },

  // Samsung Galaxy S Series
  "SM-S928B": { vendor: "Samsung", name: "Samsung Galaxy S24 Ultra" },
  "SM-S928U": { vendor: "Samsung", name: "Samsung Galaxy S24 Ultra" },
  "SM-S926B": { vendor: "Samsung", name: "Samsung Galaxy S24+" },
  "SM-S921B": { vendor: "Samsung", name: "Samsung Galaxy S24" },
  "SM-S918B": { vendor: "Samsung", name: "Samsung Galaxy S23 Ultra" },
  "SM-S918U": { vendor: "Samsung", name: "Samsung Galaxy S23 Ultra" },
  "SM-S916B": { vendor: "Samsung", name: "Samsung Galaxy S23+" },
  "SM-S911B": { vendor: "Samsung", name: "Samsung Galaxy S23" },
  "SM-S908B": { vendor: "Samsung", name: "Samsung Galaxy S22 Ultra" },
  "SM-S906B": { vendor: "Samsung", name: "Samsung Galaxy S22+" },
  "SM-S901B": { vendor: "Samsung", name: "Samsung Galaxy S22" },
  "SM-G998B": { vendor: "Samsung", name: "Samsung Galaxy S21 Ultra" },
  "SM-G996B": { vendor: "Samsung", name: "Samsung Galaxy S21+" },
  "SM-G991B": { vendor: "Samsung", name: "Samsung Galaxy S21" },
  "SM-G988B": { vendor: "Samsung", name: "Samsung Galaxy S20 Ultra" },
  "SM-G981B": { vendor: "Samsung", name: "Samsung Galaxy S20" },

  // Samsung Galaxy A Series
  "SM-A546B": { vendor: "Samsung", name: "Samsung Galaxy A54 5G" },
  "SM-A546E": { vendor: "Samsung", name: "Samsung Galaxy A54 5G" },
  "SM-A536B": { vendor: "Samsung", name: "Samsung Galaxy A53 5G" },
  "SM-A528B": { vendor: "Samsung", name: "Samsung Galaxy A52s 5G" },
  "SM-A525F": { vendor: "Samsung", name: "Samsung Galaxy A52" },
  "SM-A346B": { vendor: "Samsung", name: "Samsung Galaxy A34 5G" },
  "SM-A245F": { vendor: "Samsung", name: "Samsung Galaxy A24" },
  "SM-A146P": { vendor: "Samsung", name: "Samsung Galaxy A14 5G" },
  "SM-A145F": { vendor: "Samsung", name: "Samsung Galaxy A14" },
  "SM-A137F": { vendor: "Samsung", name: "Samsung Galaxy A13" },
  "SM-A135F": { vendor: "Samsung", name: "Samsung Galaxy A13" },
  "SM-A127F": { vendor: "Samsung", name: "Samsung Galaxy A12 Nacho" },
  "SM-A125F": { vendor: "Samsung", name: "Samsung Galaxy A12" },
  "SM-A057F": { vendor: "Samsung", name: "Samsung Galaxy A05s" },
  "SM-A055F": { vendor: "Samsung", name: "Samsung Galaxy A05" },
  "SM-A047F": { vendor: "Samsung", name: "Samsung Galaxy A04s" },
  "SM-A045F": { vendor: "Samsung", name: "Samsung Galaxy A04" },
  "SM-A035F": { vendor: "Samsung", name: "Samsung Galaxy A03" },

  // Google Pixel & Pixel Tablet
  "PIXEL TABLET": { vendor: "Google", name: "Google Pixel Tablet" },
  "PIXEL 8 PRO": { vendor: "Google", name: "Google Pixel 8 Pro" },
  "PIXEL 8": { vendor: "Google", name: "Google Pixel 8" },
  "PIXEL 7A": { vendor: "Google", name: "Google Pixel 7a" },
  "PIXEL 7 PRO": { vendor: "Google", name: "Google Pixel 7 Pro" },
  "PIXEL 7": { vendor: "Google", name: "Google Pixel 7" },
  "PIXEL 6A": { vendor: "Google", name: "Google Pixel 6a" },
  "PIXEL 6 PRO": { vendor: "Google", name: "Google Pixel 6 Pro" },
  "PIXEL 6": { vendor: "Google", name: "Google Pixel 6" },

  // Lenovo Tablets
  "TB370FU": { vendor: "Lenovo", name: "Lenovo Tab P12" },
  "TB350FU": { vendor: "Lenovo", name: "Lenovo Tab P11 Gen 2" },
  "TB128FU": { vendor: "Lenovo", name: "Lenovo Tab M10 Plus (3rd Gen)" },
  "TB125FU": { vendor: "Lenovo", name: "Lenovo Tab M10 Plus (3rd Gen)" },
  "TB310FU": { vendor: "Lenovo", name: "Lenovo Tab M9" },
  "TB-X606F": { vendor: "Lenovo", name: "Lenovo Tab M10 FHD Plus" },
  "TB-X505F": { vendor: "Lenovo", name: "Lenovo Tab M10 HD" },
  "TB-J606F": { vendor: "Lenovo", name: "Lenovo Tab P11" },
  "TB-J706F": { vendor: "Lenovo", name: "Lenovo Tab P11 Pro" },

  // Xiaomi & Redmi Tablets
  "23043RP34G": { vendor: "Xiaomi", name: "Xiaomi Pad 6" },
  "23073RPBFC": { vendor: "Xiaomi", name: "Xiaomi Pad 6 Max 14" },
  "23046PNC9G": { vendor: "Xiaomi", name: "Xiaomi Pad 6 Pro" },
  "22081283G": { vendor: "Xiaomi", name: "Redmi Pad" },
  "23078PND5G": { vendor: "Xiaomi", name: "Xiaomi 13T Pro" },
  "2405CRPFDL": { vendor: "Xiaomi", name: "Redmi Pad Pro" },
  "23120RP34C": { vendor: "Xiaomi", name: "Redmi Pad SE" },

  // OnePlus Pad
  "OPD2203": { vendor: "OnePlus", name: "OnePlus Pad" },
  "OPD2304": { vendor: "OnePlus", name: "OnePlus Pad Go" },
  "OPD2404": { vendor: "OnePlus", name: "OnePlus Pad 2" },

  // Amazon Fire Tablets
  "KFTUWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (13th Gen)" },
  "KFTRWI": { vendor: "Amazon", name: "Amazon Fire HD 8 (12th Gen)" },
  "KFMAWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (11th Gen)" },
  "KFSOWI": { vendor: "Amazon", name: "Amazon Fire 7 (12th Gen)" },

  // Tecno
  "CK8N": { vendor: "Tecno", name: "Tecno Camon 20 Pro 5G" },
  "CK7N": { vendor: "Tecno", name: "Tecno Camon 20 Pro" },
  "CK6": { vendor: "Tecno", name: "Tecno Camon 20" },
  "KJ5": { vendor: "Tecno", name: "Tecno Spark 20" },
  "KJ6": { vendor: "Tecno", name: "Tecno Spark 20 Pro" },
  "BG6": { vendor: "Tecno", name: "Tecno Spark 10" },
  "KI5Q": { vendor: "Tecno", name: "Tecno Spark 10C" },
  "KI7": { vendor: "Tecno", name: "Tecno Spark 10 Pro" },
  "KG5K": { vendor: "Tecno", name: "Tecno Spark 8C" },
  "KG6K": { vendor: "Tecno", name: "Tecno Spark 8P" },
  "BF7": { vendor: "Tecno", name: "Tecno Pop 7" },
  "BD4A": { vendor: "Tecno", name: "Tecno Pop 5 LTE" },

  // Infinix
  "X6831": { vendor: "Infinix", name: "Infinix Note 30" },
  "X6833B": { vendor: "Infinix", name: "Infinix Note 30 VIP" },
  "X6711": { vendor: "Infinix", name: "Infinix Note 12 5G" },
  "X676B": { vendor: "Infinix", name: "Infinix Note 12 Pro" },
  "X6816D": { vendor: "Infinix", name: "Infinix Hot 20" },
  "X6812": { vendor: "Infinix", name: "Infinix Hot 11" },
  "X6817": { vendor: "Infinix", name: "Infinix Hot 20i" },
  "X6836": { vendor: "Infinix", name: "Infinix Hot 30" },
  "X6515": { vendor: "Infinix", name: "Infinix Smart 7" },
  "X6516": { vendor: "Infinix", name: "Infinix Smart 7 HD" },
  "X6525": { vendor: "Infinix", name: "Infinix Smart 8" },
  "X670": { vendor: "Infinix", name: "Infinix Zero 5G" },

  // Itel
  "P661N": { vendor: "Itel", name: "Itel P40" },
  "P662L": { vendor: "Itel", name: "Itel P55 5G" },
  "A662L": { vendor: "Itel", name: "Itel A60" },
  "A662LM": { vendor: "Itel", name: "Itel A60s" },
  "S665L": { vendor: "Itel", name: "Itel S23" },
  "S666LN": { vendor: "Itel", name: "Itel S23+" },

  // Xiaomi / Redmi Phones
  "2201116TG": { vendor: "Xiaomi", name: "Redmi Note 11" },
  "2201117TY": { vendor: "Xiaomi", name: "Redmi Note 11S" },
  "22101316G": { vendor: "Xiaomi", name: "Redmi Note 12 Pro" },
  "23021RAA2Y": { vendor: "Xiaomi", name: "Redmi Note 12 4G" },
  "23129RAA4G": { vendor: "Xiaomi", name: "Redmi Note 13 4G" },
  "2312DRA50G": { vendor: "Xiaomi", name: "Redmi Note 13 Pro" },
  "220733SI": { vendor: "Xiaomi", name: "Redmi A1" },
  "23028RN4DG": { vendor: "Xiaomi", name: "Redmi 12C" },
  "23053RN02Y": { vendor: "Xiaomi", name: "Redmi 12" },
  "M2007J20CG": { vendor: "Xiaomi", name: "POCO X3 NFC" },
  "2201116PG": { vendor: "Xiaomi", name: "POCO M4 Pro" },
  "23049PCD8G": { vendor: "Xiaomi", name: "POCO F5" },
};

function formatSamsungPrefix(model: string): string {
  const m = model.toUpperCase().trim();
  if (m.startsWith("SM-X") || m.startsWith("SM-T") || m.startsWith("SM-P")) {
    if (m.startsWith("SM-X9")) return "Samsung Galaxy Tab S9/S8 Ultra Series";
    if (m.startsWith("SM-X8")) return "Samsung Galaxy Tab S9+/S8+ Series";
    if (m.startsWith("SM-X7")) return "Samsung Galaxy Tab S9/S8 Series";
    if (m.startsWith("SM-X6") || m.startsWith("SM-X5")) return "Samsung Galaxy Tab S9 FE Series";
    if (m.startsWith("SM-X2") || m.startsWith("SM-X1")) return "Samsung Galaxy Tab A9/A8 Series";
    if (m.startsWith("SM-T8") || m.startsWith("SM-T9")) return "Samsung Galaxy Tab S7/S6 Series";
    if (m.startsWith("SM-T5") || m.startsWith("SM-T2")) return "Samsung Galaxy Tab A Series";
    if (m.startsWith("SM-P")) return "Samsung Galaxy Tab S6 Lite Series";
    return `Samsung Galaxy Tab (${model})`;
  }

  const prefix = m.slice(0, 6);
  const map: Record<string, string> = {
    "SM-S92": "Samsung Galaxy S24 Series",
    "SM-S91": "Samsung Galaxy S23 Series",
    "SM-S90": "Samsung Galaxy S22 Series",
    "SM-G99": "Samsung Galaxy S21 Series",
    "SM-A54": "Samsung Galaxy A54",
    "SM-A53": "Samsung Galaxy A53",
    "SM-A34": "Samsung Galaxy A34",
    "SM-A24": "Samsung Galaxy A24",
    "SM-A14": "Samsung Galaxy A14",
    "SM-A13": "Samsung Galaxy A13",
    "SM-A12": "Samsung Galaxy A12",
    "SM-A05": "Samsung Galaxy A05",
    "SM-A04": "Samsung Galaxy A04",
    "SM-A03": "Samsung Galaxy A03",
  };
  return map[prefix] || `Samsung Galaxy (${model})`;
}

function detectDeviceName(
  ua: string,
  uaData: NavigatorUAData | null,
  highEntropy: Record<string, unknown> | null,
  os: string,
  osVersion: string,
  deviceType: "Desktop" | "Laptop" | "Tablet" | "Mobile" | "Unknown",
  gpuRenderer?: string
): { deviceName: string; deviceModel?: string; deviceVendor?: string } {
  // 1. High entropy UA-CH model
  if (highEntropy?.model && typeof highEntropy.model === "string") {
    const rawModel = highEntropy.model.trim();
    if (rawModel) {
      const upper = rawModel.toUpperCase();
      if (PHONE_MODEL_DATABASE[upper]) {
        return {
          deviceName: PHONE_MODEL_DATABASE[upper].name,
          deviceModel: rawModel,
          deviceVendor: PHONE_MODEL_DATABASE[upper].vendor,
        };
      }
      if (upper.startsWith("SM-") || upper.startsWith("GT-")) {
        return {
          deviceName: formatSamsungPrefix(rawModel),
          deviceModel: rawModel,
          deviceVendor: "Samsung",
        };
      }
      if (/Pixel/i.test(rawModel)) {
        return {
          deviceName: rawModel.startsWith("Google") ? rawModel : `Google ${rawModel}`,
          deviceModel: rawModel,
          deviceVendor: "Google",
        };
      }
      if (/Redmi/i.test(rawModel) || /POCO/i.test(rawModel) || /Xiaomi/i.test(rawModel)) {
        return {
          deviceName: `Xiaomi ${rawModel.replace(/^Xiaomi\s*/i, "")}`,
          deviceModel: rawModel,
          deviceVendor: "Xiaomi",
        };
      }
      if (/TECNO/i.test(rawModel)) {
        return {
          deviceName: `Tecno ${rawModel.replace(/^TECNO\s*/i, "")}`,
          deviceModel: rawModel,
          deviceVendor: "Tecno",
        };
      }
      if (/Infinix/i.test(rawModel)) {
        return {
          deviceName: `Infinix ${rawModel.replace(/^Infinix\s*/i, "")}`,
          deviceModel: rawModel,
          deviceVendor: "Infinix",
        };
      }
      if (/itel/i.test(rawModel)) {
        return {
          deviceName: `Itel ${rawModel.replace(/^itel\s*/i, "")}`,
          deviceModel: rawModel,
          deviceVendor: "Itel",
        };
      }
      if (/Oppo|CPH/i.test(rawModel)) {
        return {
          deviceName: `Oppo (${rawModel})`,
          deviceModel: rawModel,
          deviceVendor: "Oppo",
        };
      }
      if (/Vivo|V2/i.test(rawModel)) {
        return {
          deviceName: `Vivo (${rawModel})`,
          deviceModel: rawModel,
          deviceVendor: "Vivo",
        };
      }
      return {
        deviceName: rawModel,
        deviceModel: rawModel,
        deviceVendor: "Android",
      };
    }
  }

  // 2. iOS & iPadOS Devices
  if (/iPhone/.test(ua)) {
    if (typeof window !== "undefined") {
      const sw = Math.min(window.screen.width, window.screen.height);
      const sh = Math.max(window.screen.width, window.screen.height);
      const dpr = window.devicePixelRatio || 1;
      if (sw === 430 && sh === 932) return { deviceName: "Apple iPhone 15 Pro Max / 14 Pro Max", deviceModel: "iPhone Pro Max", deviceVendor: "Apple" };
      if (sw === 393 && sh === 852) return { deviceName: "Apple iPhone 15 / 15 Pro", deviceModel: "iPhone 15", deviceVendor: "Apple" };
      if (sw === 428 && sh === 926) return { deviceName: "Apple iPhone 14 Plus / 13 Pro Max", deviceModel: "iPhone Plus", deviceVendor: "Apple" };
      if (sw === 390 && sh === 844) return { deviceName: "Apple iPhone 14 / 13 / 12", deviceModel: "iPhone", deviceVendor: "Apple" };
      if (sw === 414 && sh === 896) return { deviceName: dpr === 3 ? "Apple iPhone 11 Pro Max" : "Apple iPhone 11 / XR", deviceModel: "iPhone 11", deviceVendor: "Apple" };
      if (sw === 375 && sh === 667) return { deviceName: "Apple iPhone SE (3rd Gen)", deviceModel: "iPhone SE", deviceVendor: "Apple" };
    }
    return { deviceName: "Apple iPhone", deviceModel: "iPhone", deviceVendor: "Apple" };
  }

  if (/iPad/.test(ua) || os === "iPadOS" || (deviceType === "Tablet" && (/Macintosh/.test(ua) || /MacIntel/.test(ua)))) {
    if (typeof window !== "undefined") {
      const sw = Math.min(window.screen.width, window.screen.height);
      const sh = Math.max(window.screen.width, window.screen.height);
      if (sw >= 1024 && sh >= 1366) return { deviceName: 'Apple iPad Pro 12.9" / 13"', deviceModel: "iPad Pro 12.9", deviceVendor: "Apple" };
      if (sw >= 834 && sh >= 1194) return { deviceName: 'Apple iPad Pro 11"', deviceModel: "iPad Pro 11", deviceVendor: "Apple" };
      if (sw >= 810 && sh >= 1080) return { deviceName: "Apple iPad Air / 10th Gen", deviceModel: "iPad Air", deviceVendor: "Apple" };
      if (sw <= 768) return { deviceName: "Apple iPad Mini / 9th Gen", deviceModel: "iPad Mini", deviceVendor: "Apple" };
    }
    return { deviceName: "Apple iPad", deviceModel: "iPad", deviceVendor: "Apple" };
  }

  // 3. Android UA candidate extraction
  if (/Android/.test(ua)) {
    const androidMatch = /;\s*([^;)]+?)\s*(?:Build\/|\))/i.exec(ua);
    if (androidMatch && androidMatch[1]) {
      const cand = androidMatch[1].trim();
      const candUpper = cand.toUpperCase();
      if (PHONE_MODEL_DATABASE[candUpper]) {
        return {
          deviceName: PHONE_MODEL_DATABASE[candUpper].name,
          deviceModel: cand,
          deviceVendor: PHONE_MODEL_DATABASE[candUpper].vendor,
        };
      }
      if (
        cand &&
        !cand.includes("Linux") &&
        !cand.includes("Android") &&
        cand.length >= 2 &&
        cand.length < 50
      ) {
        if (/^SM-|^GT-|^SCH-/i.test(cand)) {
          return { deviceName: formatSamsungPrefix(cand), deviceModel: cand, deviceVendor: "Samsung" };
        }
        if (/Pixel/i.test(cand)) return { deviceName: `Google ${cand.replace(/^Google\s*/i, "")}`, deviceModel: cand, deviceVendor: "Google" };
        if (/Redmi/i.test(cand) || /POCO/i.test(cand) || /Xiaomi/i.test(cand)) return { deviceName: `Xiaomi ${cand}`, deviceModel: cand, deviceVendor: "Xiaomi" };
        if (/TECNO/i.test(cand)) return { deviceName: `Tecno ${cand.replace(/^TECNO\s*/i, "")}`, deviceModel: cand, deviceVendor: "Tecno" };
        if (/Infinix/i.test(cand)) return { deviceName: `Infinix ${cand.replace(/^Infinix\s*/i, "")}`, deviceModel: cand, deviceVendor: "Infinix" };
        if (/itel/i.test(cand)) return { deviceName: `Itel ${cand.replace(/^itel\s*/i, "")}`, deviceModel: cand, deviceVendor: "Itel" };
        if (/vivo/i.test(cand)) return { deviceName: `Vivo ${cand.replace(/^vivo\s*/i, "")}`, deviceModel: cand, deviceVendor: "Vivo" };
        if (/OPPO/i.test(cand)) return { deviceName: `Oppo ${cand.replace(/^OPPO\s*/i, "")}`, deviceModel: cand, deviceVendor: "Oppo" };
        if (/realme/i.test(cand)) return { deviceName: `Realme ${cand.replace(/^realme\s*/i, "")}`, deviceModel: cand, deviceVendor: "Realme" };
        if (/HUAWEI/i.test(cand)) return { deviceName: `Huawei ${cand.replace(/^HUAWEI\s*/i, "")}`, deviceModel: cand, deviceVendor: "Huawei" };
        return { deviceName: `Android (${cand})`, deviceModel: cand, deviceVendor: "Android" };
      }
    }

    // Heuristic device name based on GPU / Chipset
    if (gpuRenderer) {
      if (/Adreno\s*\(TM\)\s*(7\d\d|8\d\d)/i.test(gpuRenderer)) {
        return { deviceName: "Flagship Android Smartphone (Snapdragon)", deviceVendor: "Qualcomm Snapdragon" };
      }
      if (/Adreno\s*\(TM\)\s*6\d\d/i.test(gpuRenderer)) {
        return { deviceName: "Android Smartphone (Snapdragon 6/7 Series)", deviceVendor: "Qualcomm Snapdragon" };
      }
      if (/Mali-G(7\d|7\d\d)/i.test(gpuRenderer)) {
        return { deviceName: "High-Performance Android Smartphone (MediaTek/Mali)", deviceVendor: "MediaTek" };
      }
      if (/Mali-G(5\d)/i.test(gpuRenderer)) {
        return { deviceName: "Android Smartphone (MediaTek Helio / Mali)", deviceVendor: "MediaTek" };
      }
      if (/PowerVR/i.test(gpuRenderer)) {
        return { deviceName: "Android Smartphone (PowerVR Series)", deviceVendor: "PowerVR" };
      }
    }

    return {
      deviceName: deviceType === "Tablet" ? "Android Tablet" : "Android Smartphone",
      deviceVendor: "Android",
    };
  }

  // 4. macOS
  if (os === "macOS" || /Macintosh/.test(ua)) {
    if (gpuRenderer) {
      if (/Apple M[1-4]/i.test(gpuRenderer)) {
        const mMatch = gpuRenderer.match(/Apple (M[1-4](?:\s+Pro|\s+Max|\s+Ultra)?)/i);
        return { deviceName: `Apple Mac (${mMatch ? mMatch[1] : "Apple Silicon"})`, deviceVendor: "Apple" };
      }
      if (/Apple/i.test(gpuRenderer)) {
        return { deviceName: "Apple Silicon Mac", deviceVendor: "Apple" };
      }
      if (/Intel/i.test(gpuRenderer)) {
        return { deviceName: "Apple Mac (Intel)", deviceVendor: "Apple" };
      }
    }
    return { deviceName: osVersion ? `Apple Mac (macOS ${osVersion})` : "Apple Mac", deviceVendor: "Apple" };
  }

  // 5. Windows
  if (os === "Windows" || /Windows/.test(ua)) {
    const isWin11 = osVersion === "11" || osVersion === "10/11";
    const base = isWin11 ? "Windows 11" : (osVersion === "10" ? "Windows 10" : "Windows");
    if (deviceType === "Tablet") return { deviceName: `${base} 2-in-1 Tablet`, deviceVendor: "Microsoft Windows" };
    if (deviceType === "Laptop") return { deviceName: `${base} Laptop`, deviceVendor: "Microsoft Windows" };
    return { deviceName: `${base} PC`, deviceVendor: "Microsoft Windows" };
  }

  // 6. Chrome OS
  if (os === "Chrome OS" || /CrOS/.test(ua)) {
    return { deviceName: "Google Chromebook", deviceVendor: "Google" };
  }

  // 7. Linux
  if (os === "Linux" || /Linux/.test(ua)) {
    if (/Ubuntu/i.test(ua)) return { deviceName: "Ubuntu Linux PC", deviceVendor: "Ubuntu" };
    if (/Fedora/i.test(ua)) return { deviceName: "Fedora Linux PC", deviceVendor: "Fedora" };
    if (/Debian/i.test(ua)) return { deviceName: "Debian Linux PC", deviceVendor: "Debian" };
    return { deviceName: "Linux Workstation", deviceVendor: "Linux" };
  }

  return {
    deviceName: `${deviceType !== "Unknown" ? deviceType : "Device"} (${os !== "Unknown" ? os : "Web"})`,
  };
}

function detectCPUArchitecture(
  ua: string,
  highEntropy: Record<string, unknown> | null,
  os?: string,
  gpuRenderer?: string
): string | undefined {
  const cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : undefined;

  if (highEntropy?.architecture && typeof highEntropy.architecture === "string") {
    const arch = highEntropy.architecture;
    if (arch && arch !== "") {
      const bitness = highEntropy?.bitness ? `${highEntropy.bitness}-bit` : "";
      return [arch, bitness, cores].filter(Boolean).join(" • ");
    }
  }

  if (os === "macOS" && gpuRenderer && /Apple/i.test(gpuRenderer)) {
    return ["ARM64 (Apple Silicon)", cores].filter(Boolean).join(" • ");
  }

  if (os === "iOS") {
    return ["ARM64 (Apple Bionic / Silicon)", cores].filter(Boolean).join(" • ");
  }

  if (os === "Android") {
    if (gpuRenderer && (/Adreno/i.test(gpuRenderer) || /Snapdragon/i.test(gpuRenderer))) {
      return ["ARM64 (Qualcomm Snapdragon)", cores].filter(Boolean).join(" • ");
    }
    if (gpuRenderer && /Mali/i.test(gpuRenderer)) {
      return ["ARM64 (MediaTek / ARM Mali)", cores].filter(Boolean).join(" • ");
    }
    return ["ARM64 (Octa-Core ARMv8/v9)", cores].filter(Boolean).join(" • ");
  }

  const archMatch = /\b(x86_64|Win64|WOW64|aarch64|armv[0-9]+|arm64)\b/.exec(ua);
  if (archMatch) {
    const arch = archMatch[1];
    const cleanArch = (arch === "Win64" || arch === "WOW64") ? "x86_64" : arch;
    return [cleanArch, cores].filter(Boolean).join(" • ");
  }

  if (os === "Windows" || os === "Linux") {
    return ["x86_64", cores].filter(Boolean).join(" • ");
  }

  return cores ? `64-bit • ${cores}` : "64-bit Architecture";
}
