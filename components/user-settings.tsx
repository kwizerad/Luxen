"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Lock, Loader2, Globe, Moon, Sun, Type, User, Camera, Upload, X, RefreshCw, MoreVertical, Eye, ChevronDown, ChevronUp, Shield, Bell, Smartphone, History, Download, Trash2, CheckCircle, AlertCircle, Info, Mail, Search, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { UserDevicesList } from "@/components/user-devices-list";

type TextSize = "sm" | "md" | "lg";
type Language = "English" | "Kinyarwanda" | "French";
type LanguageCode = "en" | "rw" | "fr";

interface UserSettingsProps {
  user: any;
  onUserUpdate?: (user: any) => void;
  showUsernameChange?: boolean;
  showPasswordChange?: boolean;
  /**
   * "admin" hides student-only or non-functioning settings (course language,
   * notification toggles, active sessions, delete account).
   */
  mode?: "admin" | "user";
}

export default function UserSettings({
  user,
  onUserUpdate,
  showUsernameChange = false,
  showPasswordChange = false,
  mode = "user",
}: UserSettingsProps) {
  const isAdminMode = mode === "admin";
  const { theme, setTheme } = useTheme();
  const { t, language: contextLanguage, setLanguage: setContextLanguage, availableLanguages } = useLanguage();
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [cardHoverClass, setCardHoverClass] = useState("transition-all duration-200 hover:shadow-lg");

  // Profile state
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || "");
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [gender, setGender] = useState(user?.user_metadata?.gender || "");
  const [nationality, setNationality] = useState(user?.user_metadata?.nationality || "");
  const [birthdate, setBirthdate] = useState(user?.user_metadata?.birthdate || "");
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.google_avatar_url ||
    user?.user_metadata?.picture ||
    ""
  );
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState(user?.user_metadata?.google_avatar_url || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Dialog state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // Card collapse state
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [appearanceLanguageOpen, setAppearanceLanguageOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // Additional state for new features
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    exams: true,
    announcements: true,
    grades: true,
  });

  // Load user preferences from metadata
  useEffect(() => {
    if (user) {
      const bestAvatar =
        user.avatar_url ||
        user.user_metadata?.avatar_url ||
        user.user_metadata?.google_avatar_url ||
        user.user_metadata?.picture ||
        "";
      if (bestAvatar) setAvatarUrl(bestAvatar);
      if (user.user_metadata?.google_avatar_url) setGoogleAvatarUrl(user.user_metadata.google_avatar_url);
      if (user.user_metadata?.first_name) setFirstName(user.user_metadata.first_name);
      if (user.user_metadata?.last_name) setLastName(user.user_metadata.last_name);
      if (user.user_metadata?.username) setUsername(user.user_metadata.username);
      if (user.user_metadata?.gender) setGender(user.user_metadata.gender);
      if (user.user_metadata?.nationality) setNationality(user.user_metadata.nationality);
      if (user.user_metadata?.birthdate) setBirthdate(user.user_metadata.birthdate);
    }

    if (user?.user_metadata) {
      const metadata = user.user_metadata;
      
      // Load notification preferences
      if (metadata.notification_preferences) {
        setNotificationPreferences(metadata.notification_preferences);
      }

      // Load theme preference
      if (!localStorage.getItem("navo-theme") && (metadata.theme === "light" || metadata.theme === "dark")) {
        setTheme(metadata.theme);
      }
      
      // Load text size preference
      if (metadata.text_size) {
        setTextSize(metadata.text_size);
        applyTextSize(metadata.text_size);
      }
      
      // Load language preference
      if (metadata.language) {
        setLanguage(metadata.language);

        // Convert language code to full name for context
        const languageMap: Record<LanguageCode, Language> = {
          en: "English",
          rw: "Kinyarwanda",
          fr: "French",
        };
        if (!localStorage.getItem("navo-language")) {
          setContextLanguage(languageMap[metadata.language as LanguageCode]);
        }
      }
    }
  }, [user, setContextLanguage]);

  const applyTextSize = (size: TextSize) => {
    const root = document.documentElement;
    root.dataset.textSize = size;
    switch (size) {
      case "sm":
        root.style.fontSize = "14px";
        break;
      case "md":
        root.style.fontSize = "16px";
        break;
      case "lg":
        root.style.fontSize = "18px";
        break;
    }
  };

  const saveUserPreferences = async (preferences: any) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: preferences
      });

      if (error) throw error;

      if (onUserUpdate) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      toast.error(`${t("userSettings.failedToSavePreferences")}: ${error.message}`);
    }
  };

  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const textSizes = [
    { value: "sm", label: t("small") },
    { value: "md", label: t("medium") },
    { value: "lg", label: t("large") },
  ];

  const allLanguages = [
    { value: "en", label: "English", fullValue: "English" },
    { value: "rw", label: "Kinyarwanda", fullValue: "Kinyarwanda" },
    { value: "fr", label: "Français", fullValue: "French" },
  ];
  const languages = allLanguages.filter((l) =>
    availableLanguages.some((al) => al.value === l.fullValue)
  );

  const handleTextSizeChange = async (size: TextSize) => {
    setTextSize(size);
    applyTextSize(size);
    
    // Save to user metadata
    await saveUserPreferences({ text_size: size });
  };

  const handleLanguageChange = async (newLanguage: LanguageCode) => {
    setLanguage(newLanguage);

    // Convert language code to full name for context
    const languageMap: Record<LanguageCode, Language> = {
      en: "English",
      rw: "Kinyarwanda",
      fr: "French",
    };
    setContextLanguage(languageMap[newLanguage]);

    // Save to user metadata
    await saveUserPreferences({ language: newLanguage });
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    
    // Save to user metadata
    await saveUserPreferences({ theme: newTheme });
  };

  const handleCardToggle = (cardName: string) => {
    const cardStates = {
      profileSettingsOpen: setProfileSettingsOpen,
      privacyOpen: setPrivacyOpen,
      securityOpen: setSecurityOpen,
      changePasswordOpen: setChangePasswordOpen,
      appearanceLanguageOpen: setAppearanceLanguageOpen,
      notificationsOpen: setNotificationsOpen,
    };

    // Close all cards first
    Object.entries(cardStates).forEach(([key, setter]) => {
      if (key !== cardName) {
        setter(false);
      }
    });

    // Toggle the clicked card
    cardStates[cardName as keyof typeof cardStates]((prev: boolean) => !prev);
  };

  const getDisplayName = () => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return user?.email?.split("@")[0] || t("user");
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayAvatarUrl = avatarUrl || googleAvatarUrl;

  const handleAvatarUpload = async (url: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });

      if (error) throw error;

      setAvatarUrl(url);
      toast.success(t("userSettings.profilePictureUpdated"));

      if (onUserUpdate) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      toast.error(error.message || t("userSettings.failedToUpdateProfilePicture"));
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });

      if (error) throw error;

      setAvatarUrl("");
      setShowRemoveDialog(false);
      toast.success(t("userSettings.profilePictureRemoved"));

      if (onUserUpdate) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) onUserUpdate(updatedUser);
      }
    } catch (error: any) {
      toast.error(error.message || t("userSettings.failedToRemoveProfilePicture"));
    }
  };

  const handleRestoreGoogleAvatar = async () => {
    if (googleAvatarUrl) {
      await handleAvatarUpload(googleAvatarUrl);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("passwordMinLength"));
      return;
    }

    setUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(t("userSettings.passwordUpdated"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || t("userSettings.failedToUpdatePassword"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <Card className={`${cardHoverClass} bg-primary/5`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary/30">
              {displayAvatarUrl && <AvatarImage src={displayAvatarUrl} alt={getDisplayName()} />}
              <AvatarFallback className="text-2xl font-semibold">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{getDisplayName()}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {user?.user_metadata?.role || t("user")}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {user?.created_at ? `${t("joined")} ${new Date(user.created_at).toLocaleDateString()}` : t("userSettings.member")}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t("userSettings.viewProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("userSettings.changePhoto")}
                </DropdownMenuItem>
                {googleAvatarUrl && avatarUrl !== googleAvatarUrl && (
                  <DropdownMenuItem onClick={handleRestoreGoogleAvatar}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("userSettings.restoreGoogle")}
                  </DropdownMenuItem>
                )}
                {avatarUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowRemoveDialog(true)} className="text-red-600">
                      <X className="mr-2 h-4 w-4" />
                      {t("removePhoto")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("userSettings.searchPlaceholder")}
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Account Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
            <User className="h-5 w-5" />
            {t("userSettings.account")}
          </h3>
          
          {/* Profile Settings */}
          <Card 
            className={`${cardHoverClass} hover:border-blue-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('profileSettingsOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("userSettings.profileSettings")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('profileSettingsOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${profileSettingsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">{t("userSettings.manageProfileInformation")}</CardDescription>
            </CardHeader>
            {profileSettingsOpen && (
            <CardContent className="pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("profilePicture")}</span>
                  <Badge variant={avatarUrl ? "default" : "secondary"} className="text-xs">
                    {avatarUrl ? t("userSettings.set") : t("userSettings.notSet")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t("userSettings.personalInfo")}</span>
                  <Badge variant={firstName || lastName ? "default" : "secondary"} className="text-xs">
                    {firstName || lastName ? t("completed") : t("userSettings.incomplete")}
                  </Badge>
                </div>
                {showUsernameChange && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("userSettings.username")}</span>
                    <Badge variant={username ? "default" : "secondary"} className="text-xs">
                      {username ? t("userSettings.set") : t("userSettings.notSet")}
                    </Badge>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowEditProfileDialog(true)}>
                {t("userSettings.editProfile")}
              </Button>
            </CardContent>
            )}
          </Card>

          {/* Privacy & Data */}
          <Card 
            className={`${cardHoverClass} hover:border-blue-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('privacyOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("userSettings.privacyData")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('privacyOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${privacyOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">{t("userSettings.privacyDataDescription")}</CardDescription>
            </CardHeader>
            {privacyOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{t("classmatesVisibility")}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("classmatesVisibilityDesc")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const supabase = createClient();
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (!currentUser) return;
                      const { data: profile } = await supabase
                        .from("user_profiles")
                        .select("is_public")
                        .eq("id", currentUser.id)
                        .maybeSingle();
                      const newValue = !(profile?.is_public ?? true);
                      const res = await fetch("/api/classmate-requests/visibility", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ is_public: newValue }),
                      });
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Failed");
                      }
                      toast.success(t("visibilityUpdated"));
                    } catch (error: any) {
                      toast.error(`${t("failedToUpdateVisibility")}: ${error.message}`);
                    }
                  }}
                >
                  {t("toggle")}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("userSettings.downloadData")}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const supabase = createClient();
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      
                      if (!currentUser) {
                        toast.error(t("userSettings.userNotFound"));
                        return;
                      }

                      // Create a JSON file with user data
                      const userData = {
                        profile: currentUser.user_metadata,
                        email: currentUser.email,
                        created_at: currentUser.created_at,
                        updated_at: currentUser.updated_at,
                      };

                      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `user-data-${Date.now()}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast.success(t("userSettings.dataExported"));
                    } catch (error: any) {
                      toast.error(`${t("userSettings.failedToExportData")}: ${error.message}`);
                    }
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t("download")}
                </Button>
              </div>
              {!isAdminMode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">{t("userSettings.deleteAccount")}</span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t("delete")}
                </Button>
              </div>
              )}
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {t("userSettings.dataRetention")}
                </p>
              </div>
            </CardContent>
            )}
          </Card>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600">
            <Shield className="h-5 w-5" />
            Security
          </h3>
          
          {/* Security Settings */}
          {!isAdminMode && (
          <Card 
            className={`${cardHoverClass} hover:border-red-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('securityOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("userSettings.securitySettings")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('securityOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${securityOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">{t("userSettings.loginHistorySessions")}</CardDescription>
            </CardHeader>
            {securityOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("linkedDevices") || "Linked Devices"}</span>
                <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                  {t("active") || "Active"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("userDevicesTransparencyDesc") || "View all devices, browsers, and IP addresses linked to your account."}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowDevicesDialog(true)}
              >
                <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                {t("manageLinkedDevices") || "Manage Linked Devices"}
              </Button>
            </CardContent>
            )}
          </Card>
          )}

          {/* Change Password */}
          {showPasswordChange && (
          <Card 
            className={`${cardHoverClass} hover:border-red-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('changePasswordOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("changePassword")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('changePasswordOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${changePasswordOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">{t("userSettings.updateYourPassword")}</CardDescription>
            </CardHeader>
            {changePasswordOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword" className="text-sm">{t("newPassword")}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("userSettings.enterNewPassword")}
                    required
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-sm">{t("confirmNewPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("userSettings.confirmPasswordPlaceholder")}
                    required
                    className="h-9"
                  />
                </div>
                <Button type="submit" disabled={updating} className="w-full" size="sm">
                  {updating ? t("updating") : t("userSettings.updatePassword")}
                </Button>
              </form>
            </CardContent>
            )}
          </Card>
          )}
        </div>

        {/* Preferences Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-600">
            <Moon className="h-5 w-5" />
            Preferences
          </h3>
          
          {/* Appearance & Language */}
          <Card 
            className={`${cardHoverClass} hover:border-purple-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('appearanceLanguageOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("userSettings.appearanceLanguage")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('appearanceLanguageOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${appearanceLanguageOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">{t("userSettings.appearanceLanguageDescription")}</CardDescription>
            </CardHeader>
            {appearanceLanguageOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <Label className="text-xs">{t("theme")}</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "light", icon: Sun, label: t("light") },
                    { value: "dark", icon: Moon, label: t("dark") },
                  ].map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      variant={theme === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleThemeChange(value)}
                      className="min-w-[80px]"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("textSize")}</Label>
                <div className="flex gap-2 flex-wrap">
                  {textSizes.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={textSize === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTextSizeChange(value as TextSize)}
                      className="min-w-[80px]"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              {!isAdminMode && (
              <div className="space-y-2">
                <Label className="text-xs">{t("language")}</Label>
                <div className="flex gap-2 flex-wrap">
                  {languages.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={language === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLanguageChange(value as any)}
                      className="min-w-[80px]"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              )}
            </CardContent>
            )}
          </Card>

          {/* Notifications */}
          {!isAdminMode && (
          <Card 
            className={`${cardHoverClass} hover:border-purple-500/50 cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => handleCardToggle('notificationsOpen')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("notifications")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardToggle('notificationsOpen');
                  }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-xs">{t("userSettings.notificationsDescription")}</CardDescription>
            </CardHeader>
            {notificationsOpen && (
            <CardContent className="pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden transition-all duration-300 ease-in-out max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("userSettings.emailAlerts")}</span>
                <Button
                  variant={emailNotifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                >
                  {emailNotifications ? t("on") : t("off")}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("userSettings.browserAlerts")}</span>
                <Button
                  variant={pushNotifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPushNotifications(!pushNotifications)}
                >
                  {pushNotifications ? t("on") : t("off")}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowNotificationDialog(true)}
              >
                {t("userSettings.chooseNotifications")}
              </Button>
            </CardContent>
            )}
          </Card>
          )}
        </div>

      </div>

      {/* Dialogs */}
      {/* Remove Profile Picture Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSettings.removeProfilePicture")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userSettings.removeProfilePictureDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAvatar}>{t("remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Profile Picture Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userSettings.changeProfilePicture")}</DialogTitle>
            <DialogDescription>
              {t("userSettings.uploadProfilePictureDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!file.type.startsWith("image/")) {
                    toast.error(t("imageUpload.selectImageFile"));
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error(t("imageUpload.fileSizeLimit"));
                    return;
                  }
                  
                  setUploadingAvatar(true);
                  try {
                    const supabase = createClient();
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `profile-pictures/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                      .from('avatars')
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('avatars')
                      .getPublicUrl(filePath);

                    await handleAvatarUpload(publicUrl);
                    setShowUploadDialog(false);
                  } catch (error: any) {
                    toast.error(`${t("userSettings.failedToUploadImage")}: ${error.message}`);
                  } finally {
                    setUploadingAvatar(false);
                  }
                }
              }}
              disabled={uploadingAvatar}
              className="w-full"
            />
            {uploadingAvatar && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Profile Picture Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profilePicture")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <img
              src={avatarUrl}
              alt={t("userSettings.profile")}
              className="max-w-full max-h-96 rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Linked Devices & Security Dialog */}
      <Dialog open={showDevicesDialog} onOpenChange={setShowDevicesDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t("linkedDevices") || "Linked Devices & Account Transparency"}
            </DialogTitle>
            <DialogDescription>
              {t("manageLinkedDevicesDesc") || "Review the browsers, device types, and IP addresses linked to your profile."}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <UserDevicesList showCardWrapper={false} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("userSettings.editProfile")}</DialogTitle>
            <DialogDescription>
              {t("userSettings.updatePersonalInformation")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setUpdatingProfile(true);
            
            try {
              const supabase = createClient();
              const updateData: any = {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                gender: gender,
                nationality: nationality,
                birthdate: birthdate,
              };
              
              if (showUsernameChange && username) {
                updateData.username = username.trim();
              }
              
              const { data, error } = await supabase.auth.updateUser({
                data: updateData,
              });
              
              if (error) throw error;
              
              toast.success(t("userSettings.profileUpdated"));
              
              if (onUserUpdate && data?.user) {
                onUserUpdate(data.user);
              }
              setShowEditProfileDialog(false);
            } catch (error: any) {
              toast.error(error.message || t("userSettings.failedToUpdateProfile"));
            } finally {
              setUpdatingProfile(false);
            }
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("userSettings.enterFirstName")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("userSettings.enterLastName")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">{t("gender")}</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("selectGender")}</option>
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
                <option value="other">{t("userSettings.other")}</option>
                <option value="prefer-not-to-say">{t("userSettings.preferNotToSay")}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality">{t("nationality")}</Label>
              <Input
                id="nationality"
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder={t("userSettings.enterNationality")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthdate">{t("dateOfBirth")}</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>
            {showUsernameChange && (
              <div className="grid gap-2">
                <Label htmlFor="username">{t("userSettings.username")}</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("userSettings.enterUsername")}
                  required
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditProfileDialog(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={updatingProfile}>
                {updatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  t("userSettings.saveChanges")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userSettings.chooseNotifications")}</DialogTitle>
            <DialogDescription>
              {t("userSettings.notificationPreferencesDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="exams"
                  checked={notificationPreferences.exams}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, exams: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="exams" className="text-sm cursor-pointer">{t("userSettings.examResultsReminders")}</label>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="announcements"
                  checked={notificationPreferences.announcements}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, announcements: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="announcements" className="text-sm cursor-pointer">{t("userSettings.systemMessages")}</label>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="grades"
                  checked={notificationPreferences.grades}
                  onChange={(e) => setNotificationPreferences({...notificationPreferences, grades: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="grades" className="text-sm cursor-pointer">{t("userSettings.gradeUpdates")}</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={async () => {
                try {
                  const supabase = createClient();
                  const { error } = await supabase.auth.updateUser({
                    data: { notification_preferences: notificationPreferences }
                  });

                  if (error) throw error;

                  toast.success(t("userSettings.alertChoicesSaved"));
                  setShowNotificationDialog(false);

                  if (onUserUpdate) {
                    const { data: { user: updatedUser } } = await supabase.auth.getUser();
                    if (updatedUser) onUserUpdate(updatedUser);
                  }
                } catch (error: any) {
                  toast.error(`${t("userSettings.failedToSave")}: ${error.message}`);
                }
              }}>
                Save Choices
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userSettings.deleteAccount")}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">{t("userSettings.typeDeleteToConfirm")}</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deleteConfirmText !== "DELETE") {
                    toast.error(t("userSettings.typeDeleteToConfirm"));
                    return;
                  }

                  setDeletingAccount(true);
                  try {
                    const supabase = createClient();
                    const { error } = await supabase.auth.admin.deleteUser(
                      user?.id
                    );

                    if (error) throw error;

                    toast.success(t("userSettings.accountDeleted"));
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  } catch (error: any) {
                    toast.error("Failed to delete account: " + error.message);
                  } finally {
                    setDeletingAccount(false);
                    setShowDeleteDialog(false);
                    setDeleteConfirmText("");
                  }
                }}
                disabled={deletingAccount || deleteConfirmText !== "DELETE"}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  t("userSettings.deleteAccount")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
