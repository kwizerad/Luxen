"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap, Loader2, Eye, Trash2, Ban, CheckCircle, AlertTriangle, Lock as LockIcon, User, Hash, Shield, Filter, Download, SortAsc, SortDesc, RefreshCw, ChevronDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UserExamLimitDialog } from "@/components/user-exam-limit-dialog";
import { UserPerformanceModal } from "@/components/user-performance-modal";
import { UserDetailsModal } from "@/components/user-details-modal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin, canViewStudents, hasReadWriteStudentAccess } from "@/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";
import { getUsers, getExamLimits } from "@/lib/supabase/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface User {
  id: string;
  email: string;
  created_at: string;
  banned?: boolean;
  last_seen?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
  user_metadata?: {
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
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
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
  const [performanceModal, setPerformanceModal] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [userDetailsModal, setUserDetailsModal] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [hasPermission, setHasPermission] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const router = useRouter();

  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user.full_name || user.user_metadata?.full_name || user.username || user.user_metadata?.username || user.email;
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    
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

        const data = await getUsers("students");
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time subscription for user changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        const supabase = createClient();

        // Subscribe to user changes
        subscription = supabase
          .channel('users-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_profiles'
            },
            async (payload: any) => {
              console.log('User change detected:', payload);
              // Reload users when changes occur
              const usersData = await getUsers("students");
              setUsers(usersData.users || []);
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_metadata?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_metadata?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_metadata?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_metadata?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter || user.user_metadata?.role === roleFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && !user.banned) ||
        (statusFilter === "banned" && user.banned);

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "email") {
        comparison = a.email.localeCompare(b.email);
      } else if (sortBy === "name") {
        comparison = getDisplayName(a).localeCompare(getDisplayName(b));
      } else if (sortBy === "role") {
        comparison = (a.user_metadata?.role || "").localeCompare(b.user_metadata?.role || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

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
        const response = await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banned: !currentBanned }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update user");
        }

        toast.success(`User ${!currentBanned ? "banned" : "unbanned"} successfully`);
        setUsers(users.map((u) => (u.id === userId ? { ...u, banned: !currentBanned } : u)));
      } else {
        const response = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete user");
        }

        toast.success("User deleted successfully");
        setUsers(users.filter((u) => u.id !== userId));
      }
    } catch (error: any) {
      toast.error(error.message || action === "banUnban" ? "Failed to update user" : "Failed to delete user");
    } finally {
      setProcessingUser(null);
    }
  };

  const handleSetExamLimit = async (user: User) => {
    // Fetch current limit
    try {
      const data = await getExamLimits(user.id);
      setExamLimitDialog({
        open: true,
        userId: user.id,
        email: user.email,
        currentLimit: data.daily_limit,
        currentIsLimited: data.is_limited,
      });
    } catch {
      // If error, assume default limit
      setExamLimitDialog({
        open: true,
        userId: user.id,
        email: user.email,
        currentLimit: 5,
        currentIsLimited: true,
      });
    }
  };

  const handleView = (user: User) => {
    setUserDetailsModal({ open: true, user });
  };

  const handleViewPerformance = (user: User) => {
    setPerformanceModal({ open: true, user });
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedUsers) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete users");
      }

      toast.success(`Successfully deleted ${data.deleted} user(s)`);
      setSelectedUsers(new Set());

      // Reload users
      const usersData = await getUsers("students");
      setUsers(usersData.users || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete users");
    }
  };

  const handleBulkBan = async (ban: boolean) => {
    if (selectedUsers.size === 0) return;

    const action = ban ? "ban" : "unban";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedUsers.size} user(s)?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/users/bulk-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedUsers), ban }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update users");
      }

      toast.success(`Successfully ${action}ned ${data.updated} user(s)`);
      setSelectedUsers(new Set());

      // Reload users
      const usersData = await getUsers("students");
      setUsers(usersData.users || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to update users");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/users/export");
      const data = await response.text();

      if (!response.ok) {
        throw new Error("Failed to export users");
      }

      // Create download link
      const blob = new Blob([data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Users exported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to export users");
    }
  };

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
    <>
      {/* Floating Header */}
      {showFloatingHeader && (
        <div className="fixed top-4 left-4 z-50 bg-background/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <Link href="/Admin/users" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md relative">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-sm">{config.logoText}</span>
              )}
            </div>
            <span className="font-bold text-lg tracking-tight">{config.systemName}</span>
          </Link>
        </div>
      )}

      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-background/95 backdrop-blur-sm shadow-lg p-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("users")}</h1>
            <p className="text-muted-foreground mt-1">
              {isReadOnly ? t("viewAllUserAccountsReadOnly") : t("viewAndManageAllUserAccounts")}
            </p>
          </div>
          <div className="flex items-center gap-2">
          {isReadOnly && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full text-sm">
              <Eye className="h-4 w-4" />
              <span>{t("readOnlyMode")}</span>
            </div>
          )}
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">{selectedUsers.size} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Bulk Actions <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkBan(true)}>
                    <Ban className="h-4 w-4 mr-2" />
                    Ban Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkBan(false)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Unban Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={() => setSelectedUsers(new Set())}>
                Clear
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg w-fit">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-medium">{users.length} {t("users")}</span>
          </div>
        </div>
      </div>

      <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
        <CardHeader>
          <CardTitle>{t("allUsers")}</CardTitle>
          <CardDescription>
            {t("listOfAllRegisteredUsers")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchByEmailOrUsername")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Shield className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <SortAsc className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy("created_at")}>
                      Sort by Date
                      {sortBy === "created_at" && <CheckCircle className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("email")}>
                      Sort by Email
                      {sortBy === "email" && <CheckCircle className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("name")}>
                      Sort by Name
                      {sortBy === "name" && <CheckCircle className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("role")}>
                      Sort by Role
                      {sortBy === "role" && <CheckCircle className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      {sortOrder === "asc" ? <SortAsc className="mr-2 h-4 w-4" /> : <SortDesc className="mr-2 h-4 w-4" />}
                      {sortOrder === "asc" ? "Ascending" : "Descending"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="icon" onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setSortBy("created_at");
                  setSortOrder("desc");
                }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{users.length}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{users.filter(u => (u.banned === false || u.banned === null || u.banned === undefined) && u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}</p>
                      <p className="text-xs text-muted-foreground">Active (30 days)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold">{users.filter(u => u.banned === true).length}</p>
                      <p className="text-xs text-muted-foreground">Banned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{users.filter(u => u.user_metadata?.role === "Admin").length}</p>
                      <p className="text-xs text-muted-foreground">Admins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                          } else {
                            setSelectedUsers(new Set());
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
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
                      className={"hover:bg-secondary/50 transition-colors cursor-pointer " + (user.banned ? "bg-red-50/50 dark:bg-red-950/20" : "")}
                      onClick={() => handleView(user)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedUsers);
                            if (e.target.checked) {
                              newSelected.add(user.id);
                            } else {
                              newSelected.delete(user.id);
                            }
                            setSelectedUsers(newSelected);
                          }}
                          className="rounded"
                        />
                      </TableCell>
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
                          {user.banned ? "Banned" : "Student"}
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
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPerformance(user)}
                            disabled={processingUser === user.id}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            Performance
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
      
      {/* User Performance Modal */}
      {performanceModal.user && (
        <UserPerformanceModal
          open={performanceModal.open}
          onOpenChange={(open) => setPerformanceModal({ open, user: open ? performanceModal.user : null })}
          user={performanceModal.user}
        />
      )}

      {/* User Details Modal */}
      {userDetailsModal.user && (
        <UserDetailsModal
          open={userDetailsModal.open}
          onOpenChange={(open) => setUserDetailsModal({ open, user: open ? userDetailsModal.user : null })}
          user={userDetailsModal.user}
        />
      )}
      </div>
    </>
  );
}
