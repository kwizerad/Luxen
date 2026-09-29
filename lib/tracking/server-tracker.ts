import type { NextRequest } from "next/server";
import { userAgent } from "next/server";
import type { ServerVisitorDevicePayload, DeviceType } from "./types";

export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (
    clean === "127.0.0.1" ||
    clean === "0.0.0.0" ||
    clean === "localhost" ||
    clean === "::1" ||
    clean === "unknown"
  ) {
    return true;
  }
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (clean.startsWith("169.254.")) return true;
  if (clean.startsWith("fe80:") || clean.startsWith("fc00:") || clean.startsWith("fd00:")) return true;
  return false;
}

export function extractClientIp(req: NextRequest): string {
  const headers = req.headers;

  // Cloudflare Connecting IP
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && !isPrivateOrLocalIp(cfConnectingIp)) return cfConnectingIp.trim();

  // GCP Cloud Run / App Engine
  const gcpIp = headers.get("x-appengine-user-ip");
  if (gcpIp && !isPrivateOrLocalIp(gcpIp)) return gcpIp.trim();

  // Vercel Forwarded For
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const first = vercelIp.split(",")[0]?.trim();
    if (first && !isPrivateOrLocalIp(first)) return first;
  }

  // Fastly / Akamai
  const fastlyIp = headers.get("fastly-client-ip");
  if (fastlyIp && !isPrivateOrLocalIp(fastlyIp)) return fastlyIp.trim();

  const trueClientIp = headers.get("x-true-client-ip");
  if (trueClientIp && !isPrivateOrLocalIp(trueClientIp)) return trueClientIp.trim();

  // Standard X-Forwarded-For
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    for (const item of ips) {
      if (item && !isPrivateOrLocalIp(item)) return item;
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && !isPrivateOrLocalIp(realIp)) return realIp.trim();

  const clientIp = headers.get("x-client-ip");
  if (clientIp && !isPrivateOrLocalIp(clientIp)) return clientIp.trim();

  if (req.ip && !isPrivateOrLocalIp(req.ip)) return req.ip.trim();

  // Fallback to first forwarded IP or localhost
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return req.ip || "127.0.0.1";
}

export function resolveDeviceType(
  rawType: string | undefined,
  isMobileHint: string | null,
  isBot: boolean,
  ua: string = "",
  chModel: string | null = null,
  chFormFactors: string | null = null
): DeviceType {
  if (isBot) return "bot";

  const cleanModel = (chModel || "").replace(/"/g, "").trim().toUpperCase();
  const cleanFormFactors = (chFormFactors || "").toLowerCase();

  // 1. Explicit Form Factors Hint (Chromium 121+)
  if (cleanFormFactors.includes("tablet")) {
    return "tablet";
  }

  // 2. High-Entropy Model Match against comprehensive tablet patterns
  if (
    cleanModel &&
    (TABLET_EXPLICIT_MODELS.has(cleanModel) ||
      cleanModel.startsWith("SM-X") ||
      cleanModel.startsWith("SM-T") ||
      cleanModel.startsWith("SM-P") ||
      cleanModel.startsWith("GT-P") ||
      cleanModel.startsWith("GT-N") ||
      cleanModel.startsWith("TB") ||
      cleanModel.startsWith("YT-") ||
      cleanModel.startsWith("OPD") ||
      cleanModel.startsWith("RMP") ||
      cleanModel.startsWith("KFT") ||
      cleanModel.startsWith("KFA") ||
      cleanModel.startsWith("KF") ||
      cleanModel.includes("TABLET") ||
      cleanModel.includes("PAD") ||
      cleanModel.includes("TAB") ||
      cleanModel.includes("SURFACE") ||
      cleanModel.includes("TANGORPRO"))
  ) {
    return "tablet";
  }

  // 3. User-Agent string explicit tablet regex matching
  const TABLET_UA_REGEX =
    /iPad|Tablet|PlayBook|Silk|Kindle|MediaPad|MatePad|Honor\s*Pad|Xiaomi\s*Pad|Redmi\s*Pad|POCO\s*Pad|OnePlus\s*Pad|Oppo\s*Pad|Realme\s*Pad|vivo\s*Pad|iQOO\s*Pad|Pixel\s*Tablet|Tangorpro|Surface|Teclast|Alldocube|Chuwi|Blackview\s*Tab|Doogee\s*T\d|TCL\s*Tab|Nokia\s*T\d\d?|Tab\s+[A-Z0-9]|Tab\d|SM-T\d|SM-X\d|SM-P\d|GT-P\d|GT-N\d|TB-?[A-Z0-9]|TB\d|YT-?[A-Z0-9]|KFT[A-Z0-9]|KF[A-Z]{3,}|KF[A-Z]{2}|23043RP|23073RP|23046PN|2405CR|2405CP|23120RP|22081283|21051182|OPD2[0-9]|RMP2[0-9]|BAH[2-4]|DBY-|WGR-|GOT-|MRX-|SCM-|BTK-|ELP-|HEY|ROD-/i;

  if (TABLET_UA_REGEX.test(ua)) {
    return "tablet";
  }

  // 4. Standard Chromium/Android rule:
  // In standard Android browsers, "Android" without "Mobile" signifies a Tablet
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
    return "tablet";
  }

  if (rawType === "tablet") return "tablet";

  // 5. Mobile indicators
  if (rawType === "mobile" || isMobileHint === "?1" || /iPhone|iPod|Mobile/i.test(ua)) return "mobile";
  if (rawType === "smarttv") return "smarttv";
  if (rawType === "wearable") return "wearable";
  if (!rawType || rawType === "desktop") return "desktop";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Comprehensive Tablet & Phone Device Model Database
// ---------------------------------------------------------------------------
const TABLET_EXPLICIT_MODELS = new Set([
  "PIXEL TABLET", "TANGORPRO", "GOOGLE PIXEL TABLET",
  "KFTUWI", "KFTRWI", "KFMAWI", "KFSOWI", "KFKAWI", "KFDOWI", "KFONWI", "KFGIWI", "KFMEWI", "KFFOWI", "KFSUWI", "KFAUWI", "KFSAWI", "KFTBWI",
  "OPD2203", "OPD2304", "OPD2404", "OPD2403", "OPD2101", "OPD2102", "OPD2301", "OPD2302",
  "23043RP34G", "23043RP34C", "23073RPBFC", "23046PNC9G", "24018RPACC", "21051182G", "21051182C", "22081283G", "2405CRPFDL", "23120RP34C", "2405CPCFBG",
  "TB370FU", "TB371FC", "TB350FU", "TB350XU", "TB128FU", "TB128XU", "TB125FU", "TB310FU", "TB310XU", "TB328FU", "TB300FU",
  "TB-X606F", "TB-X606X", "TB-X505F", "TB-X505L", "TB-X306F", "TB-X306X", "TB-X605F", "TB-J606F", "TB-J706F", "TB-J716F", "TB-J616F", "TB-Q706F",
  "TB8505F", "TB8705F", "TB7305F", "YT-J706F", "YT-X705F",
  "RMP2102", "RMP2103", "RMP2105", "RMP2106", "PA2170", "PA2373", "PA2473", "PA2303",
  "DBY-W09", "BAH4-W09", "WGR-W09", "GOT-W29", "MRX-W09", "SCM-W09", "BAH3-W09", "BTK-W09", "ELP-W09", "AGS3-W09", "KOB2-W09", "AGS2-W09", "BAH2-W19", "CMR-W09", "BTV-W09", "JDN2-W09",
  "HEY2-W09", "HEY-W09", "ROD-W09", "ELN-W09"
]);

const PHONE_MODEL_DATABASE: Record<string, { vendor: string; name: string }> = {
  // Samsung Galaxy Tab S9 & S8 Series
  "SM-X910": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 Ultra" },
  "SM-X916B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 Ultra 5G" },
  "SM-X916U": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 Ultra 5G" },
  "SM-X810": { vendor: "Samsung", name: "Samsung Galaxy Tab S9+" },
  "SM-X816B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9+ 5G" },
  "SM-X816U": { vendor: "Samsung", name: "Samsung Galaxy Tab S9+ 5G" },
  "SM-X710": { vendor: "Samsung", name: "Samsung Galaxy Tab S9" },
  "SM-X716B": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 5G" },
  "SM-X716U": { vendor: "Samsung", name: "Samsung Galaxy Tab S9 5G" },
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
  "SM-X300": { vendor: "Samsung", name: "Samsung Galaxy Tab Active 5" },
  "SM-X306B": { vendor: "Samsung", name: "Samsung Galaxy Tab Active 5 5G" },

  // Samsung Galaxy Tab S7, S6, S5, S4 & A Series
  "SM-T970": { vendor: "Samsung", name: "Samsung Galaxy Tab S7+" },
  "SM-T975": { vendor: "Samsung", name: "Samsung Galaxy Tab S7+ LTE" },
  "SM-T976B": { vendor: "Samsung", name: "Samsung Galaxy Tab S7+ 5G" },
  "SM-T870": { vendor: "Samsung", name: "Samsung Galaxy Tab S7" },
  "SM-T875": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 LTE" },
  "SM-T730": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 FE" },
  "SM-T733": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 FE Wi-Fi" },
  "SM-T736B": { vendor: "Samsung", name: "Samsung Galaxy Tab S7 FE 5G" },
  "SM-T500": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 10.4" },
  "SM-T505": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 LTE" },
  "SM-T220": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 Lite" },
  "SM-T225": { vendor: "Samsung", name: "Samsung Galaxy Tab A7 Lite LTE" },
  "SM-T510": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1 (2019)" },
  "SM-T515": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1 LTE" },
  "SM-T290": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0 (2019)" },
  "SM-T295": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0 LTE" },
  "SM-T590": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.5" },
  "SM-T595": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.5 LTE" },
  "SM-T580": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1" },
  "SM-T585": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1 LTE" },
  "SM-T380": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0" },
  "SM-T385": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0 LTE" },
  "SM-T280": { vendor: "Samsung", name: "Samsung Galaxy Tab A 7.0" },
  "SM-T560": { vendor: "Samsung", name: "Samsung Galaxy Tab E 9.6" },
  "SM-T561": { vendor: "Samsung", name: "Samsung Galaxy Tab E 9.6 3G" },
  "SM-T860": { vendor: "Samsung", name: "Samsung Galaxy Tab S6" },
  "SM-T865": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 LTE" },
  "SM-T720": { vendor: "Samsung", name: "Samsung Galaxy Tab S5e" },
  "SM-T725": { vendor: "Samsung", name: "Samsung Galaxy Tab S5e LTE" },
  "SM-T830": { vendor: "Samsung", name: "Samsung Galaxy Tab S4" },
  "SM-T835": { vendor: "Samsung", name: "Samsung Galaxy Tab S4 LTE" },
  "SM-T820": { vendor: "Samsung", name: "Samsung Galaxy Tab S3" },
  "SM-T810": { vendor: "Samsung", name: "Samsung Galaxy Tab S2 9.7" },
  "SM-T710": { vendor: "Samsung", name: "Samsung Galaxy Tab S2 8.0" },
  "SM-T540": { vendor: "Samsung", name: "Samsung Galaxy Tab Active Pro" },
  "SM-T570": { vendor: "Samsung", name: "Samsung Galaxy Tab Active 3" },
  "SM-P610": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite" },
  "SM-P613": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite (2022)" },
  "SM-P615": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite LTE" },
  "SM-P619": { vendor: "Samsung", name: "Samsung Galaxy Tab S6 Lite LTE (2022)" },
  "SM-P580": { vendor: "Samsung", name: "Samsung Galaxy Tab A 10.1 with S Pen" },
  "SM-P200": { vendor: "Samsung", name: "Samsung Galaxy Tab A 8.0 with S Pen" },
  "SM-P900": { vendor: "Samsung", name: "Samsung Galaxy Note Pro 12.2" },
  "SM-P600": { vendor: "Samsung", name: "Samsung Galaxy Note 10.1 (2014)" },
  "GT-P5200": { vendor: "Samsung", name: "Samsung Galaxy Tab 3 10.1" },
  "GT-P5100": { vendor: "Samsung", name: "Samsung Galaxy Tab 2 10.1" },
  "GT-P3100": { vendor: "Samsung", name: "Samsung Galaxy Tab 2 7.0" },
  "GT-N8000": { vendor: "Samsung", name: "Samsung Galaxy Note 10.1" },

  // Samsung Galaxy S Series
  "SM-S928B": { vendor: "Samsung", name: "Samsung Galaxy S24 Ultra" },
  "SM-S928U": { vendor: "Samsung", name: "Samsung Galaxy S24 Ultra" },
  "SM-S928W": { vendor: "Samsung", name: "Samsung Galaxy S24 Ultra" },
  "SM-S9280": { vendor: "Samsung", name: "Samsung Galaxy S24 Ultra" },
  "SM-S926B": { vendor: "Samsung", name: "Samsung Galaxy S24+" },
  "SM-S926U": { vendor: "Samsung", name: "Samsung Galaxy S24+" },
  "SM-S921B": { vendor: "Samsung", name: "Samsung Galaxy S24" },
  "SM-S921U": { vendor: "Samsung", name: "Samsung Galaxy S24" },
  "SM-S918B": { vendor: "Samsung", name: "Samsung Galaxy S23 Ultra" },
  "SM-S918U": { vendor: "Samsung", name: "Samsung Galaxy S23 Ultra" },
  "SM-S916B": { vendor: "Samsung", name: "Samsung Galaxy S23+" },
  "SM-S916U": { vendor: "Samsung", name: "Samsung Galaxy S23+" },
  "SM-S911B": { vendor: "Samsung", name: "Samsung Galaxy S23" },
  "SM-S911U": { vendor: "Samsung", name: "Samsung Galaxy S23" },
  "SM-S711B": { vendor: "Samsung", name: "Samsung Galaxy S23 FE" },
  "SM-S711U": { vendor: "Samsung", name: "Samsung Galaxy S23 FE" },
  "SM-S908B": { vendor: "Samsung", name: "Samsung Galaxy S22 Ultra" },
  "SM-S908U": { vendor: "Samsung", name: "Samsung Galaxy S22 Ultra" },
  "SM-S908E": { vendor: "Samsung", name: "Samsung Galaxy S22 Ultra" },
  "SM-S906B": { vendor: "Samsung", name: "Samsung Galaxy S22+" },
  "SM-S906U": { vendor: "Samsung", name: "Samsung Galaxy S22+" },
  "SM-S901B": { vendor: "Samsung", name: "Samsung Galaxy S22" },
  "SM-S901U": { vendor: "Samsung", name: "Samsung Galaxy S22" },
  "SM-G998B": { vendor: "Samsung", name: "Samsung Galaxy S21 Ultra" },
  "SM-G998U": { vendor: "Samsung", name: "Samsung Galaxy S21 Ultra" },
  "SM-G996B": { vendor: "Samsung", name: "Samsung Galaxy S21+" },
  "SM-G991B": { vendor: "Samsung", name: "Samsung Galaxy S21" },
  "SM-G990B": { vendor: "Samsung", name: "Samsung Galaxy S21 FE" },
  "SM-G988B": { vendor: "Samsung", name: "Samsung Galaxy S20 Ultra" },
  "SM-G986B": { vendor: "Samsung", name: "Samsung Galaxy S20+" },
  "SM-G981B": { vendor: "Samsung", name: "Samsung Galaxy S20" },
  "SM-G980F": { vendor: "Samsung", name: "Samsung Galaxy S20" },
  "SM-G780F": { vendor: "Samsung", name: "Samsung Galaxy S20 FE" },
  "SM-G780G": { vendor: "Samsung", name: "Samsung Galaxy S20 FE" },
  "SM-G781B": { vendor: "Samsung", name: "Samsung Galaxy S20 FE 5G" },

  // Samsung Galaxy Note & Z Series
  "SM-N986B": { vendor: "Samsung", name: "Samsung Galaxy Note 20 Ultra" },
  "SM-N981B": { vendor: "Samsung", name: "Samsung Galaxy Note 20" },
  "SM-N975F": { vendor: "Samsung", name: "Samsung Galaxy Note 10+" },
  "SM-N970F": { vendor: "Samsung", name: "Samsung Galaxy Note 10" },
  "SM-F946B": { vendor: "Samsung", name: "Samsung Galaxy Z Fold 5" },
  "SM-F936B": { vendor: "Samsung", name: "Samsung Galaxy Z Fold 4" },
  "SM-F926B": { vendor: "Samsung", name: "Samsung Galaxy Z Fold 3" },
  "SM-F731B": { vendor: "Samsung", name: "Samsung Galaxy Z Flip 5" },
  "SM-F721B": { vendor: "Samsung", name: "Samsung Galaxy Z Flip 4" },
  "SM-F711B": { vendor: "Samsung", name: "Samsung Galaxy Z Flip 3" },

  // Samsung Galaxy A Series
  "SM-A556B": { vendor: "Samsung", name: "Samsung Galaxy A55 5G" },
  "SM-A556E": { vendor: "Samsung", name: "Samsung Galaxy A55 5G" },
  "SM-A546B": { vendor: "Samsung", name: "Samsung Galaxy A54 5G" },
  "SM-A546E": { vendor: "Samsung", name: "Samsung Galaxy A54 5G" },
  "SM-A546U": { vendor: "Samsung", name: "Samsung Galaxy A54 5G" },
  "SM-A536B": { vendor: "Samsung", name: "Samsung Galaxy A53 5G" },
  "SM-A536E": { vendor: "Samsung", name: "Samsung Galaxy A53 5G" },
  "SM-A528B": { vendor: "Samsung", name: "Samsung Galaxy A52s 5G" },
  "SM-A525F": { vendor: "Samsung", name: "Samsung Galaxy A52" },
  "SM-A526B": { vendor: "Samsung", name: "Samsung Galaxy A52 5G" },
  "SM-A515F": { vendor: "Samsung", name: "Samsung Galaxy A51" },
  "SM-A356B": { vendor: "Samsung", name: "Samsung Galaxy A35 5G" },
  "SM-A346B": { vendor: "Samsung", name: "Samsung Galaxy A34 5G" },
  "SM-A346E": { vendor: "Samsung", name: "Samsung Galaxy A34 5G" },
  "SM-A336B": { vendor: "Samsung", name: "Samsung Galaxy A33 5G" },
  "SM-A256B": { vendor: "Samsung", name: "Samsung Galaxy A25 5G" },
  "SM-A245F": { vendor: "Samsung", name: "Samsung Galaxy A24" },
  "SM-A235F": { vendor: "Samsung", name: "Samsung Galaxy A23" },
  "SM-A156B": { vendor: "Samsung", name: "Samsung Galaxy A15 5G" },
  "SM-A156E": { vendor: "Samsung", name: "Samsung Galaxy A15 5G" },
  "SM-A155F": { vendor: "Samsung", name: "Samsung Galaxy A15" },
  "SM-A146P": { vendor: "Samsung", name: "Samsung Galaxy A14 5G" },
  "SM-A146B": { vendor: "Samsung", name: "Samsung Galaxy A14 5G" },
  "SM-A145F": { vendor: "Samsung", name: "Samsung Galaxy A14" },
  "SM-A145R": { vendor: "Samsung", name: "Samsung Galaxy A14" },
  "SM-A137F": { vendor: "Samsung", name: "Samsung Galaxy A13" },
  "SM-A135F": { vendor: "Samsung", name: "Samsung Galaxy A13" },
  "SM-A127F": { vendor: "Samsung", name: "Samsung Galaxy A12 Nacho" },
  "SM-A125F": { vendor: "Samsung", name: "Samsung Galaxy A12" },
  "SM-A057F": { vendor: "Samsung", name: "Samsung Galaxy A05s" },
  "SM-A055F": { vendor: "Samsung", name: "Samsung Galaxy A05" },
  "SM-A047F": { vendor: "Samsung", name: "Samsung Galaxy A04s" },
  "SM-A045F": { vendor: "Samsung", name: "Samsung Galaxy A04" },
  "SM-A035F": { vendor: "Samsung", name: "Samsung Galaxy A03" },
  "SM-A037F": { vendor: "Samsung", name: "Samsung Galaxy A03s" },

  // Tecno
  "CL8": { vendor: "Tecno", name: "Tecno Camon 30 Pro 5G" },
  "CL7": { vendor: "Tecno", name: "Tecno Camon 30 5G" },
  "CL6": { vendor: "Tecno", name: "Tecno Camon 30" },
  "CK8N": { vendor: "Tecno", name: "Tecno Camon 20 Pro 5G" },
  "CK7N": { vendor: "Tecno", name: "Tecno Camon 20 Pro" },
  "CK6": { vendor: "Tecno", name: "Tecno Camon 20" },
  "CK6N": { vendor: "Tecno", name: "Tecno Camon 20" },
  "CI8": { vendor: "Tecno", name: "Tecno Camon 19 Pro" },
  "CI6": { vendor: "Tecno", name: "Tecno Camon 19" },
  "KJ7": { vendor: "Tecno", name: "Tecno Spark 20 Pro+" },
  "KJ6": { vendor: "Tecno", name: "Tecno Spark 20 Pro" },
  "KJ5": { vendor: "Tecno", name: "Tecno Spark 20" },
  "KJ5N": { vendor: "Tecno", name: "Tecno Spark 20" },
  "BG7N": { vendor: "Tecno", name: "Tecno Spark 20C" },
  "BG6": { vendor: "Tecno", name: "Tecno Spark 10" },
  "BG6P": { vendor: "Tecno", name: "Tecno Pop 8" },
  "KI5Q": { vendor: "Tecno", name: "Tecno Spark 10C" },
  "KI7": { vendor: "Tecno", name: "Tecno Spark 10 Pro" },
  "KH7N": { vendor: "Tecno", name: "Tecno Spark 9 Pro" },
  "KH6": { vendor: "Tecno", name: "Tecno Spark 9T" },
  "KG5K": { vendor: "Tecno", name: "Tecno Spark 8C" },
  "KG6K": { vendor: "Tecno", name: "Tecno Spark 8P" },
  "BF7": { vendor: "Tecno", name: "Tecno Pop 7" },
  "BF6": { vendor: "Tecno", name: "Tecno Pop 7" },
  "BD4A": { vendor: "Tecno", name: "Tecno Pop 5 LTE" },
  "AD10": { vendor: "Tecno", name: "Tecno Phantom V Fold" },
  "AD11": { vendor: "Tecno", name: "Tecno Phantom V Flip" },
  "AD9": { vendor: "Tecno", name: "Tecno Phantom X2 Pro" },
  "AD8": { vendor: "Tecno", name: "Tecno Phantom X2" },
  "LI9": { vendor: "Tecno", name: "Tecno Pova 6 Pro 5G" },
  "LH8N": { vendor: "Tecno", name: "Tecno Pova 5 Pro 5G" },
  "LH7N": { vendor: "Tecno", name: "Tecno Pova 5" },

  // Infinix
  "X6851B": { vendor: "Infinix", name: "Infinix Note 40 Pro+ 5G" },
  "X6850": { vendor: "Infinix", name: "Infinix Note 40 Pro" },
  "X6853": { vendor: "Infinix", name: "Infinix GT 20 Pro" },
  "X6833B": { vendor: "Infinix", name: "Infinix Note 30 VIP" },
  "X6831": { vendor: "Infinix", name: "Infinix Note 30" },
  "X6716B": { vendor: "Infinix", name: "Infinix Note 30 5G" },
  "X6711": { vendor: "Infinix", name: "Infinix Note 12 5G" },
  "X676B": { vendor: "Infinix", name: "Infinix Note 12 Pro" },
  "X6837": { vendor: "Infinix", name: "Infinix Hot 40 Pro" },
  "X6836": { vendor: "Infinix", name: "Infinix Hot 40 / Hot 30" },
  "X6528B": { vendor: "Infinix", name: "Infinix Hot 40i" },
  "X6816D": { vendor: "Infinix", name: "Infinix Hot 20" },
  "X6817": { vendor: "Infinix", name: "Infinix Hot 20i" },
  "X6812": { vendor: "Infinix", name: "Infinix Hot 11" },
  "X6525B": { vendor: "Infinix", name: "Infinix Smart 8 Pro" },
  "X6525": { vendor: "Infinix", name: "Infinix Smart 8" },
  "X6515": { vendor: "Infinix", name: "Infinix Smart 7" },
  "X6516": { vendor: "Infinix", name: "Infinix Smart 7 HD" },
  "X6739": { vendor: "Infinix", name: "Infinix GT 10 Pro" },
  "X6731": { vendor: "Infinix", name: "Infinix Zero 30 5G" },
  "X670": { vendor: "Infinix", name: "Infinix Zero 5G" },

  // Itel
  "P662L": { vendor: "Itel", name: "Itel P55 5G" },
  "P662LN": { vendor: "Itel", name: "Itel P55 5G" },
  "P661N": { vendor: "Itel", name: "Itel P40" },
  "P661W": { vendor: "Itel", name: "Itel P40" },
  "S666LN": { vendor: "Itel", name: "Itel S23+" },
  "S665L": { vendor: "Itel", name: "Itel S23" },
  "A665L": { vendor: "Itel", name: "Itel A70" },
  "A662LM": { vendor: "Itel", name: "Itel A60s" },
  "A662L": { vendor: "Itel", name: "Itel A60" },
  "A661L": { vendor: "Itel", name: "Itel A58" },

  // Xiaomi / Redmi / POCO
  "24030PN60G": { vendor: "Xiaomi", name: "Xiaomi 14 Ultra" },
  "23127PN0CG": { vendor: "Xiaomi", name: "Xiaomi 14" },
  "23078PND5G": { vendor: "Xiaomi", name: "Xiaomi 13T Pro" },
  "2306EPN60G": { vendor: "Xiaomi", name: "Xiaomi 13T" },
  "23090RA98G": { vendor: "Xiaomi", name: "Redmi Note 13 Pro+" },
  "2312DRA50G": { vendor: "Xiaomi", name: "Redmi Note 13 Pro" },
  "2312DRAABG": { vendor: "Xiaomi", name: "Redmi Note 13 5G" },
  "23129RAA4G": { vendor: "Xiaomi", name: "Redmi Note 13 4G" },
  "22101316UG": { vendor: "Xiaomi", name: "Redmi Note 12 Pro+" },
  "22101316G": { vendor: "Xiaomi", name: "Redmi Note 12 Pro" },
  "23021RAA2Y": { vendor: "Xiaomi", name: "Redmi Note 12 4G" },
  "2201116TG": { vendor: "Xiaomi", name: "Redmi Note 11" },
  "2201117TY": { vendor: "Xiaomi", name: "Redmi Note 11S" },
  "2201116PG": { vendor: "Xiaomi", name: "POCO M4 Pro" },
  "23100RN82L": { vendor: "Xiaomi", name: "Redmi 13C" },
  "23053RN02Y": { vendor: "Xiaomi", name: "Redmi 12" },
  "23028RN4DG": { vendor: "Xiaomi", name: "Redmi 12C" },
  "23129RN51X": { vendor: "Xiaomi", name: "Redmi A3" },
  "23049PCD8G": { vendor: "Xiaomi", name: "POCO F5" },
  "2311DRK48G": { vendor: "Xiaomi", name: "POCO X6 Pro" },
  "M2007J20CG": { vendor: "Xiaomi", name: "POCO X3 NFC" },

  // Google Pixel & Pixel Tablet
  "PIXEL TABLET": { vendor: "Google", name: "Google Pixel Tablet" },
  "PIXEL 9 PRO FOLD": { vendor: "Google", name: "Google Pixel 9 Pro Fold" },
  "PIXEL 9 PRO XL": { vendor: "Google", name: "Google Pixel 9 Pro XL" },
  "PIXEL 9 PRO": { vendor: "Google", name: "Google Pixel 9 Pro" },
  "PIXEL 9": { vendor: "Google", name: "Google Pixel 9" },
  "PIXEL 8A": { vendor: "Google", name: "Google Pixel 8a" },
  "PIXEL 8 PRO": { vendor: "Google", name: "Google Pixel 8 Pro" },
  "PIXEL 8": { vendor: "Google", name: "Google Pixel 8" },
  "PIXEL 7A": { vendor: "Google", name: "Google Pixel 7a" },
  "PIXEL 7 PRO": { vendor: "Google", name: "Google Pixel 7 Pro" },
  "PIXEL 7": { vendor: "Google", name: "Google Pixel 7" },
  "PIXEL 6A": { vendor: "Google", name: "Google Pixel 6a" },
  "PIXEL 6 PRO": { vendor: "Google", name: "Google Pixel 6 Pro" },
  "PIXEL 6": { vendor: "Google", name: "Google Pixel 6" },
  "PIXEL 5": { vendor: "Google", name: "Google Pixel 5" },
  "PIXEL 4A": { vendor: "Google", name: "Google Pixel 4a" },

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
  "2405CRPFDL": { vendor: "Xiaomi", name: "Redmi Pad Pro" },
  "23120RP34C": { vendor: "Xiaomi", name: "Redmi Pad SE" },

  // OnePlus Pad & Phones
  "OPD2203": { vendor: "OnePlus", name: "OnePlus Pad" },
  "OPD2304": { vendor: "OnePlus", name: "OnePlus Pad Go" },
  "OPD2404": { vendor: "OnePlus", name: "OnePlus Pad 2" },
  "CPH2581": { vendor: "OnePlus", name: "OnePlus 12" },
  "CPH2609": { vendor: "OnePlus", name: "OnePlus 12R" },
  "CPH2449": { vendor: "OnePlus", name: "OnePlus 11" },
  "CPH2551": { vendor: "OnePlus", name: "OnePlus Open" },
  "CPH2493": { vendor: "OnePlus", name: "OnePlus Nord 3 5G" },
  "NE2213": { vendor: "OnePlus", name: "OnePlus 10 Pro" },

  // Amazon Fire Tablets
  "KFTUWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (13th Gen)" },
  "KFTRWI": { vendor: "Amazon", name: "Amazon Fire HD 8 (12th Gen)" },
  "KFMAWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (11th Gen)" },
  "KFSOWI": { vendor: "Amazon", name: "Amazon Fire 7 (12th Gen)" },
  "KFKAWI": { vendor: "Amazon", name: "Amazon Fire HD 8 (10th Gen)" },
  "KFDOWI": { vendor: "Amazon", name: "Amazon Fire HD 8 Plus (10th Gen)" },
  "KFONWI": { vendor: "Amazon", name: "Amazon Fire HD 8 (10th Gen)" },
  "KFGIWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (9th Gen)" },
  "KFMEWI": { vendor: "Amazon", name: "Amazon Fire 7 (9th Gen)" },
  "KFFOWI": { vendor: "Amazon", name: "Amazon Fire 7 (5th Gen)" },
  "KFSUWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (7th Gen)" },
  "KFAUWI": { vendor: "Amazon", name: "Amazon Fire HD 10 (7th Gen)" },
  "KFSAWI": { vendor: "Amazon", name: "Amazon Fire HD 8 (7th Gen)" },
  "KFTBWI": { vendor: "Amazon", name: "Amazon Fire HD 8 (8th Gen)" },

  // Huawei & Honor Tablets
  "DBY-W09": { vendor: "Huawei", name: "Huawei MatePad 11" },
  "BAH4-W09": { vendor: "Huawei", name: "Huawei MatePad 10.4" },
  "WGR-W09": { vendor: "Huawei", name: "Huawei MatePad Pro 12.6" },
  "GOT-W29": { vendor: "Huawei", name: "Huawei MatePad Pro 11" },
  "MRX-W09": { vendor: "Huawei", name: "Huawei MatePad Pro 10.8" },
  "SCM-W09": { vendor: "Huawei", name: "Huawei MatePad Pro" },
  "BAH3-W09": { vendor: "Huawei", name: "Huawei MatePad 10.4" },
  "BTK-W09": { vendor: "Huawei", name: "Huawei MatePad 11.5" },
  "ELP-W09": { vendor: "Huawei", name: "Huawei MatePad Air" },
  "AGS3-W09": { vendor: "Huawei", name: "Huawei MatePad T10s" },
  "KOB2-W09": { vendor: "Huawei", name: "Huawei MatePad T8" },
  "AGS2-W09": { vendor: "Huawei", name: "Huawei MediaPad T5" },
  "BAH2-W19": { vendor: "Huawei", name: "Huawei MediaPad M5 Lite" },
  "CMR-W09": { vendor: "Huawei", name: "Huawei MediaPad M5 10.8" },
  "BTV-W09": { vendor: "Huawei", name: "Huawei MediaPad M3 8.4" },
  "JDN2-W09": { vendor: "Huawei", name: "Huawei MediaPad M5 Lite 8" },
  "HEY2-W09": { vendor: "Honor", name: "Honor Pad 9" },
  "HEY-W09": { vendor: "Honor", name: "Honor Pad 8" },
  "ROD-W09": { vendor: "Honor", name: "Honor Pad X9" },
  "ELN-W09": { vendor: "Honor", name: "Honor Pad X8" },

  // Oppo / Realme / Vivo Tablets
  "OPD2101": { vendor: "Oppo", name: "OPPO Pad" },
  "OPD2102": { vendor: "Oppo", name: "OPPO Pad Air" },
  "OPD2301": { vendor: "Oppo", name: "OPPO Pad 2" },
  "OPD2302": { vendor: "Oppo", name: "OPPO Pad Neo" },
  "RMP2102": { vendor: "Realme", name: "Realme Pad" },
  "RMP2103": { vendor: "Realme", name: "Realme Pad Mini" },
  "RMP2105": { vendor: "Realme", name: "Realme Pad X" },
  "PA2170": { vendor: "Vivo", name: "vivo Pad" },
  "PA2373": { vendor: "Vivo", name: "vivo Pad 2" },
  "PA2473": { vendor: "Vivo", name: "vivo Pad 3 Pro" },
  "PA2303": { vendor: "iQOO", name: "iQOO Pad" },
};

function formatSamsungCode(code: string): string {
  const upper = code.toUpperCase().trim();
  if (upper.startsWith("SM-X") || upper.startsWith("SM-T") || upper.startsWith("SM-P")) {
    if (upper.startsWith("SM-X9")) return "Samsung Galaxy Tab S9/S8 Ultra Series";
    if (upper.startsWith("SM-X8")) return "Samsung Galaxy Tab S9+/S8+ Series";
    if (upper.startsWith("SM-X7")) return "Samsung Galaxy Tab S9/S8 Series";
    if (upper.startsWith("SM-X6") || upper.startsWith("SM-X5")) return "Samsung Galaxy Tab S9 FE Series";
    if (upper.startsWith("SM-X2") || upper.startsWith("SM-X1")) return "Samsung Galaxy Tab A9/A8 Series";
    if (upper.startsWith("SM-T8") || upper.startsWith("SM-T9")) return "Samsung Galaxy Tab S7/S6 Series";
    if (upper.startsWith("SM-T5") || upper.startsWith("SM-T2")) return "Samsung Galaxy Tab A Series";
    if (upper.startsWith("SM-P")) return "Samsung Galaxy Tab S6 Lite Series";
    return `Samsung Galaxy Tab (${code})`;
  }

  const prefix = upper.slice(0, 6);
  const prefixMap: Record<string, string> = {
    "SM-S92": "Samsung Galaxy S24 Series",
    "SM-S91": "Samsung Galaxy S23 Series",
    "SM-S90": "Samsung Galaxy S22 Series",
    "SM-G99": "Samsung Galaxy S21 Series",
    "SM-G98": "Samsung Galaxy S20 Series",
    "SM-A55": "Samsung Galaxy A55 5G",
    "SM-A54": "Samsung Galaxy A54 5G",
    "SM-A53": "Samsung Galaxy A53 5G",
    "SM-A35": "Samsung Galaxy A35 5G",
    "SM-A34": "Samsung Galaxy A34 5G",
    "SM-A25": "Samsung Galaxy A25 5G",
    "SM-A24": "Samsung Galaxy A24",
    "SM-A15": "Samsung Galaxy A15",
    "SM-A14": "Samsung Galaxy A14",
    "SM-A13": "Samsung Galaxy A13",
    "SM-A12": "Samsung Galaxy A12",
    "SM-A05": "Samsung Galaxy A05",
    "SM-A04": "Samsung Galaxy A04",
    "SM-A03": "Samsung Galaxy A03",
    "SM-F": "Samsung Galaxy Z Series",
  };
  return prefixMap[prefix] || `Samsung Galaxy (${code})`;
}

// ---------------------------------------------------------------------------
// Accurate Android Version Parser
// ---------------------------------------------------------------------------
export function parseAndroidVersion(
  ua: string,
  chPlatformVersion?: string | null
): string {
  // 1. Client Hints platformVersion takes highest priority if provided
  if (chPlatformVersion && typeof chPlatformVersion === "string") {
    const cleanPv = chPlatformVersion.replace(/"/g, "").trim();
    if (cleanPv && cleanPv !== "0.0.0" && cleanPv !== "0") {
      const parts = cleanPv.split(".");
      const major = parseInt(parts[0], 10);

      // Map Android API level numbers (30+) to real Android OS version
      const apiToVersion: Record<number, string> = {
        36: "16",
        35: "15",
        34: "14",
        33: "13",
        32: "12L",
        31: "12",
        30: "11",
        29: "10",
        28: "9",
        27: "8.1",
        26: "8.0",
        25: "7.1",
        24: "7.0",
      };

      if (apiToVersion[major]) {
        return apiToVersion[major];
      }

      // If it's direct major version (e.g., "14.0.0" or "14" or "13.1")
      if (major >= 1 && major <= 20) {
        const minor = parseInt(parts[1], 10);
        if (!isNaN(minor) && minor > 0) {
          return `${major}.${minor}`;
        }
        return String(major);
      }

      return cleanPv;
    }
  }

  // 2. Parse from User Agent string
  // Matches: "Android 14", "Android 13.0", "Android 8.1.0", "Android/14", "Adr 12", etc.
  const match = /(?:Android|Adr)[\s/]+([0-9]+(?:\.[0-9]+)*)/i.exec(ua);
  if (match && match[1]) {
    const rawVer = match[1].trim();
    if (rawVer.endsWith(".0.0")) return rawVer.slice(0, -4);
    if (rawVer.endsWith(".0") && !rawVer.startsWith("8.") && !rawVer.startsWith("7.")) {
      return rawVer.slice(0, -2);
    }
    return rawVer;
  }

  return "Unknown";
}

// ---------------------------------------------------------------------------
// Accurate Device & Model Name Parser
// ---------------------------------------------------------------------------
export function parseDeviceDetails(
  ua: string,
  chModel: string | null,
  chPlatform: string | null,
  deviceType: DeviceType,
  osName: string,
  osVersion: string
): { deviceName: string; deviceModel: string | null; deviceVendor: string | null } {
  // A. If high-entropy Client Hint model is available
  if (chModel && typeof chModel === "string") {
    const rawModel = chModel.replace(/"/g, "").trim();
    if (rawModel && rawModel !== "" && rawModel !== "unknown") {
      const upper = rawModel.toUpperCase();

      if (PHONE_MODEL_DATABASE[upper]) {
        return {
          deviceName: PHONE_MODEL_DATABASE[upper].name,
          deviceModel: rawModel,
          deviceVendor: PHONE_MODEL_DATABASE[upper].vendor,
        };
      }

      if (upper.startsWith("SM-") || upper.startsWith("GT-") || upper.startsWith("SCH-")) {
        return {
          deviceName: formatSamsungCode(rawModel),
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

      if (/OnePlus/i.test(rawModel)) {
        return {
          deviceName: rawModel,
          deviceModel: rawModel,
          deviceVendor: "OnePlus",
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
        deviceVendor: osName === "Android" ? "Android" : null,
      };
    }
  }

  // B. Parse Android device model from User-Agent string
  if (osName === "Android" || /Android/i.test(ua)) {
    // 1. Try standard parenthesis match: (Linux; Android 14; <MODEL> Build/...)
    const androidModelMatch =
      /;\s*(?:[a-z]{2}(?:-[a-z]{2})?;\s*)?([^;)]+?)\s*(?:Build\/|\))/i.exec(ua) ||
      /\((?:Linux;\s*(?:U;\s*)?Android[^;]*;\s*)([^;)]+?)(?:\s+Build|\s*;|\))/i.exec(ua);

    if (androidModelMatch && androidModelMatch[1]) {
      let cand = androidModelMatch[1].trim();
      // Remove common artifact tokens
      cand = cand.replace(/^(wv|mobile|tablet|k|en-us|fr-fr|zh-cn)\s*/i, "").trim();

      if (
        cand &&
        !cand.includes("Linux") &&
        !cand.includes("Android") &&
        cand.length >= 2 &&
        cand.length < 50
      ) {
        const candUpper = cand.toUpperCase();

        if (PHONE_MODEL_DATABASE[candUpper]) {
          return {
            deviceName: PHONE_MODEL_DATABASE[candUpper].name,
            deviceModel: cand,
            deviceVendor: PHONE_MODEL_DATABASE[candUpper].vendor,
          };
        }

        if (/^SM-|^GT-|^SCH-/i.test(cand)) {
          return {
            deviceName: formatSamsungCode(cand),
            deviceModel: cand,
            deviceVendor: "Samsung",
          };
        }

        if (/Pixel/i.test(cand)) {
          return {
            deviceName: cand.startsWith("Google") ? cand : `Google ${cand}`,
            deviceModel: cand,
            deviceVendor: "Google",
          };
        }

        if (/Redmi/i.test(cand) || /POCO/i.test(cand) || /Xiaomi/i.test(cand)) {
          return {
            deviceName: `Xiaomi ${cand.replace(/^Xiaomi\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Xiaomi",
          };
        }

        if (/TECNO/i.test(cand)) {
          return {
            deviceName: `Tecno ${cand.replace(/^TECNO\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Tecno",
          };
        }

        if (/Infinix/i.test(cand)) {
          return {
            deviceName: `Infinix ${cand.replace(/^Infinix\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Infinix",
          };
        }

        if (/itel/i.test(cand)) {
          return {
            deviceName: `Itel ${cand.replace(/^itel\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Itel",
          };
        }

        if (/OnePlus/i.test(cand)) {
          return {
            deviceName: cand,
            deviceModel: cand,
            deviceVendor: "OnePlus",
          };
        }

        if (/vivo/i.test(cand)) {
          return {
            deviceName: `Vivo ${cand.replace(/^vivo\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Vivo",
          };
        }

        if (/OPPO/i.test(cand)) {
          return {
            deviceName: `Oppo ${cand.replace(/^OPPO\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Oppo",
          };
        }

        if (/realme/i.test(cand)) {
          return {
            deviceName: `Realme ${cand.replace(/^realme\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Realme",
          };
        }

        if (/HUAWEI/i.test(cand)) {
          return {
            deviceName: `Huawei ${cand.replace(/^HUAWEI\s*/i, "")}`,
            deviceModel: cand,
            deviceVendor: "Huawei",
          };
        }

        if (/moto/i.test(cand) || /motorola/i.test(cand)) {
          return {
            deviceName: `Motorola ${cand.replace(/^(moto|motorola)\s*/i, "Moto ")}`,
            deviceModel: cand,
            deviceVendor: "Motorola",
          };
        }

        return {
          deviceName: `${cand} (Android ${osVersion || ""})`.trim(),
          deviceModel: cand,
          deviceVendor: "Android",
        };
      }
    }

    return {
      deviceName: deviceType === "tablet" ? "Android Tablet" : `Android Smartphone (v${osVersion})`,
      deviceModel: null,
      deviceVendor: "Android",
    };
  }

  // C. Apple iOS Devices
  if (/iPhone/i.test(ua)) {
    return {
      deviceName: "Apple iPhone",
      deviceModel: "iPhone",
      deviceVendor: "Apple",
    };
  }

  if (/iPad/i.test(ua)) {
    return {
      deviceName: "Apple iPad",
      deviceModel: "iPad",
      deviceVendor: "Apple",
    };
  }

  // D. Apple macOS
  if (osName === "macOS" || /Macintosh/i.test(ua)) {
    return {
      deviceName: osVersion && osVersion !== "Unknown" ? `Apple Mac (macOS ${osVersion})` : "Apple Mac",
      deviceModel: "Mac",
      deviceVendor: "Apple",
    };
  }

  // E. Microsoft Windows
  if (osName === "Windows" || /Windows/i.test(ua)) {
    const isWin11 = osVersion === "11" || osVersion === "10/11";
    const name = isWin11 ? "Windows 11 PC" : (osVersion === "10" ? "Windows 10 PC" : "Windows PC");
    return {
      deviceName: name,
      deviceModel: "PC",
      deviceVendor: "Microsoft Windows",
    };
  }

  // F. Google Chrome OS
  if (osName === "Chrome OS" || /CrOS/i.test(ua)) {
    return {
      deviceName: "Google Chromebook",
      deviceModel: "Chromebook",
      deviceVendor: "Google",
    };
  }

  // G. Linux
  if (osName === "Linux" || /Linux/i.test(ua)) {
    if (/Ubuntu/i.test(ua)) return { deviceName: "Ubuntu Linux PC", deviceModel: "PC", deviceVendor: "Ubuntu" };
    if (/Fedora/i.test(ua)) return { deviceName: "Fedora Linux PC", deviceModel: "PC", deviceVendor: "Fedora" };
    return { deviceName: "Linux PC", deviceModel: "PC", deviceVendor: "Linux" };
  }

  return {
    deviceName: `${osName !== "Unknown OS" ? osName : "Device"} (${deviceType})`,
    deviceModel: null,
    deviceVendor: null,
  };
}

// ---------------------------------------------------------------------------
// Build Edge Visitor Device Telemetry
// ---------------------------------------------------------------------------
export function buildDevicePayload(req: NextRequest): ServerVisitorDevicePayload {
  const { headers } = req;
  const ua = headers.get("user-agent") || "";
  const { browser, cpu, device, os: nextOs, isBot } = userAgent(req);

  const chMobile = headers.get("sec-ch-ua-mobile");
  const chPlatform = headers.get("sec-ch-ua-platform")?.replace(/"/g, "") || null;
  const chPlatformVersion = headers.get("sec-ch-ua-platform-version")?.replace(/"/g, "") || null;
  const chModel = headers.get("sec-ch-ua-model")?.replace(/"/g, "") || null;
  const chFormFactors = headers.get("sec-ch-ua-form-factors")?.replace(/"/g, "") || null;
  const ip = extractClientIp(req);
  const deviceType = resolveDeviceType(device.type, chMobile, Boolean(isBot), ua, chModel, chFormFactors);

  // Determine OS Name accurately
  let osName = chPlatform || nextOs.name || "Unknown OS";
  if (!chPlatform) {
    if (/Android/i.test(ua)) osName = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) osName = "iOS";
    else if (/Macintosh|Mac OS X/i.test(ua)) osName = "macOS";
    else if (/Windows NT/i.test(ua)) osName = "Windows";
    else if (/CrOS/i.test(ua)) osName = "Chrome OS";
    else if (/Linux/i.test(ua)) osName = "Linux";
  }

  // Determine OS Version accurately
  let osVersion = nextOs.version || "Unknown";
  if (osName === "Android") {
    osVersion = parseAndroidVersion(ua, chPlatformVersion);
  } else if (osName === "Windows") {
    if (chPlatformVersion) {
      const maj = parseInt(chPlatformVersion.split(".")[0], 10);
      osVersion = maj >= 13 ? "11" : (maj >= 1 ? "10" : chPlatformVersion);
    } else {
      const match = /Windows NT (\d+\.?\d*)/i.exec(ua);
      if (match?.[1] === "10.0") osVersion = "10/11";
      else if (match?.[1]) osVersion = match[1];
    }
  } else if (osName === "macOS") {
    const match = /Mac OS X (\d+(?:[._]\d+)+)/i.exec(ua);
    if (match?.[1]) osVersion = match[1].replace(/_/g, ".");
  } else if (osName === "iOS") {
    const match = /OS (\d+[._]\d+(?:[._]\d+)?)/i.exec(ua);
    if (match?.[1]) osVersion = match[1].replace(/_/g, ".");
  }

  // Determine Device Name, Model, and Vendor
  const { deviceName, deviceModel, deviceVendor } = parseDeviceDetails(
    ua,
    chModel,
    chPlatform,
    deviceType,
    osName,
    osVersion
  );

  // Extract Edge Geo headers (Vercel, Cloudflare, GCP, AWS, Fastly)
  const country =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-appengine-country") ||
    headers.get("x-country-code") ||
    headers.get("x-geoip-country") ||
    null;

  const countryCode =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-appengine-country") ||
    headers.get("x-country-code") ||
    null;

  const region =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("cf-region") ||
    headers.get("x-appengine-region") ||
    headers.get("x-geoip-region") ||
    null;

  const city =
    headers.get("x-vercel-ip-city") ||
    headers.get("cf-ipcity") ||
    headers.get("x-appengine-city") ||
    headers.get("x-geoip-city") ||
    null;

  let latStr = headers.get("x-vercel-ip-latitude") || headers.get("cf-iplatitude");
  let lonStr = headers.get("x-vercel-ip-longitude") || headers.get("cf-iplongitude");

  const gcpCityLatLong = headers.get("x-appengine-citylatlong");
  if (gcpCityLatLong && (!latStr || !lonStr)) {
    const parts = gcpCityLatLong.split(",");
    if (parts.length === 2) {
      latStr = parts[0]?.trim();
      lonStr = parts[1]?.trim();
    }
  }

  const timezone =
    headers.get("x-vercel-ip-timezone") ||
    headers.get("cf-timezone") ||
    headers.get("x-timezone") ||
    null;

  let requestId: string;
  try {
    requestId = crypto.randomUUID();
  } catch {
    requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  return {
    requestId,
    timestamp: new Date().toISOString(),
    path: req.nextUrl.pathname,
    method: req.method,
    ip,
    isBot: Boolean(isBot),
    deviceType,
    deviceName,
    deviceModel,
    deviceVendor,
    browser: {
      name: browser.name || "Unknown Browser",
      version: browser.version || "Unknown",
      major: browser.version ? browser.version.split(".")[0] : "Unknown",
    },
    os: {
      name: osName,
      version: osVersion,
    },
    cpuArchitecture: cpu.architecture || null,
    geo: {
      ip,
      country: country && country !== "XX" ? country : null,
      countryCode: countryCode && countryCode !== "XX" ? countryCode : null,
      region: region || null,
      city: city || null,
      latitude: latStr && !isNaN(parseFloat(latStr)) ? parseFloat(latStr) : null,
      longitude: lonStr && !isNaN(parseFloat(lonStr)) ? parseFloat(lonStr) : null,
      timezone: timezone || null,
    },
    clientHints: {
      platform: chPlatform,
      platformVersion: chPlatformVersion,
      model: chModel,
      mobile: chMobile ? chMobile === "?1" : null,
      bitness: headers.get("sec-ch-ua-bitness")?.replace(/"/g, "") || null,
    },
    referrer: headers.get("referer") || null,
    userAgent: ua,
  };
}
