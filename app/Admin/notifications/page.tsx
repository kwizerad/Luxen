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
import { Send, Loader2, ArrowLeft, Search, Check, X, Megaphone, Flag, FileText, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAdminSpa } from "@/lib/admin-spa-router";
import {
  sendNotificationToRole,
  sendNotificationToUser,
  sendNotificationToMultipleUsers,
  getStudentsForNotification,
} from "@/app/Admin/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
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
  const { navigateAdmin } = useAdminSpa();
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
      const user = await getCurrentUser();
      const permUser = user as PermUser;
      if (!canRead(permUser, "notifications")) {
        navigateAdmin("/Admin", { replace: true });
        return;
      }
      setReadOnly(!canWrite(permUser, "notifications"));
      setPermissionChecked(true);
    };
    checkPermissions();
  }, [router, navigateAdmin]);

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
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-12">
        <div className="admin-card p-14 flex flex-col items-center justify-center gap-3 border border-[var(--admin-border)]">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          <p className="text-xs text-[var(--admin-muted)]">Verifying broadcast permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-2 sm:px-4 pb-24">
      {/* Executive Header */}
      <div className="admin-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--admin-border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                {t("sendNotifications") || "Platform Broadcast & Push Center"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                Governance SPA
              </span>
              {readOnly && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  {t("readOnly") || "Read Only"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              {t("sendNotificationsToUsers") || "Dispatch real-time announcements, reminders, and targeted notifications across roles or individual learners."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/reports")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>Incident Reports</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/audit")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("back") || "Command Center"}</span>
          </button>
        </div>
      </div>

      {/* Broadcast Composer Card */}
      <div className="admin-card p-6 sm:p-8 border border-[var(--admin-border)]">
        <div className="flex items-center gap-2.5 pb-5 mb-6 border-b border-[var(--admin-border)]">
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--admin-text)]">
              {t("sendNotification") || "Compose Notification"}
            </h2>
            <p className="text-xs text-[var(--admin-muted)]">
              {t("sendNotificationsToUsers") || "Configure priority, target audience, and optional deep-link action."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
              {t("title")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("notificationTitlePlaceholder")}
              required
              disabled={loading || readOnly}
              className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
              {t("message")}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("notificationMessagePlaceholder")}
              rows={4}
              required
              disabled={loading || readOnly}
              className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)]"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                {t("notificationType")}
              </Label>
              <Select value={type} onValueChange={setType} disabled={loading || readOnly}>
                <SelectTrigger className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-11">
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
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                {t("priority")}
              </Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as "urgent" | "normal" | "low")}
                disabled={loading || readOnly}
              >
                <SelectTrigger className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-11">
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
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
              {t("sendTo")}
            </Label>
            <Select
              value={target}
              onValueChange={(v) => setTarget(v as typeof target)}
              disabled={loading || readOnly}
            >
              <SelectTrigger className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-11">
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
              <Label htmlFor="userId" className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                {t("userId")}
              </Label>
              <Input
                id="userId"
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                placeholder={t("userIdPlaceholder")}
                required={target === "specific"}
                disabled={loading || readOnly}
                className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-11"
              />
            </div>
          )}

          {target === "selected_students" && (
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--admin-text)]">
                  {t("selectStudents") || "Select Students"}
                  {selectedStudentIds.size > 0 && (
                    <Badge variant="default" className="text-xs bg-indigo-600 text-white">
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
                <Input
                  ref={searchInputRef}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder={t("searchStudents") || "Search by name or email..."}
                  className="pl-10 rounded-xl bg-[var(--admin-card-bg)] border-[var(--admin-border)] text-[var(--admin-text)]"
                  disabled={loading || readOnly}
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--admin-border)] divide-y divide-[var(--admin-border)] bg-[var(--admin-card-bg)]">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--admin-muted)]">
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
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                          selected ? "bg-indigo-500/15" : "hover:bg-[var(--admin-hover-bg)]"
                        } ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                            selected
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "border-[var(--admin-border)]"
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--admin-text)] truncate">
                            {student.full_name || student.username || student.email}
                          </p>
                          <p className="text-xs text-[var(--admin-muted)] truncate">{student.email}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="actionUrl" className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
              {t("actionUrl")} ({t("optional")})
            </Label>
            <Input
              id="actionUrl"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="/dashboard"
              disabled={loading || readOnly}
              className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-11"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--admin-border)]">
            <Button
              type="submit"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 shadow-sm shadow-indigo-600/25"
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
      </div>
    </div>
  );
}
