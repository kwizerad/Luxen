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
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {card.icon}
                <span className="text-xs uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-lg font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            {t("deviceUsageBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" /> {t("desktop")}
              </span>
              <span className="font-medium">{analytics.desktopPercentage}%</span>
            </div>
            <Progress value={analytics.desktopPercentage} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" /> {t("mobile")}
              </span>
              <span className="font-medium">{analytics.mobilePercentage}%</span>
            </div>
            <Progress value={analytics.mobilePercentage} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Tablet className="h-4 w-4 text-muted-foreground" /> {t("tablet")}
              </span>
              <span className="font-medium">{analytics.tabletPercentage}%</span>
            </div>
            <Progress value={analytics.tabletPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DistributionCard title={t("browserDistribution")} data={analytics.browserDistribution} icon={<Globe className="h-4 w-4" />} />
        <DistributionCard title={t("osDistribution")} data={analytics.osDistribution} icon={<Monitor className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("weeklyUsage")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {analytics.weeklyUsage.map((point) => (
              <div key={point.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                  style={{ height: `${Math.max(4, (point.count / Math.max(1, ...analytics.weeklyUsage.map((p) => p.count))) * 100)}%` }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{point.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("monthlyUsage")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {analytics.monthlyUsage.map((point) => (
              <div key={point.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                  style={{ height: `${Math.max(4, (point.count / Math.max(1, ...analytics.monthlyUsage.map((p) => p.count))) * 100)}%` }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{point.label}</span>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">{t("noData")}</div>
        ) : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color || "#3b82f6" }}
                  />
                  <span>{item.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
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
