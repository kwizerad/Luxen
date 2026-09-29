"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Mail, Trash2, Edit, Loader2, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { PermissionsMatrix } from "./permissions-matrix";
import {
  NO_PERMISSIONS,
  type AdminPermissions,
} from "@/lib/permissions";
import {
  getAdmins,
  inviteAdmin,
  updateAdminPermissions,
  removeAdmin,
  getAdminPermissions,
  type AdminListItem,
} from "../../actions/admin-management";

export function AdminRegistrationPanel() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [permissions, setPermissions] = useState<AdminPermissions>({ ...NO_PERMISSIONS });

  // Edit state
  const [editingAdmin, setEditingAdmin] = useState<AdminListItem | null>(null);
  const [editPermissions, setEditPermissions] = useState<AdminPermissions>({ ...NO_PERMISSIONS });
  const [editLoading, setEditLoading] = useState(false);

  // Remove state
  const [removingAdmin, setRemovingAdmin] = useState<AdminListItem | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err: any) {
      toast.error(err.message || t("failedToLoadAdmins"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    setSubmitting(true);
    try {
      const result = await inviteAdmin(email.trim(), fullName.trim(), permissions);
      if (result.success) {
        toast.success(t("adminInvitedSuccess") || "Admin invited successfully");
        setShowForm(false);
        setEmail("");
        setFullName("");
        setPermissions({ ...NO_PERMISSIONS });
        await loadAdmins();
      } else {
        toast.error(result.error || t("failedToInviteAdmin"));
      }
    } catch (err: any) {
      toast.error(err.message || t("failedToInviteAdmin"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = async (admin: AdminListItem) => {
    setEditingAdmin(admin);
    setEditLoading(true);
    try {
      const perms = await getAdminPermissions(admin.id);
      setEditPermissions(perms || { ...NO_PERMISSIONS });
    } catch (err: any) {
      toast.error(err.message || t("failedToLoadPermissions"));
      setEditPermissions({ ...NO_PERMISSIONS });
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingAdmin) return;
    setEditLoading(true);
    try {
      const result = await updateAdminPermissions(editingAdmin.id, editPermissions);
      if (result.success) {
        toast.success(t("adminPermissionsUpdated") || "Admin permissions updated");
        setEditingAdmin(null);
        await loadAdmins();
      } else {
        toast.error(result.error || t("failedToUpdatePermissions"));
      }
    } catch (err: any) {
      toast.error(err.message || t("failedToUpdatePermissions"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removingAdmin) return;
    setRemoveLoading(true);
    try {
      const result = await removeAdmin(removingAdmin.id);
      if (result.success) {
        toast.success(t("adminRemoved") || "Admin removed");
        setRemovingAdmin(null);
        await loadAdmins();
      } else {
        toast.error(result.error || t("failedToRemoveAdmin"));
      }
    } catch (err: any) {
      toast.error(err.message || t("failedToRemoveAdmin"));
    } finally {
      setRemoveLoading(false);
    }
  };

  const getPermissionSummary = (perms: AdminPermissions | null): string => {
    if (!perms) return t("noPermissionsSet") || "No permissions set";
    const active = Object.entries(perms).filter(([, v]) => v !== "none");
    if (active.length === 0) return t("noAccess") || "No access";
    if (active.length === 7) return t("fullAccess") || "Full access";
    return `${active.length}/7 ${t("sections")}`;
  };

  return (
    <div className="space-y-4">
      {/* Header + Register button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--admin-text)]">
            <Shield className="h-5 w-5" />
            {t("adminManagement") || "Admin Management"}
          </h2>
          <p className="text-sm text-[var(--admin-muted)] mt-0.5">
            {t("adminManagementDesc") || "Register and manage admins with granular permissions"}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          {t("registerNewAdmin") || "Register New Admin"}
        </Button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <Card className="rounded-2xl border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
          <CardHeader>
            <CardTitle className="text-base">{t("registerNewAdmin") || "Register New Admin"}</CardTitle>
            <CardDescription>
              {t("registerAdminDesc") || "The new admin will receive an email invite to set their password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t("email")}</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-name">{t("fullName") || "Full Name"}</Label>
                  <Input
                    id="admin-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("permissions") || "Permissions"}</Label>
                <div className="rounded-xl border border-[var(--admin-border)] p-3 bg-[var(--admin-card-bg,transparent)]">
                  <PermissionsMatrix
                    permissions={permissions}
                    onChange={setPermissions}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting || !email.trim() || !fullName.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("sending") || "Sending..."}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {t("sendInvite") || "Send Invite"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admins List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--admin-muted)]" />
        </div>
      ) : admins.length === 0 ? (
        <Card className="rounded-2xl border-[var(--admin-border)]">
          <CardContent className="py-8 text-center text-[var(--admin-muted)]">
            {t("noAdminsRegistered") || "No admins registered yet"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <Card key={admin.id} className="rounded-xl border-[var(--admin-border)] hover:border-[var(--admin-border-hover)] transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--admin-text)] truncate">
                      {admin.full_name || admin.username || admin.email}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)] truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {admin.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {getPermissionSummary(admin.permissions)}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleEditOpen(admin)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemovingAdmin(admin)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingAdmin} onOpenChange={(open) => !open && setEditingAdmin(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t("editPermissions") || "Edit Permissions"}
            </DialogTitle>
            <DialogDescription>
              {editingAdmin?.full_name || editingAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          {editLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--admin-muted)]" />
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--admin-border)] p-3">
              <PermissionsMatrix
                permissions={editPermissions}
                onChange={setEditPermissions}
              />
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingAdmin(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t("save") || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirmation */}
      <Dialog open={!!removingAdmin} onOpenChange={(open) => !open && setRemovingAdmin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              {t("removeAdmin") || "Remove Admin"}
            </DialogTitle>
            <DialogDescription>
              {t("removeAdminConfirm") || "Are you sure you want to remove this admin? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-secondary text-sm">
            <p className="font-medium">{removingAdmin?.full_name || removingAdmin?.email}</p>
            <p className="text-muted-foreground">{removingAdmin?.email}</p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRemovingAdmin(null)} disabled={removeLoading}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeLoading}>
              {removeLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("remove") || "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
