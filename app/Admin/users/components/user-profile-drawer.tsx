"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  User,
  Shield,
  Calendar,
  MapPin,
  Cake,
  Hash,
  Ban,
  CheckCircle,
  Trophy,
  Activity,
  Clock,
  Trash2,
  Key,
  Send,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { UserWithStatus, UserProgressSummary } from "./types";
import { getUserActivity, getStudentProgressSummary } from "../../actions/users";

interface UserProfileDrawerProps {
  user: UserWithStatus | null;
  onClose: () => void;
  onSuspend: (user: UserWithStatus) => void;
  onActivate: (user: UserWithStatus) => void;
  onDelete: (user: UserWithStatus) => void;
  onPerformance: (user: UserWithStatus) => void;
  onExamLimit: (user: UserWithStatus) => void;
}

export function UserProfileDrawer({
  user,
  onClose,
  onSuspend,
  onActivate,
  onDelete,
  onPerformance,
  onExamLimit,
}: UserProfileDrawerProps) {
  const { t } = useLanguage();
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof getUserActivity>>>([]);
  const [progress, setProgress] = useState<UserProgressSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getUserActivity(user.id), getStudentProgressSummary(user.id)])
      .then(([a, p]) => {
        setActivity(a);
        setProgress(p);
      })
      .catch((err) => toast.error(t("failedToLoadActivity") + (err instanceof Error ? err.message : String(err))))
      .finally(() => setLoading(false));
  }, [user, t]);

  const open = Boolean(user);

  if (!user) return null;

  const getInitials = () => {
    const name = user.full_name || user.username || user.email || "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date?: string | null) => {
    if (!date) return t("notAvailable");
    try {
      return new Date(date).toLocaleString();
    } catch {
      return t("notAvailable");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="text-left space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl truncate">
                    {user.full_name || user.username || t("unknown")}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {user.email || t("noEmail")}
                  </SheetDescription>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {user.banned ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        {t("suspended")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20">
                        <CheckCircle className="h-3 w-3" />
                        {t("active")}
                      </Badge>
                    )}
                    <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role === "Admin" ? t("admin") : t("student")}
                    </Badge>
                    {user.is_online && (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                        {t("online")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => onPerformance(user)}>
                  <Trophy className="h-4 w-4 mr-2" />
                  {t("performance")}
                </Button>
                {user.role === "Student" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onExamLimit(user)}>
                      <Hash className="h-4 w-4 mr-2" />
                      {t("setExamLimit")}
                    </Button>
                    {user.banned ? (
                      <Button size="sm" variant="outline" onClick={() => onActivate(user)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t("activate")}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onSuspend(user)}>
                        <Ban className="h-4 w-4 mr-2" />
                        {t("suspend")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onDelete(user)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("delete")}
                    </Button>
                  </>
                )}
                {user.role === "Admin" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                    <Shield className="h-4 w-4" />
                    Admin actions restricted
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start rounded-xl h-auto flex-wrap p-1 gap-1">
                {[
                  { id: "info", label: t("personalInformation"), icon: <User className="h-4 w-4" /> },
                  { id: "progress", label: t("learningProgress"), icon: <Trophy className="h-4 w-4" /> },
                  { id: "activity", label: t("activity"), icon: <Activity className="h-4 w-4" /> },
                  { id: "security", label: t("security"), icon: <Shield className="h-4 w-4" /> },
                ].map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-1 rounded-lg">
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={<Hash className="h-4 w-4" />} label={t("userId")} value={user.id} mono />
                    <InfoItem icon={<User className="h-4 w-4" />} label={t("username")} value={user.username} />
                    <InfoItem icon={<Calendar className="h-4 w-4" />} label={t("joined")} value={formatDate(user.created_at)} />
                    <InfoItem icon={<Clock className="h-4 w-4" />} label={t("lastLogin")} value={formatDate(user.last_seen)} />
                    <InfoItem icon={<Cake className="h-4 w-4" />} label={t("dateOfBirth")} value={user.birthdate} />
                    <InfoItem icon={<MapPin className="h-4 w-4" />} label={t("nationality")} value={user.nationality} />
                    <InfoItem icon={<User className="h-4 w-4" />} label={t("gender")} value={user.gender} />
                    <InfoItem icon={<Shield className="h-4 w-4" />} label={t("role")} value={user.role} />
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4 mt-4">
                  {loading ? (
                    <LoadingState />
                  ) : progress.length === 0 ? (
                    <EmptyState message={t("noProgressYet")} />
                  ) : (
                    <div className="space-y-3">
                      {progress.map((p: UserProgressSummary) => (
                        <div key={p.id} className="p-4 border rounded-xl bg-muted/30">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{p.moduleTitle}</span>
                            <Badge variant={p.examPassed ? "default" : "secondary"}>
                              {p.examPassed ? t("passed") : t("inProgress")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>
                              {p.lessonsCompleted} / {p.totalLessons} {t("lessons")}
                            </span>
                            {p.bestScore != null && (
                              <span>• {t("bestScore")}: {p.bestScore}%</span>
                            )}
                          </div>
                          <Progress
                            value={
                              p.totalLessons > 0 ? (p.lessonsCompleted / p.totalLessons) * 100 : 0
                            }
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-4">
                  {loading ? (
                    <LoadingState />
                  ) : activity.length === 0 ? (
                    <EmptyState message={t("noActivityYet")} />
                  ) : (
                    <div className="relative pl-4 border-l space-y-4">
                      {activity.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative pl-6"
                        >
                          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(item.created_at)}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="security" className="space-y-4 mt-4">
                  <div className="grid gap-3">
                    <SecurityItem
                      icon={<Key className="h-4 w-4" />}
                      label={t("resetPassword")}
                      onClick={() => toast.info(t("resetPasswordNotImplemented"))}
                    />
                    <SecurityItem
                      icon={<Send className="h-4 w-4" />}
                      label={t("sendNotification")}
                      onClick={() => toast.info(t("sendNotificationNotImplemented"))}
                    />
                    {user.role === "Student" && (
                      <SecurityItem
                        icon={<Ban className="h-4 w-4" />}
                        label={user.banned ? t("activate") : t("suspend")}
                        onClick={() => (user.banned ? onActivate(user) : onSuspend(user))}
                      />
                    )}
                  </div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function SecurityItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" className="w-full justify-start gap-2" onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground">
      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      Loading...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
      <Activity className="h-8 w-8 mb-2 opacity-50" />
      {message}
    </div>
  );
}
