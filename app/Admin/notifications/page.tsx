"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { sendNotificationToRole, sendNotificationToUser } from "@/app/Admin/actions/notifications";

export default function AdminNotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("admin_message");
  const [priority, setPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [target, setTarget] = useState<"all" | "student" | "admin" | "specific">("all");
  const [specificUserId, setSpecificUserId] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setLoading(true);
    try {
      let result;
      if (target === "specific") {
        if (!specificUserId.trim()) {
          toast.error(t("specificUserRequired"));
          return;
        }
        result = await sendNotificationToUser(specificUserId.trim(), {
          title: title.trim(),
          message: message.trim(),
          type,
          priority,
          action_url: actionUrl.trim() || undefined,
        });
        toast.success(t("notificationSent"));
      } else {
        result = await sendNotificationToRole(target, {
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
    } catch (error: any) {
      console.error("Failed to send notification:", error);
      toast.error(t("failedToSendNotification") + (error.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/Admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <h1 className="text-2xl font-bold">{t("sendNotifications")}</h1>
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("notificationType")}</Label>
                  <Select value={type} onValueChange={setType} disabled={loading}>
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
                    disabled={loading}
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
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allUsers")}</SelectItem>
                    <SelectItem value="student">{t("studentsOnly")}</SelectItem>
                    <SelectItem value="admin">{t("adminsOnly")}</SelectItem>
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
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="actionUrl">{t("actionUrl")} ({t("optional")})</Label>
                <Input
                  id="actionUrl"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/dashboard"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !title.trim() ||
                    !message.trim() ||
                    (target === "specific" && !specificUserId.trim())
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
