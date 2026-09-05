"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Monitor, Smartphone, Tablet, Globe, Clock, Star } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { DeviceAnalytics } from "@/lib/device.types";

interface DeviceAnalyticsProps {
  analytics: DeviceAnalytics & { browserDistribution: { name: string; count: number; color?: string }[]; osDistribution: { name: string; count: number; color?: string }[] };
}

export function DeviceAnalytics({ analytics }: DeviceAnalyticsProps) {
  const { t } = useLanguage();

  const statCards = [
    { icon: <Monitor className="h-4 w-4" />, label: t("primaryDevice"), value: analytics.primaryDevice || "—" },
    { icon: <Globe className="h-4 w-4" />, label: t("mostUsedBrowser"), value: analytics.mostUsedBrowser || "—" },
    { icon: <Monitor className="h-4 w-4" />, label: t("mostUsedOS"), value: analytics.mostUsedOS || "—" },
    { icon: <Clock className="h-4 w-4" />, label: t("avgSessionDuration"), value: analytics.averageSessionDurationSeconds ? `${Math.round(analytics.averageSessionDurationSeconds / 60)}m` : "—" },
    { icon: <Monitor className="h-4 w-4" />, label: t("totalDevicesUsed"), value: analytics.totalDevices.toString() },
    { icon: <Star className="h-4 w-4" />, label: t("totalLogins"), value: analytics.totalLogins.toString() },
  ];

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-xl">
            <CardContent className="p-2">
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                {card.icon}
                <span className="text-[9px] uppercase tracking-wider truncate">{card.label}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold truncate">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            {t("deviceUsageBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" /> {t("desktop")}
              </span>
              <span className="font-medium">{analytics.desktopPercentage}%</span>
            </div>
            <Progress value={analytics.desktopPercentage} className="h-1.5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> {t("mobile")}
              </span>
              <span className="font-medium">{analytics.mobilePercentage}%</span>
            </div>
            <Progress value={analytics.mobilePercentage} className="h-1.5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Tablet className="h-3.5 w-3.5 text-muted-foreground" /> {t("tablet")}
              </span>
              <span className="font-medium">{analytics.tabletPercentage}%</span>
            </div>
            <Progress value={analytics.tabletPercentage} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        <DistributionCard title={t("browserDistribution")} data={analytics.browserDistribution} icon={<Globe className="h-3.5 w-3.5" />} />
        <DistributionCard title={t("osDistribution")} data={analytics.osDistribution} icon={<Monitor className="h-3.5 w-3.5" />} />
      </div>

      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t("weeklyUsage")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-end gap-1 h-20 sm:h-24">
            {analytics.weeklyUsage.map((point) => (
              <div key={point.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                  style={{ height: `${Math.max(4, (point.count / Math.max(1, ...analytics.weeklyUsage.map((p) => p.count))) * 100)}%` }}
                />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">{point.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {t("monthlyUsage")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-end gap-1 h-20 sm:h-24">
            {analytics.monthlyUsage.map((point) => (
              <div key={point.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                  style={{ height: `${Math.max(4, (point.count / Math.max(1, ...analytics.monthlyUsage.map((p) => p.count))) * 100)}%` }}
                />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">{point.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DistributionCard({
  title,
  data,
  icon,
}: {
  title: string;
  data: { name: string; count: number; color?: string }[];
  icon: React.ReactNode;
}) {
  const { t } = useLanguage();
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {data.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">{t("noData")}</div>
        ) : (
          <div className="space-y-1">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color || "#3b82f6" }}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                  {item.count} ({Math.round((item.count / total) * 100)}%)
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
