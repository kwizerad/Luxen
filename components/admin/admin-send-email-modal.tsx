"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, Loader2, Shield, User, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface EmailRecipient {
  id?: string;
  email: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
}

interface AdminSendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: EmailRecipient | null;
  allowCustomRecipient?: boolean;
}

const QUICK_TEMPLATES = [
  {
    label: "Account Update",
    subject: "Important Update Regarding Your Account",
    body: "We are reaching out from the Administration Team with an important update regarding your account status and learning progress.\n\nPlease review your dashboard for the latest details.",
  },
  {
    label: "Exam Reminder",
    subject: "Upcoming Theory Exam Preparation Reminder",
    body: "We noticed you have active theory modules in progress. Remember to complete your practice tests and review the Rwanda Traffic Gazette lessons before taking your official exam.",
  },
  {
    label: "Admin Notice",
    subject: "Administrative Governance Notice",
    body: "Please review the latest administrative updates and curriculum review tasks in the Admin Portal at your earliest convenience.",
  },
];

export function AdminSendEmailModal({
  open,
  onOpenChange,
  recipient,
  allowCustomRecipient = false,
}: AdminSendEmailModalProps) {
  const [targetType, setTargetType] = useState<"single" | "all_admins" | "all_students">("single");
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRole, setCustomRole] = useState<"Student" | "Admin">("Student");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [alsoNotify, setAlsoNotify] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      if (recipient) {
        setTargetType("single");
        setCustomEmail(recipient.email || "");
        setCustomName(recipient.full_name || recipient.username || "");
        setCustomRole(recipient.role?.toLowerCase() === "admin" ? "Admin" : "Student");
      } else {
        setTargetType("single");
        setCustomEmail("");
        setCustomName("");
        setCustomRole("Student");
      }
      setSubject("");
      setMessage("");
      setAlsoNotify(true);
    }
  }, [open, recipient]);

  const handleApplyTemplate = (tpl: (typeof QUICK_TEMPLATES)[number]) => {
    setSubject(tpl.subject);
    setMessage(tpl.body);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please enter both a subject and message.");
      return;
    }

    if (targetType === "single" && !recipient?.email && !customEmail.trim()) {
      toast.error("Please provide a recipient email address.");
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, any> = {
        subject: subject.trim(),
        message: message.trim(),
        alsoSendNotification: alsoNotify,
      };

      if (targetType === "all_admins" || targetType === "all_students") {
        payload.targetGroup = targetType;
      } else if (recipient) {
        payload.recipientUserId = recipient.id;
        payload.recipientEmail = recipient.email;
        payload.recipientName = recipient.full_name || recipient.username || undefined;
        payload.recipientRole = recipient.role || "Student";
      } else {
        payload.recipientEmail = customEmail.trim();
        payload.recipientName = customName.trim() || undefined;
        payload.recipientRole = customRole;
      }

      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(data.message || "Email sent successfully");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const isAdminRecipient =
    recipient?.role?.toLowerCase() === "admin" ||
    (targetType === "single" && !recipient && customRole === "Admin") ||
    targetType === "all_admins";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <span>Send Email Message</span>
          </DialogTitle>
          <DialogDescription>
            Compose and dispatch an official email message to an administrator or student.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 pt-1">
          {/* Recipient Card or Selector */}
          {recipient ? (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">
                    {recipient.full_name || recipient.username || recipient.email}
                  </span>
                  <Badge
                    variant={isAdminRecipient ? "default" : "secondary"}
                    className="text-[10px] px-2 py-0.5"
                  >
                    {isAdminRecipient ? (
                      <Shield className="h-3 w-3 mr-1" />
                    ) : (
                      <User className="h-3 w-3 mr-1" />
                    )}
                    {isAdminRecipient ? "Admin" : "Student"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{recipient.email}</p>
              </div>
            </div>
          ) : allowCustomRecipient ? (
            <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recipient Audience</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType("single")}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      targetType === "single"
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Individual (Admin / Student)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("all_students")}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      targetType === "all_students"
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    All Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("all_admins")}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      targetType === "all_admins"
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    All Admins
                  </button>
                </div>
              </div>

              {targetType === "single" && (
                <div className="grid sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="recipient-email" className="text-xs">
                      Recipient Email
                    </Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      placeholder="student@example.com or admin@example.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      required
                      disabled={sending}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recipient-role" className="text-xs">
                      Recipient Role
                    </Label>
                    <select
                      id="recipient-role"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value as "Student" | "Admin")}
                      disabled={sending}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                    >
                      <option value="Student">Student</option>
                      <option value="Admin">Administrator</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Quick Templates */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Quick Templates:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-subject" className="text-xs sm:text-sm font-medium">
              Subject
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              required
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-body" className="text-xs sm:text-sm font-medium">
              Email Message
            </Label>
            <Textarea
              id="email-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message to the recipient..."
              rows={5}
              required
              disabled={sending}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="also-notify"
              checked={alsoNotify}
              onCheckedChange={(checked) => setAlsoNotify(Boolean(checked))}
              disabled={sending}
            />
            <Label htmlFor="also-notify" className="text-xs text-muted-foreground cursor-pointer">
              Also deliver a copy to the recipient&apos;s in-app notification inbox
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
