"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Shield, AlertTriangle, Trash2, Users, Eye, Lock, Edit, FileText, X, ArrowLeft, User, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PRIMARY_ADMIN_EMAIL, DEFAULT_PERMISSIONS, getUserPermissions } from "@/lib/permissions";
import { Watermark } from "@/components/watermark";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";
import { getUsers } from "@/lib/supabase/queries";
import { toast } from "sonner";
import Link from "next/link";

export default function RegisterAdminPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminGender, setNewAdminGender] = useState("male");
  const DEFAULT_ADMIN_PASSWORD = "Admin1234";
  const [showAdminForm, setShowAdminForm] = useState(false);
  
  // Permission states
  const [studentsEnabled, setStudentsEnabled] = useState(true);
  const [studentAccess, setStudentAccess] = useState<"read_only" | "read_write">("read_write");
  const [examPermissionsEnabled, setExamPermissionsEnabled] = useState(true);
  const [canAddQuestions, setCanAddQuestions] = useState(true);
  const [canViewQuestions, setCanViewQuestions] = useState(true);
  const [canManageSettings, setCanManageSettings] = useState(true);
  const [questionAccess, setQuestionAccess] = useState<"read_only" | "read_write">("read_write");
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<string | null>(null);
  
  // Edit admin state
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updatingAdmin, setUpdatingAdmin] = useState(false);
  
  // Edit admin info states
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editGender, setEditGender] = useState("male");
  
  // Edit permission states
  const [editStudentsEnabled, setEditStudentsEnabled] = useState(true);
  const [editStudentAccess, setEditStudentAccess] = useState<"read_only" | "read_write">("read_write");
  const [editExamPermissionsEnabled, setEditExamPermissionsEnabled] = useState(true);
  const [editCanAddQuestions, setEditCanAddQuestions] = useState(true);
  const [editCanViewQuestions, setEditCanViewQuestions] = useState(true);
  const [editCanManageSettings, setEditCanManageSettings] = useState(true);
  const [editQuestionAccess, setEditQuestionAccess] = useState<"read_only" | "read_write">("read_write");
  
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        setUser(user);
        
        // Only the primary admin can access this page
        if (user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
          setIsAuthorized(true);
          // Load existing admins
          loadAdmins();
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      // Note: Listing admins requires a user_profiles table or Edge Function
      // For now, this will return empty if the table doesn't exist
      const data = await getUsers("admins");
      setAdmins(data.users || []);
    } catch (error) {
      console.error("Failed to load admins:", error);
      // Note: Create user_profiles table in Supabase for admin listing
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!confirm(t("confirmDeleteAdmin").replace("{email}", adminEmail))) return;
    
    setDeletingAdmin(adminId);
    try {
      // Note: Admin deletion requires service role and should be done via Supabase Edge Function
      // For now, just update local state - implement Edge Function for production
      toast.info(t("adminDeletionRequiresBackend"));
      setAdmins(admins.filter(a => a.id !== adminId));
      setMessage({ type: "success", text: t("adminDeletedLocal").replace("{email}", adminEmail) });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("failedToDeleteAdmin") });
    } finally {
      setDeletingAdmin(null);
    }
  };

  const handleEditAdmin = (admin: any) => {
    setEditingAdmin(admin);
    const permissions = getUserPermissions(admin);
    
    setEditEmail(admin.email || "");
    setEditUsername(admin.user_metadata?.username || "");
    setEditGender(admin.user_metadata?.gender || "male");
    setEditStudentsEnabled(permissions.students?.enabled ?? true);
    setEditStudentAccess(
      permissions.students?.access === "none" ? "read_write" : permissions.students?.access ?? "read_write"
    );
    setEditExamPermissionsEnabled(permissions.examPermissions?.enabled ?? true);
    setEditCanAddQuestions(permissions.examPermissions?.canAddQuestions ?? true);
    setEditCanViewQuestions(permissions.examPermissions?.canViewQuestions ?? true);
    setEditCanManageSettings(permissions.examPermissions?.canManageSettings ?? true);
    setEditQuestionAccess(
      permissions.examPermissions?.questionAccess === "none" ? "read_write" : permissions.examPermissions?.questionAccess ?? "read_write"
    );
    
    setShowEditModal(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingAdmin(true);
    
    try {
      toast.info(t("adminUpdatesRequireBackend"));
      setMessage({ type: "success", text: t("adminUpdatedLocal").replace("{email}", editEmail) });
      setShowEditModal(false);
      // Update local state
      setAdmins(admins.map(a => a.id === editingAdmin.id ? {
        ...a,
        email: editEmail,
        user_metadata: {
          ...a.user_metadata,
          username: editUsername,
          gender: editGender,
        }
      } : a));
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("failedToUpdateAdmin") });
    } finally {
      setUpdatingAdmin(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAdmin(null);
    setMessage(null);
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    setRegistering(true);
    
    try {
      // Note: Creating admins requires service role and should be done via Supabase Edge Function
      // For now, show a message - implement Edge Function for production
      // You can also manually create admins in Supabase Dashboard
      toast.info(t("creatingAdminsRequiresBackend"));
      setMessage({ type: "success", text: t("adminCreationDefaultPassword") });
      setNewAdminEmail("");
      setNewAdminUsername("");
      setNewAdminGender("male");
      setStudentsEnabled(true);
      setStudentAccess("read_write");
      setExamPermissionsEnabled(true);
      setCanAddQuestions(true);
      setCanViewQuestions(true);
      setCanManageSettings(true);
      setQuestionAccess("read_write");
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("failedToCreateAdmin") });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("accessDenied")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("registerAdminNoPermission")}
          </p>
        </div>
        
        <Card className="border-destructive/20 hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--destructive)/0.3)] hover:-translate-y-1 hover:border-destructive transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">{t("unauthorized")}</h3>
                <p className="text-destructive/80 mt-1">
                  {t("onlyPrimaryAdminCanRegister").replace("{email}", PRIMARY_ADMIN_EMAIL)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/Admin/settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserPlus className="h-8 w-8 text-primary" />
              {t("registerNewAdmin")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("createAdministratorAccount")}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAdminForm(!showAdminForm)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {showAdminForm ? t("cancel") : t("newAdmin")}
        </Button>
      </div>

      {showAdminForm && (
        <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <CardTitle className="text-accent">{t("privilegedAccess")}</CardTitle>
            </div>
            <CardDescription className="text-accent/80">
              {t("privilegedAccessDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegisterAdmin} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                type="text"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder={t("usernamePlaceholder")}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="gender">{t("gender")}</Label>
              <Select
                value={newAdminGender}
                onValueChange={(value) => setNewAdminGender(value)}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder={t("selectGender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("male")}</SelectItem>
                  <SelectItem value="female">{t("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permissions Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label className="font-semibold">{t("permissions")}</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="studentsEnabled" className="cursor-pointer">{t("viewStudents")}</Label>
                  </div>
                  <Switch
                    id="studentsEnabled"
                    checked={studentsEnabled}
                    onCheckedChange={setStudentsEnabled}
                  />
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {t("viewStudentsDescription")}
                </p>
              </div>

              {studentsEnabled && (
                <div className="space-y-3 pl-4 border-l-2 border-border">
                  <Label>{t("studentAccessLevel")}</Label>
                  <Select
                    value={studentAccess}
                    onValueChange={(value: "read_only" | "read_write") => setStudentAccess(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read_only">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>{t("readOnly")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="read_write">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          <span>{t("readWrite")}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {studentAccess === "read_only" 
                      ? t("readOnlyStudentsDescription")
                      : t("readWriteStudentsDescription")}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="examPermissionsEnabled" className="cursor-pointer">{t("examPermissions")}</Label>
                  </div>
                  <Switch
                    id="examPermissionsEnabled"
                    checked={examPermissionsEnabled}
                    onCheckedChange={setExamPermissionsEnabled}
                  />
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Enable exam-related permissions for this admin
                </p>
              </div>

              {examPermissionsEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="canAddQuestions" className="cursor-pointer">{t("addQuestions")}</Label>
                      </div>
                      <Switch
                        id="canAddQuestions"
                        checked={canAddQuestions}
                        onCheckedChange={setCanAddQuestions}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t("addQuestionsDescription")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="canViewQuestions" className="cursor-pointer">{t("viewQuestions")}</Label>
                      </div>
                      <Switch
                        id="canViewQuestions"
                        checked={canViewQuestions}
                        onCheckedChange={setCanViewQuestions}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t("viewQuestionsDescription")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="canManageSettings" className="cursor-pointer">{t("manageExamSettings")}</Label>
                      </div>
                      <Switch
                        id="canManageSettings"
                        checked={canManageSettings}
                        onCheckedChange={setCanManageSettings}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t("manageExamSettingsDescription")}
                    </p>
                  </div>

                  {canViewQuestions && (
                    <div className="space-y-3">
                      <Label>{t("questionAccessLevel")}</Label>
                      <Select
                        value={questionAccess}
                        onValueChange={(value: "read_only" | "read_write") => setQuestionAccess(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_only">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              <span>{t("readOnly")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="read_write">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              <span>{t("readWrite")}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {questionAccess === "read_only" 
                          ? t("readOnlyQuestionsDescription")
                          : t("readWriteQuestionsDescription")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{t("defaultPassword")}:</strong> {DEFAULT_ADMIN_PASSWORD}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {t("defaultPasswordDescription")}
              </p>
            </div>
            
            {message && (
              <div className={`p-4 rounded-md text-sm font-medium border-2 ${
                message.type === "success" 
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              }`}>
                <div className="flex items-start gap-2">
                  {message.type === "success" ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )}
            
            <Button type="submit" disabled={registering} className="w-full">
              {registering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creatingAdmin")}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("createAdminAccount")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      {/* Manage Existing Admins */}
      <Card className="hover:shadow-[0_0_var(--glow-intensity)_hsl(var(--primary)/0.3)] hover:-translate-y-1 hover:border-[var(--hover-border-color)] transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("manageExistingAdmins")}
          </CardTitle>
          <CardDescription>
            {t("manageExistingAdminsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdmins ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("noAdminAccountsFound")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("username")}</TableHead>
                    <TableHead>{t("gender")}</TableHead>
                    <TableHead>{t("role")}</TableHead>
                    <TableHead>{t("permissions")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const isPrimary = admin.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                    const permissions = getUserPermissions(admin);
                    return (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.email}
                          {isPrimary && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {t("primary")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{admin.user_metadata?.username || "-"}</TableCell>
                        <TableCell className="capitalize">{admin.user_metadata?.gender || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {admin.user_metadata?.role || t("admin")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {permissions.students?.enabled && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                permissions.students.access === "read_write"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              }`}>
                                {permissions.students.access === "read_write" ? (
                                  <><Edit className="h-3 w-3 mr-1" />{t("studentsReadWrite")}</>
                                ) : (
                                  <><Eye className="h-3 w-3 mr-1" />{t("studentsReadOnly")}</>
                                )}
                              </span>
                            )}
                            {permissions.examPermissions?.enabled && (
                              <>
                                {permissions.examPermissions.canAddQuestions && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <Edit className="h-3 w-3 mr-1" />
                                    {t("addQuestionsShort")}
                                  </span>
                                )}
                                {permissions.examPermissions.canViewQuestions && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                    permissions.examPermissions.questionAccess === "read_write"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                  }`}>
                                    {permissions.examPermissions.questionAccess === "read_write" ? (
                                      <><Edit className="h-3 w-3 mr-1" />{t("questionsReadWrite")}</>
                                    ) : (
                                      <><Eye className="h-3 w-3 mr-1" />{t("questionsReadOnly")}</>
                                    )}
                                  </span>
                                )}
                                {permissions.examPermissions?.canManageSettings && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                    <Settings className="h-3 w-3 mr-1" />{t("settingsShort")}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!isPrimary && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditAdmin(admin)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                                  disabled={deletingAdmin === admin.id}
                                >
                                  {deletingAdmin === admin.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Admin Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              {t("editAdmin")}
            </DialogTitle>
            <DialogDescription>
              {t("admin")}: {editingAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateAdmin} className="space-y-4 mt-4">
            {/* Admin Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <Label className="font-semibold">{t("adminInformation")}</Label>
              </div>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="editEmail">{t("email")}</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="editUsername">{t("username")}</Label>
                  <Input
                    id="editUsername"
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="editGender">{t("gender")}</Label>
                  <Select
                    value={editGender}
                    onValueChange={setEditGender}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("male")}</SelectItem>
                      <SelectItem value="female">{t("female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Permissions Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label className="font-semibold">{t("permissions")}</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="editStudentsEnabled" className="cursor-pointer">{t("viewStudents")}</Label>
                  </div>
                  <Switch
                    id="editStudentsEnabled"
                    checked={editStudentsEnabled}
                    onCheckedChange={setEditStudentsEnabled}
                  />
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {t("viewStudentsDescription")}
                </p>
              </div>

              {editStudentsEnabled && (
                <div className="space-y-3 pl-4 border-l-2 border-border">
                  <Label>{t("studentAccessLevel")}</Label>
                  <Select
                    value={editStudentAccess}
                    onValueChange={(value: "read_only" | "read_write") => setEditStudentAccess(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read_only">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>{t("readOnly")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="read_write">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          <span>{t("readWrite")}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {editStudentAccess === "read_only" 
                      ? t("readOnlyStudentsDescription")
                      : t("readWriteStudentsDescription")}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="editExamPermissionsEnabled" className="cursor-pointer">{t("examPermissions")}</Label>
                  </div>
                  <Switch
                    id="editExamPermissionsEnabled"
                    checked={editExamPermissionsEnabled}
                    onCheckedChange={setEditExamPermissionsEnabled}
                  />
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Enable exam-related permissions for this admin
                </p>
              </div>

              {editExamPermissionsEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="editCanAddQuestions" className="cursor-pointer">{t("addQuestions")}</Label>
                      </div>
                      <Switch
                        id="editCanAddQuestions"
                        checked={editCanAddQuestions}
                        onCheckedChange={setEditCanAddQuestions}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t("addQuestionsDescription")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="editCanViewQuestions" className="cursor-pointer">{t("viewQuestions")}</Label>
                      </div>
                      <Switch
                        id="editCanViewQuestions"
                        checked={editCanViewQuestions}
                        onCheckedChange={setEditCanViewQuestions}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t("viewQuestionsDescription")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="editCanManageSettings" className="cursor-pointer">{t("manageExamSettings")}</Label>
                      </div>
                      <Switch
                        id="editCanManageSettings"
                        checked={editCanManageSettings}
                        onCheckedChange={setEditCanManageSettings}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t("manageExamSettingsDescription")}
                    </p>
                  </div>

                  {editCanViewQuestions && (
                    <div className="space-y-3">
                      <Label>{t("questionAccessLevel")}</Label>
                      <Select
                        value={editQuestionAccess}
                        onValueChange={(value: "read_only" | "read_write") => setEditQuestionAccess(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_only">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              <span>{t("readOnly")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="read_write">
                            <div className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              <span>{t("readWrite")}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {editQuestionAccess === "read_only" 
                          ? t("readOnlyQuestionsDescription")
                          : t("readWriteQuestionsDescription")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {message && (
              <div className={`p-4 rounded-md text-sm font-medium border-2 ${
                message.type === "success" 
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              }`}>
                <div className="flex items-start gap-2">
                  {message.type === "success" ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={updatingAdmin} className="flex-1">
                {updatingAdmin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    {t("updatePermissions")}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeEditModal}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
