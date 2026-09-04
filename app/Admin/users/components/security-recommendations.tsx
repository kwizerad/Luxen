"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Shield, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { revokeAllOtherSessions } from "@/app/Admin/actions/devices";
import type { SecurityRecommendation } from "@/lib/device.types";

interface SecurityRecommendationsProps {
  recommendations: SecurityRecommendation[];
  userId: string;
  onChange?: () => void;
}

export function SecurityRecommendations({
  recommendations,
  userId,
  onChange,
}: SecurityRecommendationsProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSignOutAll = async () => {
    setLoading(true);
    try {
      await revokeAllOtherSessions(userId);
      toast.success(t("allOtherSessionsRevoked"));
      onChange?.();
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {t("securityRecommendations")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-center gap-1.5 text-[11px] text-green-600">
            <CheckCircle className="h-3 w-3" />
            {t("noSecurityRecommendations")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t("securityRecommendations")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="flex items-start gap-2 p-2 sm:p-2.5 rounded-lg border bg-muted/30"
          >
            <div className="mt-0.5 flex-shrink-0">
              {rec.severity === "critical" ? (
                <XCircle className="h-3.5 w-3.5 text-red-600" />
              ) : rec.severity === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-medium">{rec.message}</p>
                <Badge
                  variant={
                    rec.severity === "critical"
                      ? "destructive"
                      : rec.severity === "warning"
                        ? "default"
                        : "secondary"
                  }
                  className="text-[10px] px-1.5 py-0"
                >
                  {t(rec.severity)}
                </Badge>
              </div>
              {rec.id === "too-many-sessions" && rec.actionLabel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1.5 h-7 text-xs"
                  disabled={loading}
                  onClick={handleSignOutAll}
                >
                  {loading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                  {rec.actionLabel}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
