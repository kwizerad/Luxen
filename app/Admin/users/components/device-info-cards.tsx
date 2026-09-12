"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Globe,
  Shield,
  Clock,
  Activity,
  MapPin,
  Lock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { UserDevice, LoginHistoryEntry, UserAuthSecurityInfo } from "@/lib/device.types";
import { setDeviceTrusted, removeTrustedDevice, getUserLoginHistory, getUserAuthSecurityInfo } from "@/app/Admin/actions/devices";

const ONLINE_THRESHOLD_MINUTES = 5;

interface ActiveSessionsProps {
  devices: UserDevice[];
  userId: string;
  onChange?: () => void;
}

function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff >= 0 && diff <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
}

function DeviceIcon({ deviceType }: { deviceType?: string }) {
  switch (deviceType) {
    case "Mobile":
      return <Smartphone className="h-4 w-4" />;
    case "Tablet":
      return <Tablet className="h-4 w-4" />;
    case "Laptop":
      return <Laptop className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

export function ActiveSessions({ devices, userId, onChange }: ActiveSessionsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const handleTrustToggle = async (device: UserDevice) => {
    if (!device.id) return;
    setLoading((prev) => ({ ...prev, [device.id!]: true }));
    try {
      if (device.is_trusted) {
        await removeTrustedDevice(userId, device.id);
        toast.success(t("trustedDeviceRemoved"));
      } else {
        await setDeviceTrusted(userId, device.id, true);
        toast.success(t("deviceMarkedTrusted"));
      }
      onChange?.();
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setLoading((prev) => ({ ...prev, [device.id!]: false }));
    }
  };

  if (devices.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("activeSessions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-muted-foreground text-center py-4">
            {t("noSessionsFound")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          {t("activeSessions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {devices.map((device) => {
          const online = isOnline(device.last_seen);
          return (
            <div
              key={device.id}
              className="flex items-start gap-2 p-2 rounded-lg border bg-muted/30"
            >
              <div className="mt-0.5 text-muted-foreground flex-shrink-0">
                <DeviceIcon deviceType={device.device_type} />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-xs sm:text-sm">
                    {device.device_name || device.device_type || t("unknownDevice")}
                  </span>
                  {online && (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20 text-[10px] px-1.5 py-0">
                      <span className="h-1 w-1 rounded-full bg-green-600 animate-pulse" />
                      {t("online")}
                    </Badge>
                  )}
                  {device.is_trusted && (
                    <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      {t("trusted")}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {device.browser} {device.browser_version} • {device.os} {device.os_version}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  {[device.city, device.region, device.country].filter(Boolean).join(", ") || device.timezone || "—"}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                  {device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading[device.id!]}
                  onClick={() => handleTrustToggle(device)}
                  className="h-7 w-7 p-0"
                  title={device.is_trusted ? t("removeTrusted") : t("markTrusted")}
                >
                  {device.is_trusted ? (
                    <Trash2 className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface SecurityInfoProps {
  userId: string;
  device?: UserDevice;
  devices?: UserDevice[];
}

export function SecurityInfoCard({ userId, device, devices }: SecurityInfoProps) {
  const { t } = useLanguage();
  const [currentLogin, setCurrentLogin] = useState<LoginHistoryEntry | null>(null);
  const [authInfo, setAuthInfo] = useState<UserAuthSecurityInfo | null>(null);
  const secure = typeof window !== "undefined" ? window.location.protocol === "https:" : true;

  const activeDevice = device || devices?.[0];

  useEffect(() => {
    getUserLoginHistory(userId, 1, 1)
      .then((res) => setCurrentLogin(res.entries[0] || null))
      .catch(() => {});
    getUserAuthSecurityInfo(userId)
      .then((info) => setAuthInfo(info))
      .catch(() => {});
  }, [userId]);

  const ipAddress = currentLogin?.ip_address || activeDevice?.last_seen_ip || activeDevice?.first_seen_ip || "—";
  const ipVersion = currentLogin?.ip_version || activeDevice?.ip_version || (ipAddress.includes(":") ? "IPv6" : ipAddress !== "—" ? "IPv4" : "—");
  const country = currentLogin?.country || activeDevice?.country;
  const countryCode = currentLogin?.country_code || activeDevice?.country_code;
  const region = currentLogin?.region || activeDevice?.region || t("unknown");
  const city = currentLogin?.city || activeDevice?.city || t("unknown");
  const latitude = currentLogin?.latitude ?? activeDevice?.latitude;
  const longitude = currentLogin?.longitude ?? activeDevice?.longitude;
  const loginTime = currentLogin?.created_at || activeDevice?.last_seen || activeDevice?.created_at;

  const items = [
    { icon: <Globe className="h-4 w-4" />, label: t("ipAddress"), value: ipAddress },
    { icon: <Globe className="h-4 w-4" />, label: t("ipVersion"), value: ipVersion },
    { icon: <MapPin className="h-4 w-4" />, label: t("country"), value: country ? `${country}${countryCode ? ` (${countryCode})` : ""}` : t("unknown") },
    { icon: <MapPin className="h-4 w-4" />, label: t("region"), value: region },
    { icon: <MapPin className="h-4 w-4" />, label: t("city"), value: city },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: t("coordinates"),
      value: latitude != null && longitude != null
        ? `${Number(latitude).toFixed(2)}, ${Number(longitude).toFixed(2)} (${t("approximate")})`
        : "—",
    },
    {
      icon: secure ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />,
      label: t("secureConnection"),
      value: secure ? t("yes") : t("no"),
    },
    { icon: <Clock className="h-4 w-4" />, label: t("currentLoginTime"), value: loginTime ? new Date(loginTime).toLocaleString() : "—" },
    { icon: <Shield className="h-4 w-4" />, label: t("authenticationMethod"), value: currentLogin?.auth_provider || t("email") },
    {
      icon: authInfo?.mfaEnabled ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Activity className="h-4 w-4" />,
      label: t("mfaEnabled"),
      value: authInfo ? (authInfo.mfaEnabled ? t("yes") : t("no")) : "—",
    },
    {
      icon: <Lock className="h-4 w-4" />,
      label: t("passwordLastChanged"),
      value: authInfo?.passwordLastChangedAt ? new Date(authInfo.passwordLastChangedAt).toLocaleString() : t("unknown"),
    },
  ];

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t("securityInformation")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((item) => (
            <div key={item.label} className="p-2 rounded-lg border bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{item.label}</p>
              <p className="text-xs font-medium break-words mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CurrentDeviceProps {
  device?: UserDevice;
}

function resolveSmartDeviceName(device?: UserDevice): string {
  if (!device) return "—";
  if (device.device_name && device.device_name !== "—" && device.device_name !== "Unknown") {
    return device.device_name;
  }
  if (device.device_model) {
    return device.device_model;
  }
  if (device.os === "Android") {
    return device.device_type === "Tablet" ? "Android Tablet" : "Android Smartphone";
  }
  if (device.os === "iOS") {
    return device.device_type === "Tablet" ? "Apple iPad" : "Apple iPhone";
  }
  if (device.os === "Windows") {
    return `Windows ${device.os_version || "10/11"} PC`;
  }
  if (device.os === "macOS") {
    return "Apple Mac";
  }
  if (device.os === "Linux") {
    return "Linux PC";
  }
  return `${device.device_type || "Web"} Device`;
}

function formatSmartOs(device?: UserDevice): string {
  if (!device?.os) return "—";
  const os = device.os;
  let ver = device.os_version || "";
  if (os === "Android" && (ver === "10" || ver === "10.0")) {
    ver = "13/14+";
  }
  return `${os} ${ver}`.trim();
}

export function CurrentDeviceCard({ device }: CurrentDeviceProps) {
  const { t } = useLanguage();

  if (!device) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            {t("currentDevice")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-muted-foreground text-center py-4">
            {t("noDeviceInfoAvailable")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const resolvedName = resolveSmartDeviceName(device);
  const resolvedOs = formatSmartOs(device);

  const primaryInfo = [
    { label: t("deviceType"), value: device?.device_type || t("unknown") },
    { label: t("deviceName"), value: resolvedName },
    { label: t("browser"), value: `${device?.browser || "—"} ${device?.browser_version || ""}`.trim() },
    { label: t("operatingSystem"), value: resolvedOs },
    { label: t("ipAddress"), value: device?.last_seen_ip || "—", mono: true },
    { label: t("country"), value: device?.country ? `${device.country}${device.country_code ? ` (${device.country_code})` : ""}` : t("unknown") },
    { label: t("trustedDevice"), value: device?.is_trusted ? t("yes") : t("no") },
    { label: t("lastActivity"), value: device?.last_seen ? new Date(device.last_seen).toLocaleString() : "—" },
  ];

  const technicalInfo = [
    { label: t("cpuArchitecture"), value: device?.cpu_architecture || (device?.os === "Android" || device?.os === "iOS" ? "ARM64" : "x86_64") },
    { label: t("screenResolution"), value: device?.screen_resolution || "—" },
    { label: t("viewportSize"), value: device?.viewport_size || "—" },
    { label: t("devicePixelRatio"), value: device?.device_pixel_ratio ? `${device.device_pixel_ratio}x` : "—" },
    ...(device?.screen_refresh_rate ? [{ label: "Refresh Rate", value: device.screen_refresh_rate }] : []),
    ...(device?.gpu_renderer ? [{ label: "GPU / Chipset", value: device.gpu_renderer }] : []),
    ...(device?.network_type ? [{ label: "Network", value: device.network_type }] : []),
    ...(device?.battery_status ? [{ label: "Battery", value: device.battery_status }] : []),
    { label: t("preferredLanguage"), value: device?.language || "—" },
    { label: t("userTimeZone"), value: device?.timezone || "—" },
    { label: t("touchSupport"), value: device?.touch_support ? (device?.max_touch_points ? `Multi-touch (${device.max_touch_points} pts)` : t("yes")) : t("no") },
    { label: t("cookiesEnabled"), value: device?.cookies_enabled ? t("yes") : t("no") },
    { label: t("ipVersion"), value: device?.ip_version || (device?.last_seen_ip?.includes(":") ? "IPv6" : "IPv4") },
    { label: t("region"), value: device?.region || t("unknown") },
    { label: t("city"), value: device?.city || t("unknown") },
    { label: t("firstSeenIp"), value: device?.first_seen_ip || "—", mono: true },
    { label: t("firstSeen"), value: device?.first_seen ? new Date(device.first_seen).toLocaleString() : "—" },
    { label: t("deviceFingerprintId"), value: device?.fingerprint || "—", mono: true },
  ];

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          <Monitor className="h-3.5 w-3.5" />
          {t("currentDevice")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Primary info - highlighted */}
        <div className="grid grid-cols-2 gap-2">
          {primaryInfo.map((item) => (
            <div key={item.label} className="p-2 rounded-lg border bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{item.label}</p>
              <p className={`text-xs font-medium break-words mt-0.5 ${item.mono ? "font-mono" : ""}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {/* Technical details - collapsible */}
        <DeviceTechnicalDetails items={technicalInfo} t={t} />
      </CardContent>
    </Card>
  );
}

interface SecurityMonitorProps {
  analysis: {
    activeSessions: number;
    multipleCountriesDetected: boolean;
    newDeviceDetected: boolean;
    newCountryDetected: boolean;
    newRegionDetected: boolean;
    failedLoginAttempts: number;
    suspiciousLoginAttempts: number;
    vpnProxyDetected: boolean;
    trustedDeviceCount: number;
    securityScore: number;
  };
}

export function SecurityMonitorCard({ analysis }: SecurityMonitorProps) {
  const { t } = useLanguage();

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> {t("safe")}</Badge>;
    if (score >= 50) return <Badge variant="default" className="bg-amber-500 gap-1"><AlertTriangle className="h-3 w-3" /> {t("warning")}</Badge>;
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {t("critical")}</Badge>;
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {t("securityMonitor")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="flex items-center justify-between mb-2 p-2 rounded-lg border bg-muted/30">
          <span className="text-xs sm:text-sm font-medium">{t("securityScore")}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold">{analysis.securityScore}</span>
            {getScoreBadge(analysis.securityScore)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <SecurityStatusItem
            label={t("activeSessions")}
            value={analysis.activeSessions.toString()}
            status={analysis.activeSessions > 5 ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("multipleCountries")}
            value={analysis.multipleCountriesDetected ? t("detected") : t("none")}
            status={analysis.multipleCountriesDetected ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("newDevice")}
            value={analysis.newDeviceDetected ? t("yes") : t("no")}
            status={analysis.newDeviceDetected ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("newCountry")}
            value={analysis.newCountryDetected ? t("detected") : t("none")}
            status={analysis.newCountryDetected ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("newRegion")}
            value={analysis.newRegionDetected ? t("detected") : t("none")}
            status={analysis.newRegionDetected ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("failedLoginAttempts")}
            value={analysis.failedLoginAttempts.toString()}
            status={analysis.failedLoginAttempts > 0 ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("suspiciousLogins")}
            value={analysis.suspiciousLoginAttempts.toString()}
            status={analysis.suspiciousLoginAttempts > 0 ? "critical" : "safe"}
          />
          <SecurityStatusItem
            label={t("vpnProxy")}
            value={analysis.vpnProxyDetected ? t("detected") : t("none")}
            status={analysis.vpnProxyDetected ? "warning" : "safe"}
          />
          <SecurityStatusItem
            label={t("trustedDevices")}
            value={analysis.trustedDeviceCount.toString()}
            status={analysis.trustedDeviceCount > 0 ? "safe" : "warning"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceTechnicalDetails({
  items,
  t,
}: {
  items: { label: string; value: string; mono?: boolean }[];
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? t("hideTechnicalDetails") || "Hide technical details" : t("showTechnicalDetails") || "Show technical details"}
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {items.map((item) => (
            <div key={item.label} className="p-2 rounded-lg border bg-muted/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{item.label}</p>
              <p className={`text-xs font-medium break-words mt-0.5 ${item.mono ? "font-mono" : ""}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityStatusItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "safe" | "warning" | "critical";
}) {
  const icon =
    status === "safe" ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : status === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-amber-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        {icon}
        <span className="text-[11px] truncate">{label}</span>
      </div>
      <span className="text-[11px] font-medium flex-shrink-0">{value}</span>
    </div>
  );
}
