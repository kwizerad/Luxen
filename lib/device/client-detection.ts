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
        // Clean up common prefixes like "ANGLE (..., "
        return renderer.replace(/^ANGLE\s*\((.+)\)$/, "$1").trim();
      }
    }
  } catch {
    // WebGL unsupported or context disabled
  }
  return undefined;
}

export async function parseDeviceInfo(): Promise<ParsedDeviceInfo> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
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

  const gpuRenderer = detectGPURenderer();
  const browser = detectBrowser(ua, uaData, highEntropyData);
  const browserVersion = detectBrowserVersion(ua, browser, uaData, highEntropyData);
  const os = detectOS(ua, uaData);
  const osVersion = detectOSVersion(ua, os, highEntropyData);
  const deviceType = detectDeviceType(ua, uaData);
  let deviceName = detectDeviceName(ua, uaData, highEntropyData, os, osVersion, deviceType, gpuRenderer);
  if (!deviceName) {
    if (os === "Android") {
      deviceName = deviceType === "Tablet" ? "Android Tablet" : "Android Smartphone";
    } else if (os === "iOS") {
      deviceName = deviceType === "Tablet" ? "Apple iPad" : "Apple iPhone";
    } else if (os === "Windows") {
      deviceName = `Windows ${osVersion ? osVersion + " " : ""}PC`;
    } else if (os === "macOS") {
      deviceName = "Apple Mac";
    } else if (os === "Linux") {
      deviceName = "Linux PC";
    } else {
      deviceName = `${deviceType !== "Unknown" ? deviceType : "Device"} (${os !== "Unknown" ? os : "Web"})`;
    }
  }

  const rawCpuArch = detectCPUArchitecture(ua, highEntropyData, os, gpuRenderer);
  const cpuArchitecture = rawCpuArch || (os === "Android" || os === "iOS" ? "ARM64" : (os === "macOS" ? "ARM64 (Apple Silicon)" : "x86_64"));

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
  if (uaData?.platform) {
    const p = uaData.platform;
    if (p === "Windows") return "Windows";
    if (p === "macOS") return "macOS";
    if (p === "Android") return "Android";
    if (p === "Chrome OS") return "Chrome OS";
    if (p === "Linux") return "Linux";
  }

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
  if (highEntropy?.platformVersion && typeof highEntropy.platformVersion === "string") {
    const pv = highEntropy.platformVersion;
    if (os === "Windows") {
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
  const hasTouch = typeof window !== "undefined" && ("ontouchstart" in window || (navigator?.maxTouchPoints || 0) > 0);
  const maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;

  if (/iPad/.test(ua)) return "Tablet";
  if (/iPhone/.test(ua)) return "Mobile";
  if (/iPod/.test(ua)) return "Mobile";

  if (/Android/.test(ua)) {
    if (/Tablet/.test(ua)) return "Tablet";
    if (!/Mobile/.test(ua)) return "Tablet";

    if (typeof window !== "undefined") {
      const cssWidth = window.screen.width / (window.devicePixelRatio || 1);
      const cssHeight = window.screen.height / (window.devicePixelRatio || 1);
      const minCssDim = Math.min(cssWidth, cssHeight);
      if (minCssDim >= 600) return "Tablet";
      const minScreenDim = Math.min(window.screen.width, window.screen.height);
      if (minScreenDim >= 1200) return "Tablet";
    }
    return "Mobile";
  }

  if (/CrOS/.test(ua)) {
    if (uaData?.mobile) return "Tablet";
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Laptop";
  }

  if (/Macintosh/.test(ua)) {
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Desktop";
  }

  if (/Windows/.test(ua)) {
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Desktop";
  }

  if (/Linux/.test(ua)) {
    if (hasTouch && maxTouchPoints > 0) return "Tablet";
    return "Desktop";
  }

  return "Unknown";
}

function formatSamsungModel(model: string): string {
  const m = model.toUpperCase().trim();
  const map: Record<string, string> = {
    "SM-S928": "Samsung Galaxy S24 Ultra",
    "SM-S926": "Samsung Galaxy S24+",
    "SM-S921": "Samsung Galaxy S24",
    "SM-S918": "Samsung Galaxy S23 Ultra",
    "SM-S916": "Samsung Galaxy S23+",
    "SM-S911": "Samsung Galaxy S23",
    "SM-S908": "Samsung Galaxy S22 Ultra",
    "SM-S906": "Samsung Galaxy S22+",
    "SM-S901": "Samsung Galaxy S22",
    "SM-G998": "Samsung Galaxy S21 Ultra",
    "SM-G996": "Samsung Galaxy S21+",
    "SM-G991": "Samsung Galaxy S21",
    "SM-G988": "Samsung Galaxy S20 Ultra",
    "SM-G986": "Samsung Galaxy S20+",
    "SM-G981": "Samsung Galaxy S20",
    "SM-G975": "Samsung Galaxy S10+",
    "SM-G973": "Samsung Galaxy S10",
    "SM-A546": "Samsung Galaxy A54 5G",
    "SM-A536": "Samsung Galaxy A53 5G",
    "SM-A528": "Samsung Galaxy A52s 5G",
    "SM-A525": "Samsung Galaxy A52",
    "SM-A346": "Samsung Galaxy A34 5G",
    "SM-A245": "Samsung Galaxy A24",
    "SM-A146": "Samsung Galaxy A14 5G",
    "SM-A145": "Samsung Galaxy A14",
    "SM-A055": "Samsung Galaxy A05",
    "SM-A045": "Samsung Galaxy A04",
    "SM-X910": "Samsung Galaxy Tab S9 Ultra",
    "SM-X810": "Samsung Galaxy Tab S9+",
    "SM-X710": "Samsung Galaxy Tab S9",
    "SM-X200": "Samsung Galaxy Tab A8",
  };

  const prefix4 = m.slice(0, 7);
  if (map[prefix4]) return map[prefix4];

  if (m.startsWith("SM-T") || m.startsWith("SM-X")) {
    return `Samsung Galaxy Tab (${model})`;
  }
  return `Samsung Galaxy (${model})`;
}

function detectDeviceName(
  ua: string,
  uaData: NavigatorUAData | null,
  highEntropy: Record<string, unknown> | null,
  os: string,
  osVersion: string,
  deviceType: "Desktop" | "Laptop" | "Tablet" | "Mobile" | "Unknown",
  gpuRenderer?: string
): string | undefined {
  // 1. High entropy UA-CH "model"
  if (highEntropy?.model && typeof highEntropy.model === "string") {
    const rawModel = highEntropy.model.trim();
    if (rawModel) {
      if (rawModel.startsWith("SM-") || rawModel.startsWith("GT-") || rawModel.startsWith("SCH-")) {
        return formatSamsungModel(rawModel);
      }
      if (/Pixel/i.test(rawModel)) {
        return rawModel.startsWith("Google") ? rawModel : `Google ${rawModel}`;
      }
      if (/Redmi/i.test(rawModel)) return `Xiaomi ${rawModel}`;
      if (/POCO/i.test(rawModel)) return `Xiaomi ${rawModel}`;
      if (/OnePlus/i.test(rawModel)) return rawModel;
      if (/TECNO/i.test(rawModel)) return `Tecno ${rawModel.replace(/^TECNO\s*/i, "")}`;
      if (/Infinix/i.test(rawModel)) return `Infinix ${rawModel.replace(/^Infinix\s*/i, "")}`;
      if (/itel/i.test(rawModel)) return `Itel ${rawModel.replace(/^itel\s*/i, "")}`;
      if (/HUAWEI/i.test(rawModel)) return `Huawei ${rawModel.replace(/^HUAWEI\s*/i, "")}`;
      return rawModel;
    }
  }

  // 2. iOS devices
  if (/iPhone/.test(ua)) {
    if (typeof window !== "undefined") {
      const sw = Math.min(window.screen.width, window.screen.height);
      const sh = Math.max(window.screen.width, window.screen.height);
      const dpr = window.devicePixelRatio || 1;
      if (sw === 430 && sh === 932) return "Apple iPhone (Pro Max / Plus)";
      if (sw === 393 && sh === 852) return "Apple iPhone (Pro / Standard)";
      if (sw === 428 && sh === 926) return "Apple iPhone Plus / Pro Max";
      if (sw === 390 && sh === 844) return "Apple iPhone";
      if (sw === 414 && sh === 896) return dpr === 3 ? "Apple iPhone Pro Max" : "Apple iPhone 11 / XR";
      if (sw === 375 && sh === 667) return "Apple iPhone SE";
    }
    return "Apple iPhone";
  }

  if (/iPad/.test(ua)) {
    if (typeof window !== "undefined") {
      const sw = Math.min(window.screen.width, window.screen.height);
      const sh = Math.max(window.screen.width, window.screen.height);
      if (sw >= 1024 && sh >= 1366) return 'Apple iPad Pro 12.9"';
      if (sw >= 834 && sh >= 1194) return 'Apple iPad Pro 11"';
      if (sw >= 810 && sh >= 1080) return "Apple iPad / Air";
      if (sw <= 768) return "Apple iPad Mini";
    }
    return "Apple iPad";
  }

  if (/iPod/.test(ua)) return "Apple iPod Touch";

  // 3. Android UA string parsing
  if (/Android/.test(ua)) {
    const androidMatch = /;\s*([^;)]+?)\s*(?:Build\/|\))/i.exec(ua);
    if (androidMatch && androidMatch[1]) {
      const cand = androidMatch[1].trim();
      if (
        cand &&
        !cand.includes("Linux") &&
        !cand.includes("Android") &&
        cand.length >= 2 &&
        cand.length < 50
      ) {
        if (/^SM-|^GT-|^SCH-/i.test(cand)) return formatSamsungModel(cand);
        if (/Pixel/i.test(cand)) return cand.startsWith("Google") ? cand : `Google ${cand}`;
        if (/Redmi/i.test(cand)) return `Xiaomi ${cand}`;
        if (/POCO/i.test(cand)) return `Xiaomi ${cand}`;
        if (/Xiaomi|Mi\s/i.test(cand)) return `Xiaomi ${cand}`;
        if (/TECNO/i.test(cand)) return `Tecno ${cand.replace(/^TECNO\s*/i, "")}`;
        if (/Infinix/i.test(cand)) return `Infinix ${cand.replace(/^Infinix\s*/i, "")}`;
        if (/itel/i.test(cand)) return `Itel ${cand.replace(/^itel\s*/i, "")}`;
        if (/OnePlus|CPH/i.test(cand)) return `OnePlus / Oppo (${cand})`;
        if (/HUAWEI/i.test(cand)) return `Huawei ${cand.replace(/^HUAWEI\s*/i, "")}`;
        if (/vivo/i.test(cand)) return `Vivo ${cand.replace(/^vivo\s*/i, "")}`;
        if (/OPPO/i.test(cand)) return `Oppo ${cand.replace(/^OPPO\s*/i, "")}`;
        if (/realme/i.test(cand)) return `Realme ${cand.replace(/^realme\s*/i, "")}`;
        if (/moto|motorola/i.test(cand)) return `Motorola ${cand.replace(/^moto(rola)?\s*/i, "")}`;
        if (/Sony|Xperia/i.test(cand)) return `Sony Xperia ${cand.replace(/^Sony\s*/i, "")}`;
        return `Android (${cand})`;
      }
    }
    return deviceType === "Tablet" ? "Android Tablet" : "Android Smartphone";
  }

  // 4. macOS
  if (os === "macOS" || /Macintosh/.test(ua)) {
    if (gpuRenderer) {
      if (/Apple M[1-4]/i.test(gpuRenderer)) {
        const mMatch = gpuRenderer.match(/Apple (M[1-4](?:\s+Pro|\s+Max|\s+Ultra)?)/i);
        return mMatch ? `Apple Mac (${mMatch[1]})` : "Apple Silicon Mac";
      }
      if (/Apple/i.test(gpuRenderer)) {
        return "Apple Silicon Mac";
      }
      if (/Intel/i.test(gpuRenderer)) {
        return "Apple Mac (Intel)";
      }
      if (/AMD|Radeon/i.test(gpuRenderer)) {
        return "Apple Mac (AMD Radeon)";
      }
    }
    return osVersion ? `Apple Mac (macOS ${osVersion})` : "Apple Mac";
  }

  // 5. Windows
  if (os === "Windows" || /Windows/.test(ua)) {
    const isWin11 = osVersion === "11";
    const base = isWin11 ? "Windows 11" : (osVersion === "10" ? "Windows 10" : "Windows");
    if (deviceType === "Tablet") return `${base} 2-in-1 / Tablet`;
    if (deviceType === "Laptop") return `${base} Laptop`;
    return `${base} PC`;
  }

  // 6. Chrome OS
  if (os === "Chrome OS" || /CrOS/.test(ua)) {
    return "Google Chromebook";
  }

  // 7. Linux
  if (os === "Linux" || /Linux/.test(ua)) {
    if (/Ubuntu/i.test(ua)) return "Ubuntu Linux PC";
    if (/Fedora/i.test(ua)) return "Fedora Linux PC";
    if (/Debian/i.test(ua)) return "Debian Linux PC";
    if (/Arch/i.test(ua)) return "Arch Linux PC";
    return "Linux PC / Workstation";
  }

  return undefined;
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
    return ["ARM64 (Apple Silicon)", cores].filter(Boolean).join(" • ");
  }

  if (os === "Android") {
    if (gpuRenderer && (/Adreno/i.test(gpuRenderer) || /Snapdragon/i.test(gpuRenderer))) {
      return ["ARM64 (Qualcomm)", gpuRenderer, cores].filter(Boolean).join(" • ");
    }
    if (gpuRenderer && /Mali/i.test(gpuRenderer)) {
      return ["ARM64 (ARM Mali)", gpuRenderer, cores].filter(Boolean).join(" • ");
    }
    return ["ARM64 (ARMv8-A)", cores].filter(Boolean).join(" • ");
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

