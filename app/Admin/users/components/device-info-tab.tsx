"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import type { UserWithStatus } from "./types";
import {
  getUserDevices,
  getUserDeviceAnalytics,
  getUserSecurityAnalysis,
} from "@/app/Admin/actions/devices";
import {
  CurrentDeviceCard,
  SecurityInfoCard,
  ActiveSessions,
  SecurityMonitorCard,
} from "./device-info-cards";
import { LoginHistory } from "./login-history";
import { DeviceAnalytics } from "./device-analytics";
import { SecurityRecommendations } from "./security-recommendations";
import type { UserDevice, DeviceAnalytics as DeviceAnalyticsType, SecurityAnalysis } from "@/lib/device.types";

interface DeviceInfoTabProps {
  user: UserWithStatus;
}

export function DeviceInfoTab({ user }: DeviceInfoTabProps) {
  const { t } = useLanguage();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [analytics, setAnalytics] = useState<DeviceAnalyticsType & { browserDistribution: { name: string; count: number; color?: string }[]; osDistribution: { name: string; count: number; color?: string }[] } | null>(null);
  const [securityAnalysis, setSecurityAnalysis] = useState<SecurityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [devicesData, analyticsData, securityData] = await Promise.all([
        getUserDevices(user.id),
        getUserDeviceAnalytics(user.id),
        getUserSecurityAnalysis(user.id),
      ]);
      setDevices(devicesData);
      setAnalytics(analyticsData);
      setSecurityAnalysis(securityData);
    } catch {
      toast.error(t("failedToLoadDeviceInfo"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const currentDevice = devices[0];

  if (loading) {
    return (
      <TabsContent value="device" className="space-y-4 mt-4">
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          {t("loading")}
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="device" className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={refreshing} onClick={load}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      <CurrentDeviceCard device={currentDevice} />
      <SecurityInfoCard userId={user.id} />
      <ActiveSessions devices={devices} userId={user.id} onChange={load} />
      <AnimatePresence mode="wait">
        {securityAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            <SecurityMonitorCard analysis={securityAnalysis} />
            <SecurityRecommendations
              recommendations={securityAnalysis.recommendations}
              userId={user.id}
              onChange={load}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <LoginHistory userId={user.id} />
      {analytics && <DeviceAnalytics analytics={analytics} />}
    </TabsContent>
  );
}
