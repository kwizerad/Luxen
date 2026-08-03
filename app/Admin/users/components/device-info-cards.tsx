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
  Star,
  Trash2,
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
      return <Smartphone className="h-5 w-5" />;
    case "Tablet":
      return <Tablet className="h-5 w-5" />;
    case "Laptop":
      return <Laptop className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("activeSessions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-6">
            {t("noSessionsFound")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t("activeSessions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.map((device) => {
          const online = isOnline(device.last_seen);
          return (
            <div
              key={device.id}
              className="flex items-start gap-3 p-3 rounded-xl border bg-muted/30"
            >
              <div className="mt-0.5 text-muted-foreground">
                <DeviceIcon deviceType={device.device_type} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {device.device_name || device.device_type || t("unknownDevice")}
                  </span>
                  {online && (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                      {t("online")}
                    </Badge>
                  )}
                  {device.is_trusted && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3" />
                      {t("trusted")}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {device.browser} {device.browser_version} • {device.os} {device.os_version}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[device.city, device.region, device.country].filter(Boolean).join(", ") || device.timezone || "—"}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {device.last_seen_ip || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {t("lastActivity")}: {device.last_seen ? new Date(device.last_seen).toLocaleString() : "—"}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading[device.id!]}
                  onClick={() => handleTrustToggle(device)}
                  className="h-8 w-8 p-0"
                  title={device.is_trusted ? t("removeTrusted") : t("markTrusted")}
                >
                  {device.is_trusted ? (
                    <Trash2 className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Star className="h-4 w-4" />
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
}

export function SecurityInfoCard({ userId }: SecurityInfoProps) {
  const { t } = useLanguage();
  const [currentLogin, setCurrentLogin] = useState<LoginHistoryEntry | null>(null);
  const [authInfo, setAuthInfo] = useState<UserAuthSecurityInfo | null>(null);
  const secure = typeof window !== "undefined" ? window.location.protocol === "https:" : true;

  useEffect(() => {
    getUserLoginHistory(userId, 1, 1)
      .then((res) => setCurrentLogin(res.entries[0] || null))
      .catch(() => {});
    getUserAuthSecurityInfo(userId)
      .then((info) => setAuthInfo(info))
      .catch(() => {});
  }, [userId]);

  const items = [
    { icon: <Globe className="h-4 w-4" />, label: t("ipAddress"), value: currentLogin?.ip_address || "—" },
    { icon: <Globe className="h-4 w-4" />, label: t("ipVersion"), value: currentLogin?.ip_version || "—" },
    { icon: <MapPin className="h-4 w-4" />, label: t("country"), value: currentLogin?.country ? `${currentLogin.country}${currentLogin.country_code ? ` (${currentLogin.country_code})` : ""}` : t("unknown") },
    { icon: <MapPin className="h-4 w-4" />, label: t("region"), value: currentLogin?.region || t("unknown") },
    { icon: <MapPin className="h-4 w-4" />, label: t("city"), value: currentLogin?.city || t("unknown") },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: t("coordinates"),
      value: currentLogin?.latitude != null && currentLogin?.longitude != null
        ? `${currentLogin.latitude.toFixed(2)}, ${currentLogin.longitude.toFixed(2)} (${t("approximate")})`
        : "—",
    },
    {
      icon: secure ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />,
      label: t("secureConnection"),
      value: secure ? t("yes") : t("no"),
    },
    { icon: <Clock className="h-4 w-4" />, label: t("currentLoginTime"), value: currentLogin?.created_at ? new Date(currentLogin.created_at).toLocaleString() : "—" },
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t("securityInformation")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="text-muted-foreground mt-0.5">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-medium break-words">{item.value}</p>
              </div>
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

export function CurrentDeviceCard({ device }: CurrentDeviceProps) {
  const { t } = useLanguage();

  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {t("currentDevice")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-6">
            {t("noDeviceInfoAvailable")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const infoItems = [
    { label: t("deviceType"), value: device?.device_type || t("unknown") },
    { label: t("deviceName"), value: device?.device_name || "—" },
    { label: t("browser"), value: `${device?.browser || "—"} ${device?.browser_version || ""}` },
    { label: t("operatingSystem"), value: `${device?.os || "—"} ${device?.os_version || ""}` },
    { label: t("ipAddress"), value: device?.last_seen_ip || "—", mono: true },
    { label: t("ipVersion"), value: device?.ip_version || "—" },
    { label: t("country"), value: device?.country ? `${device.country}${device.country_code ? ` (${device.country_code})` : ""}` : t("unknown") },
    { label: t("region"), value: device?.region || t("unknown") },
    { label: t("city"), value: device?.city || t("unknown") },
    { label: t("firstSeenIp"), value: device?.first_seen_ip || "—", mono: true },
    { label: t("cpuArchitecture"), value: device?.cpu_architecture || "—" },
    { label: t("screenResolution"), value: device?.screen_resolution || "—" },
    { label: t("viewportSize"), value: device?.viewport_size || "—" },
    { label: t("devicePixelRatio"), value: device?.device_pixel_ratio?.toString() || "—" },
    { label: t("preferredLanguage"), value: device?.language || "—" },
    { label: t("userTimeZone"), value: device?.timezone || "—" },
    { label: t("touchSupport"), value: device?.touch_support ? t("yes") : t("no") },
    { label: t("cookiesEnabled"), value: device?.cookies_enabled ? t("yes") : t("no") },
    { label: t("firstSeen"), value: device?.first_seen ? new Date(device.first_seen).toLocaleString() : "—" },
    { label: t("lastActivity"), value: device?.last_seen ? new Date(device.last_seen).toLocaleString() : "—" },
    { label: t("deviceFingerprintId"), value: device?.fingerprint || "—", mono: true },
    { label: t("trustedDevice"), value: device?.is_trusted ? t("yes") : t("no") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          {t("currentDevice")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={`text-sm font-medium break-words ${item.mono ? "font-mono text-xs" : ""}`}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t("securityMonitor")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg border bg-muted/30">
          <span className="text-sm font-medium">{t("securityScore")}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{analysis.securityScore}</span>
            {getScoreBadge(analysis.securityScore)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
