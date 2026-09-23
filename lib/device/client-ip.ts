/**
 * Resilient multi-provider client-side public IP address fetcher.
 * Uses fast, privacy-safe, free public IP lookup endpoints with quick timeouts.
 */

const CACHE_KEY = "navo:cached-client-ip";
const CACHE_TIME_KEY = "navo:cached-client-ip-time";
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function isValidPublicIp(ip?: string | null): boolean {
  if (!ip || typeof ip !== "string") return false;
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (clean.length < 7) return false;
  // Private / local / loopback ranges
  if (
    clean === "127.0.0.1" ||
    clean === "0.0.0.0" ||
    clean === "localhost" ||
    clean === "::1" ||
    clean === "unknown"
  ) {
    return false;
  }
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return false;
  if (clean.startsWith("169.254.")) return false; // link-local
  if (clean.startsWith("fe80:") || clean.startsWith("fc00:") || clean.startsWith("fd00:")) return false;
  // Check if valid IPv4 or IPv6
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(clean);
  const isIpv6 = clean.includes(":") && clean.split(":").length >= 3;
  return isIpv4 || isIpv6;
}

async function fetchFromEndpoint(
  url: string,
  parseJson: boolean,
  jsonKey?: string
): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      headers: { Accept: "application/json, text/plain" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return undefined;
    if (parseJson) {
      const data = await res.json();
      const ip = jsonKey
        ? data?.[jsonKey]
        : data?.ip || data?.ip_address || data?.query || data?.ipAddress;
      if (isValidPublicIp(ip)) return String(ip).trim();
    } else {
      const text = (await res.text()).trim();
      if (isValidPublicIp(text)) return text;
    }
  } catch {
    // try next provider
  }
  return undefined;
}

export async function fetchClientPublicIp(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;

  // Check cache first
  try {
    const cachedIp = sessionStorage.getItem(CACHE_KEY);
    const cachedTime = parseInt(sessionStorage.getItem(CACHE_TIME_KEY) || "0", 10);
    if (cachedIp && isValidPublicIp(cachedIp) && Date.now() - cachedTime < CACHE_TTL_MS) {
      return cachedIp;
    }
  } catch {
    // sessionStorage unavailable
  }

  // Fast parallel queries to multiple distinct high-availability providers
  const providers = [
    fetchFromEndpoint("https://api.ipify.org?format=json", true, "ip"),
    fetchFromEndpoint("https://api64.ipify.org?format=json", true, "ip"),
    fetchFromEndpoint("https://ipwho.is/", true, "ip"),
    fetchFromEndpoint("https://icanhazip.com", false),
    fetchFromEndpoint("https://freeipapi.com/api/json", true, "ipAddress"),
    fetchFromEndpoint("https://api.my-ip.io/v2/ip.json", true, "ip"),
    fetchFromEndpoint("https://api.seeip.org/jsonip", true, "ip"),
    fetchFromEndpoint("https://ipapi.co/json/", true, "ip"),
    fetchFromEndpoint("https://ifconfig.me/ip", false),
  ];

  try {
    // Return the first resolved valid public IP
    const ip = await Promise.any(
      providers.map((p) =>
        p.then((val) => {
          if (val && isValidPublicIp(val)) return val;
          throw new Error("Invalid IP");
        })
      )
    );

    if (ip && isValidPublicIp(ip)) {
      try {
        sessionStorage.setItem(CACHE_KEY, ip);
        sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      return ip;
    }
  } catch {
    // Promise.any failed, check settled
    const results = await Promise.allSettled(providers);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value && isValidPublicIp(r.value)) {
        try {
          sessionStorage.setItem(CACHE_KEY, r.value);
          sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        return r.value;
      }
    }
  }

  return undefined;
}

