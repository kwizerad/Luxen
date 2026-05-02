"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap, Loader2, Eye, Trash2, Ban, CheckCircle, AlertTriangle, Lock as LockIcon, User, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UserExamLimitDialog } from "@/components/user-exam-limit-dialog";
import { useRouter } from "next/navigation";
import { isAdmin, canViewStudents, hasReadWriteStudentAccess } from "@/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  email: string;
  created_at: string;
  banned?: boolean;
  user_metadata: {
    gender?: string;
    nationality?: string;
    birthdate?: string;
    date_of_birth?: string;
    birthday?: string;
    dob?: string;
    role?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [confirmUserAction, setConfirmUserAction] = useState<{
    action: "banUnban" | "delete";
    userId: string;
    email: string;
    currentBanned: boolean;
  } | null>(null);
  const [examLimitDialog, setExamLimitDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
    currentLimit?: number;
    currentIsLimited?: boolean;
  } | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Check if user is authenticated first
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/");
          return;
        }

        // Check if user is admin
        if (!isAdmin(user)) {
          router.push("/");
          return;
        }

        // Check if user has permission to view students
        if (!canViewStudents(user)) {
          setHasPermission(false);
          setLoading(false);
          return;
        }

        setHasPermission(true);
        setIsReadOnly(!hasReadWriteStudentAccess(user));

        const response = await fetch("/api/users", {
          credentials: "include",
        });
        const data = await response.json();
        
        if (!data.success) {
          if (data.error?.includes("Unauthorized")) {
            router.push("/");
            return;
          }
          setError(data.error || "Failed to load users");
          return;
        }

        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [router]);

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_metadata?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_metadata?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_metadata?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_metadata?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayName = (user: User) => {
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user.user_metadata?.full_name || user.user_metadata?.username || user.email;
  };

  const getInitials = (user: User) => {
    const name = getDisplayName(user);
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleBanUnban = (userId: string, currentBanned: boolean, email: string) => {
    setConfirmUserAction({
      action: "banUnban",
      userId,
      email,
      currentBanned,
    });
  };

  const handleDelete = (userId: string, email: string) => {
    setConfirmUserAction({
      action: "delete",
      userId,
      email,
      currentBanned: false,
    });
  };

  const handleConfirmUserAction = async () => {
    if (!confirmUserAction) return;

    const { action, userId, currentBanned } = confirmUserAction;
    setConfirmUserAction(null);
    setProcessingUser(userId);

    try {
      if (action === "banUnban") {
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, banned: !currentBanned }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(data.message);
          setUsers(users.map((u) => (u.id === userId ? { ...u, banned: !currentBanned } : u)));
        } else {
          toast.error(data.error || "Failed to update user");
        }
      } else {
        const res = await fetch(`/api/users?id=${userId}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (data.success) {
          toast.success("User deleted successfully");
          setUsers(users.filter((u) => u.id !== userId));
        } else {
          toast.error(data.error || "Failed to delete user");
        }
      }
    } catch (error) {
      toast.error(action === "banUnban" ? "Failed to update user" : "Failed to delete user");
    } finally {
      setProcessingUser(null);
    }
  };

  const handleSetExamLimit = (user: User) => {
    // Fetch current limit
    fetch(`/api/exam/limits?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setExamLimitDialog({
          open: true,
          userId: user.id,
          email: user.email,
          currentLimit: data.daily_limit,
          currentIsLimited: data.is_limited,
        });
      })
      .catch(() => {
        // If error, assume default limit
        setExamLimitDialog({
          open: true,
          userId: user.id,
          email: user.email,
          currentLimit: 5,
          currentIsLimited: true,
        });
      });
  };

  const handleView = (user: User) => {
    const displayName = getDisplayName(user);
    toast.info(`User: ${user.email}`, {
      description: `Name: ${displayName}
First Name: ${user.user_metadata?.first_name || '-'}
Last Name: ${user.user_metadata?.last_name || '-'}
Username: ${user.user_metadata?.username || '-'}
Gender: ${user.user_metadata?.gender || '-'}
Nationality: ${user.user_metadata?.nationality || '-'}
Date of Birth: ${user.user_metadata?.birthdate || user.user_metadata?.date_of_birth || user.user_metadata?.birthday || user.user_metadata?.dob || '-'}`,
    });

    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Users</h1>
        <Card className="border-destructive/20 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--destructive)/0.3)] hover:-translate-y-1 hover:border-destructive transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">Access Denied</h3>
                <p className="text-destructive/80 mt-1">
                  You don't have permission to view student accounts. Please contact the primary administrator for access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Users</h1>
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">
            {isReadOnly ? "View all user accounts (Read Only)" : "View and manage all user accounts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isReadOnly && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full text-sm">
              <Eye className="h-4 w-4" />
              <span>Read Only Mode</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg w-fit">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-medium">{users.length} Users</span>
          </div>
        </div>
      </div>

      <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            List of all registered users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No users found matching your search" : "No users registered yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Birthdate</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className={"hover:bg-secondary/50 transition-colors " + (user.banned ? "bg-red-50/50 dark:bg-red-950/20" : "")}
                    >
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={getDisplayName(user)} />
                          <AvatarFallback className={user.banned ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300" : ""}>
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className={"font-medium " + (user.banned ? "text-red-600 dark:text-red-400" : "") }>
                        {user.email}
                        {user.banned && (
                          <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 px-2 py-0.5 rounded font-medium border border-red-200 dark:border-red-800">
                            BANNED
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={user.banned ? "text-red-600 dark:text-red-400" : ""}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{getDisplayName(user)}</span>
                        </div>
                      </TableCell>
                      <TableCell className={"capitalize " + (user.banned ? "text-red-600 dark:text-red-400" : "") }>
                        {user.user_metadata?.gender || "-"}
                      </TableCell>
                      <TableCell className={"" + (user.banned ? "text-red-600 dark:text-red-400" : "") }>
                        {user.user_metadata?.nationality || "-"}
                      </TableCell>
                      <TableCell className={"" + (user.banned ? "text-red-600 dark:text-red-400" : "") }>
                        {user.user_metadata?.birthdate || user.user_metadata?.date_of_birth || user.user_metadata?.birthday || user.user_metadata?.dob || "-"}
                      </TableCell>
                      <TableCell>
                        <span className={"inline-flex items-center px-2 py-1 rounded-full text-xs font-medium " + (user.banned ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-primary/10 text-primary") }>
                          {user.banned ? "Banned" : (user.user_metadata?.role || "User")}
                        </span>
                      </TableCell>
                      <TableCell className={"" + (user.banned ? "text-red-500 dark:text-red-400" : "text-muted-foreground") }>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(user)}
                            disabled={processingUser === user.id}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {!isReadOnly && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetExamLimit(user)}
                                disabled={processingUser === user.id}
                                className="text-blue-500 hover:text-blue-600"
                              >
                                {processingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <>
                                    <Hash className="h-4 w-4 mr-2" />
                                    Set Limit
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={
                                  user.banned
                                    ? "text-green-500 hover:text-green-600"
                                    : "text-orange-500 hover:text-orange-600"
                                }
                                onClick={() => handleBanUnban(user.id, user.banned || false, user.email)}
                                disabled={processingUser === user.id}
                              >
                                {processingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : user.banned ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Unban
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Ban
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(user.id, user.email)}
                                disabled={processingUser === user.id}
                              >
                                {processingUser === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete
                              </Button>
                            </>
                          )}
                          {isReadOnly && (
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <LockIcon className="h-3 w-3" />
                              <span>Read Only</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!confirmUserAction}
        onOpenChange={(open) => {
          if (!open) setConfirmUserAction(null);
        }}
        title={
          confirmUserAction?.action === "banUnban"
            ? `${confirmUserAction.currentBanned ? "Unban" : "Ban"} User?`
            : "Delete User?"
        }
        description={
          confirmUserAction?.action === "banUnban"
            ? `This will ${confirmUserAction.currentBanned ? "unban" : "ban"} ${confirmUserAction.email}.`
            : `This will delete ${confirmUserAction?.email}. This action cannot be undone.`
        }
        confirmLabel={confirmUserAction?.action === "banUnban" ? (confirmUserAction.currentBanned ? "Unban" : "Ban") : "Delete"}
        onConfirm={handleConfirmUserAction}
        confirmVariant={confirmUserAction?.action === "delete" ? "destructive" : "default"}
      />
      {examLimitDialog && (
        <UserExamLimitDialog
          open={examLimitDialog.open}
          onOpenChange={(open) => {
            if (!open) setExamLimitDialog(null);
            else setExamLimitDialog({ ...examLimitDialog, open });
          }}
          userId={examLimitDialog.userId}
          userEmail={examLimitDialog.email}
          currentLimit={examLimitDialog.currentLimit}
          currentIsLimited={examLimitDialog.currentIsLimited}
        />
      )}
    </div>
  );
}
