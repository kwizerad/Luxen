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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("securityRecommendations")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            {t("noSecurityRecommendations")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t("securityRecommendations")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
          >
            <div className="mt-0.5">
              {rec.severity === "critical" ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : rec.severity === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{rec.message}</p>
                <Badge
                  variant={
                    rec.severity === "critical"
                      ? "destructive"
                      : rec.severity === "warning"
                        ? "default"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {t(rec.severity)}
                </Badge>
              </div>
              {rec.id === "too-many-sessions" && rec.actionLabel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7"
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
