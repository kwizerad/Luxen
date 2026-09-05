"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, ArrowLeft, Search, Check, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  sendNotificationToRole,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  getStudentsForNotification,
} from "@/app/Admin/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import { canRead, canWrite, type User as PermUser } from "@/lib/permissions";

interface StudentItem {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
}

export default function AdminNotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("admin_message");
  const [priority, setPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [target, setTarget] = useState<"all" | "student" | "admin" | "specific" | "selected_students">("all");
  const [specificUserId, setSpecificUserId] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // Multi-student select state
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentsLoading, setStudentsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkPermissions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const permUser = user as PermUser;
      if (!canRead(permUser, "notifications")) {
        router.replace("/Admin");
        return;
      }
      setReadOnly(!canWrite(permUser, "notifications"));
      setPermissionChecked(true);
    };
    checkPermissions();
  }, [router]);

  // Load students when "selected_students" target is chosen
  useEffect(() => {
    if (target === "selected_students" && students.length === 0 && !studentsLoading) {
      setStudentsLoading(true);
      getStudentsForNotification()
        .then((data) => {
          setStudents(data as StudentItem[]);
        })
        .catch((err) => {
          toast.error(t("failedToLoadStudents") + (err.message || ""));
        })
        .finally(() => setStudentsLoading(false));
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.email?.toLowerCase().includes(q) ||
      s.full_name?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q)
    );
  });

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearAll = () => setSelectedStudentIds(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (readOnly) return;

    setLoading(true);
    try {
      if (target === "specific") {
        if (!specificUserId.trim()) {
          toast.error(t("specificUserRequired"));
          return;
        }
        await sendNotificationToUser(specificUserId.trim(), {
          title: title.trim(),
          message: message.trim(),
          type,
          priority,
          action_url: actionUrl.trim() || undefined,
        });
        toast.success(t("notificationSent"));
      } else if (target === "selected_students") {
        if (selectedStudentIds.size === 0) {
          toast.error(t("selectAtLeastOneStudent") || "Select at least one student");
          return;
        }
        const result = await sendNotificationToMultipleUsers(
          Array.from(selectedStudentIds),
          {
            title: title.trim(),
            message: message.trim(),
            type,
            priority,
            action_url: actionUrl.trim() || undefined,
          }
        );
        toast.success(
          result.count > 0
            ? `${t("notifications.sentSuccess") || "Sent to"} ${result.count} ${t("students") || "students"}`
            : t("notificationSent")
        );
      } else {
        const result = await sendNotificationToRole(target, {
          title: title.trim(),
          message: message.trim(),
          type,
          priority,
          action_url: actionUrl.trim() || undefined,
        });
        toast.success(
          result.count > 0
            ? `${t("notifications.sentSuccess")} ${result.count} ${t("users")}`
            : t("notificationSent")
        );
      }

      setTitle("");
      setMessage("");
      setActionUrl("");
      setSpecificUserId("");
      setTarget("all");
      setSelectedStudentIds(new Set());
      setStudentSearch("");
    } catch (error: any) {
      console.error("Failed to send notification:", error);
      toast.error(t("failedToSendNotification") + (error.message || ""));
    } finally {
      setLoading(false);
    }
  };

  if (!permissionChecked) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/Admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <h1 className="text-2xl font-bold">{t("sendNotifications")}</h1>
          {readOnly && (
            <Badge variant="secondary" className="ml-auto">
              {t("readOnly") || "Read Only"}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t("sendNotification")}
            </CardTitle>
            <CardDescription>{t("sendNotificationsToUsers")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">{t("title")}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("notificationTitlePlaceholder")}
                  required
                  disabled={loading || readOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t("message")}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("notificationMessagePlaceholder")}
                  rows={4}
                  required
                  disabled={loading || readOnly}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("notificationType")}</Label>
                  <Select value={type} onValueChange={setType} disabled={loading || readOnly}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_message">{t("adminMessage")}</SelectItem>
                      <SelectItem value="announcement">{t("announcement")}</SelectItem>
                      <SelectItem value="system">{t("systemUpdate")}</SelectItem>
                      <SelectItem value="exam_result">{t("examResult")}</SelectItem>
                      <SelectItem value="exam_available">{t("examAvailable")}</SelectItem>
                      <SelectItem value="reminder">{t("reminder")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("priority")}</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as "urgent" | "normal" | "low")}
                    disabled={loading || readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">{t("urgent")}</SelectItem>
                      <SelectItem value="normal">{t("normal")}</SelectItem>
                      <SelectItem value="low">{t("low")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("sendTo")}</Label>
                <Select
                  value={target}
                  onValueChange={(v) => setTarget(v as typeof target)}
                  disabled={loading || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allUsers")}</SelectItem>
                    <SelectItem value="student">{t("studentsOnly")}</SelectItem>
                    <SelectItem value="admin">{t("adminsOnly")}</SelectItem>
                    <SelectItem value="selected_students">{t("selectedStudents") || "Selected Students"}</SelectItem>
                    <SelectItem value="specific">{t("specificUser")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {target === "specific" && (
                <div className="space-y-2">
                  <Label htmlFor="userId">{t("userId")}</Label>
                  <Input
                    id="userId"
                    value={specificUserId}
                    onChange={(e) => setSpecificUserId(e.target.value)}
                    placeholder={t("userIdPlaceholder")}
                    required={target === "specific"}
                    disabled={loading || readOnly}
                  />
                </div>
              )}

              {target === "selected_students" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-2">
                      {t("selectStudents") || "Select Students"}
                      {selectedStudentIds.size > 0 && (
                        <Badge variant="default" className="text-xs">
                          {selectedStudentIds.size} {t("selected") || "selected"}
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllFiltered} disabled={loading || readOnly}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {t("selectAll") || "Select All"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={loading || readOnly || selectedStudentIds.size === 0}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        {t("clear") || "Clear"}
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder={t("searchStudents") || "Search by name or email..."}
                      className="pl-9"
                      disabled={loading || readOnly}
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {t("noStudentsFound") || "No students found"}
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const selected = selectedStudentIds.has(student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => !readOnly && toggleStudent(student.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              selected ? "bg-primary/10" : "hover:bg-secondary"
                            } ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                              selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                            }`}>
                              {selected && <Check className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {student.full_name || student.username || student.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="actionUrl">{t("actionUrl")} ({t("optional")})</Label>
                <Input
                  id="actionUrl"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/dashboard"
                  disabled={loading || readOnly}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    readOnly ||
                    !title.trim() ||
                    !message.trim() ||
                    (target === "specific" && !specificUserId.trim()) ||
                    (target === "selected_students" && selectedStudentIds.size === 0)
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("send")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
