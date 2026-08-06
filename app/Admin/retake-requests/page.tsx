"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, ShieldCheck, Mail, User } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import {
  getAllRetakeRequests,
  approveRetakeRequest,
  denyRetakeRequest,
} from "@/lib/supabase/queries";
import type { ExamRetakeRequest, ExamRetakeStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { canRead, canWrite, type User as PermUser } from "@/lib/permissions";
import { useRouter } from "next/navigation";

type RetakeRequestWithUser = ExamRetakeRequest & {
  user_email?: string;
  user_name?: string;
};

export default function RetakeRequestsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [requests, setRequests] = useState<RetakeRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ExamRetakeStatus | "all">("pending");
  const [selectedRequest, setSelectedRequest] = useState<RetakeRequestWithUser | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [canWriteAccess, setCanWriteAccess] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkPermissions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const permUser = user as PermUser;
      if (!canRead(permUser, "retake")) {
        router.replace("/Admin");
        return;
      }
      setCanWriteAccess(canWrite(permUser, "retake"));
    };
    checkPermissions();
  }, [router]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllRetakeRequests(filter === "all" ? undefined : filter);
      setRequests(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load retake requests");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await approveRetakeRequest(selectedRequest.id, adminNote || undefined);
      toast.success(t("retakeApproved") || "Retake request approved");
      setShowDialog(false);
      setAdminNote("");
      setSelectedRequest(null);
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await denyRetakeRequest(selectedRequest.id, adminNote || undefined);
      toast.success(t("retakeDenied") || "Retake request denied");
      setShowDialog(false);
      setAdminNote("");
      setSelectedRequest(null);
      await loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to deny request");
    } finally {
      setActionLoading(false);
    }
  };

  const openDialog = (request: RetakeRequestWithUser) => {
    setSelectedRequest(request);
    setAdminNote("");
    setShowDialog(true);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  return (
    <div className="admin-page max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          {t("retakeRequests") || "Retake Requests"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("retakeRequestsDesc") || "Review and approve student exam retake requests"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">{t("pending") || "Pending"}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-xs text-muted-foreground">{t("approved") || "Approved"}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{deniedCount}</div>
            <div className="text-xs text-muted-foreground">{t("denied") || "Denied"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        {(["pending", "approved", "denied", "all"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === "all" ? (t("all") || "All") : t(status) || status}
          </Button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("noRetakeRequests") || "No retake requests found"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge
                        variant={
                          request.status === "approved" ? "default" :
                          request.status === "denied" ? "destructive" :
                          "secondary"
                        }
                      >
                        {request.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {request.status === "denied" && <XCircle className="h-3 w-3 mr-1" />}
                        {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {t(request.status) || request.status}
                      </Badge>
                      <Badge variant="outline">
                        {request.exam_type === "module" ? (t("moduleExam") || "Module Exam") :
                         request.exam_type === "midterm" ? (t("midtermTest") || "Midterm") :
                         (t("finalExam") || "Final Exam")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      {request.user_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {request.user_email}
                        </span>
                      )}
                      {request.user_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {request.user_name}
                        </span>
                      )}
                    </div>
                    {request.reason && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">{t("reason") || "Reason"}: </span>
                        {request.reason}
                      </p>
                    )}
                    {request.admin_note && (
                      <p className="text-sm mt-1 text-muted-foreground">
                        <span className="font-medium">{t("adminNote") || "Admin note"}: </span>
                        {request.admin_note}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  {request.status === "pending" && canWriteAccess && (
                    <Button size="sm" onClick={() => openDialog(request)}>
                      {t("review") || "Review"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {t("reviewRetakeRequest") || "Review Retake Request"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.user_email} — {selectedRequest?.exam_type}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest?.reason && (
            <div className="p-3 bg-secondary rounded-lg text-sm">
              <span className="font-medium">{t("reason") || "Reason"}: </span>
              {selectedRequest.reason}
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("adminNote") || "Admin Note"} (optional)
            </label>
            <textarea
              className="w-full min-h-[80px] p-3 border rounded-lg resize-y bg-background"
              placeholder={t("adminNotePlaceholder") || "Add a note for the student..."}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={actionLoading}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("deny") || "Deny"}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t("approve") || "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
