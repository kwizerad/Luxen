"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { requireAdmin } from "../actions/_shared";
import type {
  UserDevice,
  LoginHistoryEntry,
  SecurityEvent,
  DeviceAnalytics,
  BrowserDistributionEntry,
  OSDistributionEntry,
  SecurityAnalysis,
  UserAuthSecurityInfo,
} from "@/lib/device.types";

const ONLINE_THRESHOLD_MINUTES = 5;

function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff >= 0 && diff <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
}

export async function getUserDevices(userId: string): Promise<UserDevice[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userId)
    .order("last_seen", { ascending: false });

  if (error) {
    console.error("getUserDevices error:", error);
    return [];
  }
  return data || [];
}

export async function getUserLoginHistory(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ entries: LoginHistoryEntry[]; count: number }> {
  await requireAdmin();
  const supabase = createAdminClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("login_history")
    .select("*, user_devices(*)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getUserLoginHistory error:", error);
    return { entries: [], count: 0 };
  }

  return {
    entries: (data || []) as unknown as LoginHistoryEntry[],
    count: count || 0,
  };
}

export async function getUserSecurityEvents(userId: string): Promise<SecurityEvent[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("security_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserSecurityEvents error:", error);
    return [];
  }
  return data || [];
}

export async function getUserAuthSecurityInfo(
  userId: string
): Promise<UserAuthSecurityInfo> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    console.error("getUserAuthSecurityInfo error:", error);
    return { mfaEnabled: false };
  }

  const user = data.user;
  let mfaEnabled = false;

  try {
    const { data: factorsData } = await supabase.auth.admin.mfa.listFactors({ userId });
    const factors = factorsData?.factors || [];
    mfaEnabled = Array.isArray(factors) && factors.length > 0;
  } catch {
    // Fallback to metadata flags if the MFA API is unavailable.
    mfaEnabled = Boolean(
      user.user_metadata?.mfa_enabled || user.app_metadata?.mfa_enabled
    );
  }

  return {
    mfaEnabled,
    passwordLastChangedAt: user.updated_at,
    email: user.email,
    phone: user.phone,
  };
}

export async function getUserDeviceAnalytics(
  userId: string
): Promise<DeviceAnalytics & { browserDistribution: BrowserDistributionEntry[]; osDistribution: OSDistributionEntry[] }> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [devicesRes, historyRes] = await Promise.all([
    supabase.from("user_devices").select("*").eq("user_id", userId),
    supabase
      .from("login_history")
      .select("created_at, login_result")
      .eq("user_id", userId)
      .eq("login_result", "success"),
  ]);

  const devices: UserDevice[] = devicesRes.data || [];
  const logins: { created_at?: string | null; login_result?: string | null }[] = historyRes.data || [];

  const typeCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};
  let totalDesktop = 0;
  let totalMobile = 0;
  let totalTablet = 0;

  for (const d of devices) {
    typeCounts[d.device_type || "Unknown"] = (typeCounts[d.device_type || "Unknown"] || 0) + 1;
    browserCounts[d.browser || "Unknown"] = (browserCounts[d.browser || "Unknown"] || 0) + 1;
    osCounts[d.os || "Unknown"] = (osCounts[d.os || "Unknown"] || 0) + 1;

    if (d.device_type === "Desktop" || d.device_type === "Laptop") totalDesktop++;
    else if (d.device_type === "Mobile") totalMobile++;
    else if (d.device_type === "Tablet") totalTablet++;
  }

  const sortedDevices = Object.entries(typeCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
  const sortedBrowsers = Object.entries(browserCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
  const sortedOS = Object.entries(osCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  const totalTyped = totalDesktop + totalMobile + totalTablet;

  // Weekly usage (last 12 weeks)
  const weeklyUsage: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = logins.filter((l: { created_at?: string | null }) => l.created_at && new Date(l.created_at) >= start && new Date(l.created_at) < end).length;
    weeklyUsage.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  // Monthly usage (last 12 months)
  const monthlyUsage: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    const count = logins.filter((l: { created_at?: string | null }) => {
      if (!l.created_at) return false;
      const d = new Date(l.created_at);
      return d.getMonth() === date.getMonth() && d.getFullYear() === year;
    }).length;
    monthlyUsage.push({ label: `${month} ${year}`, count });
  }

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const browserDistribution: BrowserDistributionEntry[] = sortedBrowsers.map(([name, count], idx) => ({
    name,
    count,
    color: colors[idx % colors.length],
  }));

  const osDistribution: OSDistributionEntry[] = sortedOS.map(([name, count], idx) => ({
    name,
    count,
    color: colors[idx % colors.length],
  }));

  // Average session duration: rough proxy from first to last login per day
  let avgSessionDurationSeconds: number | undefined;
  if (logins.length >= 2) {
    const sorted: { created_at: string }[] = logins
      .filter((l): l is { created_at: string; login_result: string } => Boolean(l.created_at))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first = new Date(sorted[0].created_at!).getTime();
    const last = new Date(sorted[sorted.length - 1].created_at!).getTime();
    avgSessionDurationSeconds = Math.round((last - first) / 1000 / Math.max(sorted.length - 1, 1));
  }

  return {
    primaryDevice: sortedDevices[0]?.[0],
    mostUsedBrowser: sortedBrowsers[0]?.[0],
    mostUsedOS: sortedOS[0]?.[0],
    desktopPercentage: totalTyped > 0 ? Math.round((totalDesktop / totalTyped) * 100) : 0,
    mobilePercentage: totalTyped > 0 ? Math.round((totalMobile / totalTyped) * 100) : 0,
    tabletPercentage: totalTyped > 0 ? Math.round((totalTablet / totalTyped) * 100) : 0,
    averageSessionDurationSeconds: avgSessionDurationSeconds,
    totalDevices: devices.length,
    totalLogins: logins.length,
    weeklyUsage,
    monthlyUsage,
    browserDistribution,
    osDistribution,
  };
}

export async function getUserSecurityAnalysis(userId: string): Promise<SecurityAnalysis> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [devicesRes, eventsRes, historyRes] = await Promise.all([
    supabase.from("user_devices").select("*").eq("user_id", userId),
    supabase
      .from("security_events")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("login_history")
      .select("country, login_result, created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const devices = (devicesRes.data || []) as UserDevice[];
  const events: SecurityEvent[] = eventsRes.data || [];
  const history: { country?: string | null; login_result: string; created_at: string }[] = historyRes.data || [];

  const activeSessions = devices.filter((d) => isOnline(d.last_seen)).length;

  const countries = new Set(history.map((l) => l.country).filter(Boolean));
  const multipleCountries = countries.size > 1;

  const newDeviceDetected = events.some((e) => e.event_type === "new_device");
  const newCountryDetected = events.some((e) => e.event_type === "new_country");
  const newRegionDetected = events.some((e) => e.event_type === "new_region");
  const failedLoginAttempts = events.filter((e) => e.event_type === "failed_login").length;
  const suspiciousLoginAttempts = events.filter(
    (e) => e.event_type === "suspicious_login" || e.event_type === "multiple_countries" || e.event_type === "vpn_proxy"
  ).length;
  const vpnProxyDetected = events.some((e) => e.event_type === "vpn_proxy");
  const trustedDeviceCount = devices.filter((d) => d.is_trusted).length;

  // Security score 0-100
  let score = 100;
  if (failedLoginAttempts > 0) score -= Math.min(20, failedLoginAttempts * 5);
  if (suspiciousLoginAttempts > 0) score -= Math.min(30, suspiciousLoginAttempts * 10);
  if (multipleCountries) score -= 15;
  if (vpnProxyDetected) score -= 15;
  if (trustedDeviceCount === 0) score -= 10;
  score = Math.max(0, score);

  const recommendations: SecurityAnalysis["recommendations"] = [];
  if (trustedDeviceCount === 0) {
    recommendations.push({
      id: "trust-device",
      severity: "warning",
      message: "No trusted devices. Consider marking this user's known devices as trusted.",
    });
  }
  if (multipleCountries) {
    recommendations.push({
      id: "multiple-countries",
      severity: "warning",
      message: "Logins detected from multiple countries in the last 30 days. Review login history.",
    });
  }
  if (newCountryDetected) {
    recommendations.push({
      id: "new-country",
      severity: "warning",
      message: "A login was detected from a country never used by this user before.",
    });
  }
  if (newRegionDetected) {
    recommendations.push({
      id: "new-region",
      severity: "safe",
      message: "A login was detected from a new region within a previously seen country.",
    });
  }
  if (failedLoginAttempts > 0) {
    recommendations.push({
      id: "failed-logins",
      severity: failedLoginAttempts > 5 ? "critical" : "warning",
      message: `${failedLoginAttempts} failed login attempt(s) recently.`,
    });
  }
  if (suspiciousLoginAttempts > 0) {
    recommendations.push({
      id: "suspicious-logins",
      severity: "critical",
      message: "Suspicious login activity detected. Consider forcing a password reset.",
      actionLabel: "Reset password",
    });
  }
  if (vpnProxyDetected) {
    recommendations.push({
      id: "vpn-proxy",
      severity: "warning",
      message: "Possible VPN/proxy usage detected.",
    });
  }
  if (activeSessions > 5) {
    recommendations.push({
      id: "too-many-sessions",
      severity: "safe",
      message: "Many active sessions. Review and sign out unused devices.",
      actionLabel: "Sign out all",
    });
  }

  return {
    activeSessions,
    multipleCountriesDetected: multipleCountries,
    newDeviceDetected,
    newCountryDetected,
    newRegionDetected,
    failedLoginAttempts,
    suspiciousLoginAttempts,
    vpnProxyDetected,
    trustedDeviceCount,
    securityScore: score,
    recommendations,
  };
}

export async function setDeviceTrusted(
  userId: string,
  deviceId: number,
  trusted: boolean
): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_devices")
    .update({ is_trusted: trusted, updated_at: new Date().toISOString() })
    .eq("id", deviceId)
    .eq("user_id", userId);

  if (error) {
    console.error("setDeviceTrusted error:", error);
    throw new Error("Failed to update trusted status");
  }
}

export async function revokeAllOtherSessions(userId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();

  // Mark all devices except most recent as offline and record event
  const { error } = await supabase
    .from("user_devices")
    .update({ last_seen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
    .eq("user_id", userId)
    .neq(
      "id",
      (await supabase
        .from("user_devices")
        .select("id")
        .eq("user_id", userId)
        .order("last_seen", { ascending: false })
        .limit(1)
        .single()) as unknown as number
    );

  if (error) {
    console.error("revokeAllOtherSessions error:", error);
    throw new Error("Failed to revoke sessions");
  }

  await supabase.from("security_events").insert({
    user_id: userId,
    event_type: "session_revoked",
    severity: "safe",
    details: { source: "admin" },
  });
}

export async function removeTrustedDevice(userId: string, deviceId: number): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_devices")
    .update({ is_trusted: false, updated_at: new Date().toISOString() })
    .eq("id", deviceId)
    .eq("user_id", userId);

  if (error) {
    console.error("removeTrustedDevice error:", error);
    throw new Error("Failed to remove trusted device");
  }

  await supabase.from("security_events").insert({
    user_id: userId,
    device_id: deviceId,
    event_type: "trusted_device_removed",
    severity: "safe",
    details: {},
  });
}

export async function sendPasswordReset(userId: string): Promise<void> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    throw new Error("User not found or has no email address.");
  }

  const { headers: reqHeaders } = await import("next/headers");
  const host = reqHeaders().get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectTo = `${protocol}://${host}/auth/update-password`;

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    data.user.email,
    { redirectTo }
  );

  if (resetError) {
    throw new Error(resetError.message);
  }

  await supabase.from("security_events").insert({
    user_id: userId,
    event_type: "password_changed",
    severity: "safe",
    details: { source: "admin_password_reset_email", triggered_by: "admin" },
  });
}
