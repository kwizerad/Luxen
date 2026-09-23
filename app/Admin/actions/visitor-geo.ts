"use server";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { requireAdmin, ActionResult } from "./_shared";

export interface VisitorLocationPoint {
  id: string;
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  deviceType: string;
  browser: string | null;
  os: string | null;
  path: string | null;
  createdAt: string;
}

export interface CountryStat {
  country: string;
  count: number;
  percentage: number;
}

export interface DeviceDistribution {
  deviceType: string;
  count: number;
  percentage: number;
}

export interface VisitorGeoData {
  points: VisitorLocationPoint[];
  totalLogs: number;
  uniqueCountries: number;
  uniqueCities: number;
  countryStats: CountryStat[];
  deviceStats: DeviceDistribution[];
  topCities: { city: string; country: string; count: number }[];
  recentLogs: {
    id: string;
    ip: string;
    location: string;
    device: string;
    path: string;
    time: string;
  }[];
}

// Fallback capital/city coordinates for countries when lat/lon is missing
const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  RW: [-1.9441, 30.0619], // Rwanda
  Rwanda: [-1.9441, 30.0619],
  US: [37.0902, -95.7129], // United States
  "United States": [37.0902, -95.7129],
  USA: [37.0902, -95.7129],
  GB: [55.3781, -3.436], // United Kingdom
  "United Kingdom": [55.3781, -3.436],
  UK: [55.3781, -3.436],
  CA: [56.1304, -106.3468], // Canada
  Canada: [56.1304, -106.3468],
  DE: [51.1657, 10.4515], // Germany
  Germany: [51.1657, 10.4515],
  FR: [46.2276, 2.2137], // France
  France: [46.2276, 2.2137],
  UG: [1.3733, 32.2903], // Uganda
  Uganda: [1.3733, 32.2903],
  KE: [-0.0236, 37.9062], // Kenya
  Kenya: [-0.0236, 37.9062],
  TZ: [-6.369, 34.8888], // Tanzania
  Tanzania: [-6.369, 34.8888],
  BI: [-3.3731, 29.9189], // Burundi
  Burundi: [-3.3731, 29.9189],
  CD: [-4.0383, 21.7587], // DR Congo
  "DR Congo": [-4.0383, 21.7587],
  IN: [20.5937, 78.9629], // India
  India: [20.5937, 78.9629],
  NG: [9.082, 8.6753], // Nigeria
  Nigeria: [9.082, 8.6753],
  ZA: [-30.5595, 22.9375], // South Africa
  "South Africa": [-30.5595, 22.9375],
  AU: [-25.2744, 133.7751], // Australia
  Australia: [-25.2744, 133.7751],
  JP: [36.2048, 138.2529], // Japan
  Japan: [36.2048, 138.2529],
  CN: [35.8617, 104.1954], // China
  China: [35.8617, 104.1954],
  BR: [-14.235, -51.9253], // Brazil
  Brazil: [-14.235, -51.9253],
  NL: [52.1326, 5.2913], // Netherlands
  Netherlands: [52.1326, 5.2913],
  SE: [60.1282, 18.6435], // Sweden
  Sweden: [60.1282, 18.6435],
  BE: [50.5039, 4.4699], // Belgium
  Belgium: [50.5039, 4.4699],
  CH: [46.8182, 8.2275], // Switzerland
  Switzerland: [46.8182, 8.2275],
};

export async function getVisitorGeoDistribution(): Promise<ActionResult<VisitorGeoData>> {
  try {
    await requireAdmin();

    if (!isSupabaseAdminConfigured()) {
      return {
        success: true,
        data: {
          points: [],
          totalLogs: 0,
          uniqueCountries: 0,
          uniqueCities: 0,
          countryStats: [],
          deviceStats: [],
          topCities: [],
          recentLogs: [],
        },
      };
    }

    const supabase = createAdminClient();

    // 1. Try querying visitor_device_logs (highest fidelity)
    let logs: any[] = [];
    const { data: vdlData, error: vdlError } = await supabase
      .from("visitor_device_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (!vdlError && vdlData && vdlData.length > 0) {
      logs = vdlData.map((d) => ({
        id: d.id || d.request_id,
        ip_address: d.ip_address,
        country: d.country,
        city: d.city,
        region: d.region,
        latitude: d.latitude,
        longitude: d.longitude,
        device_type: d.device_type,
        device_name: d.device_name || d.device_model,
        browser: d.browser_name ? `${d.browser_name} ${d.browser_version || ""}`.trim() : null,
        os: d.os_name ? `${d.os_name} ${d.os_version || ""}`.trim() : null,
        path: d.path,
        created_at: d.created_at,
      }));
    } else {
      // Fallback 1: Query visitor_logs
      const { data: vlData } = await supabase
        .from("visitor_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (vlData && vlData.length > 0) {
        logs = vlData;
      } else {
        // Fallback 2: anonymous_visits
        const { data: avData } = await supabase
          .from("anonymous_visits")
          .select("*")
          .order("last_seen", { ascending: false })
          .limit(300);

        if (avData && avData.length > 0) {
          logs = avData.map((av) => ({
            id: av.id,
            ip_address: av.ip_address,
            country: av.country,
            city: av.city,
            region: av.region,
            latitude: av.latitude,
            longitude: av.longitude,
            device_type: av.device_type,
            browser: av.browser,
            os: av.os,
            path: av.landing_page,
            created_at: av.last_seen || av.created_at,
          }));
        }
      }
    }

    if (logs.length === 0) {
      return {
        success: true,
        data: {
          points: [],
          totalLogs: 0,
          uniqueCountries: 0,
          uniqueCities: 0,
          countryStats: [],
          deviceStats: [],
          topCities: [],
          recentLogs: [],
        },
      };
    }

    // Process coordinates and map points
    const points: VisitorLocationPoint[] = [];
    const countryCounts: Record<string, number> = {};
    const cityCounts: Record<string, { city: string; country: string; count: number }> = {};
    const deviceCounts: Record<string, number> = {};

    logs.forEach((log, index) => {
      let lat = typeof log.latitude === "number" ? log.latitude : parseFloat(log.latitude);
      let lon = typeof log.longitude === "number" ? log.longitude : parseFloat(log.longitude);

      const country = log.country || "Unknown";
      const city = log.city || null;
      const deviceType = log.device_type || "desktop";

      // If lat/lon are missing, try country fallback coordinate
      if ((isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) && COUNTRY_COORDINATES[country]) {
        const [cLat, cLon] = COUNTRY_COORDINATES[country];
        const offsetLat = ((index % 7) - 3) * 0.05;
        const offsetLon = (((index * 3) % 7) - 3) * 0.05;
        lat = cLat + offsetLat;
        lon = cLon + offsetLon;
      }

      if (!isNaN(lat) && !isNaN(lon)) {
        points.push({
          id: log.id || `pt-${index}`,
          ip: log.ip_address ? maskIp(log.ip_address) : "Hidden",
          city: city,
          region: log.region || null,
          country: country,
          latitude: lat,
          longitude: lon,
          deviceType: deviceType,
          browser: log.browser || "Browser",
          os: log.os || "OS",
          path: log.path || "/",
          createdAt: log.created_at || new Date().toISOString(),
        });
      }

      // Count stats
      if (country && country !== "Unknown") {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
      if (city) {
        const key = `${city}-${country}`;
        if (!cityCounts[key]) {
          cityCounts[key] = { city, country, count: 0 };
        }
        cityCounts[key].count += 1;
      }

      const devKey = deviceType.toLowerCase();
      deviceCounts[devKey] = (deviceCounts[devKey] || 0) + 1;
    });

    const totalLogs = logs.length;

    const countryStats: CountryStat[] = Object.entries(countryCounts)
      .map(([country, count]) => ({
        country,
        count,
        percentage: totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const deviceStats: DeviceDistribution[] = Object.entries(deviceCounts)
      .map(([deviceType, count]) => ({
        deviceType: deviceType.charAt(0).toUpperCase() + deviceType.slice(1),
        count,
        percentage: totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topCities = Object.values(cityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const recentLogs = logs.slice(0, 8).map((l, idx) => ({
      id: l.id || `log-${idx}`,
      ip: l.ip_address ? maskIp(l.ip_address) : "—",
      location: [l.city, l.country].filter(Boolean).join(", ") || "Global",
      device: l.device_name
        ? `${l.device_name}${l.os ? ` • ${l.os}` : ""}`
        : `${l.device_type || "Device"} (${l.os || "OS"})`,
      path: l.path || "/",
      time: l.created_at || new Date().toISOString(),
    }));

    return {
      success: true,
      data: {
        points,
        totalLogs,
        uniqueCountries: Object.keys(countryCounts).length,
        uniqueCities: Object.keys(cityCounts).length,
        countryStats,
        deviceStats,
        topCities,
        recentLogs,
      },
    };
  } catch (error: any) {
    console.error("[getVisitorGeoDistribution] error:", error);
    return {
      success: false,
      error: error?.message || "Failed to load visitor location data",
    };
  }
}

function maskIp(ip: string): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.slice(0, 8) + "...";
}
