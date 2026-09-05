"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Clock,
  MapPin,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  HardDrive,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

export interface UserDeviceItem {
  id: string | number;
  user_id: string;
  fingerprint: string;
  device_name?: string;
  device_type?: string;
  browser_info?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  screen_resolution?: string;
  ip_address?: string;
  last_seen_ip?: string;
  first_seen_ip?: string;
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  is_trusted?: boolean;
  is_current?: boolean;
  first_seen?: string;
  last_seen?: string;
}

interface UserDevicesListProps {
  className?: string;
  showCardWrapper?: boolean;
  onDeviceChange?: () => void;
}

export function UserDevicesList({
  className = "",
  showCardWrapper = true,
  onDeviceChange,
}: UserDevicesListProps) {
  const { t } = useLanguage();
  const [devices, setDevices] = useState<UserDeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<UserDeviceItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [showRevokeOthersDialog, setShowRevokeOthersDialog] = useState(false);

  const fetchDevices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/user-devices", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load linked devices");
      }
      const data = await res.json();
      if (Array.isArray(data.devices)) {
        setDevices(data.devices);
      }
    } catch (err: any) {
      console.warn("Error fetching devices:", err);
      if (isRefresh) {
        toast.error(err?.message || "Failed to refresh devices");
      }
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const copyToClipboard = (text: string) => {
    if (!text || text === "unknown") return;
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    toast.success(`${t("copied") || "Copied"}: ${text}`);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleToggleTrust = async (device: UserDeviceItem) => {
    const newTrust = !device.is_trusted;
    try {
      const res = await fetch("/api/user-devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, is_trusted: newTrust }),
      });

      if (!res.ok) {
        throw new Error("Failed to update trust status");
      }

      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, is_trusted: newTrust } : d))
      );
      toast.success(
        newTrust
          ? t("deviceMarkedTrusted") || "Device marked as trusted"
          : t("deviceUnmarkedTrusted") || "Device trust removed"
      );
      onDeviceChange?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update device");
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/user-devices?id=${encodeURIComponent(deviceToDelete.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove device");
      }

      setDevices((prev) => prev.filter((d) => d.id !== deviceToDelete.id));
      toast.success(t("deviceRemoved") || "Device removed successfully");
      setDeviceToDelete(null);
      onDeviceChange?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove device");
    } finally {
      setDeleting(false);
    }
  };

  const handleRevokeOtherDevices = async () => {
    const currentDevice = devices.find((d) => d.is_current);
    if (!currentDevice) return;
    setRevokingOthers(true);
    try {
      const res = await fetch(
        `/api/user-devices?revoke_others=true&keep_fingerprint=${encodeURIComponent(
          currentDevice.fingerprint
        )}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error("Failed to revoke other devices");
      }

      setDevices([currentDevice]);
      toast.success(t("otherDevicesRevoked") || "All other devices have been revoked");
      setShowRevokeOthersDialog(false);
      onDeviceChange?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke other devices");
    } finally {
      setRevokingOthers(false);
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    const type = (deviceType || "").toLowerCase();
    if (type.includes("mobile") || type.includes("phone")) {
      return <Smartphone className="h-5 w-5 text-blue-500" />;
    }
    if (type.includes("tablet") || type.includes("ipad")) {
      return <Tablet className="h-5 w-5 text-indigo-500" />;
    }
    if (type.includes("laptop") || type.includes("macbook")) {
      return <Laptop className="h-5 w-5 text-purple-500" />;
    }
    return <Monitor className="h-5 w-5 text-emerald-500" />;
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return t("unknown") || "Unknown";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return t("activeNow") || "Active now";
      if (diffMins < 60) return `${diffMins} ${t("minutesAgo") || "mins ago"}`;
      if (diffHours < 24) return `${diffHours} ${t("hoursAgo") || "hours ago"}`;
      if (diffDays < 7) return `${diffDays} ${t("daysAgo") || "days ago"}`;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return timestamp;
    }
  };

  const otherDevicesCount = devices.filter((d) => !d.is_current).length;

  const content = (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {devices.length} {devices.length === 1 ? t("deviceLinked") || "Device Linked" : t("devicesLinked") || "Devices Linked"}
            </span>
            {devices.some((d) => d.is_current) && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("currentSessionActive") || "Current Session Active"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("userDevicesTransparencyDesc") || "Review all browsers and devices that have accessed your account."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDevices(true)}
            disabled={refreshing || loading}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("refresh") || "Refresh"}
          </Button>

          {otherDevicesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeOthersDialog(true)}
              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-200 dark:border-red-900/40"
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
              {t("revokeOtherDevices") || "Sign out other devices"}
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-xl animate-pulse space-y-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-8 px-4 border rounded-xl bg-muted/10">
          <HardDrive className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">{t("noDevicesFound") || "No linked devices recorded"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("deviceWillRecordOnNextLogin") || "Your device will be automatically linked upon your next activity."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const ip = device.last_seen_ip || device.ip_address || device.first_seen_ip;
            const location = [device.city, device.country].filter(Boolean).join(", ");

            return (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  device.is_current
                    ? "bg-primary/[0.03] border-primary/40 shadow-xs"
                    : "bg-card hover:border-border/80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Device Icon and Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-muted/60 border mt-0.5 shrink-0">
                      {getDeviceIcon(device.device_type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          {device.device_name || `${device.os || "Device"} • ${device.browser || device.device_type || "Browser"}`}
                        </span>

                        {device.is_current && (
                          <Badge className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white hover:bg-emerald-600 font-medium">
                            {t("thisDevice") || "This Device"}
                          </Badge>
                        )}

                        {device.is_trusted && (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                            <ShieldCheck className="h-3 w-3 mr-1 inline" />
                            {t("trusted") || "Trusted"}
                          </Badge>
                        )}
                      </div>

                      {/* Hardware / Browser specs */}
                      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted-foreground mt-1">
                        {device.browser && (
                          <span>
                            {device.browser} {device.browser_version ? `v${device.browser_version}` : ""}
                          </span>
                        )}
                        {device.os && <span>• {device.os}</span>}
                        {device.screen_resolution && (
                          <span className="hidden md:inline">• {device.screen_resolution}</span>
                        )}
                      </div>

                      {/* IP & Geolocation / Last Seen */}
                      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted-foreground mt-2">
                        {ip && ip !== "unknown" && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ip)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted transition-colors border text-foreground/80 hover:text-foreground"
                            title={t("clickToCopyIp") || "Click to copy IP"}
                          >
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span>{ip}</span>
                            {copiedIp === ip ? (
                              <Check className="h-3 w-3 text-emerald-500 ml-0.5" />
                            ) : (
                              <Copy className="h-2.5 w-2.5 text-muted-foreground opacity-60 ml-0.5" />
                            )}
                          </button>
                        )}

                        {location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {location}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{t("lastActive") || "Last active"}: {formatLastSeen(device.last_seen)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTrust(device)}
                      className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Shield className={`h-3.5 w-3.5 mr-1.5 ${device.is_trusted ? "text-blue-500 fill-blue-500/20" : ""}`} />
                      {device.is_trusted ? t("untrust") || "Untrust" : t("trust") || "Trust"}
                    </Button>

                    {!device.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeviceToDelete(device)}
                        className="h-8 text-xs px-2.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        title={t("removeDevice") || "Remove device"}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        {t("remove") || "Remove"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Transparency notice */}
      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground text-xs">
            {t("accountSecurityTransparency") || "Account Transparency & Security"}
          </p>
          <p>
            {t("deviceTrackingTransparencyDetails") ||
              "Your linked devices and IP addresses are recorded during authentication to protect your account against unauthorized logins. If you notice an unfamiliar device, sign it out immediately and update your password."}
          </p>
        </div>
      </div>

      {/* Delete Device Dialog */}
      <AlertDialog open={Boolean(deviceToDelete)} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeLinkedDevice") || "Remove Linked Device?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDeviceConfirmation") ||
                "This device will be removed from your linked accounts list and any active session tokens will be invalidated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel") || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              {t("removeDevice") || "Remove Device"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Other Devices Dialog */}
      <AlertDialog open={showRevokeOthersDialog} onOpenChange={setShowRevokeOthersDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeOtherDevicesTitle") || "Sign out all other devices?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeOtherDevicesDesc") ||
                "All sessions on other phones, laptops, and browsers will be signed out. Only your current active device will remain authenticated."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingOthers}>{t("cancel") || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeOtherDevices}
              disabled={revokingOthers}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {revokingOthers ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4 mr-1.5" />
              )}
              {t("confirmSignOutOthers") || "Sign Out Other Devices"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (!showCardWrapper) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={`border shadow-xs ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {t("linkedDevices") || "Linked Devices & Active Sessions"}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("manageLinkedDevicesDesc") || "Manage trusted devices and view IP addresses linked to your profile."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">{content}</CardContent>
    </Card>
  );
}
