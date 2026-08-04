"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Monitor,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { UserWithStatus, UserProgressSummary } from "./types";
import { getUserActivity, getStudentProgressSummary, getUserNationalIdRecords, type NationalIdRecord } from "../../actions/users";
import { DeviceInfoTab } from "./device-info-tab";
import { sendPasswordReset } from "@/app/Admin/actions/devices";

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
  const [nationalIdRecords, setNationalIdRecords] = useState<NationalIdRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [resetLoading, setResetLoading] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getUserActivity(user.id),
      getStudentProgressSummary(user.id),
      getUserNationalIdRecords(user.id),
    ])
      .then(([a, p, records]) => {
        setActivity(a);
        setProgress(p);
        setNationalIdRecords(records);
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

  const handleResetPassword = async () => {
    if (!user) return;
    setResetLoading(true);
    try {
      await sendPasswordReset(user.id);
      toast.success(t("passwordResetEmailSent"));
    } catch (error) {
      toast.error(t("failedToSendPasswordReset") + (error instanceof Error ? error.message : ""));
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !notifyTitle.trim() || !notifyMessage.trim()) return;
    setNotifyLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admin_message",
          title: notifyTitle.trim(),
          message: notifyMessage.trim(),
          target_user_id: user.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send notification");
      }
      toast.success(t("notificationSent"));
      setNotifyTitle("");
      setNotifyMessage("");
      setNotifyOpen(false);
    } catch (error) {
      toast.error(t("failedToSendNotification") + (error instanceof Error ? error.message : ""));
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <ScrollArea className="h-full">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Header */}
            <SheetHeader className="text-left space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                  <AvatarFallback className="text-xl sm:text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl sm:text-2xl truncate">
                    {user.full_name || user.username || t("unknown")}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-1.5 sm:gap-2 mt-1 text-sm">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{user.email || t("noEmail")}</span>
                  </SheetDescription>
                  <div className="flex gap-1.5 sm:gap-2 mt-2 flex-wrap">
                    {user.banned ? (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Ban className="h-3 w-3" />
                        {t("suspended")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        {t("active")}
                      </Badge>
                    )}
                    <Badge variant={user.role === "Admin" ? "default" : "secondary"} className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role === "Admin" ? t("admin") : t("student")}
                    </Badge>
                    {user.is_online && (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                        {t("online")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => onPerformance(user)} className="h-8 text-xs sm:text-sm">
                  <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t("performance")}
                </Button>
                {user.role === "Student" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onExamLimit(user)} className="h-8 text-xs sm:text-sm">
                      <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      {t("setExamLimit")}
                    </Button>
                    {user.banned ? (
                      <Button size="sm" variant="outline" onClick={() => onActivate(user)} className="h-8 text-xs sm:text-sm">
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        {t("activate")}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onSuspend(user)} className="h-8 text-xs sm:text-sm">
                        <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        {t("suspend")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onDelete(user)} className="h-8 text-xs sm:text-sm text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      {t("delete")}
                    </Button>
                  </>
                )}
                {user.role === "Admin" && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-2 py-1 rounded-lg bg-muted/40">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Admin actions restricted
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start rounded-xl h-auto flex-wrap p-1 gap-1">
                {[
                  { id: "info", label: t("personalInformation"), icon: <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                  { id: "progress", label: t("learningProgress"), icon: <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                  { id: "activity", label: t("activity"), icon: <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                  { id: "security", label: t("security"), icon: <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                  { id: "device", label: t("deviceInfo"), icon: <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                  { id: "nationalIds", label: t("nationalIds"), icon: <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
                ].map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-1 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="info" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                <TabsContent value="progress" className="space-y-3 sm:space-y-4 mt-4">
                  {loading ? (
                    <LoadingState />
                  ) : progress.length === 0 ? (
                    <EmptyState message={t("noProgressYet")} />
                  ) : (
                    <div className="space-y-3">
                      {progress.map((p: UserProgressSummary) => (
                        <div key={p.id} className="p-3 sm:p-4 border rounded-xl bg-muted/30">
                          <div className="flex justify-between items-center mb-2 gap-2">
                            <span className="font-medium text-sm truncate">{p.moduleTitle}</span>
                            <Badge variant={p.examPassed ? "default" : "secondary"} className="text-xs flex-shrink-0">
                              {p.examPassed ? t("passed") : t("inProgress")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2 flex-wrap">
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

                <TabsContent value="activity" className="space-y-3 sm:space-y-4 mt-4">
                  {loading ? (
                    <LoadingState />
                  ) : activity.length === 0 ? (
                    <EmptyState message={t("noActivityYet")} />
                  ) : (
                    <div className="relative pl-3 sm:pl-4 border-l space-y-3 sm:space-y-4">
                      {activity.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative pl-4 sm:pl-6"
                        >
                          <span className="absolute -left-[17px] sm:-left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(item.created_at)}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="security" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="grid gap-2.5 sm:gap-3">
                    <SecurityItem
                      icon={<Key className="h-4 w-4" />}
                      label={resetLoading ? t("sending") : t("resetPassword")}
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                    />
                    <SecurityItem
                      icon={<Send className="h-4 w-4" />}
                      label={t("sendNotification")}
                      onClick={() => setNotifyOpen(true)}
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

                <TabsContent value="device" className="space-y-4 mt-4">
                  <DeviceInfoTab user={user} />
                </TabsContent>

                <TabsContent value="nationalIds" className="space-y-3 sm:space-y-4 mt-4">
                  <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      {t("nationalIds")}
                    </h3>
                    {nationalIdRecords.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-6">
                        {t("noNationalIdRecords")}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {nationalIdRecords.map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-background gap-2"
                          >
                            <span className="font-mono text-xs sm:text-sm truncate">{record.national_id}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDate(record.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Send Notification Dialog */}
        <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
          <DialogContent className="sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{t("sendNotification")}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {t("sendNotificationDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendNotification} className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="notify-title" className="text-xs sm:text-sm">{t("title")}</Label>
                <Input
                  id="notify-title"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder={t("notificationTitlePlaceholder")}
                  required
                  disabled={notifyLoading}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="notify-message" className="text-xs sm:text-sm">{t("message")}</Label>
                <Textarea
                  id="notify-message"
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder={t("notificationMessagePlaceholder")}
                  rows={4}
                  required
                  disabled={notifyLoading}
                  className="text-sm"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNotifyOpen(false)} disabled={notifyLoading} className="h-9 text-sm">
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={notifyLoading || !notifyTitle.trim() || !notifyMessage.trim()} className="h-9 text-sm">
                  {notifyLoading ? t("sending") : t("send")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
    <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-muted/30">
      <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-xs sm:text-sm font-medium break-words mt-0.5 ${mono ? "font-mono" : ""}`}>
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
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" className="w-full justify-start gap-2 h-9 sm:h-10 text-xs sm:text-sm" onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </Button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      Loading...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
      <Activity className="h-7 w-7 sm:h-8 sm:w-8 mb-2 opacity-40" />
      {message}
    </div>
  );
}
