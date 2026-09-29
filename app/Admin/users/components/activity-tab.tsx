"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Activity, UserPlus, LogIn, Shield, Clock } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { UserWithStatus } from "./types";

interface ActivityTabProps {
  users: UserWithStatus[];
}

export function ActivityTab({ users }: ActivityTabProps) {
  const { t } = useLanguage();

  const activity = useMemo(() => {
    const items: {
      id: string;
      type: "login" | "signup" | "suspension" | "admin";
      user: UserWithStatus;
      title: string;
      description: string;
      timestamp: string;
    }[] = [];

    for (const user of users) {
      if (user.last_seen) {
        items.push({
          id: `${user.id}-login`,
          type: "login",
          user,
          title: t("userLoggedIn"),
          description: user.full_name || user.email || user.id,
          timestamp: user.last_seen,
        });
      }

      if (user.created_at) {
        items.push({
          id: `${user.id}-signup`,
          type: "signup",
          user,
          title: t("userRegistered"),
          description: user.full_name || user.email || user.id,
          timestamp: user.created_at,
        });
      }
    }

    return items
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }, [users, t]);

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return t("notAvailable");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "login":
        return <LogIn className="h-4 w-4" />;
      case "signup":
        return <UserPlus className="h-4 w-4" />;
      case "suspension":
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentActivity")}</CardTitle>
        <CardDescription>{t("recentLoginsAndRegistrations")}</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2 opacity-50" />
            <p>{t("noActivityYet")}</p>
          </div>
        ) : (
          <div className="relative pl-4 border-l space-y-6">
            {activity.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative pl-8"
              >
                <span
                  className={`
                    absolute -left-[21px] top-0 h-8 w-8 rounded-full flex items-center justify-center
                    ${
                      item.type === "login"
                        ? "bg-green-500/10 text-green-600"
                        : item.type === "signup"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {getIcon(item.type)}
                </span>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={item.user.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {(item.user.full_name || item.user.email || "?")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.type === "login" ? t("login") : t("signup")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
